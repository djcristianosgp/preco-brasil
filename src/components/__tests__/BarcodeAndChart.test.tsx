import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodeSearchPanel } from '@/components/barcode/BarcodeSearchPanel';
import { PriceEvolutionChart } from '@/components/charts/PriceEvolutionChart';
import { clearDataCache } from '@/services/priceDataService';
import { FIXTURE_CATALOG, FIXTURE_ITEM_HISTORY, FIXTURE_LATEST } from '@/test/fixtures';

describe('BarcodeSearchPanel & PriceEvolutionChart', () => {
  afterEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('searches catalog by ANP code, sharded CMED, external Open Food Facts, and switches to NFC-e tab', async () => {
    const onSelectCatalogItem = vi.fn();
    const onOpenCamera = vi.fn();

    render(
      <BarcodeSearchPanel
        catalog={FIXTURE_CATALOG}
        metricsMap={FIXTURE_LATEST.national}
        scopeLabel="Brasil"
        selectedUf="SP"
        onSelectCatalogItem={onSelectCatalogItem}
        onOpenCamera={onOpenCamera}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Escanear/i }));
    expect(onOpenCamera).toHaveBeenCalled();

    // Quick sample ANP code
    fireEvent.click(screen.getByRole('button', { name: /Gasolina \(ANP 320102001\)/i }));
    await waitFor(() => expect(screen.getByText(/Item localizado no catálogo oficial/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Ver no mapa/i }));
    expect(onSelectCatalogItem).toHaveBeenCalledWith('gasolina-comum');

    // Local sharded CMED + external retail EAN-13
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('/data/cmed/14.json')) {
          return new Response(
            JSON.stringify({
              '7898075310314': {
                p: 'DORFEBRIL',
                s: 'DIPIRONA MONOIDRATADA',
                a: '500 MG/ML 10 ML',
                l: '1FARMA',
                t: 'MIP',
                pmc: [9.85, 9.9, 9.97, 10.1, 10.15, 10.21, 10.3, 10.35, 10.48, 10.55, 10.65],
              },
            }),
            { status: 200 },
          );
        }
        if (String(url).includes('/data/cmed/')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            status: 1,
            product: {
              code: '7891000100103',
              product_name_pt: 'Leite Condensado Moça',
              brands: 'Nestlé',
              quantity: '395g',
            },
          }),
          { status: 200 },
        );
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Dipirona Gotas/i }));
    await waitFor(() => expect(screen.getByText('DORFEBRIL')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Digite EAN-13, ANP ou NCM/i), {
      target: { value: '7891000100103' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));
    await waitFor(() => expect(screen.getByText('Leite Condensado Moça')).toBeInTheDocument());

    // Switch to NFC-e tab
    fireEvent.click(screen.getByRole('button', { name: /Cupom NFC-e/i }));
    expect(screen.getByLabelText(/URL do QR Code ou chave de acesso NFC-e/i)).toBeInTheDocument();
  });

  it('renders daily evolution chart controls, dollar PTAX overlay toggle, and recent dates table', () => {
    const onRangeChange = vi.fn();
    const onSeriesModeChange = vi.fn();
    const onToggleDollar = vi.fn();

    render(
      <PriceEvolutionChart
        item={FIXTURE_CATALOG[0]}
        series={FIXTURE_ITEM_HISTORY.national}
        scopeLabel="Brasil"
        nationalAvg={6.49}
        range="30d"
        seriesMode="avg7d"
        loading={false}
        dollarPoints={[{ date: '2026-11-11', rate: 5.95 }]}
        showDollarOverlay={true}
        onToggleDollarOverlay={onToggleDollar}
        onRangeChange={onRangeChange}
        onSeriesModeChange={onSeriesModeChange}
      />,
    );

    expect(screen.getByText(/Evolução Diária · Gasolina/i)).toBeInTheDocument();
    expect(screen.getByText('13/11/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dólar PTAX/i }));
    expect(onToggleDollar).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '90D' }));
    expect(onRangeChange).toHaveBeenCalledWith('90d');

    fireEvent.click(screen.getByRole('button', { name: /Dia exato/i }));
    expect(onSeriesModeChange).toHaveBeenCalledWith('daily');

    fireEvent.click(screen.getByRole('button', { name: /Média 7d/i }));
    expect(onSeriesModeChange).toHaveBeenCalledWith('avg7d');
  });

  it('renders empty and loading states on PriceEvolutionChart', () => {
    const { rerender } = render(
      <PriceEvolutionChart
        item={FIXTURE_CATALOG[0]}
        series={[]}
        scopeLabel="Acre"
        range="7d"
        seriesMode="avg7d"
        loading={true}
        onRangeChange={vi.fn()}
        onSeriesModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Carregando série histórica diária/i)).toBeInTheDocument();

    rerender(
      <PriceEvolutionChart
        item={FIXTURE_CATALOG[0]}
        series={[]}
        scopeLabel="Acre"
        range="7d"
        seriesMode="avg7d"
        loading={false}
        onRangeChange={vi.fn()}
        onSeriesModeChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Não há histórico diário suficiente/i)).toBeInTheDocument();
  });
});
