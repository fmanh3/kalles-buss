import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LiveMap.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const createBusIcon = (status: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'UNKNOWN', isSelected: boolean) => {
  let color = '#3b82f6'; // blue
  if (status === 'DELAYED') color = '#ef4444'; // red
  if (status === 'ON_TIME') color = '#10b981'; // green

  return L.divIcon({
    className: 'custom-bus-marker',
    html: `<div style="
      background-color: ${color};
      width: ${isSelected ? '24px' : '16px'};
      height: ${isSelected ? '24px' : '16px'};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${isSelected ? '12px' : '0px'};
      font-weight: bold;
    ">${isSelected ? '🚌' : ''}</div>`,
    iconSize: isSelected ? [24, 24] : [16, 16],
    iconAnchor: isSelected ? [12, 12] : [8, 8],
  });
};

export interface MapVehicle {
  id: string;
  lat: number;
  lon: number;
  status: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'UNKNOWN';
  speed?: number;
  soc?: number;
  routeId?: string;
}

interface LiveMapProps {
  vehicles: MapVehicle[];
  selectedVehicleId?: string | null;
  onVehicleSelect?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  routePolyline?: [number, number][];
}

// Component to handle auto-panning/zooming when selection or bounds change
const MapController: React.FC<{
  vehicles: MapVehicle[];
  selectedId?: string | null;
  center?: [number, number];
  zoom?: number;
}> = ({ vehicles, selectedId, center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: true });
    } else if (selectedId) {
      const v = vehicles.find(v => v.id === selectedId);
      if (v) {
        map.setView([v.lat, v.lon], 14, { animate: true });
      }
    } else if (vehicles.length > 0 && !center) {
      // Auto-fit bounds if no center and multiple vehicles
      const bounds = L.latLngBounds(vehicles.map(v => [v.lat, v.lon]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [vehicles, selectedId, center, zoom, map]);

  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  center,
  zoom,
  routePolyline
}) => {
  // Default to Norrtälje/Stockholm area if nothing provided
  const defaultCenter: [number, number] = [59.5, 18.3];
  const defaultZoom = 10;

  return (
    <div className="live-map-container">
      <MapContainer 
        center={center || defaultCenter} 
        zoom={zoom || defaultZoom} 
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        zoomControl={false}
      >
        {/* Light Theme Map Tiles (CartoDB Positron) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapController 
          vehicles={vehicles} 
          selectedId={selectedVehicleId} 
          center={center} 
          zoom={zoom} 
        />

        {routePolyline && routePolyline.length > 0 && (
          <Polyline positions={routePolyline} color="var(--primary)" weight={4} opacity={0.7} />
        )}

        {vehicles.map(v => (
          <Marker 
            key={v.id} 
            position={[v.lat, v.lon]}
            icon={createBusIcon(v.status, v.id === selectedVehicleId)}
            eventHandlers={{
              click: () => onVehicleSelect?.(v.id),
            }}
          >
            <Popup className="bus-popup">
              <div className="bus-popup-content">
                <strong>{v.id}</strong>
                {v.routeId && <div>Route: {v.routeId}</div>}
                <div>Status: <span className={`status-text ${v.status.toLowerCase()}`}>{v.status}</span></div>
                {v.speed !== undefined && <div>Speed: {Math.round(v.speed)} km/h</div>}
                {v.soc !== undefined && <div>SOC: {v.soc}%</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
