import { describe, expect, it } from 'vitest';
import { CMED_ICMS_KEYS, UF_ICMS_2026, expandCmedShardRecord } from '@/utils/cmedIcms';

describe('cmedIcms', () => {
  it('maps all 27 UFs to valid CMED ICMS columns', () => {
    const ufs = Object.keys(UF_ICMS_2026);
    expect(ufs).toHaveLength(27);
    for (const key of Object.values(UF_ICMS_2026)) {
      expect(CMED_ICMS_KEYS).toContain(key);
    }
  });

  it('expands compact shard record into state-by-state PMC table', () => {
    const expanded = expandCmedShardRecord('7891058009458', {
      p: 'DORFLEX',
      s: 'DIPIRONA MONOIDRATADA; CITRATO DE ORFENADRINA',
      a: 'SOL OR CT FR VD AMB X 20 ML',
      l: 'OPELLA HEALTHCARE BRAZIL LTDA',
      t: 'Tarja Vermelha',
      pmc: [26.8, 27.1, 27.55, 27.9, 28.1, 28.3, 28.5, 28.7, 29.1, 29.3, 29.5],
    });

    expect(expanded.ean).toBe('7891058009458');
    expect(expanded.pmcByIcms['18']).toBe(27.55);
    expect(expanded.pmcByUf.SP).toBe(27.55);
    expect(expanded.pmcByUf.ES).toBe(26.8);
    expect(expanded.pmcByUf.MA).toBe(29.5);
    expect(expanded.minPmc).toBe(26.8);
    expect(expanded.maxPmc).toBe(29.5);
  });
});
