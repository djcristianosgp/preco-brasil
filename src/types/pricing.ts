import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface CatalogItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  categoryLabel: string;
  unit: string;
  decimals: number;
  anpCode: string;
  ncm: string;
  barcodes: string[];
  aliases: string[];
  sourceName: string;
  featured: boolean;
  priority: number;
}

export interface PriceMetric {
  avg: number;
  min: number;
  max: number;
  samples: number;
  previousAvg: number | null;
  changePct: number;
  lastDate: string;
}

export interface CitySnapshot {
  code: string;
  name: string;
  items: Record<string, PriceMetric>;
}

export interface StateSnapshot {
  uf: string;
  code: string;
  name: string;
  region: string;
  items: Record<string, PriceMetric>;
  citiesCount: number;
  cities: Record<string, CitySnapshot>;
}

export interface LatestPricesPayload {
  dataVersion: string;
  generatedAt: string;
  latestCollectionDate: string;
  activeWindowStart: string;
  activeWindowEnd: string;
  national: Record<string, PriceMetric>;
  states: Record<string, StateSnapshot>;
}

export interface DailyPoint {
  date: string;
  avg: number;
  avg7d: number;
  min: number;
  max: number;
  samples: number;
}

export interface ItemHistoryPayload {
  itemId: string;
  unit: string;
  national: DailyPoint[];
  states: Record<string, DailyPoint[]>;
}

export interface StateCityHistory {
  code: string;
  name: string;
  items: Record<string, DailyPoint[]>;
}

export interface StateHistoryPayload {
  uf: string;
  name: string;
  cities: Record<string, StateCityHistory>;
}

export interface DataSourceDescriptor {
  name: string;
  url: string;
  cadence: string;
}

export interface DataManifest {
  dataVersion: string;
  generatedAt: string;
  firstCollectionDate: string;
  latestCollectionDate: string;
  activeWindowStart: string;
  activeWindowEnd: string;
  totalDays: number;
  totalSamplesProcessed: number;
  statesCovered: number;
  citiesCovered: number;
  sources: DataSourceDescriptor[];
}

export interface SnapshotIndexEntry {
  date: string;
  dataVersion: string;
  latestCollectionDate: string;
  totalSamples: number;
  nationalAverages: Record<string, number>;
}

export interface GeoAreaProperties {
  code: string;
  name: string;
  uf?: string;
  region?: string;
}

export type GeoAreaFeature = Feature<Geometry, GeoAreaProperties>;
export type GeoAreaFeatureCollection = FeatureCollection<Geometry, GeoAreaProperties>;

export interface ExternalBarcodeProduct {
  code: string;
  productName: string;
  brands: string;
  quantity: string;
  categories: string;
  imageUrl?: string;
  source: string;
}

export interface BarcodeLookupResult {
  query: string;
  isValidGtin: boolean;
  gtinFormat: 'EAN-8' | 'EAN-13' | 'GTIN-14' | 'ANP/NCM' | 'TEXTO';
  catalogMatches: CatalogItem[];
  externalProduct: ExternalBarcodeProduct | null;
  status: 'catalog-match' | 'external-found' | 'not-found' | 'error';
  message: string;
}

export type HistoryRange = '7d' | '30d' | '90d' | 'all';
export type SeriesDisplayMode = 'avg7d' | 'daily';
export type MobileTab = 'mapa' | 'itens' | 'historico' | 'codigo';
export type ThemeMode = 'light' | 'dark';
