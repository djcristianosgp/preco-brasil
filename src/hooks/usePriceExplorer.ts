import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadBrazilGeo,
  loadCatalog,
  loadDollarPtax,
  loadItemHistory,
  loadLatestPrices,
  loadManifest,
  loadSnapshotsIndex,
  loadStateGeo,
  loadStateHistory,
  loadStateLatest,
} from '@/services/priceDataService';
import type {
  CatalogItem,
  CitySnapshot,
  DailyPoint,
  DataManifest,
  GeoAreaFeatureCollection,
  HistoryRange,
  ItemCategory,
  ItemHistoryPayload,
  LatestPricesPayload,
  MacroDollarPayload,
  MobileTab,
  PriceMetric,
  SeriesDisplayMode,
  SnapshotIndexEntry,
  StateHistoryPayload,
  ThemeMode,
} from '@/types/pricing';
import { searchCatalogItems } from '@/utils/barcode';
import { formatBRL } from '@/utils/formatters';
import { logger } from '@/utils/logger';
import { getInitialTheme, sliceByRange } from '@/utils/seriesHelpers';

export function usePriceExplorer() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [manifest, setManifest] = useState<DataManifest | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [latest, setLatest] = useState<LatestPricesPayload | null>(null);
  const [dolarPtax, setDolarPtax] = useState<MacroDollarPayload | null>(null);
  const [brazilGeo, setBrazilGeo] = useState<GeoAreaFeatureCollection | null>(null);
  const [stateGeo, setStateGeo] = useState<GeoAreaFeatureCollection | null>(null);
  const [stateLatestCities, setStateLatestCities] = useState<Record<string, CitySnapshot> | null>(
    null,
  );
  const [itemHistory, setItemHistory] = useState<ItemHistoryPayload | null>(null);
  const [stateHistory, setStateHistory] = useState<StateHistoryPayload | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotIndexEntry[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('combustiveis');
  const [selectedItemId, setSelectedItemId] = useState<string>('gasolina-comum');
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [selectedCityCode, setSelectedCityCode] = useState<string | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('30d');
  const [seriesMode, setSeriesMode] = useState<SeriesDisplayMode>('avg7d');
  const [showDollarOverlay, setShowDollarOverlay] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('mapa');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [methodologyOpen, setMethodologyOpen] = useState<boolean>(false);

  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(true);
  const [loadingStateData, setLoadingStateData] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('precobrasil-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoadingBootstrap(true);
      setError(null);
      try {
        const [m, cat, lat, geo, snaps, ptax] = await Promise.all([
          loadManifest(),
          loadCatalog(),
          loadLatestPrices(),
          loadBrazilGeo(),
          loadSnapshotsIndex(),
          loadDollarPtax().catch(() => null),
        ]);
        if (!active) return;
        setManifest(m);
        setCatalog(cat);
        setLatest(lat);
        setBrazilGeo(geo);
        setSnapshots(snaps);
        setDolarPtax(ptax);
        if (cat.length > 0) {
          setSelectedItemId((prev) => (cat.some((c) => c.id === prev) ? prev : cat[0].id));
        }
      } catch (err) {
        if (!active) return;
        logger.error('Erro ao inicializar dados do PreçoBrasil', err);
        setError('Não foi possível carregar a base oficial de preços e mapas.');
      } finally {
        if (active) setLoadingBootstrap(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId) return;
    let active = true;
    setLoadingHistory(true);
    loadItemHistory(selectedItemId)
      .then((payload) => {
        if (active) setItemHistory(payload);
      })
      .catch((err) => {
        logger.error(`Erro ao carregar histórico de ${selectedItemId}`, err);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedUf) {
      setStateGeo(null);
      setStateHistory(null);
      setStateLatestCities(null);
      return;
    }
    let active = true;
    const stateCode = latest?.states[selectedUf]?.code;
    setLoadingStateData(true);
    Promise.all([
      loadStateGeo(selectedUf, stateCode),
      loadStateHistory(selectedUf),
      loadStateLatest(selectedUf).catch(() => null),
    ])
      .then(([geo, hist, stLatest]) => {
        if (!active) return;
        setStateGeo(geo);
        setStateHistory(hist);
        setStateLatestCities(stLatest?.cities ?? null);
      })
      .catch((err) => {
        logger.error(`Erro ao carregar dados detalhados de ${selectedUf}`, err);
      })
      .finally(() => {
        if (active) setLoadingStateData(false);
      });
    return () => {
      active = false;
    };
  }, [selectedUf, latest]);

  const selectedItem = useMemo(
    () => catalog.find((c) => c.id === selectedItemId) || catalog[0] || null,
    [catalog, selectedItemId],
  );

  const selectedStateSnapshot = useMemo(
    () => (selectedUf && latest ? latest.states[selectedUf] || null : null),
    [selectedUf, latest],
  );

  const activeStateCities = useMemo(() => {
    if (stateLatestCities && Object.keys(stateLatestCities).length > 0) {
      return stateLatestCities;
    }
    return selectedStateSnapshot?.cities || {};
  }, [stateLatestCities, selectedStateSnapshot]);

  const selectedCitySnapshot = useMemo(() => {
    if (!selectedCityCode) return null;
    return activeStateCities[selectedCityCode] || null;
  }, [activeStateCities, selectedCityCode]);

  const activeScopeMetric: PriceMetric | null = useMemo(() => {
    if (!latest || !selectedItem) return null;
    if (selectedCitySnapshot) {
      return selectedCitySnapshot.items[selectedItem.id] || null;
    }
    if (selectedStateSnapshot) {
      return selectedStateSnapshot.items[selectedItem.id] || null;
    }
    return latest.national[selectedItem.id] || null;
  }, [latest, selectedItem, selectedStateSnapshot, selectedCitySnapshot]);

  const categoryCatalog = useMemo(() => {
    if (selectedCategory === 'all') return catalog;
    const subset = catalog.filter((item) => item.category === selectedCategory);
    return subset.length > 0 ? subset : catalog;
  }, [catalog, selectedCategory]);

  const filteredCatalog = useMemo(() => {
    if (searchQuery.trim()) {
      return searchCatalogItems(catalog, searchQuery);
    }
    return categoryCatalog;
  }, [catalog, categoryCatalog, searchQuery]);

  const selectCategory = useCallback(
    (category: ItemCategory) => {
      setSelectedCategory(category);
      if (category === 'all') return;
      const subset = catalog.filter((item) => item.category === category);
      if (subset.length > 0 && !subset.some((item) => item.id === selectedItemId)) {
        setSelectedItemId(subset[0].id);
      }
    },
    [catalog, selectedItemId],
  );

  const selectItem = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      const found = catalog.find((c) => c.id === itemId);
      if (found && selectedCategory !== 'all' && found.category !== selectedCategory) {
        setSelectedCategory(found.category as ItemCategory);
      }
    },
    [catalog, selectedCategory],
  );

  const activeSeries = useMemo(() => {
    if (!itemHistory) return [];
    let raw: DailyPoint[] = itemHistory.national;
    if (selectedCityCode && stateHistory?.cities[selectedCityCode]) {
      raw = stateHistory.cities[selectedCityCode].items[selectedItemId] || raw;
    } else if (selectedUf && itemHistory.states[selectedUf]) {
      raw = itemHistory.states[selectedUf];
    }
    return sliceByRange(raw, historyRange);
  }, [itemHistory, stateHistory, selectedUf, selectedCityCode, selectedItemId, historyRange]);

  useEffect(() => {
    if (!selectedItem) return;
    const scopeName = selectedCitySnapshot
      ? `${selectedCitySnapshot.name} (${selectedUf})`
      : selectedStateSnapshot
        ? `${selectedStateSnapshot.name} (${selectedStateSnapshot.uf})`
        : 'Brasil';
    const priceText = activeScopeMetric
      ? formatBRL(activeScopeMetric.avg, selectedItem.decimals)
      : '';
    document.title = priceText
      ? `${selectedItem.shortName}: ${priceText} em ${scopeName} — PreçoBrasil`
      : `${selectedItem.name} em ${scopeName} — PreçoBrasil`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && priceText) {
      metaDesc.setAttribute(
        'content',
        `Preço médio de ${selectedItem.name} em ${scopeName}: ${priceText}. Série histórica oficial (${selectedItem.sourceName}) e consulta por código de barras no PreçoBrasil.`,
      );
    }
  }, [selectedItem, selectedStateSnapshot, selectedCitySnapshot, selectedUf, activeScopeMetric]);

  const selectState = useCallback((uf: string | null) => {
    setSelectedUf(uf ? uf.toUpperCase() : null);
    setSelectedCityCode(null);
    setDrawerOpen(false);
  }, []);

  const selectCity = useCallback((cityCode: string | null, openDetail = true) => {
    setSelectedCityCode(cityCode);
    if (cityCode && openDetail) {
      setDrawerOpen(true);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return {
    theme,
    toggleTheme,
    manifest,
    catalog,
    categoryCatalog,
    filteredCatalog,
    selectedCategory,
    selectCategory,
    latest,
    dolarPtax,
    showDollarOverlay,
    setShowDollarOverlay,
    brazilGeo,
    stateGeo,
    activeStateCities,
    itemHistory,
    stateHistory,
    snapshots,
    selectedItemId,
    setSelectedItemId: selectItem,
    selectedItem,
    selectedUf,
    selectedStateSnapshot,
    selectedCityCode,
    selectedCitySnapshot,
    activeScopeMetric,
    activeSeries,
    historyRange,
    setHistoryRange,
    seriesMode,
    setSeriesMode,
    mobileTab,
    setMobileTab,
    searchQuery,
    setSearchQuery,
    drawerOpen,
    setDrawerOpen,
    methodologyOpen,
    setMethodologyOpen,
    loadingBootstrap,
    loadingStateData,
    loadingHistory,
    error,
    selectState,
    selectCity,
  };
}
