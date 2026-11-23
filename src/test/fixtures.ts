import type {
  CatalogItem,
  DataManifest,
  GeoAreaFeatureCollection,
  ItemHistoryPayload,
  LatestPricesPayload,
  SnapshotIndexEntry,
  StateHistoryPayload,
} from '@/types/pricing';

export const FIXTURE_CATALOG: CatalogItem[] = [
  {
    id: 'gasolina-comum',
    name: 'Gasolina Comum',
    shortName: 'Gasolina',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '320102001',
    ncm: '27101259',
    barcodes: ['320102001', '27101259'],
    aliases: ['gasolina'],
    sourceName: 'ANP',
    featured: true,
    priority: 1,
  },
  {
    id: 'etanol',
    name: 'Etanol Hidratado',
    shortName: 'Etanol',
    category: 'combustiveis',
    categoryLabel: 'Combustíveis Automotivos',
    unit: 'R$/L',
    decimals: 2,
    anpCode: '810101001',
    ncm: '22071090',
    barcodes: ['810101001', '22071090'],
    aliases: ['etanol', 'alcool'],
    sourceName: 'ANP',
    featured: true,
    priority: 2,
  },
];

export const FIXTURE_MANIFEST: DataManifest = {
  dataVersion: '2026.11.23.1',
  generatedAt: '2026-11-23T09:00:00Z',
  firstCollectionDate: '2026-07-01',
  latestCollectionDate: '2026-11-13',
  activeWindowStart: '2026-11-07',
  activeWindowEnd: '2026-11-13',
  totalDays: 95,
  totalSamplesProcessed: 420000,
  statesCovered: 27,
  citiesCovered: 417,
  sources: [
    {
      name: 'ANP — LPC',
      url: 'https://www.gov.br/anp',
      cadence: 'Diária',
    },
  ],
};

export const FIXTURE_LATEST: LatestPricesPayload = {
  dataVersion: '2026.11.23.1',
  generatedAt: '2026-11-23T09:00:00Z',
  latestCollectionDate: '2026-11-13',
  activeWindowStart: '2026-11-07',
  activeWindowEnd: '2026-11-13',
  national: {
    'gasolina-comum': {
      avg: 6.49,
      min: 5.59,
      max: 7.99,
      samples: 12000,
      previousAvg: 6.45,
      changePct: 0.62,
      lastDate: '2026-11-13',
    },
    etanol: {
      avg: 4.35,
      min: 3.49,
      max: 6.29,
      samples: 10500,
      previousAvg: 4.4,
      changePct: -1.14,
      lastDate: '2026-11-13',
    },
  },
  states: {
    SP: {
      uf: 'SP',
      code: '35',
      name: 'São Paulo',
      region: 'Sudeste',
      citiesCount: 1,
      items: {
        'gasolina-comum': {
          avg: 6.32,
          min: 5.79,
          max: 7.29,
          samples: 3200,
          previousAvg: 6.3,
          changePct: 0.32,
          lastDate: '2026-11-13',
        },
        etanol: {
          avg: 4.05,
          min: 3.59,
          max: 4.99,
          samples: 3100,
          previousAvg: 4.08,
          changePct: -0.74,
          lastDate: '2026-11-13',
        },
      },
      cities: {
        '3550308': {
          code: '3550308',
          name: 'São Paulo',
          items: {
            'gasolina-comum': {
              avg: 6.35,
              min: 5.89,
              max: 7.29,
              samples: 520,
              previousAvg: 6.33,
              changePct: 0.32,
              lastDate: '2026-11-13',
            },
            etanol: {
              avg: 4.09,
              min: 3.69,
              max: 4.89,
              samples: 500,
              previousAvg: 4.12,
              changePct: -0.73,
              lastDate: '2026-11-13',
            },
          },
        },
      },
    },
    RJ: {
      uf: 'RJ',
      code: '33',
      name: 'Rio de Janeiro',
      region: 'Sudeste',
      citiesCount: 1,
      items: {
        'gasolina-comum': {
          avg: 6.68,
          min: 6.19,
          max: 7.49,
          samples: 1400,
          previousAvg: 6.65,
          changePct: 0.45,
          lastDate: '2026-11-13',
        },
      },
      cities: {},
    },
  },
};

export const FIXTURE_BRAZIL_GEO: GeoAreaFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: '35', uf: 'SP', name: 'São Paulo', region: 'Sudeste' },
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
      properties: { code: '33', uf: 'RJ', name: 'Rio de Janeiro', region: 'Sudeste' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-44, -23],
            [-41, -23],
            [-41, -21],
            [-44, -21],
            [-44, -23],
          ],
        ],
      },
    },
  ],
};

export const FIXTURE_SP_GEO: GeoAreaFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: '3550308', name: 'São Paulo', uf: 'SP' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-46.8, -23.7],
            [-46.4, -23.7],
            [-46.4, -23.4],
            [-46.8, -23.4],
            [-46.8, -23.7],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { code: '3500105', name: 'Adamantina', uf: 'SP' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-51.1, -21.7],
            [-50.9, -21.7],
            [-50.9, -21.5],
            [-51.1, -21.5],
            [-51.1, -21.7],
          ],
        ],
      },
    },
  ],
};

export const FIXTURE_ITEM_HISTORY: ItemHistoryPayload = {
  itemId: 'gasolina-comum',
  unit: 'R$/L',
  national: [
    { date: '2026-11-11', avg: 6.45, avg7d: 6.44, min: 5.6, max: 7.9, samples: 2400 },
    { date: '2026-11-12', avg: 6.47, avg7d: 6.46, min: 5.59, max: 7.95, samples: 2500 },
    { date: '2026-11-13', avg: 6.51, avg7d: 6.49, min: 5.62, max: 7.99, samples: 2300 },
  ],
  states: {
    SP: [
      { date: '2026-11-12', avg: 6.3, avg7d: 6.29, min: 5.79, max: 7.29, samples: 700 },
      { date: '2026-11-13', avg: 6.34, avg7d: 6.32, min: 5.81, max: 7.29, samples: 650 },
    ],
  },
};

export const FIXTURE_STATE_HISTORY: StateHistoryPayload = {
  uf: 'SP',
  name: 'São Paulo',
  cities: {
    '3550308': {
      code: '3550308',
      name: 'São Paulo',
      items: {
        'gasolina-comum': [
          { date: '2026-11-12', avg: 6.33, avg7d: 6.32, min: 5.89, max: 7.29, samples: 120 },
          { date: '2026-11-13', avg: 6.36, avg7d: 6.35, min: 5.9, max: 7.29, samples: 110 },
        ],
      },
    },
  },
};

export const FIXTURE_SNAPSHOTS: SnapshotIndexEntry[] = [
  {
    date: '2026-11-23',
    dataVersion: '2026.11.23.1',
    latestCollectionDate: '2026-11-13',
    totalSamples: 420000,
    nationalAverages: {
      'gasolina-comum': 6.49,
      etanol: 4.35,
    },
  },
];
