import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_ITEMS } from './lib/catalog.mjs';
import {
  addDaysIso,
  createBuckets,
  round3,
  round4,
  setBucketDate,
} from './lib/common.mjs';
import { runAneelConnector } from './lib/connectors/aneel.mjs';
import { runAnpConnector } from './lib/connectors/anp.mjs';
import { runAnvisaCmedConnector } from './lib/connectors/anvisa-cmed.mjs';
import { runBcbPtaxConnector } from './lib/connectors/bcb-ptax.mjs';
import { runCommunityNfceConnector } from './lib/connectors/community-nfce.mjs';
import { runConabProhortConnector } from './lib/connectors/conab-prohort.mjs';
import { runDieeseCestaConnector } from './lib/connectors/dieese-cesta.mjs';
import { runIbgeSinapiConnector } from './lib/connectors/ibge-sinapi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const GEO_DIR = path.join(ROOT_DIR, 'public', 'geo');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const BY_ITEM_DIR = path.join(DATA_DIR, 'history', 'by-item');
const BY_STATE_DIR = path.join(DATA_DIR, 'history', 'by-state');
const LATEST_BY_STATE_DIR = path.join(DATA_DIR, 'latest', 'by-state');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const GEO_INDEX_PATH = path.join(GEO_DIR, 'ibge-municipalities-index.json');
const STATES_GEO_PATH = path.join(GEO_DIR, 'brazil-states.json');

function roundByDecimals(value, decimals = 2) {
  return decimals >= 3 ? round4(value) : round3(value);
}

async function loadIbgeMappings() {
  const indexRaw = JSON.parse(await fs.readFile(GEO_INDEX_PATH, 'utf-8'));
  const cityLookup = new Map();
  const cityNameByCode = new Map();
  for (const m of indexRaw) {
    cityLookup.set(`${m.uf}|${m.normalized}`, { code: m.code, name: m.name, uf: m.uf });
    cityNameByCode.set(m.code, { code: m.code, name: m.name, uf: m.uf });
  }

  const statesGeo = JSON.parse(await fs.readFile(STATES_GEO_PATH, 'utf-8'));
  const stateMeta = new Map();
  for (const f of statesGeo.features || []) {
    const p = f.properties || {};
    if (p.uf) {
      stateMeta.set(p.uf, { uf: p.uf, code: p.code, name: p.name, region: p.region });
    }
  }

  return { cityLookup, cityNameByCode, stateMeta };
}

async function loadExistingHistoryIntoBuckets(buckets) {
  try {
    const itemFiles = await fs.readdir(BY_ITEM_DIR);
    for (const file of itemFiles) {
      if (!file.endsWith('.json')) continue;
      const itemData = JSON.parse(await fs.readFile(path.join(BY_ITEM_DIR, file), 'utf-8'));
      const itemId = itemData.itemId;
      for (const pt of itemData.national || []) {
        setBucketDate(
          buckets.national,
          itemId,
          pt.date,
          pt.avg * pt.samples,
          pt.samples,
          pt.min,
          pt.max,
        );
      }
      for (const [uf, series] of Object.entries(itemData.states || {})) {
        for (const pt of series) {
          setBucketDate(
            buckets.state,
            `${itemId}|${uf}`,
            pt.date,
            pt.avg * pt.samples,
            pt.samples,
            pt.min,
            pt.max,
          );
        }
      }
    }

    const stateFiles = await fs.readdir(BY_STATE_DIR);
    for (const file of stateFiles) {
      if (!file.endsWith('.json')) continue;
      const stateData = JSON.parse(await fs.readFile(path.join(BY_STATE_DIR, file), 'utf-8'));
      const uf = stateData.uf;
      for (const [cityCode, cityObj] of Object.entries(stateData.cities || {})) {
        for (const [itemId, series] of Object.entries(cityObj.items || {})) {
          for (const pt of series) {
            setBucketDate(
              buckets.city,
              `${itemId}|${uf}|${cityCode}`,
              pt.date,
              pt.avg * pt.samples,
              pt.samples,
              pt.min,
              pt.max,
            );
          }
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function mergeFreshBucketsIntoHistory(historyBuckets, freshBuckets, updatedItemIds) {
  if (updatedItemIds.size === 0) return;

  // Scope date clearing strictly per updated itemId so different cadences never overwrite each other
  const freshDatesByItem = new Map();
  for (const itemId of updatedItemIds) {
    const dates = new Set();
    for (const d of freshBuckets.national.get(itemId)?.keys() || []) dates.add(d);
    if (dates.size > 0) freshDatesByItem.set(itemId, dates);
  }

  for (const [itemId, dateMap] of historyBuckets.national.entries()) {
    const datesToDelete = freshDatesByItem.get(itemId);
    if (!datesToDelete) continue;
    for (const d of datesToDelete) dateMap.delete(d);
  }
  for (const [key, dateMap] of historyBuckets.state.entries()) {
    const itemId = key.split('|')[0];
    const datesToDelete = freshDatesByItem.get(itemId);
    if (!datesToDelete) continue;
    for (const d of datesToDelete) dateMap.delete(d);
  }
  for (const [key, dateMap] of historyBuckets.city.entries()) {
    const itemId = key.split('|')[0];
    const datesToDelete = freshDatesByItem.get(itemId);
    if (!datesToDelete) continue;
    for (const d of datesToDelete) dateMap.delete(d);
  }

  for (const [key, dateMap] of freshBuckets.national.entries()) {
    for (const [d, val] of dateMap.entries()) {
      setBucketDate(historyBuckets.national, key, d, val.sum, val.count, val.min, val.max);
    }
  }
  for (const [key, dateMap] of freshBuckets.state.entries()) {
    for (const [d, val] of dateMap.entries()) {
      setBucketDate(historyBuckets.state, key, d, val.sum, val.count, val.min, val.max);
    }
  }
  for (const [key, dateMap] of freshBuckets.city.entries()) {
    for (const [d, val] of dateMap.entries()) {
      setBucketDate(historyBuckets.city, key, d, val.sum, val.count, val.min, val.max);
    }
  }
}

function toSortedDailySeries(dateMap, decimals = 2) {
  if (!dateMap || dateMap.size === 0) return [];
  const dates = Array.from(dateMap.keys()).sort();
  const series = [];

  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    const current = dateMap.get(date);
    const avg = roundByDecimals(current.sum / current.count, decimals);

    const windowStart = addDaysIso(date, -6);
    let wSum = 0;
    let wCount = 0;
    for (let j = i; j >= 0; j -= 1) {
      if (dates[j] < windowStart) break;
      const d = dateMap.get(dates[j]);
      wSum += d.sum;
      wCount += d.count;
    }

    series.push({
      date,
      avg,
      avg7d: roundByDecimals(wSum / wCount, decimals),
      min: roundByDecimals(current.min, decimals),
      max: roundByDecimals(current.max, decimals),
      samples: current.count,
    });
  }

  return series;
}

function summarizeWindowMetric(dateMap, activeEnd, item, isNational = false) {
  if (!dateMap || dateMap.size === 0) return null;
  const dates = Array.from(dateMap.keys()).sort();
  const decimals = item?.decimals ?? 2;

  if (item?.cadence === 'monthly' || item?.cadence === 'regulated') {
    const lastDate = dates[dates.length - 1];
    const cur = dateMap.get(lastDate);
    if (!cur || cur.count === 0) return null;
    const prevDate = dates.length >= 2 ? dates[dates.length - 2] : null;
    const prev = prevDate ? dateMap.get(prevDate) : null;

    const avg = roundByDecimals(cur.sum / cur.count, decimals);
    const previousAvg = prev && prev.count > 0 ? roundByDecimals(prev.sum / prev.count, decimals) : null;
    const changePct =
      previousAvg && previousAvg > 0
        ? Math.round(((avg - previousAvg) / previousAvg) * 10000) / 100
        : 0;

    return {
      avg,
      min: roundByDecimals(cur.min, decimals),
      max: roundByDecimals(cur.max, decimals),
      samples: cur.count,
      previousAvg,
      changePct,
      lastDate,
    };
  }

  const minAnchorSamples = isNational && item?.category === 'combustiveis' ? 50 : 1;
  let windowEnd = activeEnd;
  let windowStart = addDaysIso(windowEnd, -6);

  const collectRange = (start, end) => {
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    let lastDate = '';
    for (const d of dates) {
      if (d >= start && d <= end) {
        const entry = dateMap.get(d);
        sum += entry.sum;
        count += entry.count;
        if (entry.min < min) min = entry.min;
        if (entry.max > max) max = entry.max;
        if (d > lastDate) lastDate = d;
      }
    }
    return count > 0 ? { sum, count, min, max, lastDate } : null;
  };

  let cur = collectRange(windowStart, windowEnd);
  if (!cur || cur.count < minAnchorSamples) {
    const fallbackEnd = dates[dates.length - 1];
    windowEnd = fallbackEnd;
    windowStart = addDaysIso(fallbackEnd, -6);
    cur = collectRange(windowStart, windowEnd);
  }
  if (!cur) return null;

  let prev = null;
  for (let shift = 7; shift <= 28; shift += 7) {
    const pEnd = addDaysIso(windowStart, -1 - (shift - 7));
    const pStart = addDaysIso(pEnd, -6);
    prev = collectRange(pStart, pEnd);
    if (prev) break;
  }

  const avg = roundByDecimals(cur.sum / cur.count, decimals);
  const previousAvg = prev ? roundByDecimals(prev.sum / prev.count, decimals) : null;
  const changePct =
    previousAvg && previousAvg > 0
      ? Math.round(((avg - previousAvg) / previousAvg) * 10000) / 100
      : 0;

  return {
    avg,
    min: roundByDecimals(cur.min, decimals),
    max: roundByDecimals(cur.max, decimals),
    samples: cur.count,
    previousAvg,
    changePct,
    lastDate: cur.lastDate,
  };
}

async function computeDataVersion(manifestPath, todayIso) {
  try {
    const existing = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    const prefix = todayIso.replace(/-/g, '.');
    if (existing.dataVersion && existing.dataVersion.startsWith(`${prefix}.`)) {
      const seq = Number(existing.dataVersion.split('.').pop() || '0') + 1;
      return `${prefix}.${seq}`;
    }
    return `${prefix}.1`;
  } catch {
    return `${todayIso.replace(/-/g, '.')}.1`;
  }
}

async function runConnectorSafely(label, fn, connectorStatus, updatedItemIds) {
  try {
    const result = await fn();
    for (const id of result.itemIds || []) updatedItemIds.add(id);
    connectorStatus.push({
      name: result.name || label,
      status: 'ok',
      accepted: result.accepted || 0,
    });
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[WARN] Conector "${label}" falhou (${msg}); preservando histórico prévio.`);
    connectorStatus.push({
      name: label,
      status: 'warning',
      accepted: 0,
      message: msg,
    });
    return null;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isBackfill = args.has('--backfill');
  const fullYear = args.has('--full-year');
  const todayIso = new Date().toISOString().slice(0, 10);

  await Promise.all([
    fs.mkdir(BY_ITEM_DIR, { recursive: true }),
    fs.mkdir(BY_STATE_DIR, { recursive: true }),
    fs.mkdir(LATEST_BY_STATE_DIR, { recursive: true }),
    fs.mkdir(SNAPSHOTS_DIR, { recursive: true }),
  ]);

  const { cityLookup, cityNameByCode, stateMeta } = await loadIbgeMappings();
  const buckets = createBuckets();
  const itemById = new Map(CATALOG_ITEMS.map((item) => [item.id, item]));

  if (!isBackfill) {
    const loaded = await loadExistingHistoryIntoBuckets(buckets);
    console.log(
      loaded
        ? '[PIPELINE] Histórico existente carregado para atualização incremental multi-fonte.'
        : '[PIPELINE] Sem histórico prévio; iniciando nova base oficial.',
    );
  }

  const freshBuckets = createBuckets();
  const updatedItemIds = new Set();
  const connectorStatus = [];

  const anpRes = await runConnectorSafely(
    'anp',
    () => runAnpConnector({ isBackfill, fullYear, cityLookup, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );
  if (!anpRes && buckets.national.size === 0) {
    throw new Error('ANP falhou e não há histórico prévio disponível para fallback.');
  }

  const aneelRes = await runConnectorSafely(
    'aneel',
    () => runAneelConnector({ geoDir: GEO_DIR, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  const cmedRes = await runConnectorSafely(
    'anvisa-cmed',
    () => runAnvisaCmedConnector({ dataDir: DATA_DIR, todayIso, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  await runConnectorSafely(
    'conab-prohort',
    () => runConabProhortConnector({ fullYear, cityNameByCode, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  await runConnectorSafely(
    'ibge-sinapi',
    () => runIbgeSinapiConnector({ stateMeta, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  await runConnectorSafely(
    'dieese-cesta',
    () => runDieeseCestaConnector({ freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  await runConnectorSafely(
    'bcb-ptax',
    () => runBcbPtaxConnector({ dataDir: DATA_DIR }),
    connectorStatus,
    updatedItemIds,
  );

  await runConnectorSafely(
    'community-nfce',
    () => runCommunityNfceConnector({ dataDir: DATA_DIR, freshBuckets }),
    connectorStatus,
    updatedItemIds,
  );

  mergeFreshBucketsIntoHistory(buckets, freshBuckets, updatedItemIds);

  // Determine global date bounds using daily collections for the anchor window
  const allDateCounts = new Map();
  const dailyDateCounts = new Map();
  for (const [itemId, dateMap] of buckets.national.entries()) {
    const item = itemById.get(itemId);
    for (const [d, v] of dateMap.entries()) {
      allDateCounts.set(d, (allDateCounts.get(d) || 0) + v.count);
      if (!item || item.cadence === 'daily') {
        dailyDateCounts.set(d, (dailyDateCounts.get(d) || 0) + v.count);
      }
    }
  }

  const sortedDailyDates = Array.from(dailyDateCounts.keys()).sort();
  const sortedAllDates = Array.from(allDateCounts.keys()).sort();
  if (sortedAllDates.length === 0) {
    throw new Error('Nenhum dado válido foi processado por nenhuma fonte.');
  }

  const firstCollectionDate = sortedAllDates[0];
  const latestCollectionDate =
    sortedDailyDates[sortedDailyDates.length - 1] || sortedAllDates[sortedAllDates.length - 1];
  const activeWindowEnd = latestCollectionDate;
  const activeWindowStart = addDaysIso(activeWindowEnd, -6);

  await fs.writeFile(
    path.join(DATA_DIR, 'catalog.json'),
    JSON.stringify({ items: CATALOG_ITEMS }, null, 2),
  );

  const nationalLatest = {};
  for (const item of CATALOG_ITEMS) {
    const metric = summarizeWindowMetric(buckets.national.get(item.id), activeWindowEnd, item, true);
    if (metric) nationalLatest[item.id] = metric;
  }

  const statesLatest = {};
  const allCitiesCovered = new Set();

  for (const st of Array.from(stateMeta.values()).sort((a, b) => a.uf.localeCompare(b.uf))) {
    const stateItems = {};
    for (const item of CATALOG_ITEMS) {
      const metric = summarizeWindowMetric(
        buckets.state.get(`${item.id}|${st.uf}`),
        activeWindowEnd,
        item,
        false,
      );
      if (metric) stateItems[item.id] = metric;
    }

    const citiesObj = {};
    const citiesByItem = {};
    for (const [key, dateMap] of buckets.city.entries()) {
      const [itemId, uf, cityCode] = key.split('|');
      if (uf !== st.uf) continue;
      const item = itemById.get(itemId);
      const metric = summarizeWindowMetric(dateMap, activeWindowEnd, item, false);
      if (!metric) continue;
      allCitiesCovered.add(cityCode);
      citiesByItem[itemId] = (citiesByItem[itemId] || 0) + 1;
      if (!citiesObj[cityCode]) {
        const info = cityNameByCode.get(cityCode);
        citiesObj[cityCode] = {
          code: cityCode,
          name: info?.name || cityCode,
          items: {},
        };
      }
      citiesObj[cityCode].items[itemId] = metric;
    }

    // Write per-state municipal latest file to keep root latest.json compact
    await fs.writeFile(
      path.join(LATEST_BY_STATE_DIR, `${st.uf}.json`),
      JSON.stringify({
        uf: st.uf,
        name: st.name,
        cities: citiesObj,
      }),
    );

    statesLatest[st.uf] = {
      uf: st.uf,
      code: st.code,
      name: st.name,
      region: st.region,
      items: stateItems,
      citiesCount: Object.keys(citiesObj).length,
      citiesByItem,
      cities: {},
    };
  }

  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const existingManifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8').catch(() => '{}'));
  const dataVersion = await computeDataVersion(manifestPath, todayIso);

  const latestPayload = {
    dataVersion,
    generatedAt: new Date().toISOString(),
    latestCollectionDate,
    activeWindowStart,
    activeWindowEnd,
    national: nationalLatest,
    states: statesLatest,
  };
  await fs.writeFile(path.join(DATA_DIR, 'latest.json'), JSON.stringify(latestPayload));

  for (const item of CATALOG_ITEMS) {
    const natSeries = toSortedDailySeries(buckets.national.get(item.id), item.decimals);
    const stateSeries = {};
    for (const uf of stateMeta.keys()) {
      const s = toSortedDailySeries(buckets.state.get(`${item.id}|${uf}`), item.decimals);
      if (s.length > 0) stateSeries[uf] = s;
    }
    await fs.writeFile(
      path.join(BY_ITEM_DIR, `${item.id}.json`),
      JSON.stringify({
        itemId: item.id,
        unit: item.unit,
        national: natSeries,
        states: stateSeries,
      }),
    );
  }

  for (const st of stateMeta.values()) {
    const stateCityHistory = {};
    for (const [key, dateMap] of buckets.city.entries()) {
      const [itemId, uf, cityCode] = key.split('|');
      if (uf !== st.uf) continue;
      const item = itemById.get(itemId);
      if (!stateCityHistory[cityCode]) {
        const info = cityNameByCode.get(cityCode);
        stateCityHistory[cityCode] = {
          code: cityCode,
          name: info?.name || cityCode,
          items: {},
        };
      }
      stateCityHistory[cityCode].items[itemId] = toSortedDailySeries(dateMap, item?.decimals ?? 2);
    }
    await fs.writeFile(
      path.join(BY_STATE_DIR, `${st.uf}.json`),
      JSON.stringify({
        uf: st.uf,
        name: st.name,
        cities: stateCityHistory,
      }),
    );
  }

  let totalSamplesProcessed = 0;
  for (const count of allDateCounts.values()) totalSamplesProcessed += count;

  const snapshotEntry = {
    date: todayIso,
    dataVersion,
    latestCollectionDate,
    totalSamples: totalSamplesProcessed,
    nationalAverages: Object.fromEntries(
      Object.entries(nationalLatest).map(([id, m]) => [id, m.avg]),
    ),
  };
  await fs.writeFile(
    path.join(SNAPSHOTS_DIR, `${todayIso}.json`),
    JSON.stringify(snapshotEntry, null, 2),
  );

  const snapshotFiles = (await fs.readdir(SNAPSHOTS_DIR))
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse()
    .slice(0, 90);

  const snapshotIndex = [];
  for (const sf of snapshotFiles) {
    snapshotIndex.push(JSON.parse(await fs.readFile(path.join(SNAPSHOTS_DIR, sf), 'utf-8')));
  }
  await fs.writeFile(
    path.join(SNAPSHOTS_DIR, 'index.json'),
    JSON.stringify({ snapshots: snapshotIndex }, null, 2),
  );

  const totalAccepted = connectorStatus.reduce((acc, s) => acc + (s.accepted || 0), 0);
  const manifest = {
    dataVersion,
    generatedAt: new Date().toISOString(),
    firstCollectionDate,
    latestCollectionDate,
    activeWindowStart,
    activeWindowEnd,
    totalDays: sortedAllDates.length,
    totalSamplesProcessed,
    statesCovered: Object.values(statesLatest).filter((s) => Object.keys(s.items).length > 0).length,
    citiesCovered: allCitiesCovered.size,
    itemsCount: Object.keys(nationalLatest).length,
    cmedProductsIndexed:
      cmedRes?.cmedProductsIndexed ?? existingManifest.cmedProductsIndexed ?? 0,
    energyFlag: aneelRes?.energyFlag ?? existingManifest.energyFlag ?? undefined,
    connectorStatus,
    sources: [
      {
        name: 'ANP — Levantamento de Preços de Combustíveis e GLP (LPC)',
        url: 'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis',
        cadence: 'Coleta diária / Atualização matinal às 06:00 BRT',
      },
      {
        name: 'ANEEL — Tarifas Homologadas (B1 Residencial) & Bandeiras Tarifárias',
        url: 'https://dadosabertos.aneel.gov.br/',
        cadence: 'Mensal por distribuidora (5.514 municípios IBGE mapeados)',
      },
      {
        name: 'ANVISA / CMED — Tabela de Preços Máximos ao Consumidor (PMC)',
        url: 'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos',
        cadence: 'Teto regulado por alíquota modal de ICMS nas 27 UFs (+11k EANs)',
      },
      {
        name: 'CONAB / PROHORT — Cotação Diária de Hortigranjeiros (CEASAs)',
        url: 'https://www.gov.br/conab/pt-br/atuacao/informacoes-agropecuarias/hortigranjeiros-prohort',
        cadence: 'Diária nas principais CEASAs estaduais',
      },
      {
        name: 'IBGE — SINAPI Construção Civil (Agregado 2296) & Malhas v3',
        url: 'https://servicodados.ibge.gov.br/api/docs',
        cadence: 'Mensal (27 UFs + Brasil) / Malhas oficiais pré-cacheadas',
      },
      {
        name: 'DIEESE — Pesquisa Nacional da Cesta Básica de Alimentos',
        url: 'https://www.dieese.org.br/analisecestabasica/salarioMinimo.html',
        cadence: 'Mensal nas 27 capitais brasileiras',
      },
      {
        name: 'Banco Central do Brasil — Dólar Comercial PTAX (SGS Série 1)',
        url: 'https://dadosabertos.bcb.gov.br/',
        cadence: 'Diária (pregões úteis BCB)',
      },
      {
        name: 'Open Food Facts Brasil & Auditor NFC-e (ENCAT v2)',
        url: 'https://br.openfoodfacts.org/',
        cadence: 'Consulta GTIN sob demanda e contribuição auditada via cupom fiscal',
      },
    ],
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n=== Resumo da Atualização Multi-Fonte PreçoBrasil ===');
  console.log(`Versão gerada: v${dataVersion}`);
  console.log(
    `Série histórica: ${firstCollectionDate} até ${latestCollectionDate} (${sortedAllDates.length} datas)`,
  );
  console.log(
    `Total de registros históricos: ${totalSamplesProcessed.toLocaleString('pt-BR')} (${totalAccepted.toLocaleString('pt-BR')} processados nesta execução)`,
  );
  console.log(
    `Cobertura: ${manifest.statesCovered}/27 UFs | ${manifest.citiesCovered} municípios IBGE | ${manifest.itemsCount} itens ativos | ${manifest.cmedProductsIndexed} EANs CMED`,
  );
}

main().catch((err) => {
  console.error('[PIPELINE] Erro fatal:', err);
  process.exit(1);
});
