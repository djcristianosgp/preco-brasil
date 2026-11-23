import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCsvRecords } from '../anp-csv-parser.mjs';
import {
  CMED_ICMS_KEYS,
  UF_ICMS_2026,
  fetchBufferWithRetry,
  parseBrNumber,
  round3,
  upsertBucket,
} from '../common.mjs';

const CMED_CSV_URL = 'https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv';

const FEATURED_MED_BY_EAN = {
  '7891058009458': 'med-dorflex',
  '7891317427542': 'med-losartana',
  '7891721027437': 'med-metformina',
  '7896004701998': 'med-omeprazol',
  '7891317001568': 'med-amoxicilina',
  '7896094999985': 'med-neosaldina',
  '7896015592752': 'med-advil',
  '7897595601766': 'med-sinvastatina',
};

function cleanField(val) {
  return String(val || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function runAnvisaCmedConnector({ dataDir, todayIso, freshBuckets }) {
  console.log('[ANVISA/CMED] Baixando TA_PRECO_MEDICAMENTO.csv (~17 MB)...');
  const buf = await fetchBufferWithRetry(CMED_CSV_URL, { timeoutMs: 90000 });
  const rawText = new TextDecoder('utf-8').decode(buf).replace(/^\uFEFF/, '');
  const records = parseCsvRecords(rawText, ';');
  if (records.length < 2) {
    throw new Error('CSV da ANVISA CMED veio vazio.');
  }

  const header = records[0].map((h) => cleanField(h));
  const idxSubst = header.indexOf('SUBSTÂNCIA');
  const idxLab = header.indexOf('LABORATÓRIO');
  const idxEan1 = header.indexOf('EAN 1');
  const idxProd = header.indexOf('PRODUTO');
  const idxApres = header.indexOf('APRESENTAÇÃO');
  const idxComerc = header.indexOf('COMERCIALIZAÇÃO 2025');
  const idxHosp = header.indexOf('RESTRIÇÃO HOSPITALAR');
  const idxTarja = header.indexOf('TARJA');

  const pmcIndices = CMED_ICMS_KEYS.map((k) => header.indexOf(`PMC ${k} %`));
  if (
    [idxSubst, idxLab, idxEan1, idxProd, idxApres].some((i) => i === -1) ||
    pmcIndices.some((i) => i === -1)
  ) {
    throw new Error('Cabeçalho esperado do CSV CMED não encontrado.');
  }

  // Build 100 shards keyed by last 2 digits of EAN-13
  const shards = Array.from({ length: 100 }, () => ({}));
  const seenEan = new Set();
  const featuredMatched = new Set();
  let indexedCount = 0;

  for (let r = 1; r < records.length; r += 1) {
    const row = records[r];
    if (row.length <= idxApres) continue;

    if (idxComerc >= 0 && cleanField(row[idxComerc]).toLowerCase() !== 'sim') {
      continue;
    }
    if (idxHosp >= 0 && cleanField(row[idxHosp]).toLowerCase() === 'sim') {
      continue;
    }

    const ean = cleanField(row[idxEan1]).replace(/\D/g, '');
    if (ean.length !== 13 || seenEan.has(ean)) continue;

    const pmcValues = pmcIndices.map((colIdx) => parseBrNumber(row[colIdx], { min: 0.05, max: 500000 }));
    const pmc18 = pmcValues[CMED_ICMS_KEYS.indexOf('18')];
    if (!pmc18 || pmc18 <= 0) continue;

    seenEan.add(ean);
    indexedCount += 1;

    const pmcCompact = pmcValues.map((v, idx) => round3(v ?? pmcValues[idx > 0 ? idx - 1 : 0] ?? pmc18));
    const suffix = Number(ean.slice(-2));
    shards[suffix][ean] = {
      p: cleanField(row[idxProd]),
      s: cleanField(row[idxSubst]).slice(0, 140),
      a: cleanField(row[idxApres]).slice(0, 120),
      l: cleanField(row[idxLab]).slice(0, 80),
      t: idxTarja >= 0 ? cleanField(row[idxTarja]) : 'Não informada',
      pmc: pmcCompact,
    };

    const featuredItemId = FEATURED_MED_BY_EAN[ean];
    if (featuredItemId && !featuredMatched.has(featuredItemId)) {
      featuredMatched.add(featuredItemId);
      for (const [uf, icmsKey] of Object.entries(UF_ICMS_2026)) {
        const keyIdx = CMED_ICMS_KEYS.indexOf(icmsKey);
        const ufPrice = pmcCompact[keyIdx >= 0 ? keyIdx : 2];
        if (ufPrice > 0) {
          upsertBucket(freshBuckets.state, `${featuredItemId}|${uf}`, todayIso, ufPrice, 1, ufPrice, ufPrice);
          upsertBucket(freshBuckets.national, featuredItemId, todayIso, ufPrice, 1, ufPrice, ufPrice);
        }
      }
    }
  }

  const cmedDir = path.join(dataDir, 'cmed');
  await fs.mkdir(cmedDir, { recursive: true });
  await Promise.all(
    shards.map((shardObj, idx) => {
      const code = String(idx).padStart(2, '0');
      return fs.writeFile(path.join(cmedDir, `${code}.json`), JSON.stringify(shardObj));
    }),
  );

  console.log(
    `  ✓ [ANVISA/CMED] ${indexedCount.toLocaleString('pt-BR')} medicamentos EAN-13 indexados em 100 shards; ${featuredMatched.size}/8 itens em destaque mapeados às 27 UFs.`,
  );

  return {
    name: 'anvisa-cmed',
    itemIds: Array.from(featuredMatched),
    accepted: indexedCount,
    cmedProductsIndexed: indexedCount,
  };
}
