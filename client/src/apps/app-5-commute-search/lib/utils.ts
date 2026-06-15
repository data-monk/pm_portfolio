import type { SearchFilters, CommuteMode, ListingSource } from './types';

/**
 * Format seconds into a human-readable duration string.
 * e.g. 1920 → "32 min", 3600 → "60 min"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

/**
 * Format price in dollars to display string.
 * e.g. 3200 → "$3,200/mo"
 */
export function formatPrice(dollars: number): string {
  return `$${dollars.toLocaleString('en-US')}/mo`;
}

/**
 * Return the badge CSS class name based on commute seconds.
 */
export function getCommuteBadgeClass(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 20) return 'cs-badge-green';
  if (mins < 40) return 'cs-badge-yellow';
  if (mins < 60) return 'cs-badge-orange';
  return 'cs-badge-red';
}

/**
 * Return the color for a commute pin on the map.
 */
export function getCommutePinColor(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 20) return '#4ade80';
  if (mins < 40) return '#facc15';
  if (mins < 60) return '#fb923c';
  return '#f87171';
}

/**
 * Format the bed/bath/sqft string for a listing card.
 */
export function formatListingMeta(bedrooms: number, bathrooms: number, sqft?: number): string {
  const bed = bedrooms === 0 ? 'Studio' : `${bedrooms} BD`;
  const bath = `${bathrooms} BA`;
  const size = sqft ? ` · ${sqft.toLocaleString()} sqft` : '';
  return `${bed} · ${bath}${size}`;
}

/**
 * Build the URL search params string from a SearchFilters object.
 */
export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.destination_lat !== null && filters.destination_lat !== undefined) {
    params.set('dest_lat', String(filters.destination_lat));
  }
  if (filters.destination_lng !== null && filters.destination_lng !== undefined) {
    params.set('dest_lng', String(filters.destination_lng));
  }
  if (filters.destination_label) params.set('dest_label', filters.destination_label);
  params.set('mode', filters.mode);
  params.set('max_commute', String(filters.max_commute_seconds));
  if (filters.max_transfers !== undefined) params.set('max_transfers', String(filters.max_transfers));
  if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
  if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
  if (filters.min_bedrooms !== undefined) params.set('min_bedrooms', String(filters.min_bedrooms));
  if (filters.min_bathrooms !== undefined) params.set('min_bathrooms', String(filters.min_bathrooms));
  if (filters.pets_allowed !== undefined) params.set('pets_allowed', String(filters.pets_allowed));
  if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
  if (filters.sources && filters.sources.length > 0) params.set('sources', filters.sources.join(','));
  params.set('page', String(filters.page ?? 1));
  params.set('sort', filters.sort);
  return params;
}

/**
 * Parse URL search params into a SearchFilters object.
 */
export function searchParamsToFilters(params: URLSearchParams): SearchFilters {
  const destLat = params.get('dest_lat');
  const destLng = params.get('dest_lng');
  const maxTransfers = params.get('max_transfers');
  const minPrice = params.get('min_price');
  const maxPrice = params.get('max_price');
  const minBedrooms = params.get('min_bedrooms');
  const minBathrooms = params.get('min_bathrooms');
  const petsAllowed = params.get('pets_allowed');
  const neighborhood = params.get('neighborhood');
  const sources = params.get('sources');

  return {
    destination_lat: destLat ? parseFloat(destLat) : null,
    destination_lng: destLng ? parseFloat(destLng) : null,
    destination_label: params.get('dest_label') ?? '',
    mode: (params.get('mode') as CommuteMode) ?? 'transit',
    max_commute_seconds: parseInt(params.get('max_commute') ?? '2700', 10),
    max_transfers: maxTransfers !== null ? parseInt(maxTransfers, 10) : undefined,
    min_price: minPrice !== null ? parseInt(minPrice, 10) : undefined,
    max_price: maxPrice !== null ? parseInt(maxPrice, 10) : undefined,
    min_bedrooms: minBedrooms !== null ? parseInt(minBedrooms, 10) : undefined,
    min_bathrooms: minBathrooms !== null ? parseFloat(minBathrooms) : undefined,
    pets_allowed: petsAllowed !== null ? petsAllowed === 'true' : undefined,
    neighborhood: neighborhood ?? undefined,
    sources: sources
      ? (sources.split(',').filter(Boolean) as ListingSource[])
      : undefined,
    page: parseInt(params.get('page') ?? '1', 10),
    sort: (params.get('sort') as SearchFilters['sort']) ?? 'commute_asc',
  };
}

/**
 * Generate a UUID v4 (for session tokens).
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format a listing source into a short abbreviation for the badge.
 */
export function sourceAbbreviation(source: ListingSource): string {
  switch (source) {
    case 'streeteasy': return 'SE';
    case 'zillow': return 'Z';
    case 'apartments_com': return 'AC';
    case 'facebook_marketplace': return 'FB';
    default: return '?';
  }
}

/**
 * Format a listing source into a color for the source badge.
 */
export function sourceColor(source: ListingSource): { bg: string; text: string } {
  switch (source) {
    case 'streeteasy': return { bg: '#006AFF', text: '#fff' };
    case 'zillow': return { bg: '#006AFF', text: '#fff' };
    case 'apartments_com': return { bg: '#E53E3E', text: '#fff' };
    case 'facebook_marketplace': return { bg: '#1877F2', text: '#fff' };
    default: return { bg: '#4a5568', text: '#fff' };
  }
}

/**
 * Format an ISO date string into a display date.
 * e.g. "2026-07-01" → "Jul 1, 2026"
 */
export function formatAvailableDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Count active filters (excluding destination, mode, and page).
 */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.max_commute_seconds !== 2700) count++;
  if (filters.max_transfers !== undefined) count++;
  if (filters.min_price !== undefined) count++;
  if (filters.max_price !== undefined) count++;
  if (filters.min_bedrooms !== undefined && filters.min_bedrooms > 0) count++;
  if (filters.min_bathrooms !== undefined) count++;
  if (filters.pets_allowed) count++;
  if (filters.neighborhood) count++;
  if (filters.sources && filters.sources.length > 0 && filters.sources.length < 4) count++;
  return count;
}

/**
 * Return the default SearchFilters object.
 */
export function sourceLabel(source: string): string {
  switch (source) {
    case 'streeteasy': return 'StreetEasy';
    case 'zillow': return 'Zillow';
    case 'apartments_com': return 'Apartments.com';
    case 'facebook_marketplace': return 'Facebook';
    default: return source;
  }
}

export function defaultFilters(): SearchFilters {
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
