import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { CommuteMode, SearchFilters } from '../lib/types';
import { useSaved } from '../hooks/useSaved';
import DestinationInput from '../components/DestinationInput';
import CommuteModeSelector from '../components/CommuteModeSelector';
import CommuteSlider from '../components/CommuteSlider';

const BEDROOM_OPTIONS: Array<{ label: string; value: number | undefined }> = [
  { label: 'Any', value: undefined },
  { label: 'Studio', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { savedCount } = useSaved();

  const [destinationLabel, setDestinationLabel] = useState('');
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLng, setDestinationLng] = useState<number | null>(null);
  const [mode, setMode] = useState<CommuteMode>('transit');
  const [maxCommuteSeconds, setMaxCommuteSeconds] = useState(2700);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBedrooms, setMinBedrooms] = useState<number | undefined>(undefined);
  const [destinationError, setDestinationError] = useState('');

  const handleSelect = (place: { label: string; lat: number; lng: number }) => {
    setDestinationLabel(place.label);
    setDestinationLat(place.lat);
    setDestinationLng(place.lng);
    setDestinationError('');
  };

  const handleClear = () => {
    setDestinationLabel('');
    setDestinationLat(null);
    setDestinationLng(null);
  };

  const handleSearch = () => {
    if (!destinationLat || !destinationLng || !destinationLabel) {
      setDestinationError('Please enter a destination before searching.');
      return;
    }

    const filters: SearchFilters = {
      destination_lat: destinationLat,
      destination_lng: destinationLng,
      destination_label: destinationLabel,
      mode,
      max_commute_seconds: maxCommuteSeconds,
      min_price: minPrice ? parseInt(minPrice, 10) : undefined,
      max_price: maxPrice ? parseInt(maxPrice, 10) : undefined,
      min_bedrooms: minBedrooms,
      page: 1,
      sort: 'commute_asc',
    };

    navigate('/apps/commute-search/results', { state: { filters } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar strip */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(15,15,19,0.9)] backdrop-blur-sm sticky top-0 z-10">
        <span className="text-xl font-bold gradient-text">CommuteFirst</span>
        <Link
          to="/apps/commute-search/saved"
          className="text-sm text-slate-400 hover:text-[#00d4ff] transition-colors"
          aria-label={`Saved listings (${savedCount})`}
        >
          Saved ({savedCount})
        </Link>
      </nav>

      {/* Hero section */}
      <section className="text-center px-4 pt-16 pb-10 md:pt-24 md:pb-14">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-100 leading-tight mb-4">
          Find your apartment{' '}
          <span className="gradient-text">by commute time.</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">
          Search across Zillow, StreetEasy, and more — ranked by how long it actually takes to get to work.
        </p>
      </section>

      {/* Search form */}
      <section className="flex-1 px-4 md:px-8 pb-12 max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-6 md:p-8 flex flex-col gap-6">

          {/* Destination input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your destination
            </label>
            <DestinationInput
              value={destinationLabel}
              onSelect={handleSelect}
              onClear={handleClear}
              error={destinationError}
            />
          </div>

          {/* Commute mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              How do you commute?
            </label>
            <CommuteModeSelector value={mode} onChange={setMode} />
          </div>

          {/* Max commute slider */}
          <div>
            <CommuteSlider value={maxCommuteSeconds} onChange={setMaxCommuteSeconds} />
          </div>

          {/* Budget + bedrooms row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Monthly Budget</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    aria-label="Minimum monthly budget"
                    className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-200 text-sm outline-none focus:border-[#00d4ff] transition-colors"
                  />
                </div>
                <span className="text-slate-500 flex-shrink-0">–</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    aria-label="Maximum monthly budget"
                    className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-slate-200 text-sm outline-none focus:border-[#00d4ff] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Bedrooms</p>
              <div className="cs-segmented">
                {BEDROOM_OPTIONS.map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setMinBedrooms(opt.value)}
                    className={minBedrooms === opt.value ? 'active' : ''}
                    aria-pressed={minBedrooms === opt.value}
                    aria-label={`Bedrooms: ${opt.label}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search CTA */}
          <button
            type="button"
            onClick={handleSearch}
            className="w-full py-4 rounded-xl text-base font-semibold text-[#0f0f13] bg-[#00d4ff] hover:opacity-90 transition-opacity glow-border"
            aria-label="Search apartments"
          >
            Search Apartments
          </button>
        </div>

        {/* How it works */}
        <div className="mt-12">
          <h2 className="text-center text-lg font-semibold text-slate-300 mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                emoji: '🏢',
                title: 'Enter your destination',
                desc: 'Type your office, university, or any address.',
              },
              {
                emoji: '🚇',
                title: 'Set your commute limit',
                desc: 'Choose your max travel time and preferred mode of transport.',
              },
              {
                emoji: '🏠',
                title: 'Find your apartment',
                desc: 'We rank every listing by how long it actually takes to get there.',
              },
            ].map((step) => (
              <div
                key={step.title}
                className="glass rounded-xl p-5 text-center"
              >
                <div className="text-3xl mb-3" aria-hidden="true">{step.emoji}</div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{step.title}</h3>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SearchPage;
