import { Info, Moon, QrCode, Search, Sun, TrendingUp, X } from 'lucide-react';
import type { DataManifest, ThemeMode } from '@/types/pricing';
import { formatDateBR } from '@/utils/formatters';

interface AppHeaderProps {
  manifest: DataManifest | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenScanner: () => void;
  onOpenBarcodeTab: () => void;
  onOpenMethodology: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function AppHeader({
  manifest,
  searchQuery,
  onSearchChange,
  onOpenScanner,
  onOpenBarcodeTab,
  onOpenMethodology,
  theme,
  onToggleTheme,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0F2942] text-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-400/30">
            <TrendingUp className="h-5 w-5 text-sky-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight sm:text-base">
                PreçoBrasil
              </span>
              {manifest && (
                <span className="inline-block shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-medium text-emerald-300 ring-1 ring-emerald-400/30 sm:text-[10px]">
                  v{manifest.dataVersion}
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-slate-300">
              {manifest
                ? `Atualizado até ${formatDateBR(manifest.latestCollectionDate)} · ${manifest.statesCovered} UFs`
                : 'Observatório Nacional de Preços'}
            </p>
          </div>
        </div>

        {/* Desktop search + barcode */}
        <div className="hidden max-w-md flex-1 items-center gap-2 md:flex">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar item ou código (ANP, NCM, EAN-13)..."
              aria-label="Buscar item ou código de barras"
              className="h-9 w-full rounded-lg border border-white/15 bg-white/10 pl-9 pr-8 text-xs text-white placeholder:text-slate-300 focus:border-sky-400 focus:bg-white/15 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenScanner}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 text-xs font-medium text-sky-100 ring-1 ring-sky-400/40 transition hover:bg-sky-500/30"
          >
            <QrCode className="h-4 w-4" aria-hidden="true" />
            <span>Código</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenBarcodeTab}
            aria-label="Buscar por código de barras"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/10 md:hidden"
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenMethodology}
            aria-label="Metodologia e versões diárias"
            title="Metodologia e Histórico de Versões"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/10"
          >
            <Info className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
