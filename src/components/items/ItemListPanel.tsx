import { ArrowDownRight, ArrowUpRight, Barcode, Minus } from 'lucide-react';
import type { CatalogItem, PriceMetric } from '@/types/pricing';
import { formatBRL, formatIntegerBR, formatVariation } from '@/utils/formatters';

interface ItemListPanelProps {
  items: CatalogItem[];
  selectedItemId: string;
  metricsMap: Record<string, PriceMetric>;
  scopeLabel: string;
  onSelectItem: (itemId: string) => void;
  onInspectItem?: (itemId: string) => void;
}

export function ItemListPanel({
  items,
  selectedItemId,
  metricsMap,
  scopeLabel,
  onSelectItem,
  onInspectItem,
}: ItemListPanelProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-xs text-muted-foreground">
        Nenhum item encontrado na cesta monitorada para a busca informada. Use a aba{' '}
        <strong>Código</strong> para consultar produtos de varejo por GTIN/EAN-13.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Itens Monitorados · {scopeLabel}
        </h2>
        <span className="font-mono text-[11px] text-muted-foreground">{items.length} itens</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const metric = metricsMap[item.id];
          const active = item.id === selectedItemId;
          const change = metric?.changePct ?? 0;
          const isUp = change > 0.05;
          const isDown = change < -0.05;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectItem(item.id);
                onInspectItem?.(item.id);
              }}
              aria-pressed={active}
              className={`w-full rounded-xl border p-3 text-left transition ${
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </span>
                    {item.priority <= 3 && (
                      <span className="shrink-0 rounded bg-[#0F2942]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0F2942] dark:bg-sky-500/15 dark:text-sky-300">
                        Top
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10px]">
                      <Barcode className="h-3 w-3" aria-hidden="true" />
                      ANP {item.anpCode}
                    </span>
                    <span className="font-mono text-[10px]">NCM {item.ncm}</span>
                    {metric && (
                      <span className="text-[10px]">
                        · {formatIntegerBR(metric.samples)} coletas
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="tabular-nums text-base font-bold text-foreground">
                    {metric ? formatBRL(metric.avg, item.decimals) : '—'}
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                    {metric && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10px] font-semibold ${
                          isUp
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : isDown
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-muted-foreground'
                        }`}
                      >
                        {isUp ? (
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        ) : isDown ? (
                          <ArrowDownRight className="h-2.5 w-2.5" />
                        ) : (
                          <Minus className="h-2.5 w-2.5" />
                        )}
                        {formatVariation(change)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
