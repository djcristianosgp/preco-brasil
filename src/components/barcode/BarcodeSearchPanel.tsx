import { useState, type FormEvent } from 'react';
import {
  Barcode,
  Camera,
  CheckCircle2,
  ExternalLink,
  PackageSearch,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { lookupBarcodeOrProduct } from '@/services/barcodeLookupService';
import type { BarcodeLookupResult, CatalogItem, PriceMetric } from '@/types/pricing';
import { formatBRL } from '@/utils/formatters';

interface BarcodeSearchPanelProps {
  catalog: CatalogItem[];
  metricsMap: Record<string, PriceMetric>;
  scopeLabel: string;
  onSelectCatalogItem: (itemId: string) => void;
  onOpenCamera: () => void;
  externalCode?: string;
}

const SAMPLE_CODES = [
  { label: 'Gasolina (ANP 320102001)', code: '320102001' },
  { label: 'Etanol (ANP 810101001)', code: '810101001' },
  { label: 'Diesel S10 (ANP 820101034)', code: '820101034' },
  { label: 'Leite Moça (EAN 7891000100103)', code: '7891000100103' },
];

export function BarcodeSearchPanel({
  catalog,
  metricsMap,
  scopeLabel,
  onSelectCatalogItem,
  onOpenCamera,
  externalCode,
}: BarcodeSearchPanelProps) {
  const [inputCode, setInputCode] = useState(externalCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeLookupResult | null>(null);

  const runLookup = async (codeToSearch: string) => {
    setInputCode(codeToSearch);
    setLoading(true);
    try {
      const res = await lookupBarcodeOrProduct(codeToSearch, catalog);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runLookup(inputCode);
  };

  return (
    <section
      aria-label="Consulta por código de barras"
      className="space-y-3 rounded-2xl border border-border bg-surface p-3.5 shadow-corporate sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Barcode className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Busca Exata por Código de Barras</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Evita ambiguidade na descrição: consulte por EAN-13, EAN-8, GTIN-14, código ANP ou NCM.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCamera}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-[#0F2942] px-3 text-xs font-medium text-white transition hover:bg-[#173A5C] dark:bg-primary dark:text-slate-950"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          <span>Escanear</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            inputMode="numeric"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Digite EAN-13, ANP ou NCM (ex: 320102001 ou 7891000100103)"
            aria-label="Código de barras ou identificador do produto"
            className="h-11 w-full rounded-xl border border-input bg-surface-elevated pl-9 pr-3 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Consultar'}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {SAMPLE_CODES.map((sample) => (
          <button
            key={sample.code}
            type="button"
            onClick={() => void runLookup(sample.code)}
            className="rounded-lg border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/40 hover:bg-accent"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {result && (
        <div className="space-y-2.5 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              {result.status === 'not-found' || result.status === 'error' ? (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <span>{result.message}</span>
            </span>
            <span className="rounded bg-surface-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              Formato: {result.gtinFormat}
              {result.isValidGtin ? ' · Dígito GS1 válido' : ''}
            </span>
          </div>

          {result.catalogMatches.length > 0 && (
            <div className="space-y-2">
              {result.catalogMatches.map((item) => {
                const metric = metricsMap[item.id];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        ANP {item.anpCode} · NCM {item.ncm}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="tabular-nums font-mono text-sm font-bold text-foreground">
                          {metric ? formatBRL(metric.avg, item.decimals) : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{scopeLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectCatalogItem(item.id)}
                        className="min-h-[36px] rounded-lg bg-[#0F2942] px-3 text-xs font-medium text-white hover:bg-[#173A5C] dark:bg-primary dark:text-slate-950"
                      >
                        Ver no mapa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {result.externalProduct && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-start gap-3">
                {result.externalProduct.imageUrl ? (
                  <img
                    src={result.externalProduct.imageUrl}
                    alt={result.externalProduct.productName}
                    className="h-14 w-14 shrink-0 rounded-lg border border-border bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
                    <PackageSearch className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                      EAN {result.externalProduct.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      {result.externalProduct.source}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {result.externalProduct.productName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {result.externalProduct.brands} · {result.externalProduct.quantity}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Item identificado por código de barras. Série diária de preços habilitada assim que integrado ao conector estadual de NFC-e (SEFAZ).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
