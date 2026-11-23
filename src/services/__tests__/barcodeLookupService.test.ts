import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupBarcodeOrProduct } from '@/services/barcodeLookupService';
import { clearDataCache } from '@/services/priceDataService';
import type { CatalogItem } from '@/types/pricing';

const CATALOG: CatalogItem[] = [
  {
    id: 'gasolina-comum',
    name: 'Gasolina Comum',
    shortName: 'Gasolina',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '320102001',
    ncm: '27101259',
    barcodes: ['320102001', '27101259'],
    aliases: ['gasolina'],
    sourceName: 'ANP',
    featured: true,
    priority: 1,
  },
];

describe('barcodeLookupService', () => {
  afterEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('returns full catalog when query is empty', async () => {
    const res = await lookupBarcodeOrProduct('  ', CATALOG);
    expect(res.status).toBe('catalog-match');
    expect(res.catalogMatches).toHaveLength(1);
  });

  it('returns exact catalog match for ANP code without calling external API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await lookupBarcodeOrProduct('320102001', CATALOG);
    expect(res.status).toBe('catalog-match');
    expect(res.catalogMatches[0].id).toBe('gasolina-comum');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves local sharded ANVISA/CMED pharmacy EAN-13 offline without calling Open Food Facts', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/data/cmed/14.json')) {
        return new Response(
          JSON.stringify({
            '7898075310314': {
              p: 'DORFEBRIL',
              s: 'DIPIRONA MONOIDRATADA',
              a: '500 MG/ML SOL OR 10 ML',
              l: '1FARMA',
              t: 'Isento de Prescrição',
              pmc: [9.85, 9.9, 9.97, 10.1, 10.15, 10.21, 10.3, 10.35, 10.48, 10.55, 10.65],
            },
          }),
          { status: 200 },
        );
      }
      return new Response('Unexpected URL', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await lookupBarcodeOrProduct('7898075310314', CATALOG);
    expect(res.status).toBe('cmed-found');
    expect(res.cmedProduct?.productName).toBe('DORFEBRIL');
    expect(res.cmedProduct?.pmcByUf.SP).toBe(9.97);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolves external retail EAN-13 via Open Food Facts Brasil when absent from CMED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
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
              quantity: '395 g',
              categories: 'Laticínios',
              image_front_small_url: 'https://example.com/moca.jpg',
            },
          }),
          { status: 200 },
        );
      }),
    );

    const res = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(res.status).toBe('external-found');
    expect(res.isValidGtin).toBe(true);
    expect(res.externalProduct?.productName).toBe('Leite Condensado Moça');
  });

  it('handles not-found external GTIN and network failures gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('/data/cmed/')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response(JSON.stringify({ status: 0 }), { status: 200 });
      }),
    );
    const notFound = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(notFound.status).toBe('not-found');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('/data/cmed/')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response('Err', { status: 503 });
      }),
    );
    const errored = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(errored.status).toBe('error');
  });
});
