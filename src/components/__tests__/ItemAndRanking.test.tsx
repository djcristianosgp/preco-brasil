import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemListPanel } from '@/components/items/ItemListPanel';
import { QuickItemPills } from '@/components/items/QuickItemPills';
import { LocationRankingList } from '@/components/ranking/LocationRankingList';
import { FIXTURE_CATALOG, FIXTURE_LATEST } from '@/test/fixtures';

describe('ItemListPanel, QuickItemPills & LocationRankingList', () => {
  it('renders item list and quick pills and fires selection callbacks', () => {
    const onSelect = vi.fn();
    render(
      <>
        <QuickItemPills
          items={FIXTURE_CATALOG}
          selectedItemId="gasolina-comum"
          metricsMap={FIXTURE_LATEST.national}
          onSelectItem={onSelect}
        />
        <ItemListPanel
          items={FIXTURE_CATALOG}
          selectedItemId="gasolina-comum"
          metricsMap={FIXTURE_LATEST.national}
          scopeLabel="Brasil"
          onSelectItem={onSelect}
        />
      </>,
    );

    expect(screen.getAllByText('Gasolina Comum').length).toBeGreaterThan(0);
    expect(screen.getByText(/ANP 810101001/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Etanol/i }));
    expect(onSelect).toHaveBeenCalledWith('etanol');
  });

  it('renders empty state when search yields zero items', () => {
    render(
      <ItemListPanel
        items={[]}
        selectedItemId="gasolina-comum"
        metricsMap={FIXTURE_LATEST.national}
        scopeLabel="Brasil"
        onSelectItem={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nenhum item encontrado/i)).toBeInTheDocument();
  });

  it('sorts and filters state and city rankings', () => {
    const onSelectState = vi.fn();
    const onSelectCity = vi.fn();

    const { rerender } = render(
      <LocationRankingList
        latest={FIXTURE_LATEST}
        selectedItem={FIXTURE_CATALOG[0]}
        selectedUf={null}
        selectedCityCode={null}
        onSelectState={onSelectState}
        onSelectCity={onSelectCity}
      />,
    );

    expect(screen.getByText(/Ranking por Estado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Menor preço/i }));
    expect(screen.getByRole('button', { name: /Maior preço/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Maior preço/i }));
    expect(screen.getByRole('button', { name: /A–Z/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filtrar estado/i), { target: { value: 'São Paulo' } });
    fireEvent.click(screen.getByRole('button', { name: /São Paulo \(SP\)/i }));
    expect(onSelectState).toHaveBeenCalledWith('SP');

    rerender(
      <LocationRankingList
        latest={FIXTURE_LATEST}
        selectedItem={FIXTURE_CATALOG[0]}
        selectedUf="SP"
        selectedCityCode={null}
        onSelectState={onSelectState}
        onSelectCity={onSelectCity}
      />,
    );
    expect(screen.getByText(/Municípios em SP/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /São Paulo/i }));
    expect(onSelectCity).toHaveBeenCalledWith('3550308');
  });
});
