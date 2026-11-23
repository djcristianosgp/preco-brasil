export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PrecoBrasilBot/1.0)',
};

export const CMED_ICMS_KEYS = [
  '17',
  '17,5',
  '18',
  '19',
  '19,5',
  '20',
  '20,5',
  '21',
  '22',
  '22,5',
  '23',
];

export const UF_ICMS_2026 = {
  AC: '19',
  AL: '20',
  AM: '20',
  AP: '18',
  BA: '20,5',
  CE: '20',
  DF: '20',
  ES: '17',
  GO: '19',
  MA: '23',
  MG: '18',
  MS: '17',
  MT: '17',
  PA: '19',
  PB: '20',
  PE: '20,5',
  PI: '22,5',
  PR: '19,5',
  RJ: '22',
  RN: '20',
  RO: '19,5',
  RR: '20',
  RS: '17',
  SC: '17',
  SE: '20',
  SP: '18',
  TO: '20',
};

export const STATE_CAPITALS_IBGE = {
  'RIO BRANCO': { uf: 'AC', code: '1200401', name: 'Rio Branco' },
  MACEIO: { uf: 'AL', code: '2704302', name: 'Maceió' },
  MACAPA: { uf: 'AP', code: '1600303', name: 'Macapá' },
  MANAUS: { uf: 'AM', code: '1302603', name: 'Manaus' },
  SALVADOR: { uf: 'BA', code: '2927408', name: 'Salvador' },
  FORTALEZA: { uf: 'CE', code: '2304400', name: 'Fortaleza' },
  BRASILIA: { uf: 'DF', code: '5300108', name: 'Brasília' },
  VITORIA: { uf: 'ES', code: '3205309', name: 'Vitória' },
  GOIANIA: { uf: 'GO', code: '5208707', name: 'Goiânia' },
  'SAO LUIS': { uf: 'MA', code: '2111300', name: 'São Luís' },
  'BELO HORIZONTE': { uf: 'MG', code: '3106200', name: 'Belo Horizonte' },
  'CAMPO GRANDE': { uf: 'MS', code: '5002704', name: 'Campo Grande' },
  CUIABA: { uf: 'MT', code: '5103403', name: 'Cuiabá' },
  BELEM: { uf: 'PA', code: '1501402', name: 'Belém' },
  'JOAO PESSOA': { uf: 'PB', code: '2507507', name: 'João Pessoa' },
  RECIFE: { uf: 'PE', code: '2611606', name: 'Recife' },
  TERESINA: { uf: 'PI', code: '2211001', name: 'Teresina' },
  CURITIBA: { uf: 'PR', code: '4106902', name: 'Curitiba' },
  'RIO DE JANEIRO': { uf: 'RJ', code: '3304557', name: 'Rio de Janeiro' },
  NATAL: { uf: 'RN', code: '2408102', name: 'Natal' },
  'PORTO VELHO': { uf: 'RO', code: '1100205', name: 'Porto Velho' },
  'BOA VISTA': { uf: 'RR', code: '1400100', name: 'Boa Vista' },
  'PORTO ALEGRE': { uf: 'RS', code: '4314902', name: 'Porto Alegre' },
  FLORIANOPOLIS: { uf: 'SC', code: '4205407', name: 'Florianópolis' },
  ARACAJU: { uf: 'SE', code: '2800308', name: 'Aracaju' },
  'SAO PAULO': { uf: 'SP', code: '3550308', name: 'São Paulo' },
  PALMAS: { uf: 'TO', code: '1721000', name: 'Palmas' },
};

export function round3(value) {
  return Math.round(value * 1000) / 1000;
}

export function round4(value) {
  return Math.round(value * 10000) / 10000;
}

export function addDaysIso(isoDate, deltaDays) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function parseBrNumber(raw, { min = 0.0001, max = 100000 } = {}) {
  const s = String(raw || '').trim();
  if (!s || s === '-' || s === '...') return null;
  let normalized = s;
  if (s.includes(',') && s.includes('.')) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.');
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
}

export async function fetchResponseWithRetry(
  url,
  { retries = 3, method = 'GET', headers = {}, body, timeoutMs = 45000 } = {},
) {
  let lastError;
  const safeMethod = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase();
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: safeMethod,
        headers: { ...HEADERS, ...headers },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} em ${url}`);
      }
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

export async function fetchBufferWithRetry(url, options = {}) {
  const response = await fetchResponseWithRetry(url, options);
  return response.arrayBuffer();
}

export function createBuckets() {
  return {
    national: new Map(), // itemId -> Map(date -> { sum, count, min, max })
    state: new Map(), // `${itemId}|${uf}` -> Map(date -> { sum, count, min, max })
    city: new Map(), // `${itemId}|${uf}|${cityCode}` -> Map(date -> { sum, count, min, max })
  };
}

export function upsertBucket(bucketMap, key, date, sum, count, min, max) {
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

export function setBucketDate(bucketMap, key, date, sum, count, min, max) {
  let dateMap = bucketMap.get(key);
  if (!dateMap) {
    dateMap = new Map();
    bucketMap.set(key, dateMap);
  }
  dateMap.set(date, { sum, count, min, max });
}
