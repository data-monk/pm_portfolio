import { useState, useEffect, useRef } from 'react';
import type { ListingWithCommute } from '../lib/types';
import { MOCK_LISTINGS } from '../lib/mockData';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 30000;

const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string) === 'true';

/**
 * Resolves commute data for listings that have commute_pending: true.
 * Polls every 2 seconds for up to 30 seconds, then stops.
 * In mock mode, resolves with data from MOCK_LISTINGS after 2 polls.
 */
export function useCommute(
  listings: ListingWithCommute[],
): ListingWithCommute[] {
  const [resolved, setResolved] = useState<ListingWithCommute[]>(listings);
  const pollCountRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setResolved(listings);
    pollCountRef.current = 0;
    startTimeRef.current = null;

    // Check if any listings are pending
    const hasPending = listings.some((l) => l.commute_pending === true);
    if (!hasPending) return;

    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      pollCountRef.current += 1;

      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      if (elapsed >= MAX_POLL_DURATION_MS) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      if (USE_MOCK) {
        // After 2 poll cycles, simulate commute data being resolved
        if (pollCountRef.current >= 2) {
          setResolved((prev) => {
            const updated = prev.map((listing) => {
              if (!listing.commute_pending) return listing;
              // Find corresponding mock listing commute
              const mockMatch = MOCK_LISTINGS.find((m) => m.id === listing.id);
              if (mockMatch?.commute) {
                return { ...listing, commute: mockMatch.commute, commute_pending: false };
              }
              // Generate a fake commute result for listings that never had one
              return {
                ...listing,
                commute_pending: false,
                commute: {
                  commute_mode: 'transit' as const,
                  commute_time_seconds: 3600 + Math.floor(Math.random() * 600),
                  commute_time_display: `${Math.round((3600 + Math.floor(Math.random() * 600)) / 60)} min`,
                  distance_meters: 18000,
                  num_transfers: 2,
                  route_summary: '1 train to Chambers St, walk to WTC',
                  route_steps: [],
                  peak_time_used: true,
                  departure_time_utc: '2026-06-16T12:30:00Z',
                  transit_lines: ['1'],
                },
              };
            });

            const stillPending = updated.some((l) => l.commute_pending);
            if (!stillPending && timerRef.current) {
              clearInterval(timerRef.current);
            }
            return updated;
          });
        }
      } else {
        // In real mode, re-fetch listings with pending commutes from the API
        // This would normally re-call getListingById for each pending listing
        // For now, just stop polling after timeout — the parent component
        // should use React Query's refetch mechanism
        const stillPending = resolved.some((l) => l.commute_pending);
        if (!stillPending && timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  return resolved;
}
