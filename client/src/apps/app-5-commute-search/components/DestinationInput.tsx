import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getCachedConfig } from '../lib/clientConfig';

interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}

interface DestinationInputProps {
  value: string;
  onSelect: (place: PlaceSuggestion) => void;
  onClear: () => void;
  error?: string;
}

const MOCK_SUGGESTIONS: PlaceSuggestion[] = [
  { label: '1 World Trade Center, New York, NY', lat: 40.7127, lng: -74.0134 },
  { label: 'NYU Stern, New York, NY', lat: 40.7295, lng: -73.9965 },
  { label: 'Midtown Manhattan, New York, NY', lat: 40.7549, lng: -73.9840 },
  { label: 'Brooklyn Navy Yard, Brooklyn, NY', lat: 40.6983, lng: -73.9715 },
];

const PLACES_API_KEY = getCachedConfig().googleMapsBrowserKey || undefined;

const DestinationInput: React.FC<DestinationInputProps> = ({
  value,
  onSelect,
  onClear,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Keep inputValue in sync when parent resets value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Load Google Places Autocomplete if API key is present
  useEffect(() => {
    if (!PLACES_API_KEY || !inputRef.current) return;

    const loadScript = (): Promise<void> =>
      new Promise((resolve) => {
        if (document.querySelector('#google-places-script')) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.id = 'google-places-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${PLACES_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });

    loadScript().then(() => {
      if (!inputRef.current || typeof google === 'undefined') return;
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'us' },
      });
      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const label = place.formatted_address ?? place.name ?? '';
        onSelect({
          label,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setInputValue(label);
        setShowSuggestions(false);
      });
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      setActiveSuggestionIndex(-1);

      if (!PLACES_API_KEY) {
        // Dev mode: filter mock suggestions
        if (val.length < 1) {
          setFilteredSuggestions(MOCK_SUGGESTIONS);
          setShowSuggestions(true);
        } else {
          const filtered = MOCK_SUGGESTIONS.filter((s) =>
            s.label.toLowerCase().includes(val.toLowerCase()),
          );
          setFilteredSuggestions(filtered);
          setShowSuggestions(filtered.length > 0 || val.length > 0);
        }
      }
    },
    [],
  );

  const handleFocus = useCallback(() => {
    if (!PLACES_API_KEY) {
      setFilteredSuggestions(
        inputValue.length > 0
          ? MOCK_SUGGESTIONS.filter((s) =>
              s.label.toLowerCase().includes(inputValue.toLowerCase()),
            )
          : MOCK_SUGGESTIONS,
      );
      setShowSuggestions(true);
    }
  }, [inputValue]);

  const handleSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      setInputValue(suggestion.label);
      setShowSuggestions(false);
      onSelect(suggestion);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setShowSuggestions(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || filteredSuggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((i) =>
          i < filteredSuggestions.length - 1 ? i + 1 : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((i) =>
          i > 0 ? i - 1 : filteredSuggestions.length - 1,
        );
      } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelect(filteredSuggestions[activeSuggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, filteredSuggestions, activeSuggestionIndex, handleSelect],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasError = Boolean(error);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
          hasError
            ? 'border-red-500 bg-[rgba(239,68,68,0.06)]'
            : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] focus-within:border-[#00d4ff]'
        }`}
      >
        <span className="text-lg flex-shrink-0" aria-hidden="true">📍</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Enter your workplace or destination..."
          aria-label="Commute destination address"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="destination-suggestions"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-base min-w-0"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear destination"
            className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        )}
      </div>

      {hasError && (
        <p className="mt-1 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {!PLACES_API_KEY && showSuggestions && filteredSuggestions.length > 0 && (
        <ul
          id="destination-suggestions"
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute z-50 top-full mt-1 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1e1e2e] shadow-xl overflow-hidden"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion.label}
              role="option"
              aria-selected={index === activeSuggestionIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors text-sm ${
                index === activeSuggestionIndex
                  ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]'
                  : 'text-slate-300 hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              <span className="text-slate-500 flex-shrink-0" aria-hidden="true">📍</span>
              <span>{suggestion.label}</span>
            </li>
          ))}
          {!PLACES_API_KEY && (
            <li className="px-4 py-2 text-xs text-slate-600 border-t border-[rgba(255,255,255,0.06)]">
              Dev mode — showing sample destinations
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default DestinationInput;
