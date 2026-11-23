import type { Feature, FeatureCollection, Geometry } from 'geojson';

export type ItemCategory =
  | 'all'
  | 'combustiveis'
  | 'energia'
  | 'cesta-basica'
  | 'hortifruti'
  | 'medicamentos'
  | 'construcao'
  | 'varejo-nfce';

export type PriceCadence = 'daily' | 'monthly' | 'regulated';
export type GeoLevel = 'city' | 'state';

export interface CatalogItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  categoryLabel: string;
  unit: string;
  decimals: number;
  cadence?: PriceCadence;
  geoLevel?: GeoLevel;
  codeLabel?: string;
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
  citiesByItem?: Record<string, number>;
  cities: Record<string, CitySnapshot>;
}

export interface StateLatestPayload {
  uf: string;
  name: string;
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

export interface ChartDataPoint extends DailyPoint {
  usd?: number | null;
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

export interface EnergyFlagInfo {
  month: string;
  name: string;
  additionalPerMwh: number;
  additionalPerKwh: number;
}

export interface ConnectorStatusEntry {
  name: string;
  status: 'ok' | 'warning';
  accepted: number;
  message?: string;
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
  itemsCount?: number;
  cmedProductsIndexed?: number;
  energyFlag?: EnergyFlagInfo;
  connectorStatus?: ConnectorStatusEntry[];
  sources: DataSourceDescriptor[];
}

export interface SnapshotIndexEntry {
  date: string;
  dataVersion: string;
  latestCollectionDate: string;
  totalSamples: number;
  nationalAverages: Record<string, number>;
}

export interface MacroDollarPoint {
  date: string;
  rate: number;
}

export interface MacroDollarPayload {
  seriesId: number;
  name: string;
  sourceName: string;
  unit: string;
  latestDate: string;
  latestRate: number;
  changePct: number;
  points: MacroDollarPoint[];
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

export interface CmedShardRecord {
  p: string;
  s: string;
  a: string;
  l: string;
  t: string;
  pmc: number[];
}

export interface CmedProductResult {
  ean: string;
  productName: string;
  substance: string;
  presentation: string;
  laboratory: string;
  tarja: string;
  pmcByIcms: Record<string, number>;
  pmcByUf: Record<string, number>;
  minPmc: number;
  maxPmc: number;
}

export interface BarcodeLookupResult {
  query: string;
  isValidGtin: boolean;
  gtinFormat: 'EAN-8' | 'EAN-13' | 'GTIN-14' | 'ANP/NCM' | 'TEXTO';
  catalogMatches: CatalogItem[];
  cmedProduct?: CmedProductResult | null;
  externalProduct: ExternalBarcodeProduct | null;
  status: 'catalog-match' | 'cmed-found' | 'external-found' | 'not-found' | 'error';
  message: string;
}

export interface NfceParsedResult {
  rawInput: string;
  accessKey: string;
  isValidAccessKey: boolean;
  uf: string;
  ufCode: string;
  sefazUrl: string;
  emissionYearMonth: string;
  cnpj: string;
  cnpjFormatted: string;
  isValidCnpj: boolean;
  model: string;
  modelLabel: string;
  series: string;
  number: string;
  qrVersion: string;
  environment: 'Produção' | 'Homologação' | 'Não informado';
  totalValue: number | null;
  errors: string[];
}

export type HistoryRange = '7d' | '30d' | '90d' | 'all';
export type SeriesDisplayMode = 'avg7d' | 'daily';
export type MobileTab = 'mapa' | 'itens' | 'historico' | 'codigo';
export type ThemeMode = 'light' | 'dark';
