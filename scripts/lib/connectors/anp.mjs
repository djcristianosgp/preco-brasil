import { ANP_PRODUCT_MAP, decodeAnpBuffer, normalizeMunicipalityName, parseBrDateToIso, parseBrPrice, parseCsvRecords } from '../anp-csv-parser.mjs';
import { fetchBufferWithRetry, upsertBucket } from '../common.mjs';

const ANP_QUS_URLS = [
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-gasolina-etanol.csv',
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv',
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-glp.csv',
];

const ANP_INDEX_PAGE =
  'https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis';

const MANUAL_CITY_ALIASES = {
  'SP|MOGI MIRIM': 'MOJI MIRIM',
  'RJ|PARATI': 'PARATY',
  'MT|POXOREO': 'POXOREU',
};

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

async function discoverBackfillUrls(fullYear) {
  const buf = await fetchBufferWithRetry(ANP_INDEX_PAGE);
  const html = new TextDecoder('utf-8').decode(buf);
  const matches =
    html.match(/https?:\/\/[^\s"'<>]+shpc\/dsan\/2026\/[^\s"'<>]+\.csv/gi) || [];
  const unique = Array.from(new Set(matches)).sort();
  if (fullYear) {
    return unique;
  }
  return unique.filter((url) => /\/(07|08|09|10)-/.test(url));
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
    throw new Error(`Cabeçalho CSV ANP inesperado: ${header.join(', ')}`);
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

export async function runAnpConnector({ isBackfill, fullYear, cityLookup, freshBuckets }) {
  let urls = [...ANP_QUS_URLS];
  if (isBackfill) {
    console.log('[ANP] Descobrindo CSVs mensais de 2026 no portal oficial...');
    const monthlyUrls = await discoverBackfillUrls(fullYear);
    urls = [...monthlyUrls, ...ANP_QUS_URLS];
    console.log(`[ANP] ${urls.length} arquivos CSV selecionados para ingestão.`);
  }

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
    console.log(`  ✓ [ANP] ${fileName}: ${parsed} linhas (${accepted} novas coletas)`);
  }

  if (unmatchedCities.size > 0) {
    console.warn('[ANP] Municípios não mapeados ao IBGE:', Array.from(unmatchedCities));
  } else {
    console.log('[ANP] 100% dos municípios da ANP mapeados com código IBGE oficial!');
  }

  return {
    name: 'anp',
    itemIds: Object.values(ANP_PRODUCT_MAP),
    accepted: totalAccepted,
  };
}
