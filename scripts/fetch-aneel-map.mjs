import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchResponseWithRetry } from './lib/common.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const GEO_INDEX_PATH = path.join(ROOT_DIR, 'public', 'geo', 'ibge-municipalities-index.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'geo', 'aneel-municipality-distributors.json');

const INDQUAL_URL =
  'https://dadosabertos.aneel.gov.br/dataset/db9c9f60-b3b5-4504-9dfe-2637922d53ce/resource/3f841488-80a8-42f2-a6ca-e0c593b228de/download/indqual-municipio.csv';
const LIMITE_URL =
  'https://dadosabertos.aneel.gov.br/dataset/d5f0712e-62f6-4736-8dff-9991f10758a7/resource/fd69e1dd-fd66-4269-b60c-cc0b7eb221b4/download/indicadores-continuidade-coletivos-limite.csv';

function splitSemicolonLine(line) {
  return line.split(';').map((cell) => cell.replace(/^"|"$/g, '').trim());
}

async function streamSemicolonLines(url, onRow) {
  const response = await fetchResponseWithRetry(url, { timeoutMs: 120000 });
  if (!response.body) {
    throw new Error(`Resposta sem stream em ${url}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('latin1');
  let buffer = '';
  let header = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIdx = buffer.indexOf('\n');
    while (newlineIdx !== -1) {
      const rawLine = buffer.slice(0, newlineIdx).replace(/\r$/, '');
      buffer = buffer.slice(newlineIdx + 1);
      if (rawLine) {
        const cols = splitSemicolonLine(rawLine);
        if (!header) {
          header = cols;
        } else {
          onRow(cols, header);
        }
      }
      newlineIdx = buffer.indexOf('\n');
    }
  }
  if (buffer.trim()) {
    const cols = splitSemicolonLine(buffer.replace(/\r$/, ''));
    if (header) onRow(cols, header);
  }
}

export async function buildAneelMunicipalityMap() {
  console.log('[ANEEL-MAP] Carregando índice oficial do IBGE...');
  const ibgeRaw = JSON.parse(await fs.readFile(GEO_INDEX_PATH, 'utf-8'));
  const validCities = new Map();
  for (const m of ibgeRaw) {
    validCities.set(String(m.code), { uf: m.uf, name: m.name });
  }

  console.log('[ANEEL-MAP] Baixando indqual-municipio.csv...');
  const cityToConjs = new Map();
  await streamSemicolonLines(INDQUAL_URL, (cols, header) => {
    const idxConj = header.indexOf('IdeConjUnidConsumidoras');
    const idxMun = header.indexOf('CodMunicipio');
    const conj = cols[idxConj];
    const mun = cols[idxMun];
    if (!conj || !mun || !validCities.has(mun)) return;
    let set = cityToConjs.get(mun);
    if (!set) {
      set = new Set();
      cityToConjs.set(mun, set);
    }
    set.add(conj);
  });
  console.log(`[ANEEL-MAP] Municípios em indqual-municipio: ${cityToConjs.size}`);

  console.log('[ANEEL-MAP] Fazendo streaming de indicadores-continuidade-coletivos-limite.csv...');
  const conjToDist = new Map();
  await streamSemicolonLines(LIMITE_URL, (cols, header) => {
    const idxConj = header.findIndex((h) =>
      h === 'IdeConjUndConsumidoras' || h === 'IdeConjUnidConsumidoras',
    );
    const idxCnpj = header.indexOf('NumCNPJ');
    const idxSig = header.indexOf('SigAgente');
    const idxAno = header.indexOf('AnoLimiteQualidade');
    if (idxConj === -1 || idxCnpj === -1) return;
    const conj = cols[idxConj];
    const cnpj = (cols[idxCnpj] || '').replace(/\D/g, '').padStart(14, '0');
    const sigAgente = cols[idxSig] || '';
    const ano = cols[idxAno] || '';
    if (!conj || cnpj.length !== 14) return;
    const prev = conjToDist.get(conj);
    if (!prev || ano >= prev.ano) {
      conjToDist.set(conj, { cnpj, sigAgente, ano });
    }
  });
  console.log(`[ANEEL-MAP] Conjuntos elétricos mapeados: ${conjToDist.size}`);

  const municipalities = {};
  for (const [munCode, conjSet] of cityToConjs.entries()) {
    const counts = new Map();
    for (const conj of conjSet) {
      const dist = conjToDist.get(conj);
      if (!dist) continue;
      const existing = counts.get(dist.cnpj);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(dist.cnpj, { cnpj: dist.cnpj, sigAgente: dist.sigAgente, count: 1 });
      }
    }
    if (counts.size === 0) continue;
    const best = Array.from(counts.values()).sort((a, b) => b.count - a.count)[0];
    const ibgeInfo = validCities.get(munCode);
    municipalities[munCode] = {
      uf: ibgeInfo.uf,
      cnpj: best.cnpj,
      sigAgente: best.sigAgente,
    };
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mappedCount: Object.keys(municipalities).length,
    municipalities,
  };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload));
  console.log(`[ANEEL-MAP] Mapa salvo com ${payload.mappedCount} municípios IBGE -> distribuidora!`);
  return payload;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  buildAneelMunicipalityMap().catch((err) => {
    console.error('[ANEEL-MAP] Erro fatal:', err);
    process.exit(1);
  });
}
