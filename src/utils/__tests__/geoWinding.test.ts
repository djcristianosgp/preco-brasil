import { geoArea } from 'd3-geo';
import { describe, expect, it } from 'vitest';
import type { GeoAreaFeatureCollection } from '@/types/pricing';
import { rewindGeoCollection } from '@/utils/geoWinding';

describe('geoWinding', () => {
  it('rewinds RFC 7946 counter-clockwise polygons so d3-geo treats interior properly', () => {
    const ccwBrazilBox: GeoAreaFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { code: '35', uf: 'SP', name: 'São Paulo' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-49, -24],
                [-46, -24],
                [-46, -21],
                [-49, -21],
                [-49, -24],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { code: '33', uf: 'RJ', name: 'Rio de Janeiro' },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [-44, -23],
                  [-41, -23],
                  [-41, -21],
                  [-44, -21],
                  [-44, -23],
                ],
              ],
            ],
          },
        },
      ],
    };

    expect(geoArea(ccwBrazilBox.features[0])).toBeGreaterThan(2 * Math.PI);
    const rewound = rewindGeoCollection(ccwBrazilBox);
    expect(geoArea(rewound.features[0])).toBeLessThan(0.1);
    expect(geoArea(rewound.features[1])).toBeLessThan(0.1);
  });
});
