import { fetchBufferWithRetry, parseBrNumber, upsertBucket } from '../common.mjs';

const SINAPI_URL =
  'https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/-10/variaveis/48|2119|2120?localidades=N1[all]|N3[all]';

const SINAPI_VAR_MAP = {
  '48': 'sinapi-custo-m2',
  '2119': 'sinapi-materiais-m2',
  '2120': 'sinapi-mao-obra-m2',
};

export async function runIbgeSinapiConnector({ stateMeta, freshBuckets }) {
  console.log('[IBGE/SINAPI] Consultando Agregado 2296 (Custo m², Materiais, Mão de Obra)...');
  const buf = await fetchBufferWithRetry(SINAPI_URL, { timeoutMs: 45000 });
  const payload = JSON.parse(new TextDecoder('utf-8').decode(buf));

  const codeToUf = new Map();
  for (const st of stateMeta.values()) {
    codeToUf.set(String(st.code), st.uf);
  }

  let accepted = 0;
  for (const variable of payload) {
    const itemId = SINAPI_VAR_MAP[String(variable.id)];
    if (!itemId) continue;

    for (const resultado of variable.resultados || []) {
      for (const s of resultado.series || []) {
        const nivelId = s.localidade?.nivel?.id;
        const locId = String(s.localidade?.id || '');
        const uf = nivelId === 'N3' ? codeToUf.get(locId) : null;
        const isNational = nivelId === 'N1' && locId === '1';
        if (!isNational && !uf) continue;

        for (const [period, rawVal] of Object.entries(s.serie || {})) {
          if (!/^2026\d{2}$/.test(period)) continue;
          const val = parseBrNumber(rawVal, { min: 10, max: 50000 });
          if (val === null) continue;
          const dateIso = `${period.slice(0, 4)}-${period.slice(4, 6)}-01`;
          accepted += 1;

          if (isNational) {
            upsertBucket(freshBuckets.national, itemId, dateIso, val, 1, val, val);
          } else if (uf) {
            upsertBucket(freshBuckets.state, `${itemId}|${uf}`, dateIso, val, 1, val, val);
          }
        }
      }
    }
  }

  console.log(`  ✓ [IBGE/SINAPI] ${accepted} séries mensais de 2026 carregadas (Brasil + 27 UFs).`);

  return {
    name: 'ibge-sinapi',
    itemIds: Object.values(SINAPI_VAR_MAP),
    accepted,
  };
}
