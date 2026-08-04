import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Calendar, 
  ShieldCheck,
  ArrowRightLeft,
  Filter,
  UserPlus
} from 'lucide-react';
import './StaffRoster.css';

interface StaffMember {
  id: string;
  name: string;
  role: 'MECHANIC' | 'DRIVER' | 'ADMIN';
  home_depot_id: string;
  home_depot_name: string;
  status: 'AVAILABLE' | 'ON_SHIFT' | 'SICK' | 'AWAY';
  skills: string[];
}

export const StaffRoster: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch(API_URL + '/depot/staff');
      const data = await response.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <span className="status-badge success">On Duty</span>;
      case 'ON_SHIFT': return <span className="status-badge info">Active</span>;
      case 'SICK': return <span className="status-badge critical">Sick</span>;
      default: return <span className="status-badge gray">Off</span>;
    }
  };

  if (loading) return <div className="p-8">Loading staff roster from HR/Depot sync...</div>;

  return (
    <div className="staff-roster">
      <div className="roster-header">
        <div className="header-title">
          <h1>Staff & Capacity</h1>
          <p>Personnel overview mirrored from HR Domain.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn" onClick={() => fetchStaff()}>Refresh Sync</button>
          <button className="primary-btn"><UserPlus size={18} /> Requisition</button>
        </div>
      </div>

      <div className="roster-stats">
        <div className="stat-card">
          <span className="stat-label">Total Mechanics</span>
          <span className="stat-value">{staff.filter(s => s.role === 'MECHANIC').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available Now</span>
          <span className="stat-value">{staff.filter(s => s.status === 'AVAILABLE').length}</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-label">Critical Gaps</span>
          <span className="stat-value">0</span>
        </div>
      </div>

      <div className="roster-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="ALL">All Roles</option>
            <option value="MECHANIC">Mechanics</option>
            <option value="DRIVER">Drivers</option>
          </select>
        </div>
      </div>

      <div className="staff-grid">
        {filteredStaff.map(member => (
          <div key={member.id} className="staff-card">
            <div className="staff-card-header">
              <div className="staff-avatar">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="staff-basic-info">
                <h3>{member.name}</h3>
                <span className="role-tag">{member.role}</span>
              </div>
              <div className="staff-status">
                {getStatusBadge(member.status)}
              </div>
            </div>
            
            <div className="staff-details">
              <div className="detail-item">
                <MapPin size={14} />
                <span>Station: {member.home_depot_name || member.home_depot_id}</span>
              </div>
              <div className="detail-item">
                <Calendar size={14} />
                <span>Next Shift: Tomorrow 07:00</span>
              </div>
            </div>

            <div className="staff-skills">
              {(member.skills || []).map(skill => (
                <span key={skill} className="skill-pill">
                  <ShieldCheck size={10} />
                  {skill}
                </span>
              ))}
            </div>

            <div className="staff-card-footer">
              <button className="footer-btn">
                <ArrowRightLeft size={14} />
                Dispatch
              </button>
              <button className="footer-btn">
                <Calendar size={14} />
                Schedule
              </button>
            </div>
          </div>
        ))}

        {filteredStaff.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <p>No staff members matching filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
