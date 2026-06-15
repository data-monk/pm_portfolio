import React, { useState } from 'react';
import type { SearchFilters, CommuteMode, ListingSource } from '../lib/types';
import CommuteModeSelector from './CommuteModeSelector';
import CommuteSlider from './CommuteSlider';
import { countActiveFilters } from '../lib/utils';

interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
  isOpen?: boolean;
  onClose?: () => void;
  mode: 'sidebar' | 'drawer';
}

const ALL_SOURCES: { value: ListingSource; label: string }[] = [
  { value: 'streeteasy', label: 'StreetEasy' },
  { value: 'zillow', label: 'Zillow' },
  { value: 'apartments_com', label: 'Apartments.com' },
  { value: 'facebook_marketplace', label: 'Facebook MP' },
];

const BEDROOM_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: 'Studio', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
];

const BATHROOM_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '1', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2+', value: 2 },
];

const SORT_OPTIONS: { value: SearchFilters['sort']; label: string }[] = [
  { value: 'commute_asc', label: 'Commute (shortest first)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'newest', label: 'Newest listings' },
];

const TRANSFER_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: 'Direct', value: 0 },
  { label: '1', value: 1 },
  { label: '2+', value: 2 },
];

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  isOpen = true,
  onClose,
  mode,
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const updateLocal = (patch: Partial<SearchFilters>) => {
    if (mode === 'sidebar') {
      // In sidebar mode, apply changes immediately
      onChange(patch);
    } else {
      // In drawer mode, accumulate until Apply
      setLocalFilters((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleApply = () => {
    onChange(localFilters);
    onClose?.();
  };

  const handleReset = () => {
    const reset: Partial<SearchFilters> = {
      max_commute_seconds: 2700,
      max_transfers: undefined,
      min_price: undefined,
      max_price: undefined,
      min_bedrooms: undefined,
      min_bathrooms: undefined,
      pets_allowed: undefined,
      neighborhood: undefined,
      sources: undefined,
      sort: 'commute_asc',
    };
    if (mode === 'sidebar') {
      onChange(reset);
    } else {
      setLocalFilters((prev) => ({ ...prev, ...reset }));
    }
  };

  const current = mode === 'sidebar' ? filters : localFilters;
  const filterCount = countActiveFilters(current);

  const handleSourceToggle = (source: ListingSource) => {
    const existing = current.sources ?? ALL_SOURCES.map((s) => s.value);
    const next = existing.includes(source)
      ? existing.filter((s) => s !== source)
      : [...existing, source];
    updateLocal({ sources: next.length === ALL_SOURCES.length ? undefined : next });
  };

  const isSourceActive = (source: ListingSource): boolean => {
    if (!current.sources) return true; // all active when undefined
    return current.sources.includes(source);
  };

  const content = (
    <div className="flex flex-col gap-6 p-4">
      {/* Mode */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Commute Mode</p>
        <CommuteModeSelector
          value={current.mode as CommuteMode}
          onChange={(m) => updateLocal({ mode: m })}
        />
      </div>

      {/* Max Commute Slider */}
      <div>
        <CommuteSlider
          value={current.max_commute_seconds}
          onChange={(s) => updateLocal({ max_commute_seconds: s })}
        />
      </div>

      {/* Transfers — only for transit */}
      {current.mode === 'transit' && (
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Max Transfers</p>
          <div className="cs-segmented">
            {TRANSFER_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => updateLocal({ max_transfers: opt.value })}
                className={current.max_transfers === opt.value ? 'active' : ''}
                aria-pressed={current.max_transfers === opt.value}
                aria-label={`Max transfers: ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Price Range</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              placeholder="Min"
              value={current.min_price ?? ''}
              onChange={(e) =>
                updateLocal({ min_price: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              aria-label="Minimum price"
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-200 text-sm outline-none focus:border-[#00d4ff]"
            />
          </div>
          <span className="text-slate-500 flex-shrink-0">–</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              placeholder="Max"
              value={current.max_price ?? ''}
              onChange={(e) =>
                updateLocal({ max_price: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              aria-label="Maximum price"
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-200 text-sm outline-none focus:border-[#00d4ff]"
            />
          </div>
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Bedrooms</p>
        <div className="cs-segmented">
          {BEDROOM_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => updateLocal({ min_bedrooms: opt.value })}
              className={current.min_bedrooms === opt.value ? 'active' : ''}
              aria-pressed={current.min_bedrooms === opt.value}
              aria-label={`Bedrooms: ${opt.label}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Bathrooms</p>
        <div className="cs-segmented">
          {BATHROOM_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => updateLocal({ min_bathrooms: opt.value })}
              className={current.min_bathrooms === opt.value ? 'active' : ''}
              aria-pressed={current.min_bathrooms === opt.value}
              aria-label={`Bathrooms: ${opt.label}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Neighborhood */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Neighborhood</p>
        <input
          type="text"
          placeholder="e.g. Upper West Side"
          value={current.neighborhood ?? ''}
          onChange={(e) => updateLocal({ neighborhood: e.target.value || undefined })}
          aria-label="Filter by neighborhood"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-200 text-sm outline-none focus:border-[#00d4ff] transition-colors placeholder:text-slate-600"
        />
      </div>

      {/* Sort */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Sort by</p>
        <select
          value={current.sort}
          onChange={(e) => updateLocal({ sort: e.target.value as SearchFilters['sort'] })}
          aria-label="Sort results by"
          className="w-full px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#16161e] text-slate-200 text-sm outline-none focus:border-[#00d4ff] transition-colors"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Pets */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={current.pets_allowed === true}
            onChange={(e) =>
              updateLocal({ pets_allowed: e.target.checked ? true : undefined })
            }
            aria-label="Show only pet-friendly listings"
            className="w-4 h-4 accent-[#00d4ff]"
          />
          <span className="text-sm text-slate-300">Pets allowed only</span>
        </label>
      </div>

      {/* Sources */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Sources</p>
        <div className="flex flex-col gap-2">
          {ALL_SOURCES.map((src) => (
            <label key={src.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSourceActive(src.value)}
                onChange={() => handleSourceToggle(src.value)}
                aria-label={`Include ${src.label}`}
                className="w-4 h-4 accent-[#00d4ff]"
              />
              <span className="text-sm text-slate-300">{src.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        aria-label="Reset all filters"
        className="text-sm text-slate-400 hover:text-[#00d4ff] transition-colors text-left"
      >
        Reset All Filters
        {filterCount > 0 && (
          <span className="ml-1 text-xs text-slate-500">({filterCount} active)</span>
        )}
      </button>

      {/* Apply button — drawer mode only */}
      {mode === 'drawer' && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-[#16161e]">
          <button
            type="button"
            onClick={handleApply}
            aria-label={`Apply filters${filterCount > 0 ? ` (${filterCount} active)` : ''}`}
            className="w-full py-3 rounded-xl bg-[#00d4ff] text-[#0f0f13] font-semibold text-base transition-opacity hover:opacity-90"
          >
            Apply Filters
            {filterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.2)] text-sm">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );

  if (mode === 'sidebar') {
    return (
      <div
        className="bg-[#16161e] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-y-auto"
        aria-label="Filter panel"
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="font-semibold text-slate-100">Filters</h2>
          {filterCount > 0 && (
            <span className="text-xs text-[#00d4ff]">{filterCount} active</span>
          )}
        </div>
        {content}
      </div>
    );
  }

  // Drawer mode
  if (!isOpen) return null;
  return (
    <>
      <div
        className="cs-drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="cs-drawer bg-[#16161e]"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-semibold text-slate-100 text-lg">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        {content}
      </div>
    </>
  );
};

export default FilterPanel;
