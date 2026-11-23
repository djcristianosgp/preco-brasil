import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CmedResultCard } from '@/components/barcode/CmedResultCard';
import { NfceAuditPanel } from '@/components/barcode/NfceAuditPanel';
import { ScopeKpiStrip } from '@/components/details/ScopeKpiStrip';
import { CategoryTabs } from '@/components/items/CategoryTabs';
import type { CatalogItem, CmedProductResult, PriceMetric } from '@/types/pricing';

const MULTI_CATALOG: CatalogItem[] = [
  {
    id: 'gasolina-comum',
    name: 'Gasolina Comum',
    shortName: 'Gasolina',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    codeLabel: 'ANP 320102001',
    anpCode: '320102001',
    ncm: '27101259',
    barcodes: ['320102001'],
    aliases: ['gasolina'],
    sourceName: 'ANP',
    featured: true,
    priority: 1,
  },
  {
    id: 'energia-residencial-b1',
    name: 'Energia Elétrica B1',
    shortName: 'Energia B1',
    category: 'energia',
    categoryLabel: 'Energia & Gás',
    unit: 'R$/kWh',
    decimals: 3,
    cadence: 'monthly',
    geoLevel: 'city',
    codeLabel: 'ANEEL B1',
    anpCode: 'ANEEL-B1',
    ncm: '27160000',
    barcodes: ['27160000'],
    aliases: ['energia'],
    sourceName: 'ANEEL',
    featured: true,
    priority: 7,
  },
  {
    id: 'med-dorflex',
    name: 'Dorflex Gotas 20 mL',
    shortName: 'Dorflex',
    category: 'medicamentos',
    categoryLabel: 'Medicamentos',
    unit: 'R$/un',
    decimals: 2,
    cadence: 'regulated',
    geoLevel: 'state',
    codeLabel: 'EAN 7891058009458',
    anpCode: '7891058009458',
    ncm: '30049099',
    barcodes: ['7891058009458'],
    aliases: ['dorflex'],
    sourceName: 'ANVISA',
    featured: true,
    priority: 25,
  },
];

describe('CategoryTabs, CmedResultCard, NfceAuditPanel & ScopeKpiStrip variants', () => {
  it('renders CategoryTabs counts and invokes callback on selection', () => {
    const onSelectCategory = vi.fn();
    render(
      <CategoryTabs
        catalog={MULTI_CATALOG}
        selectedCategory="combustiveis"
        onSelectCategory={onSelectCategory}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Energia & Gás/i }));
    expect(onSelectCategory).toHaveBeenCalledWith('energia');
    fireEvent.click(screen.getByRole('button', { name: /Todos/i }));
    expect(onSelectCategory).toHaveBeenCalledWith('all');
  });

  it('renders CmedResultCard with UF-highlighted ICMS and national ceiling', () => {
    const prod: CmedProductResult = {
      ean: '7891058009458',
      productName: 'DORFLEX',
      substance: 'DIPIRONA + ORFENADRINA',
      presentation: 'GOTAS 20 ML',
      laboratory: 'OPELLA',
      tarja: 'Tarja Vermelha',
      pmcByIcms: { '17': 26.8, '18': 27.55, '20': 28.3, '22': 29.1, '23': 29.5 },
      pmcByUf: { SP: 27.55, RJ: 29.1 },
      minPmc: 26.8,
      maxPmc: 29.5,
    };

    const { rerender } = render(<CmedResultCard product={prod} selectedUf="SP" />);
    expect(screen.getByText(/Teto PMC em SP \(ICMS 18%\)/i)).toBeInTheDocument();

    rerender(<CmedResultCard product={prod} selectedUf={null} />);
    expect(screen.getByText(/Faixa Nacional PMC/i)).toBeInTheDocument();
  });

  it('parses NFC-e sample QR Code in NfceAuditPanel and builds submission link', () => {
    const onOpenCamera = vi.fn();
    render(<NfceAuditPanel onOpenCamera={onOpenCamera} />);

    fireEvent.click(screen.getByRole('button', { name: /Ler QR/i }));
    expect(onOpenCamera).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Exemplo/i }));
    expect(screen.getByText(/Chave NFC-e Íntegra/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir Consulta Pública SEFAZ SP/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Preço pago no cupom/i), {
      target: { value: '19,90' },
    });
    const submitLink = screen.getByRole('link', { name: /Submeter Preço Auditado/i });
    expect(submitLink).toHaveAttribute('href', expect.stringContaining('github.com/djcristianosgp/preco-brasil'));
  });

  it('renders ANEEL energy flag and CMED ICMS KPI cards in ScopeKpiStrip', () => {
    const metric: PriceMetric = {
      avg: 0.742,
      min: 0.61,
      max: 0.92,
      samples: 5510,
      previousAvg: 0.73,
      changePct: 1.64,
      lastDate: '2026-11-01',
    };

    const { rerender } = render(
      <ScopeKpiStrip
        item={MULTI_CATALOG[1]}
        metric={metric}
        scopeLabel="Brasil"
        energyFlag={{
          month: '2026-11-01',
          name: 'Verde',
          additionalPerMwh: 0,
          additionalPerKwh: 0,
        }}
      />,
    );
    expect(screen.getByText(/Bandeira Verde/i)).toBeInTheDocument();

    rerender(
      <ScopeKpiStrip item={MULTI_CATALOG[2]} metric={metric} scopeLabel="São Paulo (SP)" selectedUf="SP" />,
    );
    expect(screen.getByText(/ICMS 18%/i)).toBeInTheDocument();
  });
});
