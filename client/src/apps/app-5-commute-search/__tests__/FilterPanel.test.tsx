import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '../components/FilterPanel';
import type { SearchFilters } from '../lib/types';

vi.mock('../lib/api', () => ({
  saveListing: vi.fn(() => Promise.resolve()),
  unsaveListing: vi.fn(() => Promise.resolve()),
}));

const defaultFilters: SearchFilters = {
  destination_lat: null,
  destination_lng: null,
  destination_label: '',
  mode: 'transit',
  max_commute_seconds: 2700,
  page: 1,
  sort: 'commute_asc',
};

describe('FilterPanel (sidebar mode)', () => {
  it('renders without crashing', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByLabelText(/filter panel/i)).toBeInTheDocument();
  });

  it('renders the commute slider', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('shows "Max Transfers" section when mode is transit', () => {
    render(
      <FilterPanel
        filters={{ ...defaultFilters, mode: 'transit' }}
        onChange={vi.fn()}
        mode="sidebar"
      />
    );
    expect(screen.getByText(/max transfers/i)).toBeInTheDocument();
  });

  it('hides "Max Transfers" section when mode is driving', () => {
    render(
      <FilterPanel
        filters={{ ...defaultFilters, mode: 'driving' }}
        onChange={vi.fn()}
        mode="sidebar"
      />
    );
    expect(screen.queryByText(/max transfers/i)).not.toBeInTheDocument();
  });

  it('hides "Max Transfers" section when mode is walking', () => {
    render(
      <FilterPanel
        filters={{ ...defaultFilters, mode: 'walking' }}
        onChange={vi.fn()}
        mode="sidebar"
      />
    );
    expect(screen.queryByText(/max transfers/i)).not.toBeInTheDocument();
  });

  it('hides "Max Transfers" section when mode is bicycling', () => {
    render(
      <FilterPanel
        filters={{ ...defaultFilters, mode: 'bicycling' }}
        onChange={vi.fn()}
        mode="sidebar"
      />
    );
    expect(screen.queryByText(/max transfers/i)).not.toBeInTheDocument();
  });

  it('renders bedroom filter options', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByLabelText(/bedrooms: studio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bedrooms: 1/i)).toBeInTheDocument();
  });

  it('renders source filter checkboxes', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByLabelText(/include streeteasy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/include zillow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/include apartments.com/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/include facebook mp/i)).toBeInTheDocument();
  });

  it('renders pet-friendly checkbox', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByLabelText(/pets allowed only/i)).toBeInTheDocument();
  });

  it('calls onChange with reset filters when Reset All Filters is clicked', async () => {
    const onChange = vi.fn();
    render(
      <FilterPanel filters={defaultFilters} onChange={onChange} mode="sidebar" />
    );
    await userEvent.click(screen.getByLabelText(/reset all filters/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const callArg = onChange.mock.calls[0][0] as Partial<SearchFilters>;
    expect(callArg.max_commute_seconds).toBe(2700);
    expect(callArg.max_transfers).toBeUndefined();
    expect(callArg.min_price).toBeUndefined();
    expect(callArg.max_price).toBeUndefined();
  });

  it('shows "Filters" heading', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('does not show Apply button in sidebar mode', () => {
    render(
      <FilterPanel filters={defaultFilters} onChange={vi.fn()} mode="sidebar" />
    );
    expect(screen.queryByLabelText(/apply filters/i)).not.toBeInTheDocument();
  });
});

describe('FilterPanel (drawer mode)', () => {
  it('shows Apply Filters button in drawer mode', () => {
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={vi.fn()}
        onClose={vi.fn()}
        isOpen
        mode="drawer"
      />
    );
    expect(screen.getByLabelText(/apply filters/i)).toBeInTheDocument();
  });

  it('calls onClose when Apply Filters is clicked', async () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    render(
      <FilterPanel
        filters={defaultFilters}
        onChange={onChange}
        onClose={onClose}
        isOpen
        mode="drawer"
      />
    );
    await userEvent.click(screen.getByLabelText(/apply filters/i));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when isOpen=false in drawer mode', () => {
    const { container } = render(
      <FilterPanel
        filters={defaultFilters}
        onChange={vi.fn()}
        onClose={vi.fn()}
        isOpen={false}
        mode="drawer"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
