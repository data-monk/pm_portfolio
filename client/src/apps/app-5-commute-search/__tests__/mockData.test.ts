import { describe, it, expect } from 'vitest';
import { MOCK_LISTINGS, MOCK_DESTINATION } from '../lib/mockData';

describe('Mock data integrity', () => {
  it('has at least 10 listings', () => {
    expect(MOCK_LISTINGS.length).toBeGreaterThanOrEqual(10);
  });

  it('all listings have non-empty id', () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.id).toBeTruthy();
    }
  });

  it('all listing ids are unique', () => {
    const ids = MOCK_LISTINGS.map((l) => l.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all listings have price > 0', () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.price).toBeGreaterThan(0);
    }
  });

  it('all listings have bedrooms >= 0 (0 = studio)', () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.bedrooms).toBeGreaterThanOrEqual(0);
    }
  });

  it('all listings have valid NYC latitude range (40 < lat < 42)', () => {
    for (const listing of MOCK_LISTINGS) {
      if (listing.latitude !== undefined && listing.latitude !== null) {
        expect(listing.latitude).toBeGreaterThan(40);
        expect(listing.latitude).toBeLessThan(42);
      }
    }
  });

  it('all listings have valid NYC longitude range (-75 < lng < -73)', () => {
    for (const listing of MOCK_LISTINGS) {
      if (listing.longitude !== undefined && listing.longitude !== null) {
        expect(listing.longitude).toBeGreaterThan(-75);
        expect(listing.longitude).toBeLessThan(-73);
      }
    }
  });

  it('all listings have a listing_url', () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.listing_url).toBeTruthy();
      expect(listing.listing_url.startsWith('https://')).toBe(true);
    }
  });

  it('includes at least one StreetEasy listing', () => {
    const sources = new Set(MOCK_LISTINGS.map((l) => l.source));
    expect(sources.has('streeteasy')).toBe(true);
  });

  it('includes at least one Apartments.com listing', () => {
    const sources = new Set(MOCK_LISTINGS.map((l) => l.source));
    expect(sources.has('apartments_com')).toBe(true);
  });

  it('includes at least one Zillow listing', () => {
    const sources = new Set(MOCK_LISTINGS.map((l) => l.source));
    expect(sources.has('zillow')).toBe(true);
  });

  it('includes at least one Facebook Marketplace listing', () => {
    const sources = new Set(MOCK_LISTINGS.map((l) => l.source));
    expect(sources.has('facebook_marketplace')).toBe(true);
  });

  it('destination has valid NYC latitude (near 40.71)', () => {
    expect(MOCK_DESTINATION.lat).toBeCloseTo(40.71, 1);
  });

  it('destination has valid NYC longitude (near -74.01)', () => {
    expect(MOCK_DESTINATION.lng).toBeCloseTo(-74.01, 1);
  });

  it('destination has a non-empty label', () => {
    expect(MOCK_DESTINATION.label).toBeTruthy();
  });

  it('at least 2 listings have full route_steps (length > 0)', () => {
    const withSteps = MOCK_LISTINGS.filter(
      (l) => l.commute?.route_steps && l.commute.route_steps.length > 0
    );
    expect(withSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('listings with commute have commute_time_seconds > 0', () => {
    const withCommute = MOCK_LISTINGS.filter((l) => l.commute);
    for (const listing of withCommute) {
      expect(listing.commute!.commute_time_seconds).toBeGreaterThan(0);
    }
  });

  it('listings have valid source type values', () => {
    const validSources = new Set([
      'streeteasy',
      'zillow',
      'apartments_com',
      'facebook_marketplace',
    ]);
    for (const listing of MOCK_LISTINGS) {
      expect(validSources.has(listing.source)).toBe(true);
    }
  });

  it('price_monthly_cents matches price * 100', () => {
    for (const listing of MOCK_LISTINGS) {
      expect(listing.price_monthly_cents).toBe(listing.price * 100);
    }
  });

  it('at least one listing has commute_pending=true', () => {
    const pending = MOCK_LISTINGS.filter((l) => l.commute_pending === true);
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it('listings with commute have commute_mode set', () => {
    const validModes = new Set(['transit', 'driving', 'walking', 'bicycling']);
    for (const listing of MOCK_LISTINGS) {
      if (listing.commute) {
        expect(validModes.has(listing.commute.commute_mode)).toBe(true);
      }
    }
  });
});
