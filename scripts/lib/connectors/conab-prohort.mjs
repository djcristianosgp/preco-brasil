import { fetchResponseWithRetry, upsertBucket } from '../common.mjs';

const PROHORT_DAILY_URL =
  'https://portaldeinformacoes.conab.gov.br/downloads/arquivos/ProhortDiario.txt';

const PROHORT_PRODUCT_MAP = {
  TOMATE: 'ceasa-tomate',
  BATATA: 'ceasa-batata',
  CEBOLA: 'ceasa-cebola',
  'BANANA PRATA': 'ceasa-banana-prata',
  'LARANJA PERA': 'ceasa-laranja-pera',
  CENOURA: 'ceasa-cenoura',
  MACA: 'ceasa-maca',
  ALHO: 'ceasa-alho',
};

export async function runConabProhortConnector({
  fullYear,
  cityNameByCode,
  freshBuckets,
}) {
  const minDateSlash = fullYear ? '2026/01/01' : '2026/07/01';
  console.log(`[CONAB/PROHORT] Fazendo streaming de ProhortDiario.txt (a partir de ${minDateSlash})...`);

  const response = await fetchResponseWithRetry(PROHORT_DAILY_URL, { timeoutMs: 120000 });
  if (!response.body) {
    throw new Error('Stream indisponível em ProhortDiario.txt');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('latin1');
  let buffer = '';
  let isHeader = true;
  let accepted = 0;
  let total2026 = 0;

  const processLine = (line) => {
    if (!line) return;
    if (isHeader) {
      isHeader = false;
      return;
    }
    const parts = line.split(';');
    if (parts.length < 8) return;

    const rawDate = parts[6].trim();
    if (!rawDate.startsWith('2026/')) return;
    const dateSlash = rawDate.slice(0, 10);
    if (dateSlash < minDateSlash) return;

    total2026 += 1;
    const prod = parts[4].trim().toUpperCase();
    const itemId = PROHORT_PRODUCT_MAP[prod];
    if (!itemId) return;

    const unit = parts[5].trim().toUpperCase();
    if (unit !== 'KG') return;

    const cityCode = parts[1].trim();
    const ibgeCity = cityNameByCode.get(cityCode);
    const uf = ibgeCity?.uf || parts[2].trim().toUpperCase();
    if (uf.length !== 2) return;

    const priceStr = parts[7].trim().replace(',', '.');
    const price = Number(priceStr);
    if (!Number.isFinite(price) || price <= 0 || price > 250) return;

    const dateIso = dateSlash.replace(/\//g, '-');
    accepted += 1;

    upsertBucket(freshBuckets.national, itemId, dateIso, price, 1, price, price);
    upsertBucket(freshBuckets.state, `${itemId}|${uf}`, dateIso, price, 1, price, price);
    if (ibgeCity) {
      upsertBucket(
        freshBuckets.city,
        `${itemId}|${uf}|${ibgeCity.code}`,
        dateIso,
        price,
        1,
        price,
        price,
      );
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf('\n');
    while (nl !== -1) {
      processLine(buffer.slice(0, nl).replace(/\r$/, ''));
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf('\n');
    }
  }
  if (buffer.trim()) {
    processLine(buffer.replace(/\r$/, ''));
  }

  console.log(
    `  ✓ [CONAB/PROHORT] ${accepted.toLocaleString('pt-BR')} cotações diárias de CEASAs aceitas (de ${total2026.toLocaleString('pt-BR')} registros 2026).`,
  );

  return {
    name: 'conab-prohort',
    itemIds: Object.values(PROHORT_PRODUCT_MAP),
    accepted,
  };
}
