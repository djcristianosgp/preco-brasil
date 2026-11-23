import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDataCache,
  loadBrazilGeo,
  loadCatalog,
  loadItemHistory,
  loadLatestPrices,
  loadManifest,
  loadSnapshotsIndex,
  loadStateGeo,
  loadStateHistory,
} from '@/services/priceDataService';

describe('priceDataService', () => {
  afterEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('loads and caches static JSON resources', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('catalog.json')) {
        return new Response(
          JSON.stringify({
            items: [
              { id: 'etanol', priority: 2 },
              { id: 'gasolina-comum', priority: 1 },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes('snapshots/index.json')) {
        return new Response(JSON.stringify({ snapshots: [{ date: '2026-11-23' }] }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ ok: true, url }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const catalog = await loadCatalog();
    expect(catalog.map((c) => c.id)).toEqual(['gasolina-comum', 'etanol']);

    await loadManifest();
    await loadLatestPrices();
    await loadBrazilGeo();
    await loadBrazilGeo(); // cached
    await loadItemHistory('gasolina-comum');
    await loadStateHistory('sp');
    const snaps = await loadSnapshotsIndex();
    expect(snaps).toHaveLength(1);

    const geoCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('brazil-states.json'));
    expect(geoCalls).toHaveLength(1);
  });

  it('falls back to IBGE API when local state GeoJSON fails', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).startsWith('/geo/states/SP.json')) {
        return new Response('Not found', { status: 404 });
      }
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), {
        status: 200,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const geo = await loadStateGeo('sp', '35');
    expect(geo.type).toBe('FeatureCollection');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('servicodados.ibge.gov.br/api/v3/malhas/estados/35'),
      expect.any(Object),
    );
  });

  it('throws when local state GeoJSON fails without stateCode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Error', { status: 500 })));
    await expect(loadStateGeo('SP')).rejects.toThrow('Falha ao carregar recurso');
  });
});
