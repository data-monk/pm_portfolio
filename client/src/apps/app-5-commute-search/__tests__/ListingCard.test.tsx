import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingCard from '../components/ListingCard';
import type { ListingWithCommute } from '../lib/types';

vi.mock('../lib/api', () => ({
  saveListing: vi.fn(() => Promise.resolve()),
  unsaveListing: vi.fn(() => Promise.resolve()),
}));

const MOCK_LISTING: ListingWithCommute = {
  id: 'a1b2c3d4-0001-4000-8000-000000000001',
  external_id: 'streeteasy_1001',
  source: 'streeteasy',
  listing_url: 'https://streeteasy.com/rental/1001',
  title: 'Sunny 1BR in Park Slope',
  description: 'Bright corner unit.',
  price: 3200,
  price_monthly_cents: 320000,
  bedrooms: 2,
  bathrooms: 1,
  square_feet: 720,
  address_line1: '245 7th Ave',
  address_line2: 'Apt 3C',
  city: 'Brooklyn',
  state: 'NY',
  zip_code: '11215',
  neighborhood: 'Park Slope',
  latitude: 40.6681,
  longitude: -73.9808,
  property_type: 'apartment',
  amenities: [],
  has_doorman: false,
  has_elevator: false,
  has_gym: false,
  has_laundry_in_unit: false,
  has_laundry_in_bldg: true,
  has_dishwasher: true,
  has_ac: true,
  pets_allowed: true,
  has_outdoor_space: false,
  image_urls: [],
  is_active: true,
  scraped_at: '2026-06-14T09:00:00Z',
  last_seen_at: '2026-06-14T09:00:00Z',
  commute: {
    commute_mode: 'transit',
    commute_time_seconds: 1740,
    commute_time_display: '29 min',
    distance_meters: 8400,
    num_transfers: 1,
    route_summary: 'F train to Jay St, A train to Fulton St',
    route_steps: [],
    peak_time_used: true,
    departure_time_utc: '2026-06-16T12:30:00Z',
    transit_lines: ['F', 'A'],
  },
};

describe('ListingCard', () => {
  const defaultProps = {
    listing: MOCK_LISTING,
    onSave: vi.fn(),
    isSaved: false,
    onClick: vi.fn(),
  };

  it('renders the price formatted as $3,200/mo', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.getByText('$3,200/mo')).toBeInTheDocument();
  });

  it('renders the address', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.getByText('245 7th Ave')).toBeInTheDocument();
  });

  it('renders the neighborhood', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.getByText(/park slope/i)).toBeInTheDocument();
  });

  it('renders the commute time badge', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.getByText('29 min')).toBeInTheDocument();
  });

  it('renders transit line badges for F and A trains', () => {
    const { container } = render(<ListingCard {...defaultProps} />);
    const fBadge = container.querySelector('.cs-line-F');
    const aBadge = container.querySelector('.cs-line-A');
    expect(fBadge).toBeTruthy();
    expect(aBadge).toBeTruthy();
  });

  it('renders transfer count as "1 transfer"', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.getByText('1 transfer')).toBeInTheDocument();
  });

  it('shows unsaved heart icon when isSaved=false', () => {
    render(<ListingCard {...defaultProps} isSaved={false} />);
    const saveBtn = screen.getByRole('button', { name: /save listing/i });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows saved heart icon when isSaved=true', () => {
    render(<ListingCard {...defaultProps} isSaved={true} />);
    const saveBtn = screen.getByRole('button', { name: /remove from saved/i });
    expect(saveBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSave when bookmark button is clicked', async () => {
    const onSave = vi.fn();
    render(<ListingCard {...defaultProps} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /save listing/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when the card body is clicked', async () => {
    const onClick = vi.fn();
    render(<ListingCard {...defaultProps} onClick={onClick} />);
    await userEvent.click(screen.getByText('$3,200/mo'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when save button is clicked', async () => {
    const onClick = vi.fn();
    const onSave = vi.fn();
    render(<ListingCard {...defaultProps} onClick={onClick} onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: /save listing/i }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows warning icon (⚠) for Facebook Marketplace listings', () => {
    const fbListing: ListingWithCommute = {
      ...MOCK_LISTING,
      source: 'facebook_marketplace',
    };
    render(<ListingCard {...defaultProps} listing={fbListing} />);
    // The ⚠ icon has a title attribute
    const warningIcon = screen.getByTitle(/user-posted listing/i);
    expect(warningIcon).toBeInTheDocument();
  });

  it('does not show warning icon for StreetEasy listings', () => {
    render(<ListingCard {...defaultProps} />);
    expect(screen.queryByTitle(/user-posted listing/i)).not.toBeInTheDocument();
  });

  it('shows skeleton commute badge when commute_pending=true', () => {
    const pendingListing: ListingWithCommute = {
      ...MOCK_LISTING,
      commute: undefined,
      commute_pending: true,
    };
    const { container } = render(
      <ListingCard {...defaultProps} listing={pendingListing} />
    );
    // CommuteTimeBadge renders .cs-skeleton when pending
    expect(container.querySelector('.cs-skeleton')).toBeTruthy();
  });

  it('shows "Direct" when num_transfers is 0', () => {
    const directListing: ListingWithCommute = {
      ...MOCK_LISTING,
      commute: {
        ...MOCK_LISTING.commute!,
        num_transfers: 0,
      },
    };
    render(<ListingCard {...defaultProps} listing={directListing} />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('shows "2 transfers" when num_transfers is 2', () => {
    const twoTransferListing: ListingWithCommute = {
      ...MOCK_LISTING,
      commute: {
        ...MOCK_LISTING.commute!,
        num_transfers: 2,
      },
    };
    render(<ListingCard {...defaultProps} listing={twoTransferListing} />);
    expect(screen.getByText('2 transfers')).toBeInTheDocument();
  });

  it('shows the source badge abbreviation "SE" for StreetEasy', () => {
    render(<ListingCard {...defaultProps} />);
    // Source badge shows "SE"
    expect(screen.getByLabelText(/source: streeteasy/i)).toBeInTheDocument();
  });

  it('renders without commute data gracefully', () => {
    const noCommuteListing: ListingWithCommute = {
      ...MOCK_LISTING,
      commute: undefined,
      commute_pending: false,
    };
    render(<ListingCard {...defaultProps} listing={noCommuteListing} />);
    // Price should still render
    expect(screen.getByText('$3,200/mo')).toBeInTheDocument();
  });
});
