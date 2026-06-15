import type {
  SearchFilters,
  SearchResponse,
  ListingWithCommute,
  CommuteMode,
  ListingSource,
} from './types';
import { MOCK_LISTINGS, MOCK_DESTINATION } from './mockData';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://localhost:8001';
const USE_MOCK = (import.meta.env.VITE_USE_MOCK as string) === 'true';

interface SourceHealth {
  name: ListingSource;
  is_active: boolean;
  last_scraped_at: string | null;
}

interface ListingDetail extends ListingWithCommute {
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  utilities_included?: string[];
  parking?: string;
  laundry_type?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyMockFilters(filters: SearchFilters): ListingWithCommute[] {
  let results = [...MOCK_LISTINGS];

  if (filters.min_price !== undefined) {
    results = results.filter((l) => l.price >= (filters.min_price ?? 0));
  }
  if (filters.max_price !== undefined) {
    results = results.filter((l) => l.price <= (filters.max_price ?? Infinity));
  }
  if (filters.min_bedrooms !== undefined && filters.min_bedrooms > 0) {
    results = results.filter((l) => l.bedrooms >= (filters.min_bedrooms ?? 0));
  }
  if (filters.pets_allowed === true) {
    results = results.filter((l) => l.pets_allowed === true);
  }
  if (filters.sources && filters.sources.length > 0) {
    results = results.filter((l) => filters.sources!.includes(l.source));
  }
  if (filters.max_commute_seconds > 0) {
    results = results.filter(
      (l) => !l.commute || l.commute.commute_time_seconds <= filters.max_commute_seconds || l.commute_pending,
    );
  }
  if (filters.max_transfers !== undefined && filters.max_transfers !== null) {
    results = results.filter(
      (l) =>
        !l.commute ||
        l.commute.num_transfers === null ||
        l.commute.num_transfers <= (filters.max_transfers ?? 99),
    );
  }

  switch (filters.sort) {
    case 'commute_asc':
      results.sort((a, b) => {
        const at = a.commute?.commute_time_seconds ?? 99999;
        const bt = b.commute?.commute_time_seconds ?? 99999;
        return at - bt;
      });
      break;
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      results.sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime());
      break;
  }

  return results;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
}

export async function searchListings(filters: SearchFilters): Promise<SearchResponse> {
  if (USE_MOCK) {
    await delay(500);
    const allFiltered = applyMockFilters(filters);
    const pageSize = 20;
    const offset = ((filters.page ?? 1) - 1) * pageSize;
    const listings = allFiltered.slice(offset, offset + pageSize);
    return {
      listings,
      total: allFiltered.length,
      page: filters.page ?? 1,
      pages: Math.ceil(allFiltered.length / pageSize),
      sources_available: ['streeteasy', 'zillow', 'apartments_com', 'facebook_marketplace'],
      sources_unavailable: [],
    };
  }

  const params = new URLSearchParams();
  if (filters.destination_lat !== null && filters.destination_lat !== undefined) {
    params.set('destination_lat', String(filters.destination_lat));
  }
  if (filters.destination_lng !== null && filters.destination_lng !== undefined) {
    params.set('destination_lng', String(filters.destination_lng));
  }
  params.set('mode', filters.mode);
  params.set('max_commute', String(filters.max_commute_seconds));
  if (filters.max_transfers !== undefined) params.set('max_transfers', String(filters.max_transfers));
  if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
  if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
  if (filters.min_bedrooms !== undefined) params.set('bedrooms', String(filters.min_bedrooms));
  if (filters.bathrooms !== undefined) params.set('bathrooms', String(filters.bathrooms));
  if (filters.pets_allowed !== undefined) params.set('pets_allowed', String(filters.pets_allowed));
  if (filters.sources) params.set('sources', filters.sources.join(','));
  params.set('page', String(filters.page ?? 1));
  params.set('sort', filters.sort);

  return apiFetch<SearchResponse>(`/api/listings/search?${params.toString()}`);
}

export async function getListingById(
  id: string,
  dest?: { lat: number; lng: number },
  mode?: CommuteMode,
): Promise<ListingDetail> {
  if (USE_MOCK) {
    await delay(300);
    const listing = MOCK_LISTINGS.find((l) => l.id === id);
    if (!listing) throw new Error(`Listing ${id} not found`);
    return {
      ...listing,
      contact_name: 'Jane Doe, Compass Realty',
      contact_phone: '+12125550143',
      contact_email: 'listings@compass.com',
      utilities_included: ['heat', 'hot water'],
      parking: 'none',
      laundry_type: listing.has_laundry_in_unit ? 'in_unit' : listing.has_laundry_in_bldg ? 'in_building' : 'none',
    };
  }

  const params = new URLSearchParams();
  if (dest) {
    params.set('destination_lat', String(dest.lat));
    params.set('destination_lng', String(dest.lng));
  }
  if (mode) params.set('mode', mode);

  return apiFetch<ListingDetail>(`/api/listings/${id}?${params.toString()}`);
}

export async function saveListing(sessionToken: string, listingId: string): Promise<void> {
  if (USE_MOCK) {
    await delay(100);
    return;
  }
  await apiFetch<{ id: string }>('/api/saved', {
    method: 'POST',
    body: JSON.stringify({ session_token: sessionToken, listing_id: listingId }),
  });
}

export async function getSavedListings(sessionToken: string): Promise<ListingWithCommute[]> {
  if (USE_MOCK) {
    await delay(300);
    const savedKey = 'cs_saved_ids';
    const raw = localStorage.getItem(savedKey);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    return MOCK_LISTINGS.filter((l) => ids.includes(l.id));
  }
  return apiFetch<ListingWithCommute[]>(`/api/saved?session_token=${encodeURIComponent(sessionToken)}`);
}

export async function unsaveListing(sessionToken: string, listingId: string): Promise<void> {
  if (USE_MOCK) {
    await delay(100);
    return;
  }
  await apiFetch<void>(`/api/saved/${listingId}?session_token=${encodeURIComponent(sessionToken)}`, {
    method: 'DELETE',
  });
}

export async function getSourceHealth(): Promise<SourceHealth[]> {
  if (USE_MOCK) {
    await delay(200);
    const now = new Date().toISOString();
    return [
      { name: 'streeteasy', is_active: true, last_scraped_at: now },
      { name: 'zillow', is_active: true, last_scraped_at: now },
      { name: 'apartments_com', is_active: true, last_scraped_at: now },
      { name: 'facebook_marketplace', is_active: false, last_scraped_at: null },
    ];
  }
  return apiFetch<SourceHealth[]>('/api/sources');
}

export { MOCK_DESTINATION };
export type { SourceHealth, ListingDetail };
