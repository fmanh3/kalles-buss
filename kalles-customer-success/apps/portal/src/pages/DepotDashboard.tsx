
import React from 'react';
import { Settings, Wrench, ClipboardList, Bus, AlertCircle } from 'lucide-react';
import './DepotDashboard.css';

export const DepotDashboard: React.FC = () => {
  return (
    <div className="depot-dashboard">
      <header className="depot-header">
        <h2>Depot & Fleet Management</h2>
      </header>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-icon fleet"><Bus size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Active Fleet</span>
            <span className="kpi-value">42 / 45</span>
            <div className="kpi-trend positive">93.3% Availability</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon maintenance"><Wrench size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">In Maintenance</span>
            <span className="kpi-value">2</span>
            <div className="kpi-trend neutral">Expected release: Today 16:00</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon inspection"><ClipboardList size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Upcoming Inspections</span>
            <span className="kpi-value">4</span>
            <div className="kpi-trend negative">Due within 7 days</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon parts"><Settings size={24} /></div>
          <div className="kpi-content">
            <span className="kpi-label">Critical Parts</span>
            <span className="kpi-value">Low</span>
            <div className="kpi-trend negative"><AlertCircle size={14} /> Brake pads stock depleted</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: MAINTENANCE SCHEDULE */}
        <section className="dashboard-section">
          <div className="section-header">
            <h3>Scheduled Maintenance</h3>
          </div>
          <div className="maintenance-list">
            <div className="maintenance-item warning">
              <div className="m-bus">BUS-104</div>
              <div className="m-task">Engine Diagnostics (Reported Fault)</div>
              <div className="m-status">Grounded</div>
            </div>
            <div className="maintenance-item">
              <div className="m-bus">BUS-088</div>
              <div className="m-task">Standard 10,000km Service</div>
              <div className="m-status scheduled">Tomorrow 08:00</div>
            </div>
            <div className="maintenance-item">
              <div className="m-bus">BUS-092</div>
              <div className="m-task">Tire Replacement</div>
              <div className="m-status scheduled">Wed 14:00</div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: FLEET STATUS */}
        <section className="dashboard-section">
           <div className="section-header">
            <h3>Fleet Status Overview</h3>
          </div>
          
          <div className="fleet-status-list">
             <div className="fleet-status-row">
                <span className="status-label"><span className="dot green"></span> Operational</span>
                <span className="status-count">42</span>
             </div>
             <div className="fleet-status-row">
                <span className="status-label"><span className="dot yellow"></span> Scheduled Maintenance</span>
                <span className="status-count">2</span>
             </div>
             <div className="fleet-status-row">
                <span className="status-label"><span className="dot red"></span> Grounded (AOG)</span>
                <span className="status-count">1</span>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};
