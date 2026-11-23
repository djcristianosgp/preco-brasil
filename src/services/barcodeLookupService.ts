import { loadCmedShard } from '@/services/priceDataService';
import type {
  BarcodeLookupResult,
  CatalogItem,
  CmedShardRecord,
  ExternalBarcodeProduct,
} from '@/types/pricing';
import {
  detectCodeFormat,
  normalizeCode,
  searchCatalogItems,
  validateGtinCheckDigit,
} from '@/utils/barcode';
import { expandCmedShardRecord } from '@/utils/cmedIcms';
import { logger } from '@/utils/logger';

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    code?: string;
    product_name?: string;
    product_name_pt?: string;
    brands?: string;
    quantity?: string;
    categories?: string;
    image_front_small_url?: string;
  };
}

function isValidCmedEntry(entry: CmedShardRecord | undefined): entry is CmedShardRecord {
  return Boolean(entry && typeof entry.p === 'string' && Array.isArray(entry.pmc));
}

export async function lookupBarcodeOrProduct(
  rawQuery: string,
  catalog: CatalogItem[],
  timeoutMs = 7000,
): Promise<BarcodeLookupResult> {
  const query = rawQuery.trim();
  const cleanCode = normalizeCode(query);
  const gtinFormat = detectCodeFormat(query);
  const isValidGtin = validateGtinCheckDigit(cleanCode);

  if (!query) {
    return {
      query: '',
      isValidGtin: false,
      gtinFormat: 'TEXTO',
      catalogMatches: catalog,
      cmedProduct: null,
      externalProduct: null,
      status: 'catalog-match',
      message: 'Exibindo todos os itens monitorados.',
    };
  }

  // 1. Exact/textual match on monitored catalog (ANP, NCM, featured CMED, DIEESE, PROHORT)
  const catalogMatches = searchCatalogItems(catalog, query);
  if (catalogMatches.length > 0 && (gtinFormat !== 'EAN-13' || catalogMatches.length === 1)) {
    const exactMatch = catalogMatches.length === 1;
    return {
      query,
      isValidGtin,
      gtinFormat,
      catalogMatches,
      cmedProduct: null,
      externalProduct: null,
      status: 'catalog-match',
      message: exactMatch
        ? `Item localizado no catálogo oficial: ${catalogMatches[0].name}.`
        : `${catalogMatches.length} itens encontrados na cesta monitorada.`,
    };
  }

  // 2. Local sharded ANVISA/CMED pharmacy EAN-13 index (~11.000 medicines)
  if (/^\d{13}$/.test(cleanCode)) {
    const shard = await loadCmedShard(cleanCode.slice(-2));
    const entry = shard[cleanCode];
    if (isValidCmedEntry(entry)) {
      const cmedProduct = expandCmedShardRecord(cleanCode, entry);
      return {
        query,
        isValidGtin,
        gtinFormat,
        catalogMatches,
        cmedProduct,
        externalProduct: null,
        status: 'cmed-found',
        message: `Medicamento localizado na tabela oficial ANVISA/CMED (PMC por UF disponível).`,
      };
    }
  }

  // 3. Live Open Food Facts Brasil v2 lookup for supermarket retail GTINs
  if (/^\d{8,14}$/.test(cleanCode)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://br.openfoodfacts.org/api/v2/product/${cleanCode}.json?fields=code,product_name,product_name_pt,brands,quantity,categories,image_front_small_url`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao consultar Open Food Facts Brasil`);
      }
      const data = (await response.json()) as OpenFoodFactsResponse;
      if (data.status === 1 && data.product) {
        const externalProduct: ExternalBarcodeProduct = {
          code: data.product.code || cleanCode,
          productName:
            data.product.product_name_pt ||
            data.product.product_name ||
            `Produto GTIN ${cleanCode}`,
          brands: data.product.brands || 'Marca não informada',
          quantity: data.product.quantity || 'Unidade padrão',
          categories: data.product.categories || 'Varejo / Supermercado',
          imageUrl: data.product.image_front_small_url,
          source: 'Open Food Facts Brasil (API v2)',
        };
        return {
          query,
          isValidGtin,
          gtinFormat,
          catalogMatches,
          cmedProduct: null,
          externalProduct,
          status: 'external-found',
          message:
            'Código de barras identificado na base nacional de varejo (pronto para auditar com cupom NFC-e).',
        };
      }
    } catch (error) {
      logger.warn(`Erro ao consultar GTIN ${cleanCode} no Open Food Facts`, error);
      return {
        query,
        isValidGtin,
        gtinFormat,
        catalogMatches,
        cmedProduct: null,
        externalProduct: null,
        status: 'error',
        message: isValidGtin
          ? 'GTIN matematicamente válido, mas não foi possível consultar a base externa no momento.'
          : 'Erro ao consultar código na base externa.',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    query,
    isValidGtin,
    gtinFormat,
    catalogMatches,
    cmedProduct: null,
    externalProduct: null,
    status: 'not-found',
    message: isValidGtin
      ? `Código ${gtinFormat} válido (${cleanCode}), ainda sem série histórica cadastrada neste observatório.`
      : 'Nenhum item encontrado com este código ou descrição.',
  };
}
