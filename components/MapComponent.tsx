import React, { useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapEventHandler({ 
  onLocationChange 
}: { 
  onLocationChange: (latlng: LatLng) => void 
}) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng);
    },
  });
  return null;
}

function DraggableMarker({ 
  position, 
  onPositionChange 
}: { 
  position: LatLng; 
  onPositionChange: (latlng: LatLng) => void 
}) {
  const markerRef = useRef<any>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        onPositionChange(marker.getLatLng());
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={defaultIcon}
    />
  );
}

interface MapComponentProps {
  lat: number;
  lng: number;
  radius: number;
  onLocationChange: (latlng: { lat: number; lng: number }) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  lat, 
  lng, 
  radius, 
  onLocationChange 
}) => {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEventHandler onLocationChange={onLocationChange} />
      
      <DraggableMarker
        position={new LatLng(lat, lng)}
        onPositionChange={onLocationChange}
      />
      
      <Circle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: '#000000',
          fillColor: '#000000',
          fillOpacity: 0.1,
          weight: 2
        }}
      />
    </MapContainer>
  );
};

export default MapComponent;