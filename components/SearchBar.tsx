import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string, options?: SearchOptions) => void;
  isLoading: boolean;
  selectedLocation?: { lat: number; lng: number; radius: number } | null;
  onClearLocation?: () => void;
}

interface SearchOptions {
  maxResults: number;
  provider: string;
  useStructured: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  selectedLocation,
  onClearLocation
}) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxResults, setMaxResults] = useState(25);
  const [provider, setProvider] = useState('google');
  const [useStructured, setUseStructured] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim(), {
        maxResults,
        provider,
        useStructured
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main search bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your PMF search query (e.g., 'Private schools in Tampa')"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium min-w-[120px]"
          >
            {isLoading ? 'Searching...' : 'Execute Pipeline'}
          </button>
        </div>

        {/* Location indicator */}
        {selectedLocation && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <span>📍 Geofence: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} ({selectedLocation.radius}km radius)</span>
            {onClearLocation && (
              <button
                type="button"
                onClick={onClearLocation}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Advanced options toggle */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? '▲ Hide Advanced Options' : '▼ Show Advanced Options'}
          </button>
        </div>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            {/* Max Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Results: {maxResults}
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full"
                disabled={isLoading}
              />
              <div className="text-xs text-gray-500 mt-1">5 - 100 companies</div>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black"
                disabled={isLoading}
              >
                <option value="google">Google Places</option>
                <option value="bing">Bing Maps</option>
              </select>
            </div>

            {/* Structured Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Query Format
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useStructured}
                    onChange={() => setUseStructured(false)}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <span className="text-sm">Natural ("schools in Tampa")</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useStructured}
                    onChange={() => setUseStructured(true)}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <span className="text-sm">Structured (category + region)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline status notice */}
        {isLoading && (
          <div className="text-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-md">
            ⏳ Executing PMF pipeline... This may take 2-5 minutes for fresh business discovery and AI scoring.
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;