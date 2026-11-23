import { ArrowLeft, ChevronRight, MapPin, Minus, Plus, RotateCcw } from 'lucide-react';
import type { CitySnapshot, StateSnapshot } from '@/types/pricing';

interface MapHeaderBarProps {
  isStateZoom: boolean;
  activeStateSnapshot: StateSnapshot | null;
  activeCitySnapshot: CitySnapshot | null;
  zoomScale: number;
  onSelectState: (uf: string | null) => void;
  onSelectCity: (cityCode: string | null) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function MapHeaderBar({
  isStateZoom,
  activeStateSnapshot,
  activeCitySnapshot,
  zoomScale,
  onSelectState,
  onSelectCity,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: MapHeaderBarProps) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            onResetZoom();
            onSelectState(null);
          }}
          className={`inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2 py-1 transition ${
            isStateZoom
              ? 'bg-surface-muted text-foreground hover:bg-accent'
              : 'bg-[#0F2942] text-white dark:bg-primary dark:text-slate-950'
          }`}
        >
          {isStateZoom && <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>Brasil</span>
        </button>

        {activeStateSnapshot && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onSelectCity(null)}
              className={`inline-flex min-h-[34px] items-center rounded-lg px-2 py-1 transition ${
                activeCitySnapshot
                  ? 'bg-surface-muted text-foreground hover:bg-accent'
                  : 'bg-[#0F2942] text-white dark:bg-primary dark:text-slate-950'
              }`}
            >
              {activeStateSnapshot.name} ({activeStateSnapshot.uf})
            </button>
          </>
        )}

        {activeCitySnapshot && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="inline-flex min-h-[34px] items-center gap-1 truncate rounded-lg bg-primary/10 px-2 py-1 font-semibold text-primary">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeCitySnapshot.name}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={zoomScale <= 1}
          aria-label="Reduzir zoom"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-foreground transition hover:bg-accent disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={zoomScale >= 2.5}
          aria-label="Ampliar zoom"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-foreground transition hover:bg-accent disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {zoomScale > 1 && (
          <button
            type="button"
            onClick={onResetZoom}
            aria-label="Centralizar mapa"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-foreground transition hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
