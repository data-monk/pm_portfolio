# CommuteFirst — Product Specification

**App:** `app-5-commute-search`
**Route:** `/apps/commute-search`
**Status:** In Development
**PM Agent:** Completed (Step 1)

---

## Problem

Renters in dense urban markets (NYC, SF, Chicago) search for apartments on Zillow or StreetEasy and only discover the commute time *after* signing a lease. There is no tool that lets you say "I need to be at 1 World Trade Center by 9 AM — show me every apartment within 40 minutes by subway, no more than one transfer."

## Solution

**CommuteFirst** is a real estate aggregator that ranks and filters apartments primarily by commute time and transit friction to a user-specified destination (workplace, university, etc.). Data is pulled from Zillow, Apartments.com, StreetEasy, and Facebook Marketplace, normalized into a unified schema, and enriched with Google Distance Matrix API commute data calculated for peak morning hours.

**Core value proposition:** *Find an apartment by how long it takes to get to work, not just by price.*

---

## Target Users

- **Transit-dependent renters** — NYC/urban residents who rely on subway/bus and care about transfers
- **New-to-city relocators** — don't know neighborhoods; need commute-first discovery
- **Budget-conscious renters** — want to trade-off rent vs. commute time with real data
- **Commute-sensitive professionals** — early/late schedules where transit timing matters

---

## Core Features

### Feature A: Multi-Source Scraping & Aggregation
- Sources: Zillow, Apartments.com, StreetEasy, Facebook Marketplace
- Resilient scrapers with fallback mock data (for dev/CI)
- All sources normalized to unified schema

### Feature B: Deep Commute Integration
- Google Distance Matrix API (peak hour: Monday 8:30 AM)
- Modes: Transit, Driving, Bicycling, Walking
- Transit Friction Filter: direct route vs. 1+ transfers
- Max commute time slider (5–120 min)
- Step-by-step route breakdown per listing

### Feature C: Traditional Filters
- Rent range (min/max)
- Bedrooms (Studio, 1BR, 2BR, 3BR, 4BR+)
- Bathrooms
- Pet policy
- Data source selector
- Amenities (optional)

---

## User Stories

### US-1: Set Destination Address
As a job-holder searching for an apartment, I want to enter my workplace address as a commute destination so that all listings are ranked by travel time to that address.

**Acceptance Criteria:**
- [ ] Google Places Autocomplete suggests up to 5 results within 300ms (200ms debounce)
- [ ] Selecting a suggestion resolves to lat/lng stored in session state
- [ ] Failed geocoding shows inline error: "Could not resolve this address"
- [ ] Destination persists across searches within session; reflected in URL query string
- [ ] Clearing destination refreshes all commute times automatically

### US-2: Set Commute Mode and Time Threshold
As a transit-dependent renter, I want to select my preferred commute mode and a maximum commute time so that only listings within my tolerance appear.

**Acceptance Criteria:**
- [ ] Mutually exclusive mode selector: Transit | Drive | Bike | Walk
- [ ] Slider: 5–120 min in 5-min increments; value shown in large label below
- [ ] Mode change triggers per-card loading skeletons during recalculation
- [ ] Active mode and threshold shown as filter chips; reflected in URL (`?mode=transit&max_commute=45`)
- [ ] Empty state shown (US-9) if no listings meet threshold

### US-3: Apply Traditional Listing Filters
As a renter with specific housing needs, I want to filter by price, bedrooms, bathrooms, and pet policy alongside commute time.

**Acceptance Criteria:**
- [ ] Filter panel: price range, bedrooms, bathrooms, pet policy, source selector
- [ ] All filters applied simultaneously (AND logic); results update within 500ms
- [ ] Active filters shown as dismissible chips; "Reset All" clears all except destination + mode
- [ ] Filter state in URL for deep-linking and shareability
- [ ] Mobile: filter panel opens as bottom drawer with sticky "Apply" CTA

### US-4: Browse Results List
As a renter, I want to browse listings sorted by commute time by default so the most accessible apartments appear first.

**Acceptance Criteria:**
- [ ] Default sort: commute time ascending (shortest first)
- [ ] Sort options: Rent ↑, Rent ↓, Newest Listed, Commute ↑↓
- [ ] Each card shows: thumbnail, title, rent, address, beds/baths, commute badge, source logo
- [ ] 20 listings per page; infinite scroll or "Load More"
- [ ] Results count shown: "Showing 47 listings within 45 min by transit"
- [ ] Map toggle switches between list view and split list+map view

### US-5: View Commute Breakdown
As a transit-sensitive renter, I want step-by-step commute details for a listing so I know exactly which trains to take and how many transfers are involved.

**Acceptance Criteria:**
- [ ] Detail screen shows: total time, mode, # transfers, route steps
- [ ] Each step shows: mode icon, line name, duration, distance, stop names
- [ ] Panel labels whether peak or off-peak time was used
- [ ] Transit line badges use actual NYC MTA line colors (F=orange, A=blue, etc.)
- [ ] "Recalculate for different time" opens datetime picker → updates panel

### US-6: Save and Bookmark Listings
As a renter comparing options, I want to bookmark listings so I can return to my shortlist later.

**Acceptance Criteria:**
- [ ] Heart/bookmark icon on every card and detail screen; optimistic UI toggle
- [ ] Unauthenticated: persists in localStorage; authenticated: synced to server
- [ ] "Saved" tab in nav shows all bookmarks with count badge
- [ ] Removing shows undo snackbar for 4 seconds
- [ ] Anon cap: 10 saves → modal prompts account creation for unlimited

### US-7: Compare Listings Side-by-Side
As a renter in the final decision stage, I want to compare 2–4 saved listings side-by-side.

**Acceptance Criteria:**
- [ ] Checkboxes on saved listings; "Compare" CTA activates at ≥2 selected
- [ ] Comparison table rows: thumbnail, rent, address, commute time, # transfers, beds, baths, sqft, pet policy, available date, source
- [ ] Best value in numeric rows highlighted in green with "BEST" label
- [ ] Shareable URL encoding listing IDs
- [ ] Mobile: horizontally scrollable table, 2 columns at a time

### US-8: Mobile Responsive Experience
**Acceptance Criteria:**
- [ ] Responsive at 320px, 375px, 414px, 768px, 1280px+
- [ ] Filter panel: bottom drawer on mobile, left sidebar on desktop
- [ ] Map: full-screen overlay on mobile, split panel on desktop
- [ ] Touch targets: minimum 44×44px (WCAG)
- [ ] Lighthouse mobile performance ≥80, accessibility ≥90

### US-9: Handle No Results / Empty States
**Acceptance Criteria:**
- [ ] Empty state shows message with active filter summary
- [ ] Two actionable suggestions: "Increase commute time" button (auto-adjusts slider) + "Relax filters" button
- [ ] API failure: "We're having trouble loading listings" with Retry button

### US-10: Graceful Source Failures
**Acceptance Criteria:**
- [ ] Backend fetches all 4 sources in parallel; timed-out source (5s) is omitted
- [ ] Non-blocking banner: "Results from [Source] temporarily unavailable" (auto-dismiss 8s)
- [ ] Unavailable sources greyed out in source filter with tooltip
- [ ] Source availability logged server-side with timestamps

### US-11: Map View
**Acceptance Criteria:**
- [ ] All filtered results plotted as color-coded pins: green (0–20 min), yellow (21–40), orange (41–60), red (60+)
- [ ] Click pin → mini popup: thumbnail, rent, commute badge, "View Details" link
- [ ] Destination shown as distinct star/office marker
- [ ] Map pan/zoom does not re-trigger search unless user clicks "Search this area"

### US-12: Authentication (Optional / Phase 2)
**Acceptance Criteria:**
- [ ] Register with email + password or Google OAuth
- [ ] On login: merge localStorage saves with server saves (deduplicate by listing ID)
- [ ] HTTP-only cookie auth tokens, 30-day expiry, transparent refresh

---

## Unified Listing Schema

### Core Fields
| Field | Type | Req | Example |
|---|---|---|---|
| `id` | UUID v4 | ✅ | `"a3f9c2d1-..."` |
| `external_id` | string | ✅ | `"zillow_123456789"` |
| `source` | enum | ✅ | `"streeteasy"` |
| `listing_url` | URL | ✅ | `"https://streeteasy.com/rental/4567890"` |
| `title` | string ≤255 | ✅ | `"Sunny 2BR in Park Slope"` |
| `price_monthly_cents` | integer | ✅ | `350000` (= $3,500) |
| `bedrooms` | number | ✅ | `2` (0 = studio) |
| `bathrooms` | number (0.5 step) | ✅ | `1.5` |
| `address_line1` | string | ✅ | `"245 7th Ave"` |
| `address_line2` | string | optional | `"Apt 4C"` |
| `city` | string | ✅ | `"Brooklyn"` |
| `state` | string | ✅ | `"NY"` |
| `zip_code` | string | ✅ | `"11215"` |
| `neighborhood` | string | optional | `"Park Slope"` |
| `latitude` | float (6dp) | ✅ | `40.670123` |
| `longitude` | float (6dp) | ✅ | `-73.978456` |
| `sqft` | integer | optional | `875` |
| `description` | text | optional | `"Bright corner unit..."` |
| `is_active` | boolean | ✅ | `true` |
| `scraped_at` | ISO 8601 UTC | ✅ | `"2026-06-14T09:32:00Z"` |
| `last_seen_at` | ISO 8601 UTC | ✅ | `"2026-06-14T09:32:00Z"` |

### Commute Fields (per listing × destination × mode × departure_time)
| Field | Type | Example |
|---|---|---|
| `commute_time_seconds` | integer | `1920` (32 min) |
| `commute_mode` | enum | `"transit"` |
| `num_transfers` | integer | `1` |
| `route_summary` | string | `"F train via Jay St"` |
| `route_steps` | RouteStep[] | walk → F train → transfer → A train → walk |
| `peak_time_used` | boolean | `true` |
| `departure_time_utc` | ISO 8601 | `"2026-06-16T08:00:00Z"` |
| `distance_meters` | integer | `5400` |

### RouteStep Fields
| Field | Type | Example |
|---|---|---|
| `step_index` | integer | `0` |
| `mode` | enum | `"walking"` |
| `instruction` | string | `"Walk to 9th St / 4th Ave Station"` |
| `duration_seconds` | integer | `240` |
| `distance_meters` | integer | `310` |
| `transit_line` | string | `"F"` |
| `transit_vehicle_type` | string | `"SUBWAY"` |
| `departure_stop` | string | `"9 St / 4 Av"` |
| `arrival_stop` | string | `"Jay St - MetroTech"` |

### Meta Fields
| Field | Type | Example |
|---|---|---|
| `available_date` | ISO date | `"2026-07-01"` |
| `pet_policy` | object | `{cats_allowed: true, dogs_allowed: false}` |
| `amenities` | string[] | `["dishwasher","elevator","gym"]` |
| `parking` | enum | `"none"` |
| `laundry` | enum | `"in_unit"` |
| `utilities_included` | string[] | `["heat","hot_water"]` |
| `deposit_cents` | integer | `350000` |
| `fee_structure` | string | `"No fee"` |
| `contact_name` | string | `"Jane Doe, Compass"` |
| `contact_phone` | string (E.164) | `"+12125550143"` |

---

## API Contract (Backend → Frontend)

```
GET  /api/listings/search
     ?destination_lat=40.7128&destination_lng=-74.0060
     &mode=transit&max_commute=2700
     &min_price=0&max_price=400000
     &bedrooms=1&page=1&sort=commute_asc
     → 200: { listings: ListingWithCommute[], total: int, page: int }

GET  /api/listings/:id
     ?destination_lat=&destination_lng=&mode=transit
     → 200: ListingWithCommute (full route_steps)

POST /api/saved
     body: { session_token: UUID, listing_id: UUID }
     → 201: { id: UUID }

GET  /api/saved?session_token=UUID
     → 200: ListingWithCommute[]

GET  /api/compare
     ?ids=uuid1,uuid2,uuid3&destination_lat=&destination_lng=&mode=transit
     → 200: ComparisonRow[]

GET  /api/sources
     → 200: { name, is_active, last_scraped_at }[]
```

---

## Commute Calculation SLA

- Commute data pre-cached at scrape time for top 10 common NYC destination zip codes
- On-demand for novel destinations: ≤3 seconds or return `commute_pending: true` + WebSocket push
- Cache TTL: 6 hours

## Scraper Cadence

- All 4 sources re-scraped every 6 hours via Celery Beat
- Listings not seen in 12 hours → `is_active = false`
- Facebook Marketplace: every 12 hours (rate-limit sensitive); opt-in feature flag

## Performance Targets

- Search response: ≤500ms (with warm cache)
- Map tile load: ≤2s on 4G
- Lighthouse mobile performance: ≥80
- Lighthouse accessibility: ≥90
