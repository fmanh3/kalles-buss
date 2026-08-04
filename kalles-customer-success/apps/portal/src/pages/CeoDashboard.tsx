import { API_URL } from '../config';
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Bus,
  Banknote,
  Users
} from 'lucide-react';
import './CeoDashboard.css';

interface CeoStatus {
  finance: any;
  depot: any;
  traffic: any;
}

// Mock Agent Data for the "Command Center" feed
const MOCK_AGENT_FEED = [
  { id: 1, time: '10:42', agent: 'DEPOT', message: 'Bus 104 reported engine fault via telematics. Marked as GROUNDED.', type: 'error' },
  { id: 2, time: '10:43', agent: 'TRAFFIC', message: 'Block B-12 unassigned due to Bus 104 grounding. Searching for reserve...', type: 'warning' },
  { id: 3, time: '10:44', agent: 'FINANCE', message: 'Evaluated replacement options. Approved overtime for reserve driver (Cost: 1200 SEK) vs Penalty (5000 SEK).', type: 'info' },
  { id: 4, time: '10:45', agent: 'TRAFFIC', message: 'Assigned Bus 102 to Block B-12. Schedule restored.', type: 'success' },
];

export const CeoDashboard: React.FC = () => {
  const [statusData, setStatusData] = useState<CeoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/ceo/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch CEO metrics');
      setStatusData(await response.json());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error) return <div className="ceo-error">Error connecting to APIs: {error}</div>;
  if (!statusData) return <div className="ceo-loading">Loading Executive Dashboard...</div>;

  return (
    <div className="ceo-dashboard">
      
      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-icon finance"><Banknote size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Bank Balance</span>
            <span className="kpi-value">{statusData.finance.metrics?.bankBalance?.toLocaleString()} SEK</span>
            <div className="kpi-trend positive"><TrendingUp size={14} /> +2.4% vs last month</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon depot"><Bus size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Fleet Availability</span>
            <span className="kpi-value">{statusData.depot.metrics?.availability}%</span>
            <div className="kpi-trend negative"><TrendingDown size={14} /> -1.2% (1 bus grounded)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon traffic"><Activity size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">On-Time Performance</span>
            <span className="kpi-value">94.2%</span>
            <div className="kpi-trend positive"><TrendingUp size={14} /> +0.5% today</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon hr"><Users size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Staff Absence</span>
            <span className="kpi-value">4.1%</span>
            <div className="kpi-trend neutral"><TrendingUp size={14} /> Stable</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: AGENT ACTIVITY */}
        <section className="dashboard-section agent-feed">
          <div className="section-header">
            <h3>Autonomi Event Horizon</h3>
            <span className="live-badge"><span className="pulse-dot"></span> LIVE</span>
          </div>
          <div className="feed-list">
            {MOCK_AGENT_FEED.map(event => (
              <div key={event.id} className={`feed-item ${event.type}`}>
                <div className="feed-time">{event.time}</div>
                <div className="feed-agent">{event.agent}</div>
                <div className="feed-message">{event.message}</div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE ANOMALIES & DRILLDOWN */}
        <section className="dashboard-section anomalies-panel">
           <div className="section-header">
            <h3>Active Anomalies</h3>
          </div>
          
          <div className="anomaly-list">
             {statusData.traffic.metrics?.deficit > 0 ? (
               <div className="anomaly-card warning">
                  <div className="anomaly-icon"><AlertTriangle size={20} /></div>
                  <div className="anomaly-content">
                     <h4>Unassigned Blocks ({statusData.traffic.metrics?.deficit})</h4>
                     <p>Traffic Agent cannot fulfill schedule due to vehicle deficit.</p>
                     <button className="btn-outline">View Blocks</button>
                  </div>
               </div>
             ) : (
               <div className="anomaly-card success">
                  <div className="anomaly-icon"><CheckCircle2 size={20} /></div>
                  <div className="anomaly-content">
                     <h4>Traffic Schedule Optimal</h4>
                     <p>All blocks have assigned vehicles.</p>
                  </div>
               </div>
             )}

             {statusData.finance.metrics?.overdueInvoices > 0 && (
               <div className="anomaly-card error">
                  <div className="anomaly-icon"><AlertTriangle size={20} /></div>
                  <div className="anomaly-content">
                     <h4>Overdue Invoices ({statusData.finance.metrics?.overdueInvoices})</h4>
                     <p>Finance Agent is withholding automated payments due to cashflow rules.</p>
                     <button className="btn-outline">Review Ledger</button>
                  </div>
               </div>
             )}
          </div>

          <div className="section-header mt-20">
            <h3>Traffic Operations Drilldown</h3>
          </div>
          
          <div className="block-list-compact">
            {statusData.traffic.drilldown?.slice(0, 3).map((b: any) => (
              <div key={b.id} className={`block-item-compact ${!b.assigned_vehicle_id ? 'unassigned' : ''}`}>
                <div className="block-header">
                  <strong>{b.id}</strong>
                  <span className="badge">{b.assigned_vehicle_id || 'UNASSIGNED'}</span>
                </div>
                <div className="block-meta">
                  <span><Clock size={12}/> {b.tours?.length || 0} tours</span>
                  <span>{parseFloat(b.accumulated_distance_km).toFixed(1)} km</span>
                </div>
              </div>
            ))}
          </div>

        </section>
      </div>
    </div>
  );
};
