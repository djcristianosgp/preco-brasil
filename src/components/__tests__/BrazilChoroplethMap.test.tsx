import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrazilChoroplethMap } from '@/components/map/BrazilChoroplethMap';
import {
  FIXTURE_BRAZIL_GEO,
  FIXTURE_CATALOG,
  FIXTURE_LATEST,
  FIXTURE_SP_GEO,
} from '@/test/fixtures';

describe('BrazilChoroplethMap', () => {
  it('renders Brazil states and dispatches state drilldown on click', () => {
    const onSelectState = vi.fn();
    const onSelectCity = vi.fn();

    render(
      <BrazilChoroplethMap
        brazilGeo={FIXTURE_BRAZIL_GEO}
        stateGeo={null}
        latest={FIXTURE_LATEST}
        selectedItem={FIXTURE_CATALOG[0]}
        selectedUf={null}
        selectedCityCode={null}
        isDark={false}
        loadingState={false}
        onSelectState={onSelectState}
        onSelectCity={onSelectCity}
      />,
    );

    const spPath = screen.getByRole('button', { name: /São Paulo/i });
    fireEvent.click(spPath);
    expect(onSelectState).toHaveBeenCalledWith('SP');

    // Zoom controls & keyboard navigation
    fireEvent.keyDown(spPath, { key: 'Enter' });
    expect(onSelectState).toHaveBeenCalledWith('SP');
    const zoomIn = screen.getByRole('button', { name: /Ampliar zoom/i });
    fireEvent.click(zoomIn);
    fireEvent.click(screen.getByRole('button', { name: /Reduzir zoom/i }));
    fireEvent.click(zoomIn);
    expect(screen.getByRole('button', { name: /Centralizar mapa/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Centralizar mapa/i }));
    fireEvent.mouseEnter(spPath);
    fireEvent.mouseLeave(screen.getByRole('img'));
  });

  it('renders state municipalities on zoom and allows city selection and back to Brazil', () => {
    const onSelectState = vi.fn();
    const onSelectCity = vi.fn();

    render(
      <BrazilChoroplethMap
        brazilGeo={FIXTURE_BRAZIL_GEO}
        stateGeo={FIXTURE_SP_GEO}
        latest={FIXTURE_LATEST}
        selectedItem={FIXTURE_CATALOG[0]}
        selectedUf="SP"
        selectedCityCode="3550308"
        isDark={true}
        loadingState={false}
        onSelectState={onSelectState}
        onSelectCity={onSelectCity}
      />,
    );

    const cityPath = screen.getByRole('button', { name: /São Paulo: R\$/i });
    fireEvent.mouseEnter(cityPath);
    fireEvent.click(cityPath);
    expect(onSelectCity).toHaveBeenCalledWith('3550308');

    fireEvent.click(screen.getByRole('button', { name: /São Paulo \(SP\)/i }));
    expect(onSelectCity).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByRole('button', { name: /^Brasil$/i }));
    expect(onSelectState).toHaveBeenCalledWith(null);
  });
});
