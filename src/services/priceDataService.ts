import type {
  CatalogItem,
  CmedShardRecord,
  DataManifest,
  GeoAreaFeatureCollection,
  ItemHistoryPayload,
  LatestPricesPayload,
  MacroDollarPayload,
  SnapshotIndexEntry,
  StateHistoryPayload,
  StateLatestPayload,
} from '@/types/pricing';
import { logger } from '@/utils/logger';

const memoryCache = new Map<string, unknown>();

async function fetchJson<T>(url: string, useCache = true): Promise<T> {
  if (useCache && memoryCache.has(url)) {
    return memoryCache.get(url) as T;
  }
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Falha ao carregar recurso (${response.status}): ${url}`);
  }
  const data = (await response.json()) as T;
  if (useCache) {
    memoryCache.set(url, data);
  }
  return data;
}

export function clearDataCache(): void {
  memoryCache.clear();
}

export async function loadManifest(): Promise<DataManifest> {
  return fetchJson<DataManifest>('/data/manifest.json', false);
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  const payload = await fetchJson<{ items: CatalogItem[] }>('/data/catalog.json', false);
  return [...payload.items].sort((a, b) => a.priority - b.priority);
}

export async function loadLatestPrices(): Promise<LatestPricesPayload> {
  return fetchJson<LatestPricesPayload>('/data/latest.json', false);
}

export async function loadStateLatest(uf: string): Promise<StateLatestPayload> {
  const upperUf = uf.toUpperCase();
  return fetchJson<StateLatestPayload>(`/data/latest/by-state/${upperUf}.json`, true);
}

export async function loadDollarPtax(): Promise<MacroDollarPayload | null> {
  try {
    return await fetchJson<MacroDollarPayload>('/data/macro/dolar-ptax.json', true);
  } catch (err) {
    logger.warn('Série do Dólar PTAX indisponível', err);
    return null;
  }
}

export async function loadCmedShard(
  suffix2: string,
): Promise<Record<string, CmedShardRecord>> {
  try {
    return await fetchJson<Record<string, CmedShardRecord>>(
      `/data/cmed/${suffix2}.json`,
      true,
    );
  } catch {
    return {};
  }
}

export async function loadBrazilGeo(): Promise<GeoAreaFeatureCollection> {
  return fetchJson<GeoAreaFeatureCollection>('/geo/brazil-states.json?v=2', true);
}

export async function loadStateGeo(
  uf: string,
  stateCode?: string,
): Promise<GeoAreaFeatureCollection> {
  const upperUf = uf.toUpperCase();
  try {
    return await fetchJson<GeoAreaFeatureCollection>(`/geo/states/${upperUf}.json?v=2`, true);
  } catch (localError) {
    if (!stateCode) {
      logger.error('Falha ao carregar malha estadual local', localError);
      throw localError;
    }
    logger.warn(`Fallback IBGE direto para malha de ${upperUf}`, localError);
    const fallbackUrl = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${stateCode}?intrarregiao=municipio&qualidade=minima&formato=application/vnd.geo+json`;
    return fetchJson<GeoAreaFeatureCollection>(fallbackUrl, true);
  }
}

export async function loadItemHistory(itemId: string): Promise<ItemHistoryPayload> {
  return fetchJson<ItemHistoryPayload>(`/data/history/by-item/${itemId}.json`, true);
}

export async function loadStateHistory(uf: string): Promise<StateHistoryPayload> {
  return fetchJson<StateHistoryPayload>(`/data/history/by-state/${uf.toUpperCase()}.json`, true);
}

export async function loadSnapshotsIndex(): Promise<SnapshotIndexEntry[]> {
  const payload = await fetchJson<{ snapshots: SnapshotIndexEntry[] }>(
    '/data/snapshots/index.json',
    true,
  );
  return payload.snapshots;
}
