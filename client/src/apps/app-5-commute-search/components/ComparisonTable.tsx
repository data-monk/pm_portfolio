import React from 'react';
import type { ListingWithCommute } from '../lib/types';
import CommuteTimeBadge from './CommuteTimeBadge';
import { formatPrice, formatDuration, sourceAbbreviation, sourceColor, formatAvailableDate } from '../lib/utils';

interface ComparisonTableProps {
  listings: ListingWithCommute[];
  onRemove: (id: string) => void;
}

interface CellData {
  value: string | number | null;
  rawValue: number | null; // for best-value logic
  isBest?: boolean;
}

function getBestIndex(values: (number | null)[], lowerIsBetter: boolean): number {
  const filtered = values.map((v, i) => ({ v, i })).filter(({ v }) => v !== null);
  if (filtered.length < 2) return -1;
  filtered.sort((a, b) => lowerIsBetter ? (a.v ?? 0) - (b.v ?? 0) : (b.v ?? 0) - (a.v ?? 0));
  return filtered[0].i;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ listings, onRemove }) => {
  if (listings.length < 2) {
    return (
      <div className="text-center py-8 text-slate-400">
        Select at least 2 listings to compare
      </div>
    );
  }

  const rentValues = listings.map((l) => l.price);
  const commuteValues = listings.map((l) => l.commute?.commute_time_seconds ?? null);
  const sqftValues = listings.map((l) => l.square_feet ?? null);
  const transferValues = listings.map((l) => l.commute?.num_transfers ?? null);

  const bestRentIdx = getBestIndex(rentValues, true);
  const bestCommuteIdx = getBestIndex(commuteValues, true);
  const bestSqftIdx = getBestIndex(sqftValues, false);

  const rows: Array<{
    label: string;
    render: (listing: ListingWithCommute, idx: number) => React.ReactNode;
    bestIdx?: number;
  }> = [
    {
      label: 'Photo',
      render: (l) => (
        <div className="w-20 h-14 rounded overflow-hidden bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3e] flex items-center justify-center">
          {l.image_urls[0] ? (
            <img src={l.image_urls[0]} alt={l.title} className="w-full h-full object-cover" />
          ) : (
            <span aria-hidden="true" className="opacity-30 text-2xl">🏠</span>
          )}
        </div>
      ),
    },
    {
      label: 'Rent',
      bestIdx: bestRentIdx,
      render: (l, idx) => (
        <span className={idx === bestRentIdx ? 'cs-comparison-best' : 'text-slate-200 font-medium'}>
          {formatPrice(l.price)}
          {idx === bestRentIdx && <span className="ml-1 text-xs">🏆</span>}
        </span>
      ),
    },
    {
      label: 'Commute',
      bestIdx: bestCommuteIdx,
      render: (l, idx) => (
        <span className={`flex items-center gap-2 ${idx === bestCommuteIdx ? 'cs-comparison-best' : ''}`}>
          <CommuteTimeBadge
            seconds={l.commute?.commute_time_seconds}
            pending={l.commute_pending}
            size="sm"
          />
          {idx === bestCommuteIdx && <span className="text-xs">🏆</span>}
        </span>
      ),
    },
    {
      label: 'Transfers',
      render: (l) => (
        <span className="text-slate-300 text-sm">
          {l.commute?.num_transfers === 0
            ? 'Direct'
            : l.commute?.num_transfers != null
            ? `${l.commute.num_transfers} transfer${l.commute.num_transfers > 1 ? 's' : ''}`
            : '—'}
        </span>
      ),
    },
    {
      label: 'Bedrooms',
      render: (l) => (
        <span className="text-slate-300 text-sm">
          {l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} BD`}
        </span>
      ),
    },
    {
      label: 'Bathrooms',
      render: (l) => (
        <span className="text-slate-300 text-sm">{l.bathrooms} BA</span>
      ),
    },
    {
      label: 'Sqft',
      bestIdx: bestSqftIdx,
      render: (l, idx) => (
        <span className={idx === bestSqftIdx && l.square_feet ? 'cs-comparison-best' : 'text-slate-300 text-sm'}>
          {l.square_feet ? `${l.square_feet.toLocaleString()} sqft` : '—'}
          {idx === bestSqftIdx && l.square_feet && <span className="ml-1 text-xs">🏆</span>}
        </span>
      ),
    },
    {
      label: 'Pets',
      render: (l) => (
        <span className={`text-sm ${l.pets_allowed ? 'text-green-400' : 'text-slate-500'}`}>
          {l.pets_allowed ? '✓ Allowed' : '✗ No pets'}
        </span>
      ),
    },
    {
      label: 'Laundry',
      render: (l) => (
        <span className="text-slate-300 text-sm">
          {l.has_laundry_in_unit
            ? 'In-unit'
            : l.has_laundry_in_bldg
            ? 'In building'
            : 'None'}
        </span>
      ),
    },
    {
      label: 'Available',
      render: (l) => (
        <span className="text-slate-300 text-sm">
          {l.available_date ? formatAvailableDate(l.available_date) : '—'}
        </span>
      ),
    },
    {
      label: 'Source',
      render: (l) => {
        const abbr = sourceAbbreviation(l.source);
        const color = sourceColor(l.source);
        return (
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: color.bg, color: color.text }}
          >
            {abbr}
          </span>
        );
      },
    },
  ];

  return (
    <div className="overflow-x-auto" role="region" aria-label="Listing comparison table">
      <table className="cs-comparison-table">
        <thead>
          <tr>
            {/* Row label column */}
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider w-28">
              Feature
            </th>
            {listings.map((listing) => (
              <th key={listing.id} className="text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-slate-100 font-semibold text-sm truncate max-w-[140px]">
                      {listing.address_line1}
                    </p>
                    {listing.neighborhood && (
                      <p className="text-slate-500 text-xs">{listing.neighborhood}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(listing.id)}
                    aria-label={`Remove ${listing.title} from comparison`}
                    className="flex-shrink-0 text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="text-xs text-slate-500 font-medium">{row.label}</td>
              {listings.map((listing, idx) => (
                <td key={listing.id}>{row.render(listing, idx)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
