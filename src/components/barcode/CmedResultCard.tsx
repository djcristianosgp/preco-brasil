import { Pill, ShieldCheck } from 'lucide-react';
import type { CmedProductResult } from '@/types/pricing';
import { CMED_ICMS_KEYS, UF_ICMS_2026 } from '@/utils/cmedIcms';
import { formatBRL } from '@/utils/formatters';

interface CmedResultCardProps {
  product: CmedProductResult;
  selectedUf?: string | null;
}

const KEY_UF_EXAMPLES: Record<string, string> = {
  '17': 'ES, MT, MS, RS, SC',
  '18': 'AP, MG, SP',
  '19': 'AC, GO, PA',
  '19,5': 'PR, RO',
  '20': 'AL, AM, CE, DF, PB, RN, RR, SE, TO',
  '20,5': 'BA, PE',
  '21': 'Base 21%',
  '22': 'RJ',
  '22,5': 'PI',
  '23': 'MA',
};

export function CmedResultCard({ product, selectedUf }: CmedResultCardProps) {
  const activeUf = selectedUf ? selectedUf.toUpperCase() : null;
  const activeIcms = activeUf ? UF_ICMS_2026[activeUf] || '18' : null;
  const activePmc = activeUf ? product.pmcByUf[activeUf] : null;

  return (
    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          <Pill className="h-3 w-3" aria-hidden="true" />
          CMED · EAN {product.ean}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          Tabela Oficial ANVISA ({product.tarja})
        </span>
      </div>

      <p className="mt-1.5 text-sm font-bold text-foreground">{product.productName}</p>
      <p className="text-xs font-medium text-primary">{product.substance}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {product.presentation} · {product.laboratory}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-2.5">
        {activeUf && activePmc ? (
          <div>
            <p className="text-[10px] text-muted-foreground">
              Teto PMC em {activeUf} (ICMS {activeIcms}%)
            </p>
            <p className="tabular-nums font-mono text-lg font-bold text-foreground">
              {formatBRL(activePmc)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-muted-foreground">Faixa Nacional PMC (ICMS 17%–23%)</p>
            <p className="tabular-nums font-mono text-base font-bold text-foreground">
              {formatBRL(product.minPmc)} a {formatBRL(product.maxPmc)}
            </p>
          </div>
        )}
        <div className="text-right text-[10px] text-muted-foreground">
          <p>Preço Máximo ao Consumidor</p>
          <p className="font-mono">Base 18%: {formatBRL(product.pmcByIcms['18'])}</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {CMED_ICMS_KEYS.filter((k) => k !== '17,5').map((icms) => {
          const isHighlighted = activeIcms === icms;
          return (
            <div
              key={icms}
              title={KEY_UF_EXAMPLES[icms] || icms}
              className={`rounded-lg border px-2 py-1 text-center ${
                isHighlighted
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface-elevated/60'
              }`}
            >
              <p className="font-mono text-[9px] text-muted-foreground">ICMS {icms}%</p>
              <p className="tabular-nums font-mono text-[11px] font-semibold text-foreground">
                {formatBRL(product.pmcByIcms[icms])}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
