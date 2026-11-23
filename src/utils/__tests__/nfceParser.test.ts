import { describe, expect, it } from 'vitest';
import {
  buildNfceContributionIssueUrl,
  createSampleNfceQrUrl,
  isNfceInput,
  parseNfceInput,
  validateAccessKeyMod11,
  validateCnpj,
} from '@/utils/nfceParser';

describe('nfceParser', () => {
  it('detects NFC-e QR URLs and 44-digit access keys', () => {
    const sampleUrl = createSampleNfceQrUrl();
    expect(isNfceInput(sampleUrl)).toBe(true);
    expect(isNfceInput('35261111222333000181650010000012341123456780')).toBe(true);
    expect(isNfceInput('7891000100103')).toBe(false);
    expect(isNfceInput('')).toBe(false);
  });

  it('validates CNPJ digits mathematically', () => {
    expect(validateCnpj('11.222.333/0001-81')).toBe(true);
    expect(validateCnpj('11222333000182')).toBe(false);
    expect(validateCnpj('00000000000000')).toBe(false);
    expect(validateCnpj('123')).toBe(false);
  });

  it('parses valid ENCAT v2 QR URL, validates Mod-11 check digit, and builds GitHub contribution URL', () => {
    const sampleUrl = createSampleNfceQrUrl();
    const parsed = parseNfceInput(sampleUrl);

    expect(parsed.accessKey).toHaveLength(44);
    expect(validateAccessKeyMod11(parsed.accessKey)).toBe(true);
    expect(parsed.isValidAccessKey).toBe(true);
    expect(parsed.isValidCnpj).toBe(true);
    expect(parsed.uf).toBe('SP');
    expect(parsed.ufCode).toBe('35');
    expect(parsed.modelLabel).toContain('65');
    expect(parsed.emissionYearMonth).toBe('11/2026');
    expect(parsed.environment).toBe('Produção');
    expect(parsed.errors).toHaveLength(0);

    const issueUrl = buildNfceContributionIssueUrl({
      parsed,
      ean: '7891000100103',
      productName: 'Leite Moça 395g',
      price: '7.49',
      unit: 'R$/un',
      cityName: 'São Paulo/SP',
    });
    expect(issueUrl).toContain('https://github.com/djcristianosgp/preco-brasil/issues/new');
    expect(issueUrl).toContain('price-submission');
  });

  it('reports invalid check digits, invalid UF codes, and missing access keys cleanly', () => {
    const missing = parseNfceInput('texto qualquer sem chave');
    expect(missing.isValidAccessKey).toBe(false);
    expect(missing.errors[0]).toContain('Chave de acesso');

    const corruptedKey = '99261311222333000182550010000012341123456789';
    const invalid = parseNfceInput(corruptedKey);
    expect(invalid.isValidAccessKey).toBe(false);
    expect(invalid.isValidCnpj).toBe(false);
    expect(invalid.modelLabel).toContain('55');
    expect(invalid.errors.length).toBeGreaterThanOrEqual(2);
  });
});
