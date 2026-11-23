import { describe, expect, it } from 'vitest';
import { alignSeriesWithDollar, sliceByRange } from '@/utils/seriesHelpers';
import type { DailyPoint, MacroDollarPoint } from '@/types/pricing';

const SAMPLE_SERIES: DailyPoint[] = [
  { date: '2026-10-01', avg: 6.2, avg7d: 6.2, min: 5.9, max: 6.5, samples: 100 },
  { date: '2026-11-01', avg: 6.4, avg7d: 6.38, min: 6.0, max: 6.8, samples: 120 },
  { date: '2026-11-14', avg: 6.5, avg7d: 6.48, min: 6.1, max: 7.0, samples: 110 },
];

describe('seriesHelpers', () => {
  it('slices series accurately by calendar cutoff range', () => {
    expect(sliceByRange([], '30d')).toEqual([]);
    expect(sliceByRange(SAMPLE_SERIES, 'all')).toHaveLength(3);
    expect(sliceByRange(SAMPLE_SERIES, '7d').map((d) => d.date)).toEqual(['2026-11-14']);
    expect(sliceByRange(SAMPLE_SERIES, '30d').map((d) => d.date)).toEqual([
      '2026-11-01',
      '2026-11-14',
    ]);
  });

  it('aligns each date with the latest available PTAX dollar rate on or before that day', () => {
    const dollar: MacroDollarPoint[] = [
      { date: '2026-09-30', rate: 5.45 },
      { date: '2026-10-30', rate: 5.72 },
      { date: '2026-11-13', rate: 5.95 },
    ];
    const aligned = alignSeriesWithDollar(SAMPLE_SERIES, dollar);
    expect(aligned.map((a) => a.usd)).toEqual([5.45, 5.72, 5.95]);
    expect(alignSeriesWithDollar(SAMPLE_SERIES, undefined)[0].usd).toBeUndefined();
  });
});
