import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface MapSelectorProps {
  onSelect: (data: { lat: number; lng: number; radius: number }) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface LocationData {
  lat: number;
  lng: number;
  radius: number;
}

const LeafletMapSelector: React.FC<MapSelectorProps> = ({ onSelect, onClose, isOpen }) => {
  const [location, setLocation] = useState<LocationData>({
    lat: 40.7128,
    lng: -74.0060,
    radius: 5000
  });

  const handleLocationChange = useCallback((latlng: { lat: number; lng: number }) => {
    setLocation(prev => ({
      ...prev,
      lat: latlng.lat,
      lng: latlng.lng
    }));
  }, []);

  const handleRadiusChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const radius = parseInt(event.target.value);
    setLocation(prev => ({
      ...prev,
      radius
    }));
  }, []);

  const handleCustomRadiusChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const radius = parseInt(value);
    if (!isNaN(radius) && radius > 0) {
      setLocation(prev => ({
        ...prev,
        radius
      }));
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onSelect(location);
    onClose();
  }, [location, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Select Location</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-4">
          <div className="h-96 mb-4 border border-gray-300 rounded-md overflow-hidden">
            <MapComponent
              lat={location.lat}
              lng={location.lng}
              radius={location.radius}
              onLocationChange={handleLocationChange}
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius: {location.radius.toLocaleString()} meters ({(location.radius / 1000).toFixed(1)} km)
              </label>
              <input
                type="range"
                min="100"
                max="100000"
                step="100"
                value={Math.min(location.radius, 100000)}
                onChange={handleRadiusChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100m</span>
                <span>100km</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Radius (meters)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={location.radius}
                  onChange={handleCustomRadiusChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
                  placeholder="Enter radius in meters"
                />
                <div className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                  Max: 1,000km
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {[500, 1000, 5000, 10000, 25000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setLocation(prev => ({ ...prev, radius: preset }))}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                  >
                    {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Latitude:</span>
                <span className="ml-2 font-mono">{location.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-gray-600">Longitude:</span>
                <span className="ml-2 font-mono">{location.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeafletMapSelector;