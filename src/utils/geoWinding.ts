import { geoArea } from 'd3-geo';
import type { GeoAreaFeature, GeoAreaFeatureCollection } from '@/types/pricing';

const TWO_PI = 2 * Math.PI;

function ringNeedsReverse(ring: number[][], isHole: boolean): boolean {
  const area = geoArea({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  });
  return isHole ? area < TWO_PI : area > TWO_PI;
}

function rewindPolygonRings(rings: number[][][]): number[][][] {
  return rings.map((ring, idx) => {
    const isHole = idx > 0;
    return ringNeedsReverse(ring, isHole) ? [...ring].reverse() : ring;
  });
}

export function rewindGeoFeature(feature: GeoAreaFeature): GeoAreaFeature {
  const geom = feature.geometry;
  if (!geom) return feature;

  if (geom.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: rewindPolygonRings(geom.coordinates),
      },
    };
  }

  if (geom.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...geom,
        coordinates: geom.coordinates.map(rewindPolygonRings),
      },
    };
  }

  return feature;
}

export function rewindGeoCollection(
  collection: GeoAreaFeatureCollection,
): GeoAreaFeatureCollection {
  return {
    ...collection,
    features: (collection.features || []).map(rewindGeoFeature),
  };
}
