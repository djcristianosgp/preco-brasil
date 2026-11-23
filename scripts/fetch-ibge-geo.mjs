import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoArea } from 'd3-geo';
import { normalizeMunicipalityName } from './lib/anp-csv-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const GEO_DIR = path.join(ROOT_DIR, 'public', 'geo');
const STATES_GEO_DIR = path.join(GEO_DIR, 'states');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; PrecoBrasilBot/1.0)',
  Accept: 'application/json',
};

async function fetchJsonWithRetry(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} em ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
}

function roundCoordinate(value) {
  return Math.round(value * 10000) / 10000;
}

function roundGeometryCoords(coords) {
  if (!Array.isArray(coords)) return coords;
  if (typeof coords[0] === 'number') {
    return [roundCoordinate(coords[0]), roundCoordinate(coords[1])];
  }
  return coords.map(roundGeometryCoords);
}

function rewindRings(rings) {
  const TWO_PI = 2 * Math.PI;
  return rings.map((ring, idx) => {
    const area = geoArea({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
    const isHole = idx > 0;
    const needsFlip = isHole ? area < TWO_PI : area > TWO_PI;
    return needsFlip ? [...ring].reverse() : ring;
  });
}

function rewindGeometry(geometry) {
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: rewindRings(geometry.coordinates) };
  }
  if (geometry.type === 'MultiPolygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(rewindRings) };
  }
  return geometry;
}

function simplifyGeoJson(geojson, enrichFn) {
  return {
    type: 'FeatureCollection',
    features: (geojson.features || []).map((feature) => ({
      type: 'Feature',
      properties: enrichFn(feature.properties || {}),
      geometry: rewindGeometry({
        type: feature.geometry.type,
        coordinates: roundGeometryCoords(feature.geometry.coordinates),
      }),
    })),
  };
}

function extractMunicipalityUf(mun) {
  return (
    mun?.microrregiao?.mesorregiao?.UF?.sigla ||
    mun?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ||
    null
  );
}

async function main() {
  await fs.mkdir(STATES_GEO_DIR, { recursive: true });

  console.log('[IBGE] Baixando lista oficial de estados e municípios...');
  const [statesRaw, municipalitiesRaw] = await Promise.all([
    fetchJsonWithRetry('https://servicodados.ibge.gov.br/api/v1/localidades/estados'),
    fetchJsonWithRetry('https://servicodados.ibge.gov.br/api/v1/localidades/municipios'),
  ]);

  const stateByCode = new Map();
  for (const st of statesRaw) {
    stateByCode.set(String(st.id), {
      code: String(st.id),
      uf: st.sigla,
      name: st.nome,
      region: st.regiao?.nome || '',
      regionUf: st.regiao?.sigla || '',
    });
  }

  const munByCode = new Map();
  const munIndex = [];
  for (const mun of municipalitiesRaw) {
    const code = String(mun.id);
    const uf = extractMunicipalityUf(mun);
    if (!uf) continue;
    const entry = {
      code,
      name: mun.nome,
      uf,
      normalized: normalizeMunicipalityName(mun.nome),
    };
    munByCode.set(code, entry);
    munIndex.push(entry);
  }

  await fs.writeFile(
    path.join(GEO_DIR, 'ibge-municipalities-index.json'),
    JSON.stringify(munIndex),
  );
  console.log(`[IBGE] Índice salvo com ${munIndex.length} municípios.`);

  console.log('[IBGE] Baixando malha nacional por UF...');
  const brazilRaw = await fetchJsonWithRetry(
    'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application/vnd.geo+json',
  );

  const brazilGeo = simplifyGeoJson(brazilRaw, (props) => {
    const code = String(props.codarea || props.code || '');
    const st = stateByCode.get(code);
    return {
      code,
      uf: st?.uf || code,
      name: st?.name || code,
      region: st?.region || '',
    };
  });

  await fs.writeFile(path.join(GEO_DIR, 'brazil-states.json'), JSON.stringify(brazilGeo));
  console.log(`[IBGE] Malha nacional salva (${brazilGeo.features.length} estados).`);

  const statesList = Array.from(stateByCode.values()).sort((a, b) => a.uf.localeCompare(b.uf));
  const batchSize = 4;
  for (let i = 0; i < statesList.length; i += batchSize) {
    const batch = statesList.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (st) => {
        const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${st.code}?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json`;
        const raw = await fetchJsonWithRetry(url);
        const simplified = simplifyGeoJson(raw, (props) => {
          const code = String(props.codarea || props.code || '');
          const mun = munByCode.get(code);
          return {
            code,
            name: mun?.name || code,
            uf: st.uf,
          };
        });
        await fs.writeFile(
          path.join(STATES_GEO_DIR, `${st.uf}.json`),
          JSON.stringify(simplified),
        );
        console.log(`  - ${st.uf}: ${simplified.features.length} municípios`);
      }),
    );
  }

  console.log('[IBGE] Concluído com sucesso.');
}

main().catch((err) => {
  console.error('[IBGE] Falha fatal:', err);
  process.exit(1);
});
