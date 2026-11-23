import type { CatalogItem, PriceMetric } from '@/types/pricing';
import { formatBRL } from '@/utils/formatters';

interface QuickItemPillsProps {
  items: CatalogItem[];
  selectedItemId: string;
  metricsMap: Record<string, PriceMetric>;
  onSelectItem: (itemId: string) => void;
}

export function QuickItemPills({
  items,
  selectedItemId,
  metricsMap,
  onSelectItem,
}: QuickItemPillsProps) {
  return (
    <div
      role="tablist"
      aria-label="Seleção rápida de itens monitorados"
      className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
    >
      {items.map((item) => {
        const active = item.id === selectedItemId;
        const metric = metricsMap[item.id];
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelectItem(item.id)}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition ${
              active
                ? 'border-primary bg-[#0F2942] text-white shadow-sm dark:bg-primary dark:text-slate-950'
                : 'border-border bg-surface text-foreground hover:bg-surface-elevated'
            }`}
          >
            <span className="text-xs font-semibold">{item.shortName}</span>
            <span
              className={`tabular-nums font-mono text-xs font-medium ${
                active ? 'text-sky-300 dark:text-slate-900' : 'text-muted-foreground'
              }`}
            >
              {metric ? formatBRL(metric.avg, item.decimals) : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
