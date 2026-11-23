import type { CmedProductResult, CmedShardRecord } from '@/types/pricing';

export const CMED_ICMS_KEYS = [
  '17',
  '17,5',
  '18',
  '19',
  '19,5',
  '20',
  '20,5',
  '21',
  '22',
  '22,5',
  '23',
] as const;

export const UF_ICMS_2026: Record<string, string> = {
  AC: '19',
  AL: '20',
  AM: '20',
  AP: '18',
  BA: '20,5',
  CE: '20',
  DF: '20',
  ES: '17',
  GO: '19',
  MA: '23',
  MG: '18',
  MS: '17',
  MT: '17',
  PA: '19',
  PB: '20',
  PE: '20,5',
  PI: '22,5',
  PR: '19,5',
  RJ: '22',
  RN: '20',
  RO: '19,5',
  RR: '20',
  RS: '17',
  SC: '17',
  SE: '20',
  SP: '18',
  TO: '20',
};

export function expandCmedShardRecord(ean: string, rec: CmedShardRecord): CmedProductResult {
  const pmcByIcms: Record<string, number> = {};
  CMED_ICMS_KEYS.forEach((key, idx) => {
    const val = rec.pmc[idx] ?? rec.pmc[2] ?? rec.pmc[0] ?? 0;
    pmcByIcms[key] = val;
  });

  const pmcByUf: Record<string, number> = {};
  for (const [uf, icmsKey] of Object.entries(UF_ICMS_2026)) {
    pmcByUf[uf] = pmcByIcms[icmsKey] ?? pmcByIcms['18'] ?? 0;
  }

  const validValues = Object.values(pmcByUf).filter((v) => Number.isFinite(v) && v > 0);
  return {
    ean,
    productName: rec.p,
    substance: rec.s,
    presentation: rec.a,
    laboratory: rec.l,
    tarja: rec.t || 'Não informada',
    pmcByIcms,
    pmcByUf,
    minPmc: validValues.length ? Math.min(...validValues) : 0,
    maxPmc: validValues.length ? Math.max(...validValues) : 0,
  };
}
