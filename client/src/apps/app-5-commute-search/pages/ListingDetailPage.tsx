import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import type { SearchFilters } from '../lib/types';
import type { ListingDetail } from '../lib/api';
import { getListingById } from '../lib/api';
import { useSaved } from '../hooks/useSaved';
import { formatPrice, formatAvailableDate, sourceColor } from '../lib/utils';
import CommuteBreakdown from '../components/CommuteBreakdown';
import MapView from '../components/MapView';

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isSaved, saveListingId, removeSavedId } = useSaved();

  const locationState = location.state as {
    listing?: ListingDetail;
    filters?: SearchFilters;
  } | null;

  const [listing, setListing] = useState<ListingDetail | null>(
    locationState?.listing ?? null,
  );
  const [isLoading, setIsLoading] = useState(!locationState?.listing);
  const [isError, setIsError] = useState(false);

  const filters = locationState?.filters ?? null;
  const destinationLabel = filters?.destination_label ?? 'Your destination';

  useEffect(() => {
    if (listing) return; // already have it from state
    if (!id) return;

    const dest =
      filters?.destination_lat !== null && filters?.destination_lat !== undefined
        ? { lat: filters.destination_lat, lng: filters.destination_lng! }
        : undefined;

    setIsLoading(true);
    setIsError(false);
    getListingById(id, dest, filters?.mode)
      .then((data) => {
        setListing(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const destination =
    filters?.destination_lat !== null && filters?.destination_lat !== undefined
      ? {
          lat: filters!.destination_lat!,
          lng: filters!.destination_lng!,
          label: filters!.destination_label,
        }
      : null;

  const saved = listing ? isSaved(listing.id) : false;

  const handleSaveToggle = () => {
    if (!listing) return;
    if (saved) {
      removeSavedId(listing.id);
    } else {
      saveListingId(listing.id);
    }
  };

  const feeTypeLabel: Record<string, string> = {
    no_fee: 'No Fee',
    op_fee: "OP Fee",
    broker_fee: 'Broker Fee',
  };

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-2xl mb-3" aria-hidden="true">⚠️</p>
        <p className="text-slate-300 font-medium mb-2">Could not load listing.</p>
        <p className="text-slate-500 text-sm mb-6">Please go back and try again.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-slate-300 text-sm hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Back bar */}
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
          aria-label="Back to results"
        >
          ← Results
        </button>
        <span className="text-base font-bold gradient-text flex-1 truncate text-center">CommuteFirst</span>
        <button
          type="button"
          onClick={handleSaveToggle}
          aria-label={saved ? 'Remove from saved' : 'Save listing'}
          aria-pressed={saved}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] transition-colors text-xl"
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </nav>

      {isLoading ? (
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6">
          <div className="cs-skeleton rounded-xl h-64" aria-label="Loading photo gallery" />
          <div className="cs-skeleton rounded-xl h-24" />
          <div className="cs-skeleton rounded-xl h-48" />
          <div className="cs-skeleton rounded-xl h-80" />
        </div>
      ) : listing ? (
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-6 pb-12">
          {/* Photo gallery */}
          {listing.image_urls && listing.image_urls.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {listing.image_urls.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`${listing.title} photo ${i + 1}`}
                  className="h-56 w-auto rounded-xl object-cover flex-shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          ) : (
            <div
              className="h-64 rounded-xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center border border-[rgba(255,255,255,0.06)]"
              aria-label="No photos available"
            >
              <span className="text-5xl opacity-30" aria-hidden="true">🏠</span>
            </div>
          )}

          {/* Price + header */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-3xl font-bold text-slate-100">
                  {formatPrice(listing.price)}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BD`}
                  {' · '}
                  {listing.bathrooms} BA
                  {listing.square_feet && ` · ${listing.square_feet.toLocaleString()} sqft`}
                </p>
                <p className="text-slate-300 text-sm mt-1">
                  {listing.address_line1}
                  {listing.address_line2 && `, ${listing.address_line2}`}
                  {', '}
                  {listing.city}, {listing.state} {listing.zip_code}
                </p>
                {listing.neighborhood && (
                  <p className="text-slate-500 text-xs mt-0.5">{listing.neighborhood}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Source badge */}
                <span
                  className="inline-block px-2 py-1 rounded text-xs font-bold"
                  style={(() => {
                    const c = sourceColor(listing.source);
                    return { background: c.bg, color: c.text };
                  })()}
                >
                  {listing.source === 'streeteasy'
                    ? 'StreetEasy'
                    : listing.source === 'zillow'
                    ? 'Zillow'
                    : listing.source === 'apartments_com'
                    ? 'Apartments.com'
                    : 'Facebook MP'}
                </span>
                {listing.fee_type && (
                  <span className="text-xs text-slate-500">
                    {feeTypeLabel[listing.fee_type] ?? listing.fee_type}
                  </span>
                )}
                {listing.available_date && (
                  <span className="text-xs text-slate-500">
                    Available {formatAvailableDate(listing.available_date)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Commute panel */}
          {listing.commute ? (
            <CommuteBreakdown
              commute={listing.commute}
              destinationLabel={destinationLabel}
            />
          ) : listing.commute_pending ? (
            <div className="glass rounded-xl p-5 flex items-center gap-3">
              <div className="cs-skeleton rounded-full w-10 h-10 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 space-y-2">
                <div className="cs-skeleton rounded h-4 w-32" />
                <div className="cs-skeleton rounded h-3 w-48" />
              </div>
              <p className="text-xs text-slate-500 sr-only" aria-live="polite">Calculating commute...</p>
            </div>
          ) : (
            <div className="glass rounded-xl p-5 text-center">
              <p className="text-slate-400 text-sm">No commute data available.</p>
              <p className="text-slate-500 text-xs mt-1">
                Select a destination on the search page to calculate commute times.
              </p>
            </div>
          )}

          {/* Map */}
          <div className="rounded-xl overflow-hidden h-64">
            <MapView
              listings={[listing]}
              destination={destination}
              onListingClick={() => {}}
              selectedListingId={listing.id}
            />
          </div>

          {/* Description */}
          {listing.description && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">Description</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{listing.description}</p>
            </div>
          )}

          {/* Details grid */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Property Type', value: listing.property_type ?? '—' },
                { label: 'Floor', value: listing.floor_number !== undefined ? `Floor ${listing.floor_number}` : '—' },
                { label: 'Year Built', value: listing.year_built?.toString() ?? '—' },
                {
                  label: 'Laundry',
                  value: listing.has_laundry_in_unit
                    ? 'In-unit'
                    : listing.has_laundry_in_bldg
                    ? 'In building'
                    : 'None',
                },
                {
                  label: 'Deposit',
                  value: listing.deposit ? `$${listing.deposit.toLocaleString()}` : '—',
                },
                { label: 'Fee', value: listing.fee_type ? (feeTypeLabel[listing.fee_type] ?? listing.fee_type) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-300 capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pet policy */}
          {listing.pet_policy && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Pet Policy</h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={listing.pet_policy.cats_allowed ? 'text-green-400' : 'text-slate-500'}>
                  🐱 Cats {listing.pet_policy.cats_allowed ? 'allowed' : 'not allowed'}
                </span>
                <span className={listing.pet_policy.dogs_allowed ? 'text-green-400' : 'text-slate-500'}>
                  🐶 Dogs {listing.pet_policy.dogs_allowed ? 'allowed' : 'not allowed'}
                </span>
                {listing.pet_policy.dogs_allowed && listing.pet_policy.dog_weight_limit_lbs && (
                  <span className="text-slate-400 text-xs">
                    (max {listing.pet_policy.dog_weight_limit_lbs} lbs)
                  </span>
                )}
                {listing.pet_policy.pet_monthly_fee_cents && (
                  <span className="text-slate-400 text-xs">
                    Pet fee: ${(listing.pet_policy.pet_monthly_fee_cents / 100).toFixed(0)}/mo
                  </span>
                )}
                {listing.pet_policy.pet_deposit_cents && (
                  <span className="text-slate-400 text-xs">
                    Pet deposit: ${(listing.pet_policy.pet_deposit_cents / 100).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 rounded-full text-xs text-slate-300 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] capitalize"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {((listing as ListingDetail).contact_name ||
            (listing as ListingDetail).contact_email ||
            (listing as ListingDetail).contact_phone) && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Contact</h2>
              <div className="space-y-2 text-sm">
                {(listing as ListingDetail).contact_name && (
                  <p className="text-slate-300">{(listing as ListingDetail).contact_name}</p>
                )}
                {(listing as ListingDetail).contact_email && (
                  <a
                    href={`mailto:${(listing as ListingDetail).contact_email}`}
                    className="block text-[#00d4ff] hover:underline"
                    aria-label="Email contact"
                  >
                    {(listing as ListingDetail).contact_email}
                  </a>
                )}
                {(listing as ListingDetail).contact_phone && (
                  <a
                    href={`tel:${(listing as ListingDetail).contact_phone}`}
                    className="block text-[#00d4ff] hover:underline"
                    aria-label="Call contact"
                  >
                    {(listing as ListingDetail).contact_phone}
                  </a>
                )}
                <a
                  href={listing.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] text-slate-300 text-sm hover:border-[#00d4ff] hover:text-[#00d4ff] transition-colors"
                  aria-label={`View on ${listing.source} (opens in new tab)`}
                >
                  View on{' '}
                  {listing.source === 'streeteasy'
                    ? 'StreetEasy'
                    : listing.source === 'zillow'
                    ? 'Zillow'
                    : listing.source === 'apartments_com'
                    ? 'Apartments.com'
                    : 'Facebook MP'}{' '}
                  ↗
                </a>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ListingDetailPage;
