import fs from 'node:fs/promises';
import path from 'node:path';
import { buildAneelMunicipalityMap } from '../../fetch-aneel-map.mjs';
import { fetchBufferWithRetry, parseBrNumber, round4, upsertBucket } from '../common.mjs';

const ANEEL_TARIFF_RESOURCE = 'fcf2906c-7c32-4b9b-a637-054e7a5234f4';
const ANEEL_BANDEIRA_RESOURCE = '0591b8f6-fe54-437b-b72b-1aa2efd46e42';

async function fetchCkanRecords(resourceId, { filters, sort, limit = 2500 }) {
  const allRecords = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      resource_id: resourceId,
      limit: String(limit),
      offset: String(offset),
    });
    if (sort) params.set('sort', sort);
    if (filters) params.set('filters', JSON.stringify(filters));

    const url = `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?${params.toString()}`;
    const buf = await fetchBufferWithRetry(url, { timeoutMs: 45000 });
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(buf));
    const result = parsed?.result;
    if (!result || !Array.isArray(result.records)) {
      throw new Error(`Resposta CKAN inesperada em ${resourceId}`);
    }
    allRecords.push(...result.records);
    if (allRecords.length >= (result.total || 0) || result.records.length === 0) {
      break;
    }
    offset += result.records.length;
  }

  return allRecords;
}

function resolveTariffPerKwh(records, targetDateIso) {
  if (!records || records.length === 0) return null;
  // Prefer interval explicitly containing targetDateIso (records sorted descending by ini)
  for (const r of records) {
    if (r.ini <= targetDateIso && (!r.fim || r.fim >= targetDateIso)) {
      return r.rate;
    }
  }
  for (const r of records) {
    if (r.ini <= targetDateIso) {
      return r.rate;
    }
  }
  return records[records.length - 1].rate;
}

export async function runAneelConnector({ geoDir, freshBuckets }) {
  console.log('[ANEEL] Carregando mapeamento municípios <-> distribuidoras...');
  const mapPath = path.join(geoDir, 'aneel-municipality-distributors.json');
  let mapData;
  try {
    mapData = JSON.parse(await fs.readFile(mapPath, 'utf-8'));
  } catch {
    mapData = await buildAneelMunicipalityMap();
  }

  const municipalities = mapData.municipalities || {};
  console.log('[ANEEL] Consultando tarifas homologadas B1 Residencial Convencional...');
  const tariffRows = await fetchCkanRecords(ANEEL_TARIFF_RESOURCE, {
    limit: 2500,
    sort: 'DatInicioVigencia desc',
    filters: {
      DscBaseTarifaria: 'Tarifa de Aplicação',
      DscSubGrupo: 'B1',
      DscModalidadeTarifaria: 'Convencional',
      DscClasse: 'Residencial',
      DscSubClasse: 'Residencial',
      DscDetalhe: 'Não se aplica',
    },
  });

  const tariffsByCnpj = new Map();
  for (const r of tariffRows) {
    const cnpj = String(r.NumCNPJDistribuidora || '').replace(/\D/g, '').padStart(14, '0');
    const ini = String(r.DatInicioVigencia || '').slice(0, 10);
    const fim = String(r.DatFimVigencia || '').slice(0, 10);
    const tusd = parseBrNumber(r.VlrTUSD, { min: 0, max: 10000 }) ?? 0;
    const te = parseBrNumber(r.VlrTE, { min: 0, max: 10000 }) ?? 0;
    const rate = (tusd + te) / 1000;
    if (cnpj.length !== 14 || !ini || rate <= 0) continue;

    let list = tariffsByCnpj.get(cnpj);
    if (!list) {
      list = [];
      tariffsByCnpj.set(cnpj, list);
    }
    list.push({ ini, fim, rate, sigAgente: r.SigAgente || '' });
  }
  for (const list of tariffsByCnpj.values()) {
    list.sort((a, b) => b.ini.localeCompare(a.ini));
  }

  console.log('[ANEEL] Consultando acionamento mensal de Bandeira Tarifária...');
  const bandeiraRows = await fetchCkanRecords(ANEEL_BANDEIRA_RESOURCE, {
    limit: 50,
    sort: '_id desc',
  });

  const bandeiras2026 = bandeiraRows
    .map((r) => {
      const dateIso = String(r.DatCompetencia || '').slice(0, 10);
      const addMwh = parseBrNumber(r.VlrAdicionalBandeira, { min: 0, max: 500 }) ?? 0;
      return {
        dateIso,
        name: String(r.NomBandeiraAcionada || 'Verde').trim(),
        additionalPerMwh: round4(addMwh),
        additionalPerKwh: addMwh / 1000,
      };
    })
    .filter((b) => b.dateIso.startsWith('2026-'))
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  if (bandeiras2026.length === 0) {
    bandeiras2026.push({
      dateIso: `${new Date().toISOString().slice(0, 7)}-01`,
      name: 'Verde',
      additionalPerMwh: 0,
      additionalPerKwh: 0,
    });
  }

  const itemId = 'energia-residencial-b1';
  let accepted = 0;
  const coveredCities = new Set();

  for (const flag of bandeiras2026) {
    const midMonth = `${flag.dateIso.slice(0, 7)}-15`;
    for (const [cityCode, info] of Object.entries(municipalities)) {
      const baseRate = resolveTariffPerKwh(tariffsByCnpj.get(info.cnpj), midMonth);
      if (!baseRate || baseRate <= 0) continue;
      const finalRate = round4(baseRate + flag.additionalPerKwh);
      accepted += 1;
      coveredCities.add(cityCode);

      upsertBucket(freshBuckets.national, itemId, flag.dateIso, finalRate, 1, finalRate, finalRate);
      upsertBucket(
        freshBuckets.state,
        `${itemId}|${info.uf}`,
        flag.dateIso,
        finalRate,
        1,
        finalRate,
        finalRate,
      );
      upsertBucket(
        freshBuckets.city,
        `${itemId}|${info.uf}|${cityCode}`,
        flag.dateIso,
        finalRate,
        1,
        finalRate,
        finalRate,
      );
    }
  }

  const latestFlag = bandeiras2026[bandeiras2026.length - 1];
  console.log(
    `  ✓ [ANEEL] ${tariffsByCnpj.size} distribuidoras ativas | ${coveredCities.size} municípios | Bandeira ${latestFlag.name} (${latestFlag.dateIso}).`,
  );

  return {
    name: 'aneel',
    itemIds: [itemId],
    accepted,
    energyFlag: {
      month: latestFlag.dateIso,
      name: latestFlag.name,
      additionalPerMwh: latestFlag.additionalPerMwh,
      additionalPerKwh: round4(latestFlag.additionalPerKwh),
    },
  };
}
