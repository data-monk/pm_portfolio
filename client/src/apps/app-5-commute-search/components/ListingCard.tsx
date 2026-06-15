import React from 'react';
import type { ListingWithCommute } from '../lib/types';
import CommuteTimeBadge from './CommuteTimeBadge';
import { formatPrice, formatListingMeta, sourceAbbreviation, sourceColor } from '../lib/utils';

interface ListingCardProps {
  listing: ListingWithCommute;
  onSave: () => void;
  isSaved: boolean;
  onClick: () => void;
  compact?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onSave,
  isSaved,
  onClick,
  compact = false,
}) => {
  const hasImage = listing.image_urls.length > 0 || listing.thumbnail_url;
  const imageUrl = listing.thumbnail_url ?? listing.image_urls[0];

  const abbr = sourceAbbreviation(listing.source);
  const color = sourceColor(listing.source);
  const isFacebook = listing.source === 'facebook_marketplace';

  const transferLabel =
    listing.commute?.num_transfers === 0
      ? 'Direct'
      : listing.commute?.num_transfers === 1
      ? '1 transfer'
      : listing.commute?.num_transfers != null
      ? `${listing.commute.num_transfers} transfers`
      : null;

  return (
    <article
      className="cs-listing-card bg-[#16161e] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden cursor-pointer"
      onClick={onClick}
      aria-label={`${listing.title}, ${formatPrice(listing.price)}`}
    >
      {/* Thumbnail */}
      <div
        className={`relative ${compact ? 'h-32' : 'h-48'} bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3e] flex-shrink-0`}
      >
        {hasImage ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color.bg}22 0%, #1e1e2e 100%)`,
            }}
          >
            <span className="text-4xl opacity-30" aria-hidden="true">🏠</span>
          </div>
        )}

        {/* Source badge */}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: color.bg, color: color.text }}
            aria-label={`Source: ${listing.source}`}
          >
            {abbr}
            {isFacebook && (
              <span
                title="User-posted listing — verify independently"
                aria-label="User-posted listing"
                className="ml-0.5"
              >
                ⚠
              </span>
            )}
          </span>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
          aria-pressed={isSaved}
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-[rgba(0,0,0,0.6)] hover:bg-[rgba(0,0,0,0.8)] transition-colors"
        >
          <span className="text-lg" aria-hidden="true">
            {isSaved ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2">
        {/* Price */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xl font-bold text-slate-100">
            {formatPrice(listing.price)}
          </span>
          <CommuteTimeBadge
            seconds={listing.commute?.commute_time_seconds}
            pending={listing.commute_pending}
            size="sm"
          />
        </div>

        {/* Meta row */}
        <p className="text-sm text-slate-400">
          {formatListingMeta(listing.bedrooms, listing.bathrooms, listing.square_feet)}
        </p>

        {/* Address */}
        <p className="text-sm text-slate-300 truncate">
          {listing.address_line1}
          {listing.neighborhood && (
            <span className="text-slate-500"> · {listing.neighborhood}</span>
          )}
        </p>

        {/* Commute detail row */}
        {(listing.commute || listing.commute_pending) && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {listing.commute_pending ? (
              <span className="cs-skeleton rounded px-10 h-4 inline-block" aria-label="Calculating commute" />
            ) : (
              <>
                <span aria-hidden="true">🚇</span>
                {transferLabel && <span>{transferLabel}</span>}
                {listing.commute?.transit_lines && listing.commute.transit_lines.length > 0 && (
                  <div className="flex gap-1">
                    {listing.commute.transit_lines.slice(0, 3).map((line) => (
                      <span
                        key={line}
                        className={`cs-line-${line} inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold`}
                        aria-label={`${line} train`}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Available date */}
        {listing.available_date && !compact && (
          <p className="text-xs text-slate-500">
            Available{' '}
            <span className="text-slate-400">
              {new Date(listing.available_date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </p>
        )}
      </div>
    </article>
  );
};

export default ListingCard;
