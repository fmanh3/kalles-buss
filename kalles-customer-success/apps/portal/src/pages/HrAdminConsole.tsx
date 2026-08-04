import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  ShieldCheck, 
  HeartPulse, 
  Plus, 
  AlertCircle,
  Briefcase,
  ChevronRight,
  Download,
  X,
  Phone,
  Wallet,
  MapPin,
  CheckCircle2,
  Rocket
} from 'lucide-react';
import './HrAdminConsole.css';

type Tab = 'WORKFORCE' | 'COMPENSATION' | 'COMPLIANCE' | 'HEALTH' | 'EXPENSES' | 'RECRUITMENT';

interface ICEContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  is_primary: boolean;
}

interface Balance {
  balance_type: string;
  current_balance: number;
}

export const HrAdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('WORKFORCE');
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [expiries, setExpiries] = useState<any[]>([]);
  const [payGapStats, setPayGapStats] = useState<any[]>([]);
  const [payrollForecast, setPayrollForecast] = useState<any>(null);
  const [expenseClaims, setExpenseClaims] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  
  // Detail state for Drill-down
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [selectedEmployeeICE, setSelectedEmployeeICE] = useState<ICEContact[]>([]);
  const [selectedEmployeeBalances, setSelectedEmployeeBalances] = useState<Balance[]>([]);
  const [selectedEmployeeLifecycle, setSelectedEmployeeLifecycle] = useState<any | null>(null);

  // Modal State
  const [isHireModalOpen, setHireModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'DRIVER',
    legalGender: 'FEMALE',
    departmentCode: 'OPS',
    costCenterCode: 'CC-100',
    workEmail: '',
    privateEmail: '',
    workPhone: '',
    privatePhone: '',
    addressStreet: '',
    addressCity: '',
    addressZip: ''
  });

  const [showLifecycleAlways, setShowLifecycleAlways] = useState(true);

  const fetchData = async () => {
    try {
      const safeFetch = async (url: string) => {
        const r = await fetch(url);
        if (!r.ok) return [];
        return r.json();
      };

      const [empRes, jobsRes, expRes, gapRes, foreRes, expenseRes, reqRes] = await Promise.all([
        safeFetch('/api/staff'),
        safeFetch('/api/hr'), // Fixed endpoint name from /api/hr/jobs if it exists
        safeFetch('/api/hr/compliance/expiries'),
        safeFetch('/api/hr/analytics/pay-gap'),
        safeFetch('/api/hr/analytics/forecast'),
        safeFetch('/api/hr/expenses'),
        safeFetch('/api/hr/recruitment/requisitions')
      ]);
      
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setJobs(Array.isArray(jobsRes) ? jobsRes : []);
      setExpiries(Array.isArray(expRes) ? expRes : []);
      setPayGapStats(Array.isArray(gapRes) ? gapRes : []);
      setPayrollForecast(foreRes);
      setExpenseClaims(Array.isArray(expenseRes) ? expenseRes : []);
      setRequisitions(Array.isArray(reqRes) ? reqRes : []);
    } catch (err) {
      console.error('Failed to fetch HR data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL + '/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Hire failed');
      }
      await fetchData();
      setHireModalOpen(false);
    } catch (err: any) {
      alert(`Hire Error: ${err.message}`);
    }
  };

  const handleOpenDetails = async (emp: any) => {
    setSelectedEmployee(emp);
    setDetailsModalOpen(true);
    try {
      const safeFetch = async (url: string) => {
        const r = await fetch(url);
        if (!r.ok) return null;
        const text = await r.text();
        return text ? JSON.parse(text) : null;
      };

      const [iceRes, balanceRes, lifecycleRes] = await Promise.all([
        safeFetch(`/api/staff/${emp.id}/ice`),
        safeFetch(`/api/staff/${emp.id}/balances`),
        safeFetch(`/api/staff/${emp.id}/lifecycle`)
      ]);
      setSelectedEmployeeICE(Array.isArray(iceRes) ? iceRes : []);
      setSelectedEmployeeBalances(Array.isArray(balanceRes) ? balanceRes : []);
      setSelectedEmployeeLifecycle(lifecycleRes && lifecycleRes.status !== 'NONE' ? lifecycleRes : null);
    } catch (err) {
      console.error('Failed to fetch employee details', err);
      setSelectedEmployeeICE([]);
      setSelectedEmployeeBalances([]);
      setSelectedEmployeeLifecycle(null);
    }
  };

  const renderLifecycleWorkflow = () => {
    if (!selectedEmployeeLifecycle) return null;
    return (
      <div className="lifecycle-dashboard">
        <div className="p-4 bg-blue-900 text-white rounded-t-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Rocket size={20} />
            <h3 className="m-0 text-lg font-bold">Active Lifecycle: {selectedEmployeeLifecycle.name || 'Onboarding'}</h3>
          </div>
          <span className="status-badge info">STEP {selectedEmployeeLifecycle.steps.filter((s:any) => s.status === 'COMPLETED').length + 1} OF {selectedEmployeeLifecycle.steps.length}</span>
        </div>
        
        <div className="p-6 bg-white border border-t-0 rounded-b-lg">
          <div className="space-y-4">
            {selectedEmployeeLifecycle.steps.map((step: any, idx: number) => (
              <div key={step.id} className={`flex items-start gap-4 p-4 rounded-lg border ${step.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`mt-1 rounded-full p-1 ${step.status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                  {step.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 flex items-center justify-center text-[10px]">{idx + 1}</div>}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className={`m-0 font-bold ${step.status === 'COMPLETED' ? 'text-green-800' : 'text-gray-800'}`}>{step.title}</h4>
                    <span className="text-[10px] font-bold uppercase text-gray-400">{step.domain} | {step.type.replace('_', ' ')}</span>
                  </div>
                  <p className="m-0 text-sm text-gray-600 mt-1">{step.description || 'Awaiting completion...'}</p>
                  {step.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={async () => {
                          await fetch(`${API_URL}/staff/${selectedEmployee.id}/lifecycle/steps/${step.id}/complete`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ notes: 'Manually verified by HR' }) });
                          handleOpenDetails(selectedEmployee); // Refresh
                        }}
                        className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 font-bold"
                      >
                        Mark as Done
                      </button>
                      {step.type === 'AGENT_TRIGGER' && (
                        <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">
                          Trigger Agent
                        </button>
                      )}
                    </div>
                  )}
                  {step.completed_at && (
                    <div className="mt-2 text-[10px] text-green-600 font-bold italic">
                      COMPLETED {new Date(step.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkforce = () => (
    <div className="hr-view">
      <div className="hr-stats-row">
        <div className="hr-stat-card">
          <span className="hr-stat-label">Total Workforce</span>
          <span className="hr-stat-value">{employees.length} Employees</span>
          <span className="hr-stat-trend up">↑ 2 from last month</span>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-label">Active Roles</span>
          <span className="hr-stat-value">{new Set(employees.map(e => e.role)).size} Categories</span>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-label">Onboarding</span>
          <span className="hr-stat-value">1 Pending</span>
        </div>
      </div>

      <div className="hr-table-container">
        <table className="hr-table">
          <thead>
            <tr>
              <th>Employee / ID</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Compliance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong>{emp.name}</strong>
                    <small style={{ color: '#64748b', fontSize: '10px' }}>{emp.id}</small>
                  </div>
                </td>
                <td><span className="role-tag">{emp.role}</span></td>
                <td>{emp.home_depot_id || 'Global'}</td>
                <td><span className="status-badge success">{emp.status}</span></td>
                <td>
                  <span className={`status-badge ${emp.compliance ? 'success' : 'warning'}`}>
                    {emp.compliance ? 'Valid' : 'Action Req.'}
                  </span>
                </td>
                <td>
                  <button className="icon-btn-small" onClick={() => handleOpenDetails(emp)}>
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCompensation = () => (
    <div className="hr-view">
      <div className="hr-stats-row">
        <div className="hr-stat-card">
          <span className="hr-stat-label">Payroll Forecast (Next)</span>
          <span className="hr-stat-value">
            {parseFloat(payrollForecast?.total_base_payroll || 0).toLocaleString()} SEK
          </span>
          <span className="hr-stat-trend up">↑ 4.2% vs Last Month</span>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-label">Avg. Base Salary</span>
          <span className="hr-stat-value">34,200 SEK</span>
        </div>
      </div>

      <div className="transparency-grid">
        <div className="hr-table-container">
          <h3 className="p-6 m-0 border-b">Standard Job Architecture & Ranges</h3>
          <table className="hr-table">
            <thead>
              <tr>
                <th>Job Code</th>
                <th>Title</th>
                <th>Level</th>
                <th>Salary Range (SEK)</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td><code>{job.job_code}</code></td>
                  <td><strong>{job.title}</strong></td>
                  <td>L{job.level}</td>
                  <td>{parseFloat(job.salary_range_min).toLocaleString()} - {parseFloat(job.salary_range_max).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pay-gap-card">
          <h3>EU Transparency Monitor</h3>
          <p className="text-sm text-blue-800 mb-6">Real-time gender pay gap analysis within equivalent work groups.</p>
          
          {payGapStats.map(stat => (
            <div key={`${stat.primary_role}-${stat.legal_gender}`} className="mb-6">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span>{stat.primary_role} ({stat.legal_gender})</span>
                <span>{parseFloat(stat.avg_salary).toLocaleString()} SEK</span>
              </div>
              <div className="gap-indicator">
                <div 
                  className="gap-bar" 
                  style={{ width: `${(parseFloat(stat.avg_salary) / 50000) * 100}%` }}
                />
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
            <AlertCircle className="text-yellow-600 shrink-0" size={20} />
            <p className="text-xs text-yellow-800">
              <strong>Directive Alert:</strong> The pay gap for "DRIVER" roles exceeds 5%. An objective justification report is required within 60 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="hr-view">
      <div className="hr-table-container">
        <h3 className="p-6 m-0 border-b">Critical Expiries & Requirements</h3>
        <div className="compliance-list">
          {expiries.map(exp => (
            <div key={exp.item_id} className={`expiry-item ${exp.days_until_expiry < 30 ? 'expiry-critical' : 'expiry-warning'}`}>
              <div>
                <strong>{exp.item_subtype} ({exp.category || ''})</strong>
                <p className="m-0 text-sm text-gray-600">Employee: {exp.employee_number}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-red-600">{exp.days_until_expiry} days left</span>
                <p className="m-0 text-xs text-gray-500">Expires: {exp.expiry_date}</p>
              </div>
            </div>
          ))}
          {expiries.length === 0 && <div className="p-12 text-center text-muted">No expiring qualifications found. All clear!</div>}
        </div>
      </div>
    </div>
  );

  const renderRecruitment = () => (
    <div className="hr-view">
      <div className="hr-stats-row">
        <div className="hr-stat-card">
          <span className="hr-stat-label">Open Requisitions</span>
          <span className="hr-stat-value">{requisitions.length} Open Positions</span>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-label">Active Postings</span>
          <span className="hr-stat-value">2 Live Ads</span>
        </div>
      </div>

      <div className="hr-table-container">
        <h3 className="p-6 m-0 border-b">Hiring Pipeline (Shared Agent/Human Workflow)</h3>
        <table className="hr-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Dept</th>
              <th>Status</th>
              <th>Candidates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requisitions.map(req => (
              <tr key={req.id}>
                <td><strong>{req.title || 'Senior Mechanic'}</strong></td>
                <td>{req.department_name || 'Maintenance'}</td>
                <td><span className="status-badge info">{req.status}</span></td>
                <td>3 Applied</td>
                <td><button className="icon-btn-small"><ChevronRight size={16} /></button></td>
              </tr>
            ))}
            {requisitions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No active requisitions.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="hr-view">
      <div className="hr-stats-row">
        <div className="hr-stat-card">
          <span className="hr-stat-label">Pending Approval</span>
          <span className="hr-stat-value">{expenseClaims.length} Claims</span>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-label">Total Outlay</span>
          <span className="hr-stat-value">{expenseClaims.reduce((sum, c) => sum + parseFloat(c.amount), 0).toLocaleString()} SEK</span>
        </div>
      </div>

      <div className="hr-table-container">
        <table className="hr-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenseClaims.map(claim => (
              <tr key={claim.id}>
                <td>{claim.expense_date}</td>
                <td>{claim.employee_number}</td>
                <td><span className="category-tag">{claim.category}</span></td>
                <td>{claim.description}</td>
                <td><strong>{parseFloat(claim.amount).toLocaleString()} {claim.currency}</strong></td>
                <td><span className="status-badge warning">{claim.status}</span></td>
                <td>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button className="icon-btn-small text-green-600"><CheckCircle2 size={16}/></button>
                    <button className="icon-btn-small text-red-600"><X size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {expenseClaims.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted">No pending expense claims.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="hr-admin-console">
      <header className="hr-header">
        <div className="header-title">
          <h1>HR Enterprise Console</h1>
          <p>Governance • Transparency • Compliance</p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn"><Download size={18} /> Export AGI</button>
          <button className="primary-btn" onClick={() => setHireModalOpen(true)}><Plus size={18} /> Hire Employee</button>
        </div>
      </header>

      <nav className="hr-tabs">
        <button className={`hr-tab ${activeTab === 'WORKFORCE' ? 'active' : ''}`} onClick={() => setActiveTab('WORKFORCE')}>
          <Users size={18} /> Workforce
        </button>
        <button className={`hr-tab ${activeTab === 'COMPENSATION' ? 'active' : ''}`} onClick={() => setActiveTab('COMPENSATION')}>
          <CreditCard size={18} /> Compensation
        </button>
        <button className={`hr-tab ${activeTab === 'COMPLIANCE' ? 'active' : ''}`} onClick={() => setActiveTab('COMPLIANCE')}>
          <ShieldCheck size={18} /> Compliance
        </button>
        <button className={`hr-tab ${activeTab === 'EXPENSES' ? 'active' : ''}`} onClick={() => setActiveTab('EXPENSES')}>
          <Wallet size={18} /> Expenses
        </button>
        <button className={`hr-tab ${activeTab === 'RECRUITMENT' ? 'active' : ''}`} onClick={() => setActiveTab('RECRUITMENT')}>
          <Briefcase size={18} /> Recruitment
        </button>
        <button className={`hr-tab ${activeTab === 'HEALTH' ? 'active' : ''}`} onClick={() => setActiveTab('HEALTH')}>
          <HeartPulse size={18} /> Health
        </button>
      </nav>

      <div className="hr-content">
        {activeTab === 'WORKFORCE' && renderWorkforce()}
        {activeTab === 'COMPENSATION' && renderCompensation()}
        {activeTab === 'COMPLIANCE' && renderCompliance()}
        {activeTab === 'EXPENSES' && renderExpenses()}
        {activeTab === 'RECRUITMENT' && renderRecruitment()}
        {activeTab === 'HEALTH' && <div className="p-12 text-center text-muted">Medical Vault Restricted - Requires Level 4 Access</div>}
      </div>

      {/* DETAILS MODAL */}
      {isDetailsModalOpen && selectedEmployee && (
        <div className="hr-modal-overlay">
          <div className="hr-modal" style={{maxWidth: '800px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2rem'}}>
              <div>
                <h2 style={{margin:0}}>{selectedEmployee.name}</h2>
                <p style={{color: '#64748b', fontSize: '14px'}}>Employee Lifecycle Dashboard</p>
              </div>
              <button onClick={() => setDetailsModalOpen(false)}><X size={24}/></button>
            </div>

            {selectedEmployeeLifecycle && showLifecycleAlways ? renderLifecycleWorkflow() : (
              <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                <div className="sidebar-section">
                  <h3><Phone size={16} /> Contact & Emergency</h3>
                  <div className="p-4 bg-blue-50 rounded-lg mb-4 text-sm">
                    <div className="mb-2"><strong>Work:</strong> {selectedEmployee.work_email} | {selectedEmployee.work_phone}</div>
                    <div><strong>Private:</strong> {selectedEmployee.private_email} | {selectedEmployee.private_phone}</div>
                  </div>

                  <div className="compliance-list">
                    {selectedEmployeeICE.map(ice => (
                      <div key={ice.id} className="expiry-item" style={{border: 'none', background: '#f8fafc', marginBottom: '8px', borderRadius: '8px'}}>
                        <div>
                          <strong>{ice.name} (ICE)</strong>
                          <p className="m-0 text-xs text-gray-500">{ice.relationship}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{ice.phone_number}</span>
                          {ice.is_primary && <p className="m-0 text-xs text-green-600 font-bold">PRIMARY</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sidebar-section">
                  <h3><MapPin size={16} /> Current Address & Balances</h3>
                  <div className="p-4 bg-gray-50 rounded-lg mb-4 text-sm">
                    <strong>Home:</strong> {selectedEmployee.home_address_street}, {selectedEmployee.home_address_zip} {selectedEmployee.home_address_city}
                  </div>
                  
                  <div className="hr-stats-row" style={{gridTemplateColumns: '1fr', gap: '8px'}}>
                    {selectedEmployeeBalances.map(b => (
                      <div key={b.balance_type} className="hr-stat-card" style={{padding: '12px'}}>
                        <span className="hr-stat-label">{b.balance_type.replace('_', ' ')}</span>
                        <span className="hr-stat-value" style={{fontSize: '1.2rem'}}>
                          {b.current_balance} {b.balance_type.includes('VACATION') ? 'Days' : 'Hours'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="modal-footer" style={{marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              {selectedEmployeeLifecycle && (
                <button 
                  onClick={() => setShowLifecycleAlways(!showLifecycleAlways)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  {showLifecycleAlways ? 'View Full Profile' : 'Back to Onboarding Workflow'}
                </button>
              )}
              <button className="primary-btn" onClick={() => setDetailsModalOpen(false)}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* HIRE MODAL */}
      {isHireModalOpen && (
        <div className="hr-modal-overlay">
          <div className="hr-modal" style={{ maxWidth: '800px' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
              <h2>Hire New Employee (Step 1: Core Data)</h2>
              <button onClick={() => setHireModalOpen(false)}><X size={24}/></button>
            </div>
            
            <form onSubmit={handleHire}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* SECTION: IDENTITY */}
                <div className="form-section">
                  <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Identity & Role</h3>
                  <div className="form-group mb-4">
                    <label>Full Name</label>
                    <input className="w-full p-2 border rounded" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required placeholder="Kalle Karlsson" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label>Legal Gender</label>
                      <select className="w-full p-2 border rounded" value={newEmployee.legalGender} onChange={e => setNewEmployee({...newEmployee, legalGender: e.target.value})}>
                        <option value="FEMALE">Female</option>
                        <option value="MALE">Male</option>
                        <option value="NON_BINARY">Non-binary</option>
                      </select>
                    </div>
                    <div>
                      <label>Primary Role</label>
                      <select className="w-full p-2 border rounded" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})}>
                        <option value="DRIVER">Driver</option>
                        <option value="MECHANIC">Mechanic</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label>Department</label>
                      <select className="w-full p-2 border rounded" value={newEmployee.departmentCode} onChange={e => setNewEmployee({...newEmployee, departmentCode: e.target.value})}>
                        <option value="OPS">Operations</option>
                        <option value="MAINT">Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label>Cost Center</label>
                      <select className="w-full p-2 border rounded" value={newEmployee.costCenterCode} onChange={e => setNewEmployee({...newEmployee, costCenterCode: e.target.value})}>
                        <option value="CC-100">CC-100</option>
                        <option value="CC-200">CC-200</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION: CONTACT */}
                <div className="form-section">
                  <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label>Work Email</label>
                      <input className="w-full p-2 border rounded" value={newEmployee.workEmail} onChange={e => setNewEmployee({...newEmployee, workEmail: e.target.value})} placeholder="kalle@kallesbuss.se" />
                    </div>
                    <div>
                      <label>Private Email</label>
                      <input className="w-full p-2 border rounded" value={newEmployee.privateEmail} onChange={e => setNewEmployee({...newEmployee, privateEmail: e.target.value})} placeholder="kalle88@gmail.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label>Work Phone</label>
                      <input className="w-full p-2 border rounded" value={newEmployee.workPhone} onChange={e => setNewEmployee({...newEmployee, workPhone: e.target.value})} placeholder="070-000 00 00" />
                    </div>
                    <div>
                      <label>Private Phone</label>
                      <input className="w-full p-2 border rounded" value={newEmployee.privatePhone} onChange={e => setNewEmployee({...newEmployee, privatePhone: e.target.value})} placeholder="076-111 22 33" />
                    </div>
                  </div>
                  <div>
                    <label>Home Address</label>
                    <input className="w-full p-2 border rounded mb-2" value={newEmployee.addressStreet} onChange={e => setNewEmployee({...newEmployee, addressStreet: e.target.value})} placeholder="Street and Number" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="p-2 border rounded" value={newEmployee.addressZip} onChange={e => setNewEmployee({...newEmployee, addressZip: e.target.value})} placeholder="Zip Code" />
                      <input className="p-2 border rounded" value={newEmployee.addressCity} onChange={e => setNewEmployee({...newEmployee, addressCity: e.target.value})} placeholder="City" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border rounded-lg mt-6 mb-8 text-sm text-gray-600">
                <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                  <AlertCircle size={18} className="text-blue-500" />
                  <p className="m-0">
                    <strong>Zero-Knowledge Policy:</strong> Bank details and detailed tax info are collected <u>after</u> this step via a secure self-service link sent to the employee.
                  </p>
                </div>
              </div>

              <button type="submit" className="primary-btn w-full">Initiate Onboarding & Employment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
