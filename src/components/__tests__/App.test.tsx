import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
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

describe('App integration flow', () => {
  afterEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('loads national map, drills into SP -> São Paulo city drawer, and opens methodology modal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        const s = String(url);
        if (s.includes('manifest.json')) return new Response(JSON.stringify(FIXTURE_MANIFEST));
        if (s.includes('catalog.json')) return new Response(JSON.stringify({ items: FIXTURE_CATALOG }));
        if (s.includes('latest.json')) return new Response(JSON.stringify(FIXTURE_LATEST));
        if (s.includes('brazil-states.json')) return new Response(JSON.stringify(FIXTURE_BRAZIL_GEO));
        if (s.includes('geo/states/SP.json')) return new Response(JSON.stringify(FIXTURE_SP_GEO));
        if (s.includes('history/by-item/')) return new Response(JSON.stringify(FIXTURE_ITEM_HISTORY));
        if (s.includes('history/by-state/SP.json'))
          return new Response(JSON.stringify(FIXTURE_STATE_HISTORY));
        if (s.includes('latest/by-state/SP.json'))
          return new Response(
            JSON.stringify({ uf: 'SP', name: 'São Paulo', cities: FIXTURE_LATEST.states.SP.cities }),
          );
        if (s.includes('macro/dolar-ptax.json'))
          return new Response(
            JSON.stringify({
              seriesId: 1,
              name: 'Dólar PTAX',
              sourceName: 'BCB',
              unit: 'R$/USD',
              latestDate: '2026-11-13',
              latestRate: 5.95,
              changePct: 0.1,
              points: [{ date: '2026-11-13', rate: 5.95 }],
            }),
          );
        if (s.includes('snapshots/index.json'))
          return new Response(JSON.stringify({ snapshots: FIXTURE_SNAPSHOTS }));
        return new Response('Not found', { status: 404 });
      }),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText('v2026.11.23.1')).toBeInTheDocument());
    expect(screen.getByText(/Paridade Etanol/i)).toBeInTheDocument();

    // Header controls: search, clear, theme toggle, scanner modal
    const headerSearch = screen.getByLabelText(/Buscar item ou código de barras/i);
    fireEvent.change(headerSearch, { target: { value: 'etanol' } });
    fireEvent.click(screen.getByRole('button', { name: /Limpar busca/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ativar tema escuro/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Open Methodology modal
    fireEvent.click(screen.getByRole('button', { name: /Metodologia e versões diárias/i }));
    expect(screen.getByText(/Arquitetura de Dados & Versões Diárias/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fechar metodologia/i }));

    // Click SP state on Brazil map
    fireEvent.click(screen.getByRole('button', { name: /São Paulo: R\$/i }));
    await waitFor(() => expect(screen.getByText(/Municípios em SP/i)).toBeInTheDocument());

    // Click city in ranking to open EntityDetailDrawer
    const cityButton = screen.getByRole('button', { name: /São Paulo.*520 coletas/i });
    fireEvent.click(cityButton);
    const drawer = screen.getByRole('dialog', { name: /Detalhes de preços em São Paulo \(SP\)/i });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText(/Comparativo vs Brasil/i)).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: /Etanol Hidratado/i }));

    fireEvent.click(screen.getByRole('button', { name: /Abrir Gráfico de Evolução Diária/i }));
    expect(screen.queryByRole('dialog', { name: /Detalhes de preços/i })).not.toBeInTheDocument();

    // Mobile bottom nav switching & header barcode button
    const mobileNav = screen.getByRole('navigation', { name: /Navegação principal mobile/i });
    fireEvent.click(within(mobileNav).getByRole('button', { name: /^Código$/i }));
    fireEvent.click(within(mobileNav).getByRole('button', { name: /^Itens$/i }));
    fireEvent.click(within(mobileNav).getByRole('button', { name: /^Mapa$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Buscar por código de barras/i }));
    const header = screen.getByRole('banner');
    fireEvent.click(within(header).getByRole('button', { name: /^Código$/i }));
    expect(screen.getByRole('dialog', { name: /Leitor de código de barras/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fechar leitor/i }));
  }, 15000);
});
