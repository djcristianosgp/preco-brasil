import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePriceExplorer } from '@/hooks/usePriceExplorer';
import { clearDataCache } from '@/services/priceDataService';
import {
  FIXTURE_BRAZIL_GEO,
  FIXTURE_CATALOG,
  FIXTURE_ITEM_HISTORY,
  FIXTURE_LATEST,
  FIXTURE_MANIFEST,
  FIXTURE_SNAPSHOTS,
  FIXTURE_SP_GEO,
  FIXTURE_STATE_HISTORY,
} from '@/test/fixtures';

function mockAllFetches() {
  return vi.fn().mockImplementation(async (url: string) => {
    const s = String(url);
    if (s.includes('manifest.json')) return new Response(JSON.stringify(FIXTURE_MANIFEST));
    if (s.includes('catalog.json')) return new Response(JSON.stringify({ items: FIXTURE_CATALOG }));
    if (s.includes('latest.json')) return new Response(JSON.stringify(FIXTURE_LATEST));
    if (s.includes('brazil-states.json')) return new Response(JSON.stringify(FIXTURE_BRAZIL_GEO));
    if (s.includes('geo/states/SP.json')) return new Response(JSON.stringify(FIXTURE_SP_GEO));
    if (s.includes('history/by-item/')) return new Response(JSON.stringify(FIXTURE_ITEM_HISTORY));
    if (s.includes('history/by-state/SP.json'))
      return new Response(JSON.stringify(FIXTURE_STATE_HISTORY));
    if (s.includes('snapshots/index.json'))
      return new Response(JSON.stringify({ snapshots: FIXTURE_SNAPSHOTS }));
    return new Response('Not found', { status: 404 });
  });
}

describe('usePriceExplorer', () => {
  afterEach(() => {
    clearDataCache();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('bootstraps data, navigates state -> city drilldown, and updates SEO/theme', async () => {
    vi.stubGlobal('fetch', mockAllFetches());

    const { result } = renderHook(() => usePriceExplorer());

    await waitFor(() => expect(result.current.loadingBootstrap).toBe(false));
    expect(result.current.manifest?.dataVersion).toBe('2026.11.23.1');
    expect(result.current.activeScopeMetric?.avg).toBe(6.49);
    expect(document.title).toContain('Brasil');

    act(() => {
      result.current.selectState('SP');
    });

    await waitFor(() => expect(result.current.stateGeo).not.toBeNull());
    expect(result.current.selectedStateSnapshot?.name).toBe('São Paulo');
    expect(result.current.activeScopeMetric?.avg).toBe(6.32);

    act(() => {
      result.current.selectCity('3550308', true);
    });
    expect(result.current.selectedCitySnapshot?.name).toBe('São Paulo');
    expect(result.current.drawerOpen).toBe(true);
    expect(result.current.activeScopeMetric?.avg).toBe(6.35);

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('handles bootstrap failure gracefully with error state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const { result } = renderHook(() => usePriceExplorer());

    await waitFor(() => expect(result.current.loadingBootstrap).toBe(false));
    expect(result.current.error).toContain('Não foi possível carregar');
  });
});
