import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupBarcodeOrProduct } from '@/services/barcodeLookupService';
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

  it('resolves external retail EAN-13 via Open Food Facts Brasil', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
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
        ),
      ),
    );

    const res = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(res.status).toBe('external-found');
    expect(res.isValidGtin).toBe(true);
    expect(res.externalProduct?.productName).toBe('Leite Condensado Moça');
  });

  it('handles not-found external GTIN and network failures gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 0 }), { status: 200 })),
    );
    const notFound = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(notFound.status).toBe('not-found');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Err', { status: 503 })));
    const errored = await lookupBarcodeOrProduct('7891000100103', CATALOG);
    expect(errored.status).toBe('error');
  });
});
