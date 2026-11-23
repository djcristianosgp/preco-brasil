import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronRight, Search } from 'lucide-react';
import type { CatalogItem, LatestPricesPayload, PriceMetric } from '@/types/pricing';
import { formatBRL, formatIntegerBR, formatVariation, normalizeSearchText } from '@/utils/formatters';

interface LocationRankingListProps {
  latest: LatestPricesPayload | null;
  selectedItem: CatalogItem | null;
  selectedUf: string | null;
  selectedCityCode: string | null;
  onSelectState: (uf: string) => void;
  onSelectCity: (cityCode: string) => void;
}

type SortMode = 'asc' | 'desc' | 'name';

interface LocationRow {
  key: string;
  label: string;
  subLabel: string;
  metric: PriceMetric;
  isSelected: boolean;
}

export function LocationRankingList({
  latest,
  selectedItem,
  selectedUf,
  selectedCityCode,
  onSelectState,
  onSelectCity,
}: LocationRankingListProps) {
  const [filterText, setFilterText] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('asc');

  const isStateMode = Boolean(selectedUf);

  const rows = useMemo(() => {
    if (!latest || !selectedItem) return [] as LocationRow[];
    const q = normalizeSearchText(filterText);

    let list: LocationRow[] = [];
    if (isStateMode && selectedUf) {
      const stateSnap = latest.states[selectedUf];
      if (!stateSnap) return [];
      list = Object.values(stateSnap.cities)
        .map((city) => {
          const metric = city.items[selectedItem.id];
          if (!metric) return null;
          return {
            key: city.code,
            label: city.name,
            subLabel: `${formatIntegerBR(metric.samples)} coletas`,
            metric,
            isSelected: city.code === selectedCityCode,
          };
        })
        .filter((r): r is LocationRow => r !== null);
    } else {
      list = Object.values(latest.states)
        .map((st) => {
          const metric = st.items[selectedItem.id];
          if (!metric) return null;
          return {
            key: st.uf,
            label: `${st.name} (${st.uf})`,
            subLabel: `${st.citiesCount} cidades · ${formatIntegerBR(metric.samples)} coletas`,
            metric,
            isSelected: st.uf === selectedUf,
          };
        })
        .filter((r): r is LocationRow => r !== null);
    }

    if (q) {
      list = list.filter((r) => normalizeSearchText(r.label).includes(q));
    }

    list.sort((a, b) => {
      if (sortMode === 'asc') return a.metric.avg - b.metric.avg;
      if (sortMode === 'desc') return b.metric.avg - a.metric.avg;
      return a.label.localeCompare(b.label, 'pt-BR');
    });

    return list;
  }, [latest, selectedItem, isStateMode, selectedUf, selectedCityCode, filterText, sortMode]);

  const cycleSort = () => {
    setSortMode((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? 'name' : 'asc'));
  };

  const sortLabel =
    sortMode === 'asc' ? 'Menor preço' : sortMode === 'desc' ? 'Maior preço' : 'A–Z';

  return (
    <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-corporate">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isStateMode ? `Municípios em ${selectedUf}` : 'Ranking por Estado (27 UFs)'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {selectedItem?.name || 'Item'} · {rows.length} localidades
          </p>
        </div>

        <button
          type="button"
          onClick={cycleSort}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{sortLabel}</span>
        </button>
      </div>

      <div className="relative mb-2.5">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={isStateMode ? 'Filtrar município...' : 'Filtrar estado...'}
          aria-label={isStateMode ? 'Filtrar município' : 'Filtrar estado'}
          className="h-9 w-full rounded-lg border border-input bg-surface-elevated pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Nenhuma localidade encontrada com este filtro.
        </p>
      ) : (
        <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
          {rows.map((row, index) => (
            <button
              key={row.key}
              type="button"
              onClick={() => (isStateMode ? onSelectCity(row.key) : onSelectState(row.key))}
              className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                row.isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-surface-elevated/50 hover:border-primary/40 hover:bg-surface-elevated'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-muted font-mono text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{row.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{row.subLabel}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="tabular-nums font-mono text-xs font-bold text-foreground">
                    {formatBRL(row.metric.avg, selectedItem?.decimals || 2)}
                  </p>
                  <p
                    className={`tabular-nums font-mono text-[10px] ${
                      row.metric.changePct > 0.05
                        ? 'text-red-600 dark:text-red-400'
                        : row.metric.changePct < -0.05
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {formatVariation(row.metric.changePct)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
