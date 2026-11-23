import { describe, expect, it } from 'vitest';
import {
  CHOROPLETH_PALETTE,
  NEUTRAL_MAP_FILL,
  NEUTRAL_MAP_FILL_DARK,
  computePriceDomain,
  getLegendStops,
  getPriceColor,
} from '@/utils/colorScale';

describe('colorScale', () => {
  it('computes domain ignoring invalid or non-positive values', () => {
    expect(computePriceDomain([])).toBeNull();
    expect(computePriceDomain([0, -1, Number.NaN])).toBeNull();
    expect(computePriceDomain([6.0, 6.5, 7.0])).toEqual({
      min: 6.0,
      max: 7.0,
      mid: 6.5,
    });
  });

  it('assigns palette colors monotonically from min to max', () => {
    const domain = { min: 6.0, max: 7.0, mid: 6.5 };
    expect(getPriceColor(6.0, domain)).toBe(CHOROPLETH_PALETTE[0]);
    expect(getPriceColor(6.5, domain)).toBe(CHOROPLETH_PALETTE[2]);
    expect(getPriceColor(7.0, domain)).toBe(CHOROPLETH_PALETTE[4]);
    expect(getPriceColor(null, domain, false)).toBe(NEUTRAL_MAP_FILL);
    expect(getPriceColor(undefined, domain, true)).toBe(NEUTRAL_MAP_FILL_DARK);
    expect(getPriceColor(6.0, { min: 6.0, max: 6.0, mid: 6.0 })).toBe(CHOROPLETH_PALETTE[1]);
  });

  it('produces 5 formatted legend stops for a valid domain', () => {
    expect(getLegendStops(null)).toEqual([]);
    const stops = getLegendStops({ min: 6.0, max: 7.0, mid: 6.5 });
    expect(stops).toHaveLength(5);
    expect(stops[0].label).toBe('6,00–6,20');
    expect(stops[4].label).toBe('6,80–7,00');
  });
});
