import type { GeoLevel } from '@/types/pricing';
import type { LegendStop } from '@/utils/colorScale';

interface MapLegendBarProps {
  unit: string;
  stops: LegendStop[];
  isStateZoom: boolean;
  citiesCount: number;
  geoLevel?: GeoLevel;
}

export function MapLegendBar({
  unit,
  stops,
  isStateZoom,
  citiesCount,
  geoLevel = 'city',
}: MapLegendBarProps) {
  const hint = !isStateZoom
    ? 'Toque em um estado para desmembrar os municípios'
    : geoLevel === 'state'
      ? 'Índice oficial estadual (aplicável a toda a UF)'
      : `${citiesCount} municípios monitorados — toque para detalhar`;

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Faixa ({unit}):
        </span>
        {stops.map((stop) => (
          <span
            key={stop.color}
            className="inline-flex items-center gap-1 rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-foreground"
          >
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: stop.color }}
              aria-hidden="true"
            />
            {stop.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
