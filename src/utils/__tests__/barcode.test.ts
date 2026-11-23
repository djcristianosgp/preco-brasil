import { describe, expect, it } from 'vitest';
import type { CatalogItem } from '@/types/pricing';
import {
  detectCodeFormat,
  normalizeCode,
  searchCatalogItems,
  validateGtinCheckDigit,
} from '@/utils/barcode';

const MOCK_CATALOG: CatalogItem[] = [
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
    barcodes: ['320102001', '27101259', '7890003201027'],
    aliases: ['gasolina', 'combustivel'],
    sourceName: 'ANP',
    featured: true,
    priority: 1,
  },
  {
    id: 'etanol',
    name: 'Etanol Hidratado',
    shortName: 'Etanol',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '810101001',
    ncm: '22071090',
    barcodes: ['810101001', '22071090', '7890008101018'],
    aliases: ['alcool', 'etanol'],
    sourceName: 'ANP',
    featured: true,
    priority: 2,
  },
];

describe('barcode utilities', () => {
  it('normalizes codes and detects formats accurately', () => {
    expect(normalizeCode('2710.12.59')).toBe('27101259');
    expect(detectCodeFormat('7891000100103')).toBe('EAN-13');
    expect(detectCodeFormat('12345678')).toBe('EAN-8');
    expect(detectCodeFormat('12345678901234')).toBe('GTIN-14');
    expect(detectCodeFormat('320102001')).toBe('ANP/NCM');
    expect(detectCodeFormat('gasolina')).toBe('TEXTO');
    expect(detectCodeFormat('123')).toBe('TEXTO');
  });

  it('validates GS1 Mod-10 check digits for EAN-8 and EAN-13', () => {
    expect(validateGtinCheckDigit('7891000100103')).toBe(true);
    expect(validateGtinCheckDigit('7891000100104')).toBe(false);
    expect(validateGtinCheckDigit('78910003')).toBe(true);
    expect(validateGtinCheckDigit('78910009')).toBe(false);
    expect(validateGtinCheckDigit('123')).toBe(false);
  });

  it('resolves exact barcode/ANP matches without ambiguity and supports text search', () => {
    expect(searchCatalogItems(MOCK_CATALOG, '')).toHaveLength(2);
    expect(searchCatalogItems(MOCK_CATALOG, '320102001').map((i) => i.id)).toEqual([
      'gasolina-comum',
    ]);
    expect(searchCatalogItems(MOCK_CATALOG, '810101').map((i) => i.id)).toEqual(['etanol']);
    expect(searchCatalogItems(MOCK_CATALOG, 'álcool').map((i) => i.id)).toEqual(['etanol']);
    expect(searchCatalogItems(MOCK_CATALOG, 'inexistente')).toEqual([]);
  });
});
