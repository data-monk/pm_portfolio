import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ListingWithCommute } from '../lib/types';
import { useSaved } from '../hooks/useSaved';
import { getSavedListings } from '../lib/api';
import ListingCard from '../components/ListingCard';
import ComparisonTable from '../components/ComparisonTable';
import DestinationInput from '../components/DestinationInput';

interface UndoItem {
  id: string;
  listingSnapshot: ListingWithCommute;
  timer: ReturnType<typeof setTimeout>;
}

const SavedListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionToken, savedIds, savedCount, saveListingId, removeSavedId, isSaved } =
    useSaved();

  const [destinationLabel, setDestinationLabel] = useState('');
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLng, setDestinationLng] = useState<number | null>(null);

  // Selected listing IDs for comparison
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Undo snackbar
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null);

  const { data: savedListings = [], isLoading } = useQuery<ListingWithCommute[]>({
    queryKey: ['saved', sessionToken, [...savedIds].join(',')],
    queryFn: () => getSavedListings(sessionToken),
    staleTime: 30_000,
    enabled: savedIds.size > 0,
  });

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoItem?.timer) clearTimeout(undoItem.timer);
    };
  }, [undoItem]);

  const handleRemove = useCallback(
    (listing: ListingWithCommute) => {
      // Cancel any existing undo
      if (undoItem?.timer) clearTimeout(undoItem.timer);

      removeSavedId(listing.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });

      const timer = setTimeout(() => {
        setUndoItem(null);
      }, 4000);

      setUndoItem({ id: listing.id, listingSnapshot: listing, timer });
    },
    [removeSavedId, undoItem],
  );

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    clearTimeout(undoItem.timer);
    saveListingId(undoItem.id);
    setUndoItem(null);
  }, [undoItem, saveListingId]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(savedListings.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const compareListings = savedListings.filter((l) => selectedIds.has(l.id));

  const handleComparisonRemove = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (selectedIds.size <= 2) {
      setShowComparison(false);
    }
  };

  // Visible listings: only those still saved (not pending undo removal)
  const visibleListings = savedListings.filter((l) => isSaved(l.id));

  return (
    <div className="min-h-screen">
      {/* Header */}
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
          to="/apps/commute-search/results"
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
          aria-label="Back to results"
        >
          ← Results
        </Link>
        <span className="text-base font-bold gradient-text flex-1 truncate text-center">CommuteFirst</span>
        <span className="text-sm text-slate-400 flex-shrink-0" aria-live="polite">
          Saved ({savedCount})
        </span>
      </nav>

      <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6 pb-16">
        {/* Destination bar */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Recalculate commute for:
          </label>
          <DestinationInput
            value={destinationLabel}
            onSelect={(place) => {
              setDestinationLabel(place.label);
              setDestinationLat(place.lat);
              setDestinationLng(place.lng);
            }}
            onClear={() => {
              setDestinationLabel('');
              setDestinationLat(null);
              setDestinationLng(null);
            }}
          />
          {destinationLat && (
            <p className="text-xs text-slate-500 mt-1">
              Commute times calculated to {destinationLabel}
            </p>
          )}
        </div>

        {/* Comparison CTA bar */}
        {visibleListings.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
              <input
                type="checkbox"
                checked={selectedIds.size === visibleListings.length && visibleListings.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                aria-label="Select all listings"
                className="w-4 h-4 accent-[#00d4ff]"
              />
              Select All
            </label>
            <button
              type="button"
              onClick={() => setShowComparison(true)}
              disabled={selectedIds.size < 2}
              aria-label={`Compare selected listings (${selectedIds.size} selected)`}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#00d4ff] text-[#0f0f13] hover:opacity-90 disabled:hover:opacity-40"
            >
              Compare Selected ({selectedIds.size})
            </button>
          </div>
        )}

        {/* Comparison table */}
        {showComparison && compareListings.length >= 2 && (
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Comparison</h2>
              <button
                type="button"
                onClick={() => setShowComparison(false)}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Close comparison"
              >
                ← Back to list
              </button>
            </div>
            <ComparisonTable
              listings={compareListings}
              onRemove={handleComparisonRemove}
            />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && visibleListings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-3xl mb-3" aria-hidden="true">🤍</p>
            <p className="text-slate-300 font-medium mb-2">No saved listings yet.</p>
            <p className="text-slate-500 text-sm mb-6">
              Start searching to find your perfect commute.
            </p>
            <Link
              to="/apps/commute-search"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00d4ff] text-[#00d4ff] text-sm hover:bg-[rgba(0,212,255,0.08)] transition-colors"
            >
              Start Searching →
            </Link>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3" aria-label="Loading saved listings">
            {[1, 2, 3].map((i) => (
              <div key={i} className="cs-skeleton rounded-xl h-24" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* Listing rows */}
        {!isLoading && visibleListings.length > 0 && (
          <div className="space-y-3">
            {visibleListings.map((listing) => (
              <div key={listing.id} className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-4 pl-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(listing.id)}
                    onChange={() => handleToggleSelect(listing.id)}
                    disabled={!selectedIds.has(listing.id) && selectedIds.size >= 4}
                    aria-label={`Select ${listing.title} for comparison`}
                    className="w-4 h-4 accent-[#00d4ff] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Card */}
                <div className="flex-1 min-w-0">
                  <ListingCard
                    listing={listing}
                    isSaved={true}
                    onSave={() => handleRemove(listing)}
                    onClick={() =>
                      navigate(`/apps/commute-search/listing/${listing.id}`, {
                        state: {
                          listing,
                          filters:
                            destinationLat !== null
                              ? {
                                  destination_lat: destinationLat,
                                  destination_lng: destinationLng,
                                  destination_label: destinationLabel,
                                  mode: 'transit',
                                  max_commute_seconds: 2700,
                                  page: 1,
                                  sort: 'commute_asc' as const,
                                }
                              : undefined,
                        },
                      })
                    }
                    compact
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(listing)}
                  aria-label={`Remove ${listing.title} from saved`}
                  className="flex-shrink-0 mt-4 w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors text-xl"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Undo snackbar */}
      {undoItem && (
        <div className="cs-snackbar" role="status" aria-live="polite">
          <span className="text-sm text-slate-300">Removed from saved.</span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-sm text-[#00d4ff] font-medium hover:underline flex-shrink-0"
            aria-label="Undo removal"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedListingsPage;
