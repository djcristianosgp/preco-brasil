import { describe, expect, it } from 'vitest';
import {
  calculateEthanolParity,
  formatBRL,
  formatDateBR,
  formatIntegerBR,
  formatShortDateBR,
  formatVariation,
  normalizeSearchText,
} from '@/utils/formatters';

describe('formatters', () => {
  it('formats BRL values with customizable decimals and handles invalid inputs', () => {
    expect(formatBRL(6.49)).toContain('6,49');
    expect(formatBRL(108.5, 2)).toContain('108,50');
    expect(formatBRL(6.491, 3)).toContain('6,491');
    expect(formatBRL(null)).toBe('—');
    expect(formatBRL(undefined)).toBe('—');
    expect(formatBRL(Number.NaN)).toBe('—');
  });

  it('formats percentage variations with sign and comma', () => {
    expect(formatVariation(1.25)).toBe('+1,25%');
    expect(formatVariation(-0.85)).toBe('-0,85%');
    expect(formatVariation(0)).toBe('0,00%');
    expect(formatVariation(null)).toBe('0,00%');
  });

  it('formats ISO dates into Brazilian dd/mm/yyyy and dd/mm', () => {
    expect(formatDateBR('2026-11-13')).toBe('13/11/2026');
    expect(formatDateBR('invalid')).toBe('invalid');
    expect(formatDateBR(null)).toBe('—');
    expect(formatShortDateBR('2026-11-13')).toBe('13/11');
    expect(formatShortDateBR(undefined)).toBe('—');
    expect(formatShortDateBR('raw')).toBe('raw');
  });

  it('formats integers in pt-BR and normalizes accented text', () => {
    expect(formatIntegerBR(12345.6)).toBe('12.346');
    expect(formatIntegerBR(null)).toBe('0');
    expect(normalizeSearchText('  São José dos Campos  ')).toBe('sao jose dos campos');
  });

  it('calculates ethanol parity against gasoline with 70% threshold', () => {
    expect(calculateEthanolParity(4.05, 6.32)).toEqual({
      ratioPct: 64.1,
      favorable: true,
    });
    expect(calculateEthanolParity(5.2, 6.32)).toEqual({
      ratioPct: 82.3,
      favorable: false,
    });
    expect(calculateEthanolParity(null, 6.32)).toBeNull();
    expect(calculateEthanolParity(4.05, 0)).toBeNull();
  });
});
