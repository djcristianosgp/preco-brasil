import { normalizeMunicipalityName } from '../anp-csv-parser.mjs';
import {
  STATE_CAPITALS_IBGE,
  fetchBufferWithRetry,
  parseBrNumber,
  upsertBucket,
} from '../common.mjs';

const DIEESE_URL = 'https://www.dieese.org.br/cesta/produto';

const DIEESE_ITEMS = [
  { prodCode: '1', tipoDado: '5', itemId: 'cesta-basica-total' },
  { prodCode: '5', tipoDado: '4', itemId: 'alimento-arroz' },
  { prodCode: '4', tipoDado: '4', itemId: 'alimento-feijao' },
  { prodCode: '2', tipoDado: '4', itemId: 'alimento-carne' },
  { prodCode: '3', tipoDado: '4', itemId: 'alimento-leite' },
  { prodCode: '10', tipoDado: '4', itemId: 'alimento-cafe' },
  { prodCode: '13', tipoDado: '4', itemId: 'alimento-oleo' },
  { prodCode: '12', tipoDado: '4', itemId: 'alimento-acucar' },
];

const EXTRA_DIEESE_CITIES = {
  MACAE: { uf: 'RJ', code: '3302403', name: 'Macaé' },
};

function stripTags(htmlFragment) {
  return htmlFragment
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDieeseHtmlTable(html) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells = [];
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      cells.push(stripTags(cellMatch[1]));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  return rows;
}

export async function runDieeseCestaConnector({ freshBuckets }) {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getUTCFullYear());
  const dataFinal = `${mm}${yyyy}`;

  console.log(`[DIEESE] Consultando Cesta Básica + 7 alimentos nas 27 capitais (01/2026–${mm}/${yyyy})...`);
  let accepted = 0;

  for (const cfg of DIEESE_ITEMS) {
    const body = new URLSearchParams({
      produtos: cfg.prodCode,
      cidades: '0',
      dataInicial: '012026',
      dataFinal,
      tipoDado: cfg.tipoDado,
    }).toString();

    const buf = await fetchBufferWithRetry(DIEESE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      timeoutMs: 30000,
    });

    const html = new TextDecoder('utf-8').decode(buf);
    const rows = parseDieeseHtmlTable(html);
    if (rows.length < 2) continue;

    const headerCities = rows[0].map((c) => {
      const norm = normalizeMunicipalityName(c);
      return STATE_CAPITALS_IBGE[norm] || EXTRA_DIEESE_CITIES[norm] || null;
    });

    for (let r = 1; r < rows.length; r += 1) {
      const cols = rows[r];
      const periodMatch = /^(\d{2})-(\d{4})$/.exec(cols[0] || '');
      if (!periodMatch) continue;
      const dateIso = `${periodMatch[2]}-${periodMatch[1]}-01`;

      for (let c = 1; c < cols.length && c < headerCities.length; c += 1) {
        const cityInfo = headerCities[c];
        if (!cityInfo) continue;
        const val = parseBrNumber(cols[c], { min: 0.5, max: 3000 });
        if (val === null) continue;

        accepted += 1;
        upsertBucket(freshBuckets.national, cfg.itemId, dateIso, val, 1, val, val);
        upsertBucket(
          freshBuckets.state,
          `${cfg.itemId}|${cityInfo.uf}`,
          dateIso,
          val,
          1,
          val,
          val,
        );
        upsertBucket(
          freshBuckets.city,
          `${cfg.itemId}|${cityInfo.uf}|${cityInfo.code}`,
          dateIso,
          val,
          1,
          val,
          val,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`  ✓ [DIEESE] ${accepted} cotações mensais processadas para 8 itens.`);
  return {
    name: 'dieese-cesta',
    itemIds: DIEESE_ITEMS.map((d) => d.itemId),
    accepted,
  };
}
