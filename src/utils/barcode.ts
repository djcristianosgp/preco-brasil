import type { CatalogItem } from '@/types/pricing';
import { normalizeSearchText } from '@/utils/formatters';

export function normalizeCode(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, '').trim();
}

export function detectCodeFormat(
  raw: string,
): 'EAN-8' | 'EAN-13' | 'GTIN-14' | 'ANP/NCM' | 'TEXTO' {
  const digitsOnly = raw.replace(/\D/g, '');
  if (!/^\d+$/.test(raw.trim())) {
    return 'TEXTO';
  }
  if (digitsOnly.length === 8) return 'EAN-8';
  if (digitsOnly.length === 13) return 'EAN-13';
  if (digitsOnly.length === 14) return 'GTIN-14';
  if (digitsOnly.length >= 6 && digitsOnly.length <= 12) return 'ANP/NCM';
  return 'TEXTO';
}

export function validateGtinCheckDigit(rawCode: string): boolean {
  const digits = rawCode.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(digits.length)) {
    return false;
  }
  const nums = digits.split('').map(Number);
  const checkDigit = nums[nums.length - 1];
  let sum = 0;
  for (let i = nums.length - 2, pos = 0; i >= 0; i -= 1, pos += 1) {
    const weight = pos % 2 === 0 ? 3 : 1;
    sum += nums[i] * weight;
  }
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

export function searchCatalogItems(items: CatalogItem[], query: string): CatalogItem[] {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const cleanCode = normalizeCode(trimmed);
  const normalizedQuery = normalizeSearchText(trimmed);

  // 1. Exact code match (ANP, NCM, or barcode) — eliminates ambiguity immediately
  const exactCodeMatches = items.filter((item) => {
    const codes = [item.anpCode, item.ncm, ...item.barcodes].map(normalizeCode);
    return codes.includes(cleanCode);
  });
  if (exactCodeMatches.length > 0) {
    return exactCodeMatches;
  }

  // 2. Prefix code match when query is numeric (>= 3 digits)
  if (/^\d{3,}$/.test(cleanCode)) {
    const prefixMatches = items.filter((item) => {
      const codes = [item.anpCode, item.ncm, ...item.barcodes].map(normalizeCode);
      return codes.some((c) => c.startsWith(cleanCode));
    });
    if (prefixMatches.length > 0) {
      return prefixMatches;
    }
  }

  // 3. Textual search over name, category, aliases and codes
  return items.filter((item) => {
    const haystack = [
      item.name,
      item.shortName,
      item.categoryLabel,
      item.anpCode,
      item.ncm,
      ...item.barcodes,
      ...item.aliases,
    ]
      .map(normalizeSearchText)
      .join(' ');
    return haystack.includes(normalizedQuery);
  });
}
