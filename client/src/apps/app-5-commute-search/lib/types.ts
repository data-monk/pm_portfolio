// CommuteFirst — Core TypeScript interfaces

export type CommuteMode = 'transit' | 'driving' | 'walking' | 'bicycling';

export type TransitVehicleType = 'SUBWAY' | 'BUS' | 'HEAVY_RAIL' | 'COMMUTER_TRAIN' | 'FERRY';

export interface RouteStep {
  step_index: number;
  mode: CommuteMode | 'walking';
  instruction: string;
  duration_seconds: number;
  distance_meters: number;
  transit_line?: string;
  transit_vehicle_type?: TransitVehicleType;
  departure_stop?: string;
  arrival_stop?: string;
}

export interface CommuteData {
  commute_mode: CommuteMode;
  commute_time_seconds: number;
  commute_time_display: string;
  distance_meters: number;
  num_transfers: number | null;
  route_summary: string | null;
  route_steps: RouteStep[];
  peak_time_used: boolean;
  departure_time_utc: string;
  transit_lines: string[];
}

export interface PetPolicy {
  cats_allowed: boolean;
  dogs_allowed: boolean;
  dog_weight_limit_lbs?: number;
  pet_deposit_cents?: number;
  pet_monthly_fee_cents?: number;
}

export type ListingSource = 'zillow' | 'apartments_com' | 'streeteasy' | 'facebook_marketplace';

export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'studio' | 'loft' | 'room' | 'other';

export interface Listing {
  id: string;
  external_id: string;
  source: ListingSource;
  listing_url: string;
  title: string;
  description?: string;
  price: number;                   // monthly rent in dollars
  price_monthly_cents: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  property_type?: PropertyType;
  floor_number?: number;
  year_built?: number;
  deposit?: number;
  fee_type?: 'no_fee' | 'op_fee' | 'broker_fee';
  image_urls: string[];
  thumbnail_url?: string;
  available_date?: string;
  pet_policy?: PetPolicy;
  amenities: string[];
  has_doorman: boolean;
  has_elevator: boolean;
  has_gym: boolean;
  has_laundry_in_unit: boolean;
  has_laundry_in_bldg: boolean;
  has_dishwasher: boolean;
  has_ac: boolean;
  pets_allowed?: boolean;
  has_outdoor_space: boolean;
  is_active: boolean;
  scraped_at: string;
  last_seen_at: string;
}

export interface ListingWithCommute extends Listing {
  commute?: CommuteData;
  commute_pending?: boolean;    // true when commute is being calculated async
}

export interface SearchFilters {
  destination_lat: number | null;
  destination_lng: number | null;
  destination_label: string;
  mode: CommuteMode;
  max_commute_seconds: number;
  max_transfers?: number;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  bathrooms?: number;
  pets_allowed?: boolean;
  sources?: ListingSource[];
  page: number;
  sort: 'commute_asc' | 'price_asc' | 'price_desc' | 'newest';
}

export interface SearchResponse {
  listings: ListingWithCommute[];
  total: number;
  page: number;
  pages: number;
  sources_available: ListingSource[];
  sources_unavailable: ListingSource[];
}

export interface SavedListing {
  id: string;
  listing_id: string;
  session_token: string;
  notes?: string;
  saved_at: string;
  listing: ListingWithCommute;
}

export interface ComparisonRow {
  field: string;
  values: Array<string | number | null>;
  best_index?: number;       // index of column with the best value
}
