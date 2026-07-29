import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { SearchFilters } from '../lib/types';
import { useListings } from '../hooks/useListings';
import { useSaved } from '../hooks/useSaved';
import { useCommute } from '../hooks/useCommute';
import { triggerRefresh, getRefreshStatus } from '../lib/api';
import type { ScrapeJob } from '../lib/api';
import { searchParamsToFilters, filtersToSearchParams, formatDuration, sourceLabel } from '../lib/utils';
import ListingCard from '../components/ListingCard';
import FilterPanel from '../components/FilterPanel';
import MapView from '../components/MapView';

const SORT_LABELS: Record<string, string> = {
  commute_asc: 'Commute',
  price_asc: 'Price ↑',
  price_desc: 'Price ↓',
  newest: 'Newest',
};

function defaultFilters(): SearchFilters {
  return {
    destination_lat: null,
    destination_lng: null,
    destination_label: '',
    mode: 'transit',
    max_commute_seconds: 2700,
    page: 1,
    sort: 'commute_asc',
  };
}

const ResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const stateFilters = (location.state as { filters?: SearchFilters } | null)?.filters;
    if (stateFilters) return stateFilters;
    const params = new URLSearchParams(location.search);
    if (params.has('mode')) return searchParamsToFilters(params);
    return defaultFilters();
  });

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unavailableBanners, setUnavailableBanners] = useState<string[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
  const [selectedListingId, setSelectedListingId] = useState<string | undefined>(undefined);

  // Live scraping state
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJob[]>([]);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didTriggerRef = useRef(false);

  const { listings: rawListings, total, isLoading, isError, sourcesUnavailable } = useListings(filters);
  const resolvedListings = useCommute(rawListings);
  const { savedCount, isSaved, saveListingId, removeSavedId } = useSaved();

  // Trigger live scraping once on mount when destination is set
  const triggerLiveScrape = useCallback(async () => {
    if (didTriggerRef.current) return;
    if (!filters.destination_lat) return;
    didTriggerRef.current = true;
    try {
      const jobs = await triggerRefresh();
      if (jobs.length > 0) {
        setScrapeJobs(jobs);
        setScrapeStatus('running');
      }
    } catch {
      // silently ignore — DB results still show
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    triggerLiveScrape();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll job status until all done or failed
  useEffect(() => {
    if (scrapeStatus !== 'running' || scrapeJobs.length === 0) return;

    pollRef.current = setInterval(async () => {
      try {
        const statuses = await Promise.all(scrapeJobs.map((j) => getRefreshStatus(j.job_id)));
        const allSettled = statuses.every((s) => s.status === 'done' || s.status === 'failed');
        if (allSettled) {
          clearInterval(pollRef.current!);
          setScrapeStatus('done');
          // Invalidate listings query to pick up newly scraped results
          queryClient.invalidateQueries({ queryKey: ['listings'] });
        }
      } catch {
        clearInterval(pollRef.current!);
        setScrapeStatus('done');
      }
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [scrapeStatus, scrapeJobs, queryClient]);

  // Sync filters to URL
  useEffect(() => {
    const params = filtersToSearchParams(filters);
    navigate({ search: params.toString() }, { replace: true, state: { filters } });
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sourcesUnavailable.length > 0) {
      setUnavailableBanners((prev) => {
        const merged = new Set([...prev, ...sourcesUnavailable]);
        return [...merged];
      });
    }
  }, [sourcesUnavailable]);

  const handleFiltersChange = (patch: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }));
  };

  const handleIncreaseCommute = () => {
    setFilters((prev) => ({
      ...prev,
      max_commute_seconds: Math.min(prev.max_commute_seconds + 900, 7200),
      page: 1,
    }));
  };

  // Build filter chips
  const chips: Array<{ label: string; onRemove: () => void }> = [];
  const modeLabels: Record<string, string> = { transit: 'Transit', driving: 'Driving', walking: 'Walking', bicycling: 'Biking' };
  const modeIcons: Record<string, string> = { transit: '🚇', driving: '🚗', walking: '🚶', bicycling: '🚲' };
  chips.push({
    label: `${modeIcons[filters.mode] ?? ''} ${modeLabels[filters.mode] ?? filters.mode}`,
    onRemove: () => handleFiltersChange({ mode: 'transit' }),
  });
  chips.push({
    label: `≤${formatDuration(filters.max_commute_seconds)}`,
    onRemove: () => handleFiltersChange({ max_commute_seconds: 2700 }),
  });
  if (filters.max_price !== undefined) {
    chips.push({
      label: `≤$${filters.max_price.toLocaleString()}`,
      onRemove: () => handleFiltersChange({ max_price: undefined }),
    });
  }
  if (filters.min_price !== undefined) {
    chips.push({
      label: `≥$${filters.min_price.toLocaleString()}`,
      onRemove: () => handleFiltersChange({ min_price: undefined }),
    });
  }
  if (filters.min_bedrooms !== undefined) {
    const bedsLabel = filters.min_bedrooms === 0 ? 'Studio' : `${filters.min_bedrooms}BR+`;
    chips.push({
      label: bedsLabel,
      onRemove: () => handleFiltersChange({ min_bedrooms: undefined }),
    });
  }
  if (filters.min_bathrooms !== undefined) {
    chips.push({
      label: `${filters.min_bathrooms}BA+`,
      onRemove: () => handleFiltersChange({ min_bathrooms: undefined }),
    });
  }
  if (filters.neighborhood) {
    chips.push({
      label: `📍 ${filters.neighborhood}`,
      onRemove: () => handleFiltersChange({ neighborhood: undefined }),
    });
  }
  if (filters.pets_allowed) {
    chips.push({
      label: '🐾 Pets OK',
      onRemove: () => handleFiltersChange({ pets_allowed: undefined }),
    });
  }
  if (filters.max_transfers !== undefined) {
    chips.push({
      label: filters.max_transfers === 0 ? 'Direct only' : `≤${filters.max_transfers} transfer${filters.max_transfers > 1 ? 's' : ''}`,
      onRemove: () => handleFiltersChange({ max_transfers: undefined }),
    });
  }

  const handleResetAll = () => {
    setFilters((prev) => ({
      destination_lat: prev.destination_lat,
      destination_lng: prev.destination_lng,
      destination_label: prev.destination_label,
      mode: 'transit',
      max_commute_seconds: 2700,
      page: 1,
      sort: 'commute_asc',
    }));
  };

  const destination =
    filters.destination_lat !== null && filters.destination_lng !== null
      ? { lat: filters.destination_lat, lng: filters.destination_lng, label: filters.destination_label }
      : null;

  // Guard: no destination means useListings is disabled and nothing will load
  if (!destination) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-2xl mb-3" aria-hidden="true">🗺️</p>
        <p className="text-slate-300 font-medium mb-2">No destination set</p>
        <p className="text-slate-500 text-sm mb-6">
          Enter your workplace or destination to search apartments by commute time.
        </p>
        <Link
          to="/apps/commute-search"
          className="px-4 py-2 rounded-lg border border-[#00d4ff] text-[#00d4ff] text-sm hover:bg-[rgba(0,212,255,0.08)] transition-colors"
        >
          ← Back to Search
        </Link>
      </div>
    );
  }

  const currentCount = (filters.page ?? 1) * 20;
  const hasNextPage = total > currentCount;

  // Scraping sources labels for status banner
  const scrapingSourceNames = scrapeJobs.map((j) => sourceLabel(j.source)).join(', ');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <nav className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(15,15,19,0.95)] backdrop-blur-sm sticky top-0 z-20">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors group flex-shrink-0"
          aria-label="Back to portfolio"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Portfolio
        </Link>
        <span className="text-slate-700 text-xs">|</span>
        <Link
          to="/apps/commute-search"
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
          aria-label="Back to search"
        >
          ← Search
        </Link>
        <span className="text-base font-bold gradient-text flex-1 min-w-0 truncate text-center">CommuteFirst</span>
        <Link
          to="/apps/commute-search/saved"
          className="text-sm text-slate-400 hover:text-[#00d4ff] transition-colors flex-shrink-0"
          aria-label={`Saved listings (${savedCount})`}
        >
          Saved ({savedCount})
        </Link>
        <button
          type="button"
          onClick={() => setViewMode((v) => (v === 'list' ? 'map' : 'list'))}
          aria-label={viewMode === 'list' ? 'Switch to map view' : 'Switch to list view'}
          className="text-sm px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-slate-300 hover:text-[#00d4ff] hover:border-[#00d4ff] transition-colors flex-shrink-0"
        >
          {viewMode === 'list' ? '🗺 Map' : '☰ List'}
        </button>
      </nav>

      {/* Live scraping status banner */}
      {scrapeStatus === 'running' && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(0,212,255,0.06)] border-b border-[rgba(0,212,255,0.15)] text-[#00d4ff] text-sm" role="status">
          <span className="animate-pulse">⟳</span>
          <span>Fetching live listings from <strong>{scrapingSourceNames}</strong>…</span>
        </div>
      )}
      {scrapeStatus === 'done' && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(74,222,128,0.06)] border-b border-[rgba(74,222,128,0.15)] text-green-400 text-sm">
          <span>✓</span>
          <span>Live listings updated from {scrapingSourceNames}</span>
        </div>
      )}

      {/* Unavailable source banners */}
      {unavailableBanners
        .filter((src) => !dismissedBanners.has(src))
        .map((src) => (
          <div
            key={src}
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-300 text-sm"
            role="alert"
          >
            <span>⚠ Results from <strong>{src}</strong> are temporarily unavailable.</span>
            <button
              type="button"
              onClick={() => setDismissedBanners((prev) => new Set([...prev, src]))}
              aria-label={`Dismiss ${src} banner`}
              className="text-yellow-400 hover:text-yellow-200 text-lg leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        ))}

      {/* Filter chips bar */}
      <div className="px-4 md:px-6 py-2.5 border-b border-[rgba(255,255,255,0.04)] flex flex-wrap items-center gap-2 overflow-x-auto">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={chip.onRemove}
            className="cs-chip flex-shrink-0"
            aria-label={`Remove filter: ${chip.label}`}
          >
            {chip.label}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {chips.length > 1 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-1"
            aria-label="Reset all filters"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Results count + sort */}
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-400">
          {isLoading ? (
            <span className="cs-skeleton inline-block rounded w-40 h-4" aria-label="Loading results count" />
          ) : isError ? (
            <span className="text-red-400">Error loading listings</span>
          ) : total === 0 ? (
            <span>No listings found</span>
          ) : (
            <span>
              Showing <strong className="text-slate-200">{resolvedListings.length}</strong> of{' '}
              <strong className="text-slate-200">{total}</strong> listings
            </span>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="sort-select" className="text-xs text-slate-500 hidden sm:block">Sort:</label>
          <select
            id="sort-select"
            value={filters.sort}
            onChange={(e) => handleFiltersChange({ sort: e.target.value as SearchFilters['sort'] })}
            aria-label="Sort results"
            className="px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#16161e] text-slate-300 text-xs outline-none focus:border-[#00d4ff] transition-colors"
          >
            {Object.entries(SORT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop filter sidebar */}
        <aside className="hidden md:block w-[280px] flex-shrink-0 p-4 border-r border-[rgba(255,255,255,0.04)] overflow-y-auto">
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            mode="sidebar"
          />
        </aside>

        {/* Right content */}
        <div className="flex-1 min-w-0 p-4 md:p-6">
          {viewMode === 'map' ? (
            <div className="h-[calc(100vh-200px)] min-h-[400px]">
              <MapView
                listings={resolvedListings}
                destination={destination}
                onListingClick={(id) => {
                  setSelectedListingId(id);
                  const listing = resolvedListings.find((l) => l.id === id);
                  if (listing) {
                    navigate(`/apps/commute-search/listing/${id}`, {
                      state: { listing, filters },
                    });
                  }
                }}
                selectedListingId={selectedListingId}
              />
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Loading listings">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="cs-skeleton rounded-xl h-48"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">We're having trouble loading listings.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[#00d4ff] text-[#0f0f13] font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          ) : total === 0 && !isLoading ? (
            <div className="text-center py-16">
              <p className="text-2xl mb-3" aria-hidden="true">🔍</p>
              <p className="text-slate-300 font-medium mb-2">No listings found</p>
              <p className="text-slate-500 text-sm mb-6">
                {scrapeStatus === 'running'
                  ? 'Live listings are still being fetched — results will appear shortly.'
                  : 'Try adjusting your commute time or filters.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleIncreaseCommute}
                  className="px-4 py-2 rounded-lg border border-[#00d4ff] text-[#00d4ff] text-sm hover:bg-[rgba(0,212,255,0.08)] transition-colors"
                >
                  Increase commute time +15 min
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.06)] text-slate-300 text-sm hover:bg-[rgba(255,255,255,0.1)] transition-colors md:hidden"
                >
                  Open filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resolvedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSaved={isSaved(listing.id)}
                    onSave={() =>
                      isSaved(listing.id) ? removeSavedId(listing.id) : saveListingId(listing.id)
                    }
                    onClick={() =>
                      navigate(`/apps/commute-search/listing/${listing.id}`, {
                        state: { listing, filters },
                      })
                    }
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-8 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="px-6 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] text-slate-300 text-sm hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors"
                    aria-label="Load more listings"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile FAB for filters */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-30 md:hidden flex items-center gap-2 px-4 py-3 rounded-full bg-[#00d4ff] text-[#0f0f13] font-semibold shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Open filters"
      >
        <span aria-hidden="true">⚙</span> Filters
      </button>

      {/* Mobile filter drawer */}
      <FilterPanel
        filters={filters}
        onChange={(patch) => {
          handleFiltersChange(patch);
        }}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="drawer"
      />
    </div>
  );
};

export default ResultsPage;
