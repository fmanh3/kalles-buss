
import { useEffect, useState } from 'react';
import { useDriverStore } from '../store/driverStore';
import { SafetyCheck } from '../components/SafetyCheck';
import { Clock, Play, MapPin, Calendar as CalendarIcon, Bus } from 'lucide-react';
import { LiveMap } from '../components/LiveMap';
import type { MapVehicle } from '../components/LiveMap';
import './DriverPortal.css';

export function DriverPortal() {
  const { status, schedule, fetchState, clockIn, startTour } = useDriverStore();
  const [view, setView] = useState<'DASHBOARD' | 'CALENDAR' | 'INSPECTION'>('DASHBOARD');

  useEffect(() => {
    fetchState();
  }, []);

  if (!schedule) return <div className="loader"><div className="spinner"></div></div>;

  const nextTour = schedule.tours[0];

  // Mock vehicle position for the active drive view (e.g., somewhere along 676)
  const mockDriverVehicle: MapVehicle = {
    id: nextTour?.vehicleId || 'My Bus',
    lat: 59.345, // Tekniska Högskolan
    lon: 18.071,
    status: 'ON_TIME',
    speed: 45,
    routeId: nextTour?.line || 'Unknown',
  };

  return (
    <div className="driver-portal">
      <header className="portal-header">
        <h1>Kalles Buss</h1>
        <div className="status-badge">{status.replace(/_/g, ' ')}</div>
      </header>

      <main className="portal-content">
        {/* View: DASHBOARD (Home) */}
        {view === 'DASHBOARD' && (
          <div className="view-content fade-in">
            {/* Status: OFF DUTY */}
            {status === 'OFF_DUTY' && (
              <section className="card shift-focus">
                <div className="shift-header">
                  <label>Dagens arbetspass</label>
                  <span className="status-pill scheduled">Planerat</span>
                </div>
                <div className="shift-body">
                  <div className="time-large">
                    {schedule.shiftStart} — {schedule.shiftEnd}
                  </div>
                  <div className="action-grid mt-20">
                    <button className="action-btn primary full-width" onClick={clockIn}>
                      <Clock size={20}/> Klocka in
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Status: CLOCKED IN, PRE-TRIP REQUIRED */}
            {status === 'PRE_TRIP_REQUIRED' && (
              <section className="card shift-focus">
                 <div className="shift-header">
                  <label>Åtgärd krävs</label>
                  <span className="status-pill warn">Incheckad</span>
                </div>
                <div className="shift-body">
                  <p>Du måste utföra en säkerhetskontroll på fordon <strong>{nextTour.vehicleId}</strong> innan turen kan startas.</p>
                  <div className="action-grid mt-20">
                    <button className="action-btn secondary full-width" onClick={() => setView('INSPECTION')}>
                      Gå till Säkerhetskontroll
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Status: READY TO DRIVE */}
            {status === 'READY_FOR_DEPARTURE' && (
              <section className="card shift-focus">
                <div className="shift-header">
                  <label>Klar för avgång</label>
                  <span className="status-pill ok">Fordon Godkänt</span>
                </div>
                <div className="shift-body">
                  <div className="info-row">
                    <MapPin size={16} /> <span><strong>Linje {nextTour.line}</strong></span>
                  </div>
                  <div className="info-row">
                    <Bus size={16} /> <span>Fordon: {nextTour.vehicleId} ({nextTour.vehicleType})</span>
                  </div>
                  <div className="action-grid mt-20">
                    <button className="btn-success full-width" onClick={() => startTour(nextTour.id)}>
                      <Play size={20} /> Starta Körorder
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Status: DRIVING */}
            {status === 'IN_TRANSIT' && (
              <section className="card active-tour">
                <h2>Körorder Aktiv</h2>
                <p className="subtitle">Linje {nextTour.line} • {nextTour.vehicleId}</p>
                
                <div className="driver-map-wrapper">
                   <LiveMap 
                    vehicles={[mockDriverVehicle]} 
                    center={[mockDriverVehicle.lat, mockDriverVehicle.lon]}
                    zoom={15}
                   />
                </div>

                <div className="stops-timeline mt-20">
                  {nextTour.stops.map((stop: any, idx: number) => (
                    <div key={idx} className="stop-item">
                      <MapPin size={20} className="stop-icon" />
                      <div className="stop-info">
                        <h4>{stop.name}</h4>
                        <span>Arr: {stop.arrival} | Dep: {stop.departure}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="auto-info mt-10">Turen avslutas automatiskt via GPS vid slutstationen.</p>
              </section>
            )}
          </div>
        )}

        {/* View: INSPECTION */}
        {view === 'INSPECTION' && (
          <div className="view-content fade-in">
             <SafetyCheck onComplete={() => setView('DASHBOARD')} />
             <button className="btn secondary full-width mt-10" onClick={() => setView('DASHBOARD')}>Avbryt</button>
          </div>
        )}

        {/* View: CALENDAR (Always accessible) */}
        {view === 'CALENDAR' && (
          <div className="view-content fade-in">
            <section className="card">
              <h2><CalendarIcon className="icon" /> Mitt Schema</h2>
              <div className="calendar-list-v2">
                {schedule.tours.map((t: any) => (
                  <div key={t.id} className="calendar-item">
                    <div className="cal-info">
                      <span className="cal-time">{t.stops[0]?.departure} — {t.stops[t.stops.length-1]?.arrival}</span>
                      <span className="cal-line">Linje {t.line}</span>
                    </div>
                    <div className="cal-status">
                      <span className="vehicle-ref"><Bus size={14}/> {t.vehicleId}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Persistent Bottom Navigation */}
      <nav className="driver-nav">
        <button className={view === 'DASHBOARD' || view === 'INSPECTION' ? 'active' : ''} onClick={() => setView('DASHBOARD')}>
          <Clock size={20} /><span>Idag</span>
        </button>
        <button className={view === 'CALENDAR' ? 'active' : ''} onClick={() => setView('CALENDAR')}>
          <CalendarIcon size={20} /><span>Schema</span>
        </button>
      </nav>
    </div>
  );
}
