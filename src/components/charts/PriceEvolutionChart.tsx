import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign } from 'lucide-react';
import type {
  CatalogItem,
  ChartDataPoint,
  DailyPoint,
  HistoryRange,
  MacroDollarPoint,
  SeriesDisplayMode,
} from '@/types/pricing';
import { formatBRL, formatDateBR, formatIntegerBR, formatShortDateBR } from '@/utils/formatters';
import { alignSeriesWithDollar } from '@/utils/seriesHelpers';

interface PriceEvolutionChartProps {
  item: CatalogItem | null;
  series: DailyPoint[];
  scopeLabel: string;
  nationalAvg?: number | null;
  range: HistoryRange;
  seriesMode: SeriesDisplayMode;
  loading: boolean;
  dollarPoints?: MacroDollarPoint[];
  showDollarOverlay?: boolean;
  onToggleDollarOverlay?: () => void;
  onRangeChange: (range: HistoryRange) => void;
  onSeriesModeChange: (mode: SeriesDisplayMode) => void;
}

const RANGES: Array<{ id: HistoryRange; label: string }> = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'Tudo' },
];

export function PriceEvolutionChart({
  item,
  series,
  scopeLabel,
  nationalAvg,
  range,
  seriesMode,
  loading,
  dollarPoints,
  showDollarOverlay = false,
  onToggleDollarOverlay,
  onRangeChange,
  onSeriesModeChange,
}: PriceEvolutionChartProps) {
  const decimals = item?.decimals ?? 2;
  const chartData = useMemo(
    () =>
      showDollarOverlay
        ? alignSeriesWithDollar(series, dollarPoints)
        : (series as ChartDataPoint[]),
    [series, dollarPoints, showDollarOverlay],
  );

  const firstPoint = chartData[0];
  const lastPoint = chartData[chartData.length - 1];
  const periodDelta =
    firstPoint && lastPoint && firstPoint[seriesMode] > 0
      ? ((lastPoint[seriesMode] - firstPoint[seriesMode]) / firstPoint[seriesMode]) * 100
      : 0;
  const hasDollarData = Boolean(dollarPoints && dollarPoints.length > 0);

  return (
    <section
      aria-label="Evolução diária dos preços"
      className="rounded-2xl border border-border bg-surface p-3.5 shadow-corporate sm:p-4"
    >
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {item?.cadence && item.cadence !== 'daily'
                ? 'Evolução Histórica'
                : 'Evolução Diária'}{' '}
              · {item?.shortName || 'Produto'}
            </h2>
            <span className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {scopeLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chartData.length > 0
              ? `${formatDateBR(firstPoint.date)} a ${formatDateBR(lastPoint.date)} (${chartData.length} registros · ${periodDelta >= 0 ? '+' : ''}${periodDelta.toFixed(2).replace('.', ',')}% no período)`
              : 'Sem série histórica para o recorte selecionado'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasDollarData && onToggleDollarOverlay && (
            <button
              type="button"
              onClick={onToggleDollarOverlay}
              aria-pressed={showDollarOverlay}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                showDollarOverlay
                  ? 'border-emerald-600/50 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-surface-elevated text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="h-3 w-3" aria-hidden="true" />
              <span>Dólar PTAX (BCB)</span>
            </button>
          )}

          <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
            <button
              type="button"
              onClick={() => onSeriesModeChange('avg7d')}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                seriesMode === 'avg7d'
                  ? 'bg-[#0F2942] text-white dark:bg-primary dark:text-slate-950'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Média 7d
            </button>
            <button
              type="button"
              onClick={() => onSeriesModeChange('daily')}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                seriesMode === 'daily'
                  ? 'bg-[#0F2942] text-white dark:bg-primary dark:text-slate-950'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dia exato
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={`min-w-[36px] rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  range === r.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && chartData.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
          Carregando série histórica diária...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Não há histórico diário suficiente para este recorte geográfico.
        </div>
      ) : (
        <div className="h-60 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="precoAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDateBR}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                minTickGap={24}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="price"
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `R$ ${v.toFixed(decimals).replace('.', ',')}`}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={68}
                axisLine={false}
                tickLine={false}
              />
              {showDollarOverlay && (
                <YAxis
                  yAxisId="usd"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => `US$ ${v.toFixed(2).replace('.', ',')}`}
                  tick={{ fontSize: 10, fill: '#059669' }}
                  width={56}
                  axisLine={false}
                  tickLine={false}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const pt = payload[0].payload as ChartDataPoint;
                  return (
                    <div className="rounded-xl border border-border bg-surface p-2.5 text-xs shadow-lg">
                      <p className="font-semibold text-foreground">{formatDateBR(pt.date)}</p>
                      <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                        <p className="text-primary">
                          Média 7d: <strong>{formatBRL(pt.avg7d, decimals)}</strong>
                        </p>
                        <p className="text-foreground">
                          Valor no dia: <strong>{formatBRL(pt.avg, decimals)}</strong>
                        </p>
                        <p className="text-muted-foreground">
                          Faixa: {formatBRL(pt.min, decimals)} – {formatBRL(pt.max, decimals)}
                        </p>
                        <p className="text-muted-foreground">
                          Amostras: {formatIntegerBR(pt.samples)}
                        </p>
                        {showDollarOverlay && pt.usd && (
                          <p className="text-emerald-600 dark:text-emerald-400">
                            Dólar PTAX: <strong>{formatBRL(pt.usd, 3)}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              {nationalAvg && (
                <ReferenceLine
                  yAxisId="price"
                  y={nationalAvg}
                  stroke="#059669"
                  strokeDasharray="4 4"
                  label={{
                    value: `BR ${formatBRL(nationalAvg, decimals)}`,
                    position: 'insideTopRight',
                    fill: '#059669',
                    fontSize: 10,
                  }}
                />
              )}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey={seriesMode === 'avg7d' ? 'avg7d' : 'avg'}
                stroke="#1D4ED8"
                strokeWidth={2.2}
                fillOpacity={1}
                fill="url(#precoAreaGrad)"
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#FFFFFF' }}
              />
              {showDollarOverlay && (
                <Line
                  yAxisId="usd"
                  type="monotone"
                  dataKey="usd"
                  stroke="#059669"
                  strokeWidth={1.8}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-3 overflow-x-auto border-t border-border pt-3">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-1.5 font-medium">Data</th>
                <th className="pb-1.5 font-medium">Valor Ref.</th>
                <th className="pb-1.5 font-medium">Média 7d</th>
                <th className="hidden pb-1.5 font-medium sm:table-cell">Mín – Máx</th>
                <th className="pb-1.5 text-right font-medium">Amostras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {chartData
                .slice(-5)
                .reverse()
                .map((pt) => (
                  <tr key={pt.date}>
                    <td className="py-1.5 text-foreground">{formatDateBR(pt.date)}</td>
                    <td className="tabular-nums py-1.5 font-semibold text-foreground">
                      {formatBRL(pt.avg, decimals)}
                    </td>
                    <td className="tabular-nums py-1.5 text-primary">
                      {formatBRL(pt.avg7d, decimals)}
                    </td>
                    <td className="tabular-nums hidden py-1.5 text-muted-foreground sm:table-cell">
                      {formatBRL(pt.min, decimals)} – {formatBRL(pt.max, decimals)}
                    </td>
                    <td className="tabular-nums py-1.5 text-right text-muted-foreground">
                      {formatIntegerBR(pt.samples)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
