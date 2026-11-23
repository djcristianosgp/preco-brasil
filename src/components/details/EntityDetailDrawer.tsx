import { Barcode, MapPin, TrendingDown, TrendingUp, X } from 'lucide-react';
import type {
  CatalogItem,
  CitySnapshot,
  PriceMetric,
  StateSnapshot,
} from '@/types/pricing';
import { formatBRL, formatDateBR, formatIntegerBR, formatVariation } from '@/utils/formatters';

interface EntityDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  item: CatalogItem | null;
  stateSnapshot: StateSnapshot | null;
  citySnapshot: CitySnapshot | null;
  nationalMetric: PriceMetric | null;
  onSelectItem: (itemId: string) => void;
  catalog: CatalogItem[];
  onGoToHistory: () => void;
}

export function EntityDetailDrawer({
  open,
  onClose,
  item,
  stateSnapshot,
  citySnapshot,
  nationalMetric,
  onSelectItem,
  catalog,
  onGoToHistory,
}: EntityDetailDrawerProps) {
  if (!open || !item) return null;

  const activeMetrics = citySnapshot?.items || stateSnapshot?.items || {};
  const currentMetric = activeMetrics[item.id] || nationalMetric;
  const title = citySnapshot
    ? `${citySnapshot.name} (${stateSnapshot?.uf || ''})`
    : stateSnapshot
      ? `${stateSnapshot.name} (${stateSnapshot.uf})`
      : 'Média Nacional (Brasil)';

  const stateAvg = stateSnapshot?.items[item.id]?.avg ?? null;
  const natAvg = nationalMetric?.avg ?? null;

  const diffVsBrazil =
    currentMetric && natAvg && natAvg > 0
      ? ((currentMetric.avg - natAvg) / natAvg) * 100
      : null;

  const diffVsState =
    citySnapshot && currentMetric && stateAvg && stateAvg > 0
      ? ((currentMetric.avg - stateAvg) / stateAvg) * 100
      : null;

  const relatedCatalog = catalog.filter(
    (c) => Boolean(activeMetrics[c.id]) || c.category === item.category,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de preços em ${title}`}
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/60 backdrop-blur-[1px] sm:items-center sm:justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 shadow-drawer sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:p-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-foreground">{item.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5">
                <Barcode className="h-3 w-3" />
                {item.codeLabel || `ANP ${item.anpCode}`}
              </span>
              <span>NCM {item.ncm}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {currentMetric ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-surface-elevated p-3.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Preço Médio Atual</p>
                  <p className="tabular-nums mt-0.5 text-2xl font-bold text-foreground">
                    {formatBRL(currentMetric.avg, item.decimals)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {item.unit}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs font-semibold ${
                      currentMetric.changePct > 0.05
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {currentMetric.changePct > 0.05 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {formatVariation(currentMetric.changePct)}
                  </span>
                  <p className="mt-1 text-[10px] text-muted-foreground">vs período anterior</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Mínimo</p>
                  <p className="tabular-nums font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatBRL(currentMetric.min, item.decimals)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Máximo</p>
                  <p className="tabular-nums font-mono font-semibold text-red-600 dark:text-red-400">
                    {formatBRL(currentMetric.max, item.decimals)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Registros</p>
                  <p className="tabular-nums font-mono font-semibold text-foreground">
                    {formatIntegerBR(currentMetric.samples)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Última referência oficial nesta localidade: {formatDateBR(currentMetric.lastDate)}
              </p>
            </div>

            {(diffVsBrazil !== null || diffVsState !== null) && (
              <div className="grid grid-cols-2 gap-2.5">
                {diffVsBrazil !== null && (
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-[11px] text-muted-foreground">Comparativo vs Brasil</p>
                    <p className="tabular-nums mt-0.5 font-mono text-sm font-bold text-foreground">
                      {formatVariation(diffVsBrazil)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      BR: {formatBRL(natAvg, item.decimals)}
                    </p>
                  </div>
                )}
                {diffVsState !== null && (
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-[11px] text-muted-foreground">
                      Comparativo vs {stateSnapshot?.uf}
                    </p>
                    <p className="tabular-nums mt-0.5 font-mono text-sm font-bold text-foreground">
                      {formatVariation(diffVsState)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      UF: {formatBRL(stateAvg, item.decimals)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Itens disponíveis em {citySnapshot?.name || stateSnapshot?.uf || 'Brasil'}
              </h4>
              <div className="space-y-1.5">
                {relatedCatalog.map((catItem) => {
                  const m = activeMetrics[catItem.id];
                  return (
                    <button
                      key={catItem.id}
                      type="button"
                      onClick={() => onSelectItem(catItem.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                        catItem.id === item.id
                          ? 'border-primary bg-primary/5 font-semibold'
                          : 'border-border bg-surface-elevated/50 hover:bg-surface-elevated'
                      }`}
                    >
                      <span className="truncate text-foreground">{catItem.name}</span>
                      <span className="tabular-nums font-mono font-semibold text-foreground">
                        {m ? formatBRL(m.avg, catItem.decimals) : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onGoToHistory();
                onClose();
              }}
              className="min-h-[44px] w-full rounded-xl bg-[#0F2942] px-4 text-xs font-semibold text-white transition hover:bg-[#173A5C] dark:bg-primary dark:text-slate-950"
            >
              Abrir Gráfico de Evolução Diária
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Sem dados suficientes nesta localidade para o produto selecionado.
          </p>
        )}
      </div>
    </div>
  );
}
