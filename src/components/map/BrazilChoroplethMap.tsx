import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { MapHeaderBar } from '@/components/map/MapHeaderBar';
import { MapLegendBar } from '@/components/map/MapLegendBar';
import type {
  CatalogItem,
  GeoAreaFeature,
  GeoAreaFeatureCollection,
  LatestPricesPayload,
  PriceMetric,
} from '@/types/pricing';
import { computePriceDomain, getLegendStops, getPriceColor } from '@/utils/colorScale';
import { formatBRL, formatIntegerBR, formatVariation } from '@/utils/formatters';
import { rewindGeoCollection } from '@/utils/geoWinding';

interface BrazilChoroplethMapProps {
  brazilGeo: GeoAreaFeatureCollection | null;
  stateGeo: GeoAreaFeatureCollection | null;
  latest: LatestPricesPayload | null;
  selectedItem: CatalogItem | null;
  selectedUf: string | null;
  selectedCityCode: string | null;
  isDark: boolean;
  loadingState: boolean;
  onSelectState: (uf: string | null) => void;
  onSelectCity: (cityCode: string | null) => void;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 560;

const UF_LABEL_OFFSETS: Record<string, [number, number]> = {
  DF: [0, -6],
  RN: [14, -4],
  PB: [18, 0],
  PE: [20, 4],
  AL: [16, 4],
  SE: [14, 6],
  ES: [14, 2],
  RJ: [12, 8],
  SC: [6, 4],
};

interface HoverTooltip {
  title: string;
  subtitle: string;
  metric: PriceMetric | null;
  x: number;
  y: number;
}

export function BrazilChoroplethMap({
  brazilGeo,
  stateGeo,
  latest,
  selectedItem,
  selectedUf,
  selectedCityCode,
  isDark,
  loadingState,
  onSelectState,
  onSelectCity,
}: BrazilChoroplethMapProps) {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [hoverInfo, setHoverInfo] = useState<HoverTooltip | null>(null);

  const isStateZoom = Boolean(selectedUf);
  const rawActiveGeo = isStateZoom && stateGeo ? stateGeo : brazilGeo;
  const activeGeo = useMemo(
    () => (rawActiveGeo ? rewindGeoCollection(rawActiveGeo) : null),
    [rawActiveGeo],
  );
  const activeStateSnapshot = selectedUf && latest ? latest.states[selectedUf] : null;
  const activeCitySnapshot =
    activeStateSnapshot && selectedCityCode ? activeStateSnapshot.cities[selectedCityCode] : null;

  const domain = useMemo(() => {
    if (!latest || !selectedItem) return null;
    const source =
      isStateZoom && activeStateSnapshot
        ? Object.values(activeStateSnapshot.cities).map((c) => c.items[selectedItem.id]?.avg)
        : Object.values(latest.states).map((s) => s.items[selectedItem.id]?.avg);
    return computePriceDomain(source.filter((v): v is number => typeof v === 'number'));
  }, [latest, selectedItem, isStateZoom, activeStateSnapshot]);

  const legendStops = useMemo(() => getLegendStops(domain), [domain]);

  const renderedFeatures = useMemo(() => {
    if (!activeGeo || !activeGeo.features?.length) return [];
    const projection = geoMercator().fitExtent(
      [
        [20, 20],
        [SVG_WIDTH - 20, SVG_HEIGHT - 20],
      ],
      activeGeo,
    );
    const generator = geoPath().projection(projection);
    return activeGeo.features.map((feature) => {
      const d = generator(feature) || '';
      const [cx, cy] = generator.centroid(feature);
      return { feature, d, cx, cy };
    });
  }, [activeGeo]);

  const getMetricForFeature = (feature: GeoAreaFeature): PriceMetric | null => {
    if (!latest || !selectedItem) return null;
    if (isStateZoom) {
      return activeStateSnapshot?.cities[feature.properties.code]?.items[selectedItem.id] || null;
    }
    const uf = feature.properties.uf || feature.properties.code;
    return latest.states[uf]?.items[selectedItem.id] || null;
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-corporate sm:p-4">
      <MapHeaderBar
        isStateZoom={isStateZoom}
        activeStateSnapshot={activeStateSnapshot}
        activeCitySnapshot={activeCitySnapshot}
        zoomScale={zoomScale}
        onSelectState={onSelectState}
        onSelectCity={onSelectCity}
        onZoomIn={() => setZoomScale((s) => Math.min(2.5, Math.round((s + 0.25) * 100) / 100))}
        onZoomOut={() => setZoomScale((s) => Math.max(1, Math.round((s - 0.25) * 100) / 100))}
        onResetZoom={() => setZoomScale(1)}
      />

      <div className="relative overflow-hidden rounded-xl border border-border bg-surface-elevated">
        {loadingState && isStateZoom && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/75 backdrop-blur-[1px]">
            <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              Desmembrando municípios de {selectedUf}...
            </span>
          </div>
        )}

        {renderedFeatures.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-xs text-muted-foreground sm:h-[420px]">
            Carregando malha territorial oficial do IBGE...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label={
              isStateZoom
                ? `Mapa municipal de ${activeStateSnapshot?.name || selectedUf}`
                : 'Mapa do Brasil separado por estados'
            }
            className="h-auto max-h-[430px] w-full select-none touch-manipulation sm:max-h-[520px]"
            onMouseLeave={() => setHoverInfo(null)}
          >
            <g
              transform={`translate(${SVG_WIDTH / 2}, ${SVG_HEIGHT / 2}) scale(${zoomScale}) translate(${-SVG_WIDTH / 2}, ${-SVG_HEIGHT / 2})`}
              className="transition-transform duration-300 ease-out"
            >
              {renderedFeatures.map(({ feature, d }) => {
                const metric = getMetricForFeature(feature);
                const code = feature.properties.code;
                const uf = feature.properties.uf || code;
                const isSelected = isStateZoom ? code === selectedCityCode : uf === selectedUf;
                const fill = getPriceColor(metric?.avg, domain, isDark);
                const stroke = isSelected
                  ? isDark
                    ? '#F8FAFC'
                    : '#0F2942'
                  : isDark
                    ? '#0F172A'
                    : '#FFFFFF';

                return (
                  <path
                    key={code}
                    d={d}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2.2 : isStateZoom ? 0.65 : 1.1}
                    className="cursor-pointer transition-opacity duration-150 hover:opacity-85 focus:outline-none"
                    tabIndex={0}
                    role="button"
                    aria-label={`${feature.properties.name}${metric && selectedItem ? `: ${formatBRL(metric.avg, selectedItem.decimals)}` : ': sem coleta na janela'}`}
                    onClick={() => {
                      if (isStateZoom) {
                        if (metric) onSelectCity(code);
                      } else {
                        setZoomScale(1);
                        onSelectState(uf);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isStateZoom && metric) onSelectCity(code);
                        if (!isStateZoom) onSelectState(uf);
                      }
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!rect) return;
                      setHoverInfo({
                        title: isStateZoom
                          ? `${feature.properties.name} (${selectedUf})`
                          : `${feature.properties.name} (${uf})`,
                        subtitle: isStateZoom
                          ? metric
                            ? `${formatIntegerBR(metric.samples)} coletas`
                            : 'Sem coleta ANP neste ciclo'
                          : `${latest?.states[uf]?.citiesCount || 0} cidades pesquisadas`,
                        metric,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                  />
                );
              })}

              {!isStateZoom &&
                renderedFeatures.map(({ feature, cx, cy }) => {
                  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                  const uf = feature.properties.uf || feature.properties.code;
                  const [dx, dy] = UF_LABEL_OFFSETS[uf] || [0, 0];
                  return (
                    <text
                      key={`lbl-${uf}`}
                      x={cx + dx}
                      y={cy + dy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none fill-white text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(15,41,66,0.9)]"
                    >
                      {uf}
                    </text>
                  );
                })}

              {isStateZoom &&
                renderedFeatures.map(({ feature, cx, cy }) => {
                  if (feature.properties.code !== selectedCityCode) return null;
                  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
                  return (
                    <circle
                      key={`city-pin-${feature.properties.code}`}
                      cx={cx}
                      cy={cy}
                      r={4.5}
                      fill="#0F2942"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                      className="pointer-events-none"
                    />
                  );
                })}
            </g>
          </svg>
        )}

        {hoverInfo && (
          <div
            style={{
              left: Math.min(hoverInfo.x + 12, 340),
              top: Math.max(hoverInfo.y - 12, 8),
            }}
            className="pointer-events-none absolute z-20 hidden rounded-lg border border-border bg-surface/95 px-2.5 py-2 text-xs shadow-lg backdrop-blur-sm sm:block"
          >
            <p className="font-semibold text-foreground">{hoverInfo.title}</p>
            {hoverInfo.metric && selectedItem ? (
              <div className="mt-1 flex items-center gap-2">
                <span className="tabular-nums font-mono font-bold text-primary">
                  {formatBRL(hoverInfo.metric.avg, selectedItem.decimals)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({formatVariation(hoverInfo.metric.changePct)})
                </span>
              </div>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{hoverInfo.subtitle}</p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground">{hoverInfo.subtitle}</p>
          </div>
        )}
      </div>

      <MapLegendBar
        unit={selectedItem?.unit || 'R$'}
        stops={legendStops}
        isStateZoom={isStateZoom}
        citiesCount={activeStateSnapshot?.citiesCount || 0}
      />
    </div>
  );
}
