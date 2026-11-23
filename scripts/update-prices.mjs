import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANP_PRODUCT_MAP,
  decodeAnpBuffer,
  normalizeMunicipalityName,
  parseBrDateToIso,
  parseBrPrice,
  parseCsvRecords,
} from './lib/anp-csv-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const BY_ITEM_DIR = path.join(DATA_DIR, 'history', 'by-item');
const BY_STATE_DIR = path.join(DATA_DIR, 'history', 'by-state');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const GEO_INDEX_PATH = path.join(ROOT_DIR, 'public', 'geo', 'ibge-municipalities-index.json');
const STATES_GEO_PATH = path.join(ROOT_DIR, 'public', 'geo', 'brazil-states.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PrecoBrasilBot/1.0)',
};

const ANP_QUS_URLS = [
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-gasolina-etanol.csv',
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv',
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-glp.csv',
];

const ANP_INDEX_PAGE =
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis';

export const CATALOG_ITEMS = [
  {
    id: 'gasolina-comum',
    name: 'Gasolina Comum',
    shortName: 'Gasolina',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '320102001',
    ncm: '27101259',
    barcodes: ['320102001', '27101259', '7890003201027'],
    aliases: ['gasolina', 'gasolina c', 'gasolina comum', 'combustivel', 'gasolina tipo c'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: true,
    priority: 1,
  },
  {
    id: 'etanol',
    name: 'Etanol Hidratado',
    shortName: 'Etanol',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '810101001',
    ncm: '22071090',
    barcodes: ['810101001', '22071090', '7890008101018'],
    aliases: ['etanol', 'alcool', 'etanol hidratado', 'álcool combustível', 'etanol comum'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: true,
    priority: 2,
  },
  {
    id: 'diesel-s10',
    name: 'Óleo Diesel S10',
    shortName: 'Diesel S10',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '820101034',
    ncm: '27101921',
    barcodes: ['820101034', '27101921', '7890008201039'],
    aliases: ['diesel s10', 's10', 'oleo diesel s10', 'diesel aditivado'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: true,
    priority: 3,
  },
  {
    id: 'diesel-comum',
    name: 'Óleo Diesel Comum',
    shortName: 'Diesel',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '820101012',
    ncm: '27101921',
    barcodes: ['820101012', '7890008201015'],
    aliases: ['diesel', 'diesel comum', 'diesel s500', 'oleo diesel'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: true,
    priority: 4,
  },
  {
    id: 'gasolina-aditivada',
    name: 'Gasolina Aditivada',
    shortName: 'Gas. Aditivada',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '320102002',
    ncm: '27101259',
    barcodes: ['320102002', '7890003201034'],
    aliases: ['gasolina aditivada', 'aditivada', 'grid', 'podium', 'v-power'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: true,
    priority: 5,
  },
  {
    id: 'glp-13kg',
    name: 'Gás de Cozinha (GLP 13 kg)',
    shortName: 'GLP 13 kg',
    category: 'energia',
    categoryLabel: 'Gás & Energia',
    unit: 'R$/13kg',
    decimals: 2,
    anpCode: '210203001',
    ncm: '27111910',
    barcodes: ['210203001', '27111910', '7890002102035'],
    aliases: ['glp', 'gas de cozinha', 'botijao', 'botijao 13kg', 'gas glp'],
    sourceName: 'ANP — Levantamento de Preços de GLP',
    featured: false,
    priority: 6,
  },
  {
    id: 'gnv',
    name: 'Gás Natural Veicular (GNV)',
    shortName: 'GNV',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/m³',
    decimals: 2,
    anpCode: '220101005',
    ncm: '27112100',
    barcodes: ['220101005', '27112100', '7890002201011'],
    aliases: ['gnv', 'gas natural', 'gas veicular'],
    sourceName: 'ANP — Levantamento de Preços de Combustíveis',
    featured: false,
    priority: 7,
  },
];

const MANUAL_CITY_ALIASES = {
  'SP|MOGI MIRIM': 'MOJI MIRIM',
  'RJ|PARATI': 'PARATY',
  'MT|POXOREO': 'POXOREU',
};

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function addDaysIso(isoDate, deltaDays) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

async function fetchBufferWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} em ${url}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
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

async function discoverBackfillUrls(fullYear) {
  const buf = await fetchBufferWithRetry(ANP_INDEX_PAGE);
  const html = new TextDecoder('utf-8').decode(buf);
  const matches = html.match(
    /https?:\/\/[^\s"'<>]+shpc\/dsan\/2026\/[^\s"'<>]+\.csv/gi,
  ) || [];
  const unique = Array.from(new Set(matches)).sort();
  if (fullYear) {
    return unique;
  }
  return unique.filter((url) => /\/(07|08|09|10)-/.test(url));
}

function createBuckets() {
  return {
    national: new Map(), // itemId -> Map(date -> { sum, count, min, max })
    state: new Map(), // `${itemId}|${uf}` -> Map(date -> { sum, count, min, max })
    city: new Map(), // `${itemId}|${uf}|${cityCode}` -> Map(date -> { sum, count, min, max })
  };
}

function upsertBucket(bucketMap, key, date, sum, count, min, max) {
  let dateMap = bucketMap.get(key);
  if (!dateMap) {
    dateMap = new Map();
    bucketMap.set(key, dateMap);
  }
  const prev = dateMap.get(date);
  if (!prev) {
    dateMap.set(date, { sum, count, min, max });
  } else {
    prev.sum += sum;
    prev.count += count;
    if (min < prev.min) prev.min = min;
    if (max > prev.max) prev.max = max;
  }
}

function setBucketDate(bucketMap, key, date, sum, count, min, max) {
  let dateMap = bucketMap.get(key);
  if (!dateMap) {
    dateMap = new Map();
    bucketMap.set(key, dateMap);
  }
  dateMap.set(date, { sum, count, min, max });
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

function resolveCity(cityLookup, uf, rawMun) {
  const norm = normalizeMunicipalityName(rawMun);
  const direct = cityLookup.get(`${uf}|${norm}`);
  if (direct) return direct;
  const alias = MANUAL_CITY_ALIASES[`${uf}|${norm}`];
  if (alias) {
    return cityLookup.get(`${uf}|${alias}`) || null;
  }
  return null;
}

function ingestCsvRows(csvText, cityLookup, dedupSet, freshBuckets, unmatchedCities) {
  const records = parseCsvRecords(csvText, ';');
  if (records.length < 2) return { parsed: 0, accepted: 0 };

  const header = records[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const idxUf = header.indexOf('Estado - Sigla');
  const idxMun = header.indexOf('Municipio');
  const idxCnpj = header.indexOf('CNPJ da Revenda');
  const idxProd = header.indexOf('Produto');
  const idxDate = header.indexOf('Data da Coleta');
  const idxPrice = header.indexOf('Valor de Venda');

  if ([idxUf, idxMun, idxProd, idxDate, idxPrice].some((i) => i === -1)) {
    throw new Error(`Cabeçalho CSV inesperado: ${header.join(', ')}`);
  }

  let accepted = 0;
  for (let i = 1; i < records.length; i += 1) {
    const row = records[i];
    if (row.length <= Math.max(idxUf, idxMun, idxProd, idxDate, idxPrice)) continue;

    const productRaw = row[idxProd].toUpperCase();
    const itemId = ANP_PRODUCT_MAP[productRaw];
    if (!itemId) continue;

    const dateIso = parseBrDateToIso(row[idxDate]);
    const price = parseBrPrice(row[idxPrice]);
    const uf = row[idxUf].toUpperCase();
    const rawMun = row[idxMun];
    if (!dateIso || price === null || uf.length !== 2 || !rawMun) continue;

    const cnpj = idxCnpj >= 0 ? row[idxCnpj] : String(i);
    const dedupKey = `${itemId}|${dateIso}|${cnpj}`;
    if (dedupSet.has(dedupKey)) continue;
    dedupSet.add(dedupKey);

    accepted += 1;
    upsertBucket(freshBuckets.national, itemId, dateIso, price, 1, price, price);
    upsertBucket(freshBuckets.state, `${itemId}|${uf}`, dateIso, price, 1, price, price);

    const city = resolveCity(cityLookup, uf, rawMun);
    if (city) {
      upsertBucket(
        freshBuckets.city,
        `${itemId}|${uf}|${city.code}`,
        dateIso,
        price,
        1,
        price,
        price,
      );
    } else {
      unmatchedCities.add(`${uf}|${rawMun}`);
    }
  }

  return { parsed: records.length - 1, accepted };
}

function toSortedDailySeries(dateMap) {
  if (!dateMap || dateMap.size === 0) return [];
  const dates = Array.from(dateMap.keys()).sort();
  const series = [];

  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    const current = dateMap.get(date);
    const avg = round3(current.sum / current.count);

    // Trailing 7-calendar-day weighted moving average
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
      avg7d: round3(wSum / wCount),
      min: round3(current.min),
      max: round3(current.max),
      samples: current.count,
    });
  }

  return series;
}

function summarizeWindowMetric(dateMap, activeEnd, minAnchorSamples = 1) {
  if (!dateMap || dateMap.size === 0) return null;
  const dates = Array.from(dateMap.keys()).sort();

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

  // Find preceding 7-day window with samples (search up to 4 weeks back for biweekly cities)
  let prev = null;
  for (let shift = 7; shift <= 28; shift += 7) {
    const pEnd = addDaysIso(windowStart, -1 - (shift - 7));
    const pStart = addDaysIso(pEnd, -6);
    prev = collectRange(pStart, pEnd);
    if (prev) break;
  }

  const avg = round3(cur.sum / cur.count);
  const previousAvg = prev ? round3(prev.sum / prev.count) : null;
  const changePct =
    previousAvg && previousAvg > 0
      ? Math.round(((avg - previousAvg) / previousAvg) * 10000) / 100
      : 0;

  return {
    avg,
    min: round3(cur.min),
    max: round3(cur.max),
    samples: cur.count,
    previousAvg,
    changePct,
    lastDate: cur.lastDate,
  };
}

function mergeFreshBucketsIntoHistory(historyBuckets, freshBuckets) {
  const freshDates = new Set();
  for (const dateMap of freshBuckets.national.values()) {
    for (const d of dateMap.keys()) freshDates.add(d);
  }
  // Remove fresh dates from history buckets before overwriting with exact fresh deduplicated totals
  for (const bucketMap of [historyBuckets.national, historyBuckets.state, historyBuckets.city]) {
    for (const dateMap of bucketMap.values()) {
      for (const fd of freshDates) {
        dateMap.delete(fd);
      }
    }
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

async function main() {
  const args = new Set(process.argv.slice(2));
  const isBackfill = args.has('--backfill');
  const fullYear = args.has('--full-year');

  await Promise.all([
    fs.mkdir(BY_ITEM_DIR, { recursive: true }),
    fs.mkdir(BY_STATE_DIR, { recursive: true }),
    fs.mkdir(SNAPSHOTS_DIR, { recursive: true }),
  ]);

  const { cityLookup, cityNameByCode, stateMeta } = await loadIbgeMappings();
  const buckets = createBuckets();

  if (!isBackfill) {
    const loaded = await loadExistingHistoryIntoBuckets(buckets);
    console.log(
      loaded
        ? '[ANP] Histórico existente carregado para atualização incremental.'
        : '[ANP] Sem histórico prévio; iniciando com as últimas 4 semanas.',
    );
  }

  let urls = [...ANP_QUS_URLS];
  if (isBackfill) {
    console.log('[ANP] Descobrindo CSVs mensais de 2026 no portal oficial...');
    const monthlyUrls = await discoverBackfillUrls(fullYear);
    urls = [...monthlyUrls, ...ANP_QUS_URLS];
    console.log(`[ANP] ${urls.length} arquivos CSV selecionados para ingestão.`);
  }

  const freshBuckets = createBuckets();
  const dedupSet = new Set();
  const unmatchedCities = new Set();
  let totalAccepted = 0;

  for (const url of urls) {
    const fileName = url.split('/').pop();
    const buf = await fetchBufferWithRetry(url);
    const text = decodeAnpBuffer(buf);
    const { parsed, accepted } = ingestCsvRows(
      text,
      cityLookup,
      dedupSet,
      freshBuckets,
      unmatchedCities,
    );
    totalAccepted += accepted;
    console.log(`  ✓ ${fileName}: ${parsed} linhas (${accepted} novas coletas válidas)`);
  }

  if (unmatchedCities.size > 0) {
    console.warn('[ANP] Municípios não mapeados ao IBGE:', Array.from(unmatchedCities));
  } else {
    console.log('[ANP] 100% dos municípios da ANP mapeados com código IBGE oficial!');
  }

  if (isBackfill) {
    mergeFreshBucketsIntoHistory(buckets, freshBuckets);
  } else {
    mergeFreshBucketsIntoHistory(buckets, freshBuckets);
  }

  // Determine global date bounds and active anchor window
  const allDateCounts = new Map();
  for (const dateMap of buckets.national.values()) {
    for (const [d, v] of dateMap.entries()) {
      allDateCounts.set(d, (allDateCounts.get(d) || 0) + v.count);
    }
  }
  const sortedAllDates = Array.from(allDateCounts.keys()).sort();
  if (sortedAllDates.length === 0) {
    throw new Error('Nenhum dado válido foi processado.');
  }

  const firstCollectionDate = sortedAllDates[0];
  const latestCollectionDate = sortedAllDates[sortedAllDates.length - 1];
  const activeWindowEnd = latestCollectionDate;
  const activeWindowStart = addDaysIso(activeWindowEnd, -6);

  // Build catalog.json
  await fs.writeFile(
    path.join(DATA_DIR, 'catalog.json'),
    JSON.stringify({ items: CATALOG_ITEMS }, null, 2),
  );

  // Build latest.json
  const nationalLatest = {};
  for (const item of CATALOG_ITEMS) {
    const metric = summarizeWindowMetric(buckets.national.get(item.id), activeWindowEnd, 50);
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
        3,
      );
      if (metric) stateItems[item.id] = metric;
    }

    const citiesObj = {};
    for (const [key, dateMap] of buckets.city.entries()) {
      const [itemId, uf, cityCode] = key.split('|');
      if (uf !== st.uf) continue;
      const metric = summarizeWindowMetric(dateMap, activeWindowEnd, 1);
      if (!metric) continue;
      allCitiesCovered.add(cityCode);
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

    statesLatest[st.uf] = {
      uf: st.uf,
      code: st.code,
      name: st.name,
      region: st.region,
      items: stateItems,
      citiesCount: Object.keys(citiesObj).length,
      cities: citiesObj,
    };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const manifestPath = path.join(DATA_DIR, 'manifest.json');
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

  // Build history/by-item/{itemId}.json
  for (const item of CATALOG_ITEMS) {
    const natSeries = toSortedDailySeries(buckets.national.get(item.id));
    const stateSeries = {};
    for (const uf of stateMeta.keys()) {
      const s = toSortedDailySeries(buckets.state.get(`${item.id}|${uf}`));
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

  // Build history/by-state/{UF}.json
  for (const st of stateMeta.values()) {
    const stateCityHistory = {};
    for (const [key, dateMap] of buckets.city.entries()) {
      const [itemId, uf, cityCode] = key.split('|');
      if (uf !== st.uf) continue;
      if (!stateCityHistory[cityCode]) {
        const info = cityNameByCode.get(cityCode);
        stateCityHistory[cityCode] = {
          code: cityCode,
          name: info?.name || cityCode,
          items: {},
        };
      }
      stateCityHistory[cityCode].items[itemId] = toSortedDailySeries(dateMap);
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

  // Build snapshot & snapshots/index.json
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
    sources: [
      {
        name: 'ANP — Levantamento de Preços de Combustíveis (LPC)',
        url: 'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis',
        cadence: 'Coleta diária / Atualização matinal às 06:00 BRT',
      },
      {
        name: 'IBGE — Malhas Territoriais v3 & Localidades v1',
        url: 'https://servicodados.ibge.gov.br/api/docs',
        cadence: 'Malha oficial pré-cacheada (27 UFs / 5.571 municípios)',
      },
      {
        name: 'Open Food Facts Brasil — API v2 GTIN/EAN',
        url: 'https://br.openfoodfacts.org/',
        cadence: 'Consulta ao vivo sob demanda por código de barras',
      },
    ],
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n=== Resumo da Atualização PreçoBrasil ===');
  console.log(`Versão gerada: ${dataVersion}`);
  console.log(`Período histórico: ${firstCollectionDate} até ${latestCollectionDate} (${sortedAllDates.length} dias com coletas)`);
  console.log(`Janela ativa atual: ${activeWindowStart} a ${activeWindowEnd}`);
  console.log(`Total de coletas no histórico: ${totalSamplesProcessed.toLocaleString('pt-BR')} (${totalAccepted.toLocaleString('pt-BR')} nesta execução)`);
  console.log(`Cobertura: ${manifest.statesCovered}/27 UFs | ${manifest.citiesCovered} municípios IBGE`);
  for (const item of CATALOG_ITEMS) {
    const m = nationalLatest[item.id];
    if (m) {
      console.log(`  • ${item.name.padEnd(28)}: R$ ${m.avg.toFixed(2)} (${m.changePct >= 0 ? '+' : ''}${m.changePct.toFixed(2)}%, ${m.samples} coletas na janela)`);
    }
  }
}

main().catch((err) => {
  console.error('[ANP] Erro fatal:', err);
  process.exit(1);
});
