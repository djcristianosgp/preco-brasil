import { useRef, useState } from 'react';
import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';
import { BarcodeSearchPanel } from '@/components/barcode/BarcodeSearchPanel';
import { PriceEvolutionChart } from '@/components/charts/PriceEvolutionChart';
import { EntityDetailDrawer } from '@/components/details/EntityDetailDrawer';
import { MethodologyModal } from '@/components/details/MethodologyModal';
import { ScopeKpiStrip } from '@/components/details/ScopeKpiStrip';
import { ItemListPanel } from '@/components/items/ItemListPanel';
import { QuickItemPills } from '@/components/items/QuickItemPills';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BrazilChoroplethMap } from '@/components/map/BrazilChoroplethMap';
import { LocationRankingList } from '@/components/ranking/LocationRankingList';
import { usePriceExplorer } from '@/hooks/usePriceExplorer';

export function App() {
  const explorer = usePriceExplorer();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const historyRef = useRef<HTMLDivElement | null>(null);

  const scopeMetricsMap =
    explorer.selectedCitySnapshot?.items ||
    explorer.selectedStateSnapshot?.items ||
    explorer.latest?.national ||
    {};

  const scopeLabel = explorer.selectedCitySnapshot
    ? `${explorer.selectedCitySnapshot.name} (${explorer.selectedUf})`
    : explorer.selectedStateSnapshot
      ? `${explorer.selectedStateSnapshot.name} (${explorer.selectedStateSnapshot.uf})`
      : 'Brasil';

  const handleDetectedBarcode = (code: string) => {
    setScannedCode(code);
    explorer.setSearchQuery(code);
    explorer.setMobileTab('codigo');
  };

  const scrollToHistory = () => {
    explorer.setMobileTab('historico');
    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground lg:pb-8">
      <AppHeader
        manifest={explorer.manifest}
        searchQuery={explorer.searchQuery}
        onSearchChange={explorer.setSearchQuery}
        onOpenScanner={() => setScannerOpen(true)}
        onOpenBarcodeTab={() => explorer.setMobileTab('codigo')}
        onOpenMethodology={() => explorer.setMethodologyOpen(true)}
        theme={explorer.theme}
        onToggleTheme={explorer.toggleTheme}
      />

      <main className="mx-auto max-w-[1440px] space-y-4 px-3 py-3 sm:px-5 sm:py-4">
        {explorer.error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            {explorer.error}
          </div>
        ) : explorer.loadingBootstrap ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-[440px] animate-pulse rounded-2xl border border-border bg-surface lg:col-span-7" />
            <div className="h-[440px] animate-pulse rounded-2xl border border-border bg-surface lg:col-span-5" />
          </div>
        ) : (
          <>
            {/* Quick product pills — always accessible on mobile and desktop */}
            <QuickItemPills
              items={explorer.catalog}
              selectedItemId={explorer.selectedItemId}
              metricsMap={scopeMetricsMap}
              onSelectItem={explorer.setSelectedItemId}
            />

            {/* Executive KPI Strip */}
            <ScopeKpiStrip
              item={explorer.selectedItem}
              metric={explorer.activeScopeMetric}
              scopeLabel={scopeLabel}
              ethanolPrice={scopeMetricsMap['etanol']?.avg}
              gasolinePrice={scopeMetricsMap['gasolina-comum']?.avg}
            />

            {/* Main Split Workspace (Desktop) / Tabbed Workspace (Mobile) */}
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Left Column: Choropleth Map + Daily Chart */}
              <div className="space-y-4 lg:col-span-7">
                <div className={explorer.mobileTab === 'mapa' ? 'block' : 'hidden lg:block'}>
                  <BrazilChoroplethMap
                    brazilGeo={explorer.brazilGeo}
                    stateGeo={explorer.stateGeo}
                    latest={explorer.latest}
                    selectedItem={explorer.selectedItem}
                    selectedUf={explorer.selectedUf}
                    selectedCityCode={explorer.selectedCityCode}
                    isDark={explorer.theme === 'dark'}
                    loadingState={explorer.loadingStateData}
                    onSelectState={explorer.selectState}
                    onSelectCity={(code) => explorer.selectCity(code, true)}
                  />
                </div>

                <div
                  ref={historyRef}
                  className={explorer.mobileTab === 'historico' ? 'block' : 'hidden lg:block'}
                >
                  <PriceEvolutionChart
                    item={explorer.selectedItem}
                    series={explorer.activeSeries}
                    scopeLabel={scopeLabel}
                    nationalAvg={
                      explorer.selectedUf && explorer.selectedItem
                        ? explorer.latest?.national[explorer.selectedItem.id]?.avg
                        : null
                    }
                    range={explorer.historyRange}
                    seriesMode={explorer.seriesMode}
                    loading={explorer.loadingHistory}
                    onRangeChange={explorer.setHistoryRange}
                    onSeriesModeChange={explorer.setSeriesMode}
                  />
                </div>
              </div>

              {/* Right Sidebar: Items + Ranking + Barcode Search */}
              <aside className="space-y-4 lg:col-span-5">
                <div className={explorer.mobileTab === 'codigo' ? 'block' : 'hidden lg:block'}>
                  <BarcodeSearchPanel
                    key={scannedCode || 'default-barcode'}
                    catalog={explorer.catalog}
                    metricsMap={scopeMetricsMap}
                    scopeLabel={scopeLabel}
                    externalCode={scannedCode}
                    onOpenCamera={() => setScannerOpen(true)}
                    onSelectCatalogItem={(itemId) => {
                      explorer.setSelectedItemId(itemId);
                      explorer.setMobileTab('mapa');
                    }}
                  />
                </div>

                <div className={explorer.mobileTab === 'itens' ? 'block' : 'hidden lg:block'}>
                  <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-corporate">
                    <ItemListPanel
                      items={explorer.filteredCatalog}
                      selectedItemId={explorer.selectedItemId}
                      metricsMap={scopeMetricsMap}
                      scopeLabel={scopeLabel}
                      onSelectItem={explorer.setSelectedItemId}
                    />
                  </div>
                </div>

                <div
                  className={
                    explorer.mobileTab === 'mapa' || explorer.mobileTab === 'itens'
                      ? 'block'
                      : 'hidden lg:block'
                  }
                >
                  <LocationRankingList
                    latest={explorer.latest}
                    selectedItem={explorer.selectedItem}
                    selectedUf={explorer.selectedUf}
                    selectedCityCode={explorer.selectedCityCode}
                    onSelectState={(uf) => {
                      explorer.selectState(uf);
                      explorer.setMobileTab('mapa');
                    }}
                    onSelectCity={(cityCode) => explorer.selectCity(cityCode, true)}
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav
        activeTab={explorer.mobileTab}
        onSelectTab={explorer.setMobileTab}
      />

      <EntityDetailDrawer
        open={explorer.drawerOpen}
        onClose={() => explorer.setDrawerOpen(false)}
        item={explorer.selectedItem}
        stateSnapshot={explorer.selectedStateSnapshot}
        citySnapshot={explorer.selectedCitySnapshot}
        nationalMetric={
          explorer.selectedItem
            ? explorer.latest?.national[explorer.selectedItem.id] || null
            : null
        }
        onSelectItem={explorer.setSelectedItemId}
        catalog={explorer.catalog}
        onGoToHistory={scrollToHistory}
      />

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetectedBarcode}
      />

      <MethodologyModal
        open={explorer.methodologyOpen}
        onClose={() => explorer.setMethodologyOpen(false)}
        manifest={explorer.manifest}
        snapshots={explorer.snapshots}
      />
    </div>
  );
}

export default App;
