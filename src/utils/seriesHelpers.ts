import type {
  ChartDataPoint,
  DailyPoint,
  HistoryRange,
  MacroDollarPoint,
  ThemeMode,
} from '@/types/pricing';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('precobrasil-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

export function sliceByRange(points: DailyPoint[], range: HistoryRange): DailyPoint[] {
  if (points.length === 0 || range === 'all') return points;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const lastDate = points[points.length - 1].date;
  const cutoff = new Date(`${lastDate}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoffIso);
}

export function alignSeriesWithDollar(
  series: DailyPoint[],
  dollarPoints: MacroDollarPoint[] | undefined,
): ChartDataPoint[] {
  if (!dollarPoints || dollarPoints.length === 0) {
    return series.map((pt) => ({ ...pt }));
  }

  const sortedDollar = [...dollarPoints].sort((a, b) => a.date.localeCompare(b.date));
  let idx = 0;

  return series.map((pt) => {
    while (idx + 1 < sortedDollar.length && sortedDollar[idx + 1].date <= pt.date) {
      idx += 1;
    }
    const matched = sortedDollar[idx] && sortedDollar[idx].date <= pt.date ? sortedDollar[idx].rate : null;
    return {
      ...pt,
      usd: matched,
    };
  });
}
