export const CHOROPLETH_PALETTE = [
  '#0D9488', // Mais barato (Teal institucional)
  '#0284C7', // Abaixo da média (Azul corporativo)
  '#D97706', // Intermediário (Âmbar)
  '#EA580C', // Acima da média (Laranja escuro)
  '#B91C1C', // Mais caro (Carmesim)
] as const;

export const NEUTRAL_MAP_FILL = '#CBD5E1';
export const NEUTRAL_MAP_FILL_DARK = '#334155';

export interface PriceDomain {
  min: number;
  max: number;
  mid: number;
}

export function computePriceDomain(values: number[]): PriceDomain | null {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const mid = (min + max) / 2;
  return { min, max, mid };
}

export function getPriceColor(
  value: number | null | undefined,
  domain: PriceDomain | null,
  isDark = false,
): string {
  if (value === null || value === undefined || !Number.isFinite(value) || !domain) {
    return isDark ? NEUTRAL_MAP_FILL_DARK : NEUTRAL_MAP_FILL;
  }
  const span = domain.max - domain.min;
  if (span <= 0.0001) {
    return CHOROPLETH_PALETTE[1];
  }
  const ratio = Math.max(0, Math.min(0.9999, (value - domain.min) / span));
  const index = Math.floor(ratio * CHOROPLETH_PALETTE.length);
  return CHOROPLETH_PALETTE[index];
}

export interface LegendStop {
  color: string;
  label: string;
  min: number;
  max: number;
}

export function getLegendStops(domain: PriceDomain | null, decimals = 2): LegendStop[] {
  if (!domain) return [];
  const span = domain.max - domain.min;
  const step = span / CHOROPLETH_PALETTE.length;
  return CHOROPLETH_PALETTE.map((color, idx) => {
    const start = domain.min + step * idx;
    const end = idx === CHOROPLETH_PALETTE.length - 1 ? domain.max : domain.min + step * (idx + 1);
    return {
      color,
      min: start,
      max: end,
      label: `${start.toFixed(decimals).replace('.', ',')}–${end.toFixed(decimals).replace('.', ',')}`,
    };
  });
}
