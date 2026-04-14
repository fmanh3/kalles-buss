import { useState, useEffect } from 'react';
import { 
  Users, Wallet, Bus, LogOut, Info, CheckCircle, 
  User, Shield, ClipboardCheck, Map as MapIcon, 
  Battery, AlertTriangle, Navigation, Calendar as CalendarIcon,
  ChevronRight, Phone, Heart, CreditCard, Briefcase
} from 'lucide-react';
import './App.css';

type Role = 'NONE' | 'CEO' | 'DRIVER';
type View = 'DASHBOARD' | 'PROFILE' | 'CALENDAR' | 'VEHICLE' | 'INSPECTION' | 'ROUTE';

const BFF_URL = 'https://kalles-bff-625737625145.europe-west1.run.app';
const DRIVER_ID = 'DRIVER-007';

function App() {
  const [role, setRole] = useState<Role>('NONE');
  const [view, setView] = useState<View>('DASHBOARD'); 
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [inspection, setInspection] = useState<Record<string, boolean>>({
    tires: false,
    lights: false,
    brakes: false,
    wipers: false
  });

  const formatTime = (dateStr: any) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const fetchData = async (selectedRole: Role) => {
    setLoading(true);
    try {
      if (selectedRole === 'CEO') {
        const response = await fetch(`${BFF_URL}/api/ceo/dashboard`);
        const json = await response.json();
        setData(json);
      } else {
        // Fetch Driver Schedule
        const scheduleRes = await fetch(`${BFF_URL}/api/driver/schedule/${DRIVER_ID}`);
        const scheduleJson = await scheduleRes.json();
        setData(scheduleJson);

        // Fetch Profile
        const profileRes = await fetch(`${BFF_URL}/api/driver/profile/${DRIVER_ID}`);
        const profileJson = await profileRes.json();
        setProfile(profileJson);

        // Fetch Vehicle (using first shift vehicle or default)
        const vehicleId = scheduleJson.shifts?.[0]?.vehicle_id || 'BUSS-101';
        const vehicleRes = await fetch(`${BFF_URL}/api/vehicles/${vehicleId}/details`);
        const vehicleJson = await vehicleRes.json();
        setVehicle(vehicleJson);
      }
    } catch (err: any) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = (selectedRole: Role) => {
    setRole(selectedRole);
    fetchData(selectedRole);
  };

  const handleInspection = (item: string) => {
    setInspection(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const submitInspection = async () => {
    const isRoadworthy = inspection['tires'] && inspection['lights'] && inspection['brakes'];
    alert(isRoadworthy ? 'Säkerhetskontroll godkänd! ✅' : 'Kontroll sparad med anmärkning. Verkstad meddelad. 🛠️');
    setView('DASHBOARD');
  };

  if (role === 'NONE') {
    return (
      <div className="login-container">
        <div className="login-hero">
          <h1>Kalles Buss 🚌</h1>
          <p>Operativ Verksamhetsportal v2.0</p>
        </div>
        <div className="role-grid">
          <button onClick={() => login('CEO')} className="role-card">
            <Users size={48} />
            <span>VD / Ledning</span>
          </button>
          <button onClick={() => login('DRIVER')} className="role-card">
            <Bus size={48} />
            <span>Förare</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-layout">
      <header>
        <div className="logo" onClick={() => setView('DASHBOARD')}>Kalles Buss 🚌</div>
        <div className="user-info">
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setView('PROFILE')} title="Min Profil">
              <User size={20} />
            </button>
            <span className="badge">{role}</span>
            <button onClick={() => setRole('NONE')} className="icon-btn" title="Logga ut">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {loading && <div className="loader"><div className="spinner"></div></div>}
        
        {!loading && role === 'CEO' && (
          <div className="dashboard">
            <section className="card stats-card">
              <h2><Wallet className="icon" /> Finansiell Överblick</h2>
              <div className="stat-main">
                <label>Total Likviditet</label>
                <div className="value">{(data?.finance?.status?.totalLiquidity || 0).toLocaleString()} SEK</div>
              </div>
            </section>
          </div>
        )}

        {!loading && role === 'DRIVER' && (
          <div className="driver-container">
            {/* Mobile Navigation Bar */}
            <nav className="driver-nav">
              <button className={view === 'DASHBOARD' ? 'active' : ''} onClick={() => setView('DASHBOARD')}>
                <Clock size={20} /><span>Idag</span>
              </button>
              <button className={view === 'CALENDAR' ? 'active' : ''} onClick={() => setView('CALENDAR')}>
                <CalendarIcon size={20} /><span>Schema</span>
              </button>
              <button className={view === 'VEHICLE' ? 'active' : ''} onClick={() => setView('VEHICLE')}>
                <Bus size={20} /><span>Fordon</span>
              </button>
              <button className={view === 'ROUTE' ? 'active' : ''} onClick={() => setView('ROUTE')}>
                <MapIcon size={20} /><span>Rutt</span>
              </button>
            </nav>

            {/* View: Dashboard */}
            {view === 'DASHBOARD' && (
              <div className="view-content fade-in">
                <section className="card shift-focus">
                  <div className="shift-header">
                    <label>Dagens arbetspass</label>
                    <span className="status-pill scheduled">Planerat</span>
                  </div>
                  {data?.shifts?.length > 0 ? (
                    <div className="shift-body">
                      <div className="time-large">
                        {formatTime(data.shifts[0].planned_start_time)} — {formatTime(data.shifts[0].planned_end_time)}
                      </div>
                      <div className="info-row">
                        <Navigation size={16} /> <span><strong>Linje {data.shifts[0].line_id}</strong>: Norrtälje — Sthlm</span>
                      </div>
                      <div className="info-row">
                        <Info size={16} /> <span>Startpunkt: {data.shifts[0].pickup_location}</span>
                      </div>
                      
                      <div className="action-grid">
                        <button 
                          className={`action-btn ${checkedIn ? 'checked-in' : 'primary'}`}
                          onClick={() => setCheckedIn(!checkedIn)}
                        >
                          {checkedIn ? <><CheckCircle size={20}/> On Duty</> : 'Checka in'}
                        </button>
                        <button className="action-btn secondary" onClick={() => setView('INSPECTION')}>
                          <ClipboardCheck size={20}/> Säkerhetskontroll
                        </button>
                      </div>
                    </div>
                  ) : <p className="empty">Inga pass idag.</p>}
                </section>

                <section className="card mini-card" onClick={() => setView('VEHICLE')}>
                  <div className="card-header-flex">
                    <h3><Battery size={18} /> Fordon {vehicle?.id}</h3>
                    <ChevronRight size={18} />
                  </div>
                  <div className="soc-summary">
                    <div className="soc-track"><div className="soc-fill" style={{width: `${vehicle?.status?.soc || 0}%`}}></div></div>
                    <span>{vehicle?.status?.soc}% SoC</span>
                  </div>
                </section>
              </div>
            )}

            {/* View: Profile */}
            {view === 'PROFILE' && (
              <div className="view-content fade-in">
                <section className="card profile-card">
                  <div className="profile-header">
                    <div className="avatar">{profile?.name?.[0]}</div>
                    <div className="profile-titles">
                      <h2>{profile?.name}</h2>
                      <p>{profile?.employment_form} • {profile?.depot_location}</p>
                    </div>
                  </div>
                  
                  <div className="profile-details">
                    <div className="detail-box">
                      <Phone size={16} /> <span>{profile?.contact_email}</span>
                    </div>
                    <div className="detail-box">
                      <Heart size={16} /> <span>ICE: {profile?.ice_contact}</span>
                    </div>
                    <div className="detail-box">
                      <CreditCard size={16} /> <span>{profile?.bank_account}</span>
                    </div>
                  </div>

                  <div className="vacation-stats">
                    <div className="v-stat">
                      <label>Sparade dagar</label>
                      <div className="num">{profile?.vacation_days_saved}</div>
                    </div>
                    <div className="v-stat">
                      <label>Kvar i år</label>
                      <div className="num highlight">{profile?.vacation_days_current}</div>
                    </div>
                  </div>

                  <div className="certs-list">
                    <h3><Shield size={18} /> Licenser & Behörigheter</h3>
                    {profile?.certifications?.map((c: any) => (
                      <div key={c.id} className="cert-item">
                        <div className="cert-info">
                          <span className="cert-type">{c.type}</span>
                          {c.reference_name && <span className="cert-ref">{c.reference_name}</span>}
                        </div>
                        <span className={`cert-status ${c.status === 'Giltigt' ? 'ok' : 'warn'}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* View: Vehicle Details */}
            {view === 'VEHICLE' && (
              <div className="view-content fade-in">
                <section className="card vehicle-full">
                  <h2><Bus className="icon" /> {vehicle?.model}</h2>
                  <div className="bev-digital-twin">
                    <div className="twin-grid">
                      <div className="twin-stat">
                        <label>SoC</label>
                        <div className="big-val">{vehicle?.status?.soc}%</div>
                      </div>
                      <div className="twin-stat">
                        <label>Est. Räckvidd</label>
                        <div className="big-val highlight">180 km</div>
                        <span className="sub-val">-5°C (Vinter)</span>
                      </div>
                    </div>
                    
                    <div className="specs-list">
                      <div className="spec"><span>Mätarställning</span> <strong>{vehicle?.maintenance?.odometer} km</strong></div>
                      <div className="spec"><span>Nästa service</span> <strong>{vehicle?.maintenance?.nextService}</strong></div>
                      <div className="spec"><span>Passagerare</span> <strong>{vehicle?.capacity?.total} (75+10)</strong></div>
                      <div className="spec"><span>Batterihälsa</span> <strong>{100 - (vehicle?.specs?.degradation || 0)}%</strong></div>
                    </div>
                  </div>
                  
                  <div className="alert-box info">
                    <Info size={16} />
                    <p>Laddnätverk: Pantograf Tekniska (OppCharge), CCS2 Norrtälje</p>
                  </div>
                </section>
              </div>
            )}

            {/* View: Inspection */}
            {view === 'INSPECTION' && (
              <div className="view-content fade-in">
                <section className="card inspection-card">
                  <h2>Säkerhetskontroll: {vehicle?.id}</h2>
                  <p className="subtitle">Buss 8042 (Dubbeldäckare)</p>
                  
                  <div className="check-list">
                    {Object.keys(inspection).map(item => (
                      <div key={item} className="check-item" onClick={() => handleInspection(item)}>
                        <span className="capitalize">{item}</span>
                        <div className={`checkbox ${inspection[item] ? 'checked' : ''}`}>
                          {inspection[item] && <CheckCircle size={16} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="defect-log">
                    <label>Fellogg / Anmärkningar</label>
                    <textarea placeholder="Beskriv eventuella fel..."></textarea>
                  </div>

                  <button className="btn primary full-width" onClick={submitInspection}>Signera & Skicka</button>
                  <button className="btn secondary full-width mt-10" onClick={() => setView('DASHBOARD')}>Avbryt</button>
                </section>
              </div>
            )}

            {/* View: Route */}
            {view === 'ROUTE' && (
              <div className="view-content fade-in">
                <section className="card map-view-full">
                  <h2><Navigation className="icon" /> Linje 676</h2>
                  <div className="map-container-mock">
                    <div className="route-line"></div>
                    <div className="bus-location-marker">676</div>
                    <div className="alert-marker" style={{top: '45%', left: '55%'}}>
                      <AlertTriangle size={14} />
                    </div>
                  </div>
                  <div className="traffic-alerts">
                    <div className="traffic-item warn">
                      <strong>Vägarbete: Roslags Näsby</strong>
                      <p>Förväntad kötid: 8 minuter</p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* View: Calendar */}
            {view === 'CALENDAR' && (
              <div className="view-content fade-in">
                <section className="card">
                  <h2><CalendarIcon className="icon" /> Arbetsschema</h2>
                  <div className="calendar-list-v2">
                    {data?.shifts?.map((s: any) => (
                      <div key={s.id} className="calendar-item">
                        <div className="cal-date">
                          <span className="day-name">{new Date(s.planned_start_time).toLocaleDateString([], {weekday: 'short'})}</span>
                          <span className="day-num">{new Date(s.planned_start_time).getDate()}</span>
                        </div>
                        <div className="cal-info">
                          <span className="cal-time">{formatTime(s.planned_start_time)} — {formatTime(s.planned_end_time)}</span>
                          <span className="cal-line">Linje {s.line_id}</span>
                        </div>
                        <div className="cal-status"><ChevronRight size={16} /></div>
                      </div>
                    ))}
                  </div>
                  <button className="btn secondary full-width mt-20">Ansök om ledighet</button>
                </section>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
