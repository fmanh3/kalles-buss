import { API_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { LiveMap } from '../components/LiveMap';
import type { MapVehicle } from '../components/LiveMap';
import { Filter, X } from 'lucide-react';
import './TacticalMap.css';

interface LiveVehicleState {
  vehicleId: string;
  tripId?: string;
  routeId?: string;
  lat: number;
  lon: number;
  speedKmh: number;
  currentSOC: number;
  lastUpdated: string;
  status: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'UNKNOWN';
  delaySeconds: number;
  nextStopId?: string;
}

export const TacticalMap: React.FC = () => {
  const [vehicles, setVehicles] = useState<LiveVehicleState[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>(['676']);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/ceo/tactical-map`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to fetch tactical data', err);
    }
  };

  const toggleLine = (line: string) => {
    setSelectedLines(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const filteredVehicles = vehicles.filter(v => {
    if (!v.routeId) return true; // Show unassigned/unknown buses too
    return selectedLines.some(line => v.routeId?.includes(line));
  });

  const mapVehicles: MapVehicle[] = filteredVehicles.map(v => ({
    id: v.vehicleId,
    lat: v.lat,
    lon: v.lon,
    status: v.status,
    speed: v.speedKmh,
    soc: v.currentSOC,
    routeId: v.routeId
  }));

  return (
    <div className="tactical-container light-theme">
      {/* FULL SCREEN MAP */}
      <div className="tactical-map-area">
        <LiveMap 
          vehicles={mapVehicles}
          selectedVehicleId={selectedVehicle}
          onVehicleSelect={setSelectedVehicle}
        />
      </div>

      {/* FLOATING FILTER BUTTON (Visible when sidebar is closed) */}
      {!isSidebarOpen && (
        <button 
          className="floating-filter-btn"
          onClick={() => setIsSidebarOpen(true)}
          title="Open Traffic Filters"
        >
          <Filter size={24} />
        </button>
      )}

      {/* OVERLAY SIDEBAR */}
      <div className={`tactical-sidebar-overlay ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header-row">
          <h2>Traffic Control</h2>
          <button 
            className="toggle-sidebar-btn" 
            onClick={() => setIsSidebarOpen(false)}
            title="Close Filters"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="sidebar-content">
          <div className="line-filter">
            <h3>Monitored Lines</h3>
            <div className="checkbox-group">
              <label className="line-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedLines.includes('676')} 
                  onChange={() => toggleLine('676')} 
                />
                <span className="checkbox-label">Line 676 (Norrtälje)</span>
              </label>
              <label className="line-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedLines.includes('677')} 
                  onChange={() => toggleLine('677')} 
                />
                <span className="checkbox-label">Line 677 (Uppsala)</span>
              </label>
            </div>
          </div>

          <div className="bus-list">
            <h3>Active Fleet ({filteredVehicles.length})</h3>
            {filteredVehicles.length === 0 && <p className="empty-state">No vehicles broadcasting on selected lines.</p>}
            
            {filteredVehicles.map(v => (
              <div 
                key={v.vehicleId} 
                className={`bus-card status-${v.status.toLowerCase()} ${selectedVehicle === v.vehicleId ? 'active' : ''}`}
                onClick={() => setSelectedVehicle(v.vehicleId)}
              >
                <div className="bus-header">
                  <span className="bus-id">{v.vehicleId}</span>
                  <span className="bus-status">
                    {v.status}
                  </span>
                </div>
                <div className="bus-details">
                  <span>🔋 {v.currentSOC}%</span>
                  <span>⚡ {Math.round(v.speedKmh)} km/h</span>
                  {v.delaySeconds > 0 && <span className="delay-alert">Delay: {Math.floor(v.delaySeconds / 60)} min</span>}
                  <span className="route-info">
                    {v.routeId ? `Route: ${v.routeId}` : 'Off Route / Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
