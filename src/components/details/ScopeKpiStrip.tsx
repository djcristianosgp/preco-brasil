import { ArrowDownRight, ArrowUpRight, Fuel, Minus } from 'lucide-react';
import type { CatalogItem, PriceMetric } from '@/types/pricing';
import {
  calculateEthanolParity,
  formatBRL,
  formatDateBR,
  formatIntegerBR,
  formatVariation,
} from '@/utils/formatters';

interface ScopeKpiStripProps {
  item: CatalogItem | null;
  metric: PriceMetric | null;
  scopeLabel: string;
  ethanolPrice?: number | null;
  gasolinePrice?: number | null;
}

export function ScopeKpiStrip({
  item,
  metric,
  scopeLabel,
  ethanolPrice,
  gasolinePrice,
}: ScopeKpiStripProps) {
  if (!item || !metric) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3.5 text-xs text-muted-foreground shadow-corporate">
        Sem dados disponíveis para {item?.name || 'o item selecionado'} em {scopeLabel}.
      </div>
    );
  }

  const parity =
    item.id === 'gasolina-comum' || item.id === 'etanol'
      ? calculateEthanolParity(ethanolPrice, gasolinePrice)
      : null;

  const isUp = metric.changePct > 0.05;
  const isDown = metric.changePct < -0.05;

  return (
    <section aria-label="Indicadores do recorte selecionado" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div className="rounded-xl border border-border bg-surface p-3 shadow-corporate">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span className="truncate">Média · {scopeLabel}</span>
          <span className="font-mono text-[10px]">{item.unit}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="tabular-nums text-xl font-bold tracking-tight text-foreground">
            {formatBRL(metric.avg, item.decimals)}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              isUp
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : isDown
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-slate-500/10 text-muted-foreground'
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : isDown ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {formatVariation(metric.changePct)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 shadow-corporate">
        <p className="text-[11px] font-medium text-muted-foreground">Menor / Maior na Janela</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {formatBRL(metric.min, item.decimals)}
          </span>
          <span className="text-xs text-muted-foreground">a</span>
          <span className="tabular-nums text-sm font-semibold text-red-600 dark:text-red-400">
            {formatBRL(metric.max, item.decimals)}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Ref.: {formatDateBR(metric.lastDate)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 shadow-corporate">
        <p className="text-[11px] font-medium text-muted-foreground">Amostragem Oficial</p>
        <p className="tabular-nums mt-1 text-base font-bold text-foreground">
          {formatIntegerBR(metric.samples)} <span className="text-xs font-normal text-muted-foreground">coletas</span>
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          ANP {item.anpCode}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3 shadow-corporate">
        {parity ? (
          <>
            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>Paridade Etanol</span>
              <Fuel className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <p className="tabular-nums mt-1 text-base font-bold text-foreground">
              {parity.ratioPct.toFixed(1).replace('.', ',')}%
            </p>
            <p
              className={`mt-0.5 text-[10px] font-medium ${
                parity.favorable ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {parity.favorable ? 'Etanol competitivo (≤ 70%)' : 'Gasolina mais vantajosa'}
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-medium text-muted-foreground">Código Fiscal NCM</p>
            <p className="tabular-nums mt-1 font-mono text-base font-bold text-foreground">
              {item.ncm}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.categoryLabel}</p>
          </>
        )}
      </div>
    </section>
  );
}
