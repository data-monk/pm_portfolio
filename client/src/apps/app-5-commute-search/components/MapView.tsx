import React, { useState } from 'react';
import type { ListingWithCommute } from '../lib/types';
import { formatPrice, getCommutePinColor } from '../lib/utils';
import CommuteTimeBadge from './CommuteTimeBadge';

interface Destination {
  lat: number;
  lng: number;
  label: string;
}

interface MapViewProps {
  listings: ListingWithCommute[];
  destination: Destination | null;
  onListingClick: (id: string) => void;
  selectedListingId?: string;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

// Placeholder when no API key is configured
function MapPlaceholder(): React.ReactElement {
  return (
    <div className="cs-map-placeholder">
      <span className="text-5xl mb-4" aria-hidden="true">🗺️</span>
      <p className="text-slate-300 font-medium text-center px-6">
        Map view requires Google Maps API key
      </p>
      <p className="text-slate-500 text-sm mt-2 text-center px-6">
        Set <code className="text-[#00d4ff] bg-[rgba(0,212,255,0.1)] px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to enable the interactive map
      </p>
    </div>
  );
}

// Dynamic import wrapper for Google Maps components to avoid build errors without API key
let GoogleMapsComponents: {
  APIProvider: React.ComponentType<{ apiKey: string; children: React.ReactNode }>;
  Map: React.ComponentType<{
    defaultCenter: { lat: number; lng: number };
    defaultZoom: number;
    mapId?: string;
    style?: React.CSSProperties;
    gestureHandling?: string;
    disableDefaultUI?: boolean;
    children?: React.ReactNode;
  }>;
  AdvancedMarker: React.ComponentType<{
    position: { lat: number; lng: number };
    onClick?: () => void;
    children?: React.ReactNode;
  }>;
  InfoWindow: React.ComponentType<{
    position: { lat: number; lng: number };
    onCloseClick?: () => void;
    children?: React.ReactNode;
  }>;
} | null = null;

if (MAPS_API_KEY) {
  import('@vis.gl/react-google-maps')
    .then((mod) => {
      GoogleMapsComponents = {
        APIProvider: mod.APIProvider,
        Map: mod.Map as MapViewProps['onListingClick'] extends unknown ? typeof mod.Map : typeof mod.Map,
        AdvancedMarker: mod.AdvancedMarker,
        InfoWindow: mod.InfoWindow,
      };
    })
    .catch(() => {
      // Maps won't load; will show placeholder
    });
}

interface ListingPinProps {
  listing: ListingWithCommute;
  isSelected: boolean;
  onClick: () => void;
}

function ListingPin({ listing, isSelected, onClick }: ListingPinProps): React.ReactElement {
  const color = listing.commute?.commute_time_seconds
    ? getCommutePinColor(listing.commute.commute_time_seconds)
    : '#64748b';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${listing.title} - ${formatPrice(listing.price)}`}
      style={{
        width: isSelected ? 20 : 16,
        height: isSelected ? 20 : 16,
        borderRadius: '50%',
        background: color,
        border: isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.6)',
        boxShadow: isSelected ? `0 0 12px ${color}` : `0 2px 6px rgba(0,0,0,0.4)`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'block',
      }}
    />
  );
}

function DestinationPin(): React.ReactElement {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#00d4ff',
        border: '3px solid #fff',
        boxShadow: '0 0 16px rgba(0,212,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
      }}
      aria-label="Destination"
      role="img"
    >
      ★
    </div>
  );
}

interface PopupCardProps {
  listing: ListingWithCommute;
  onViewDetails: () => void;
  onClose: () => void;
}

function PopupCard({ listing, onViewDetails, onClose }: PopupCardProps): React.ReactElement {
  return (
    <div className="bg-[#16161e] rounded-lg p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-bold text-slate-100 text-base">{formatPrice(listing.price)}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          className="text-slate-400 hover:text-slate-200 text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-2 truncate">{listing.address_line1}</p>
      <div className="flex items-center justify-between">
        <CommuteTimeBadge
          seconds={listing.commute?.commute_time_seconds}
          pending={listing.commute_pending}
          size="sm"
        />
        <button
          type="button"
          onClick={onViewDetails}
          className="text-xs text-[#00d4ff] hover:underline"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}

const MapView: React.FC<MapViewProps> = ({
  listings,
  destination,
  onListingClick,
  selectedListingId,
}) => {
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [MapsLoaded, setMapsLoaded] = useState(false);
  const [mapsComponents, setMapsComponents] = useState(GoogleMapsComponents);

  // Load maps components dynamically if key is present
  React.useEffect(() => {
    if (!MAPS_API_KEY) return;
    if (GoogleMapsComponents) {
      setMapsComponents(GoogleMapsComponents);
      setMapsLoaded(true);
      return;
    }
    import('@vis.gl/react-google-maps').then((mod) => {
      const comps = {
        APIProvider: mod.APIProvider,
        Map: mod.Map as typeof mod.Map,
        AdvancedMarker: mod.AdvancedMarker,
        InfoWindow: mod.InfoWindow,
      };
      GoogleMapsComponents = comps;
      setMapsComponents(comps);
      setMapsLoaded(true);
    }).catch(() => {
      // silently fail — placeholder will show
    });
  }, []);

  if (!MAPS_API_KEY || !mapsComponents || (!MapsLoaded && !mapsComponents)) {
    return <MapPlaceholder />;
  }

  const { APIProvider, Map, AdvancedMarker, InfoWindow } = mapsComponents;

  const defaultCenter = destination
    ? { lat: destination.lat, lng: destination.lng }
    : { lat: 40.7128, lng: -74.0060 };

  const activePopupListing = activePopupId
    ? listings.find((l) => l.id === activePopupId)
    : null;

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={12}
        mapId="commute-first-map"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="cooperative"
        disableDefaultUI={false}
      >
        {/* Destination marker */}
        {destination && (
          <AdvancedMarker position={{ lat: destination.lat, lng: destination.lng }}>
            <DestinationPin />
          </AdvancedMarker>
        )}

        {/* Listing pins */}
        {listings.map((listing) => (
          <AdvancedMarker
            key={listing.id}
            position={{ lat: listing.latitude, lng: listing.longitude }}
            onClick={() => {
              setActivePopupId(listing.id === activePopupId ? null : listing.id);
              onListingClick(listing.id);
            }}
          >
            <ListingPin
              listing={listing}
              isSelected={selectedListingId === listing.id || activePopupId === listing.id}
              onClick={() => setActivePopupId(listing.id === activePopupId ? null : listing.id)}
            />
          </AdvancedMarker>
        ))}

        {/* Info window for active popup */}
        {activePopupListing && (
          <InfoWindow
            position={{ lat: activePopupListing.latitude, lng: activePopupListing.longitude }}
            onCloseClick={() => setActivePopupId(null)}
          >
            <PopupCard
              listing={activePopupListing}
              onViewDetails={() => {
                onListingClick(activePopupListing.id);
                setActivePopupId(null);
              }}
              onClose={() => setActivePopupId(null)}
            />
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
};

export default MapView;
