import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Bus, 
  User, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Settings,
  Database,
  Package,
  Users
} from 'lucide-react';
import { DriverPortal } from './pages/DriverPortal';
import { CeoDashboard } from './pages/CeoDashboard';
import { TacticalMap } from './pages/TacticalMap';
import { DepotDashboard } from './pages/DepotDashboard';
import { RegistryDashboard } from './pages/RegistryDashboard';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { HrAdminConsole } from './pages/HrAdminConsole';
import './App.css';

type Role = 'CEO' | 'TRAFFIC_PLANNER' | 'DRIVER';
type View = 'DASHBOARD' | 'MAP' | 'FLEET' | 'REGISTRY' | 'PROFILE' | 'INVENTORY' | 'STAFF';

function App() {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('kalles-role') as Role) || 'CEO';
  });
  const [activeView, setActiveView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('kalles-role', role);
  }, [role]);

  const navItems = [
    { id: 'DASHBOARD', label: 'Executive Dashboard', icon: LayoutDashboard, roles: ['CEO'] },
    { id: 'MAP', label: 'Traffic Control', icon: MapIcon, roles: ['CEO', 'TRAFFIC_PLANNER'] },
    { id: 'FLEET', label: 'Depot & Fleet', icon: Bus, roles: ['CEO'] },
    { id: 'STAFF', label: 'Staff & Roster', icon: Users, roles: ['CEO'] },
    { id: 'INVENTORY', label: 'Inventory & Parts', icon: Package, roles: ['CEO'] },
    { id: 'REGISTRY', label: 'Master Data', icon: Database, roles: ['CEO'] },
    { id: 'PROFILE', label: 'My Profile', icon: User, roles: ['CEO', 'TRAFFIC_PLANNER', 'DRIVER'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  // Auto-switch view if current view not allowed for role
  useEffect(() => {
     if (role === 'DRIVER') {
       setActiveView('PROFILE'); // Driver portal handles its own sub-views
     } else if (!filteredNav.find(n => n.id === activeView)) {
       setActiveView('DASHBOARD');
     }
  }, [role]);

  const renderContent = () => {
    // DriverPortal is handled outside of the main view container
    if (role === 'DRIVER') return null;
    
    switch (activeView) {
      case 'DASHBOARD': return <CeoDashboard />;
      case 'MAP': return <TacticalMap />;
      case 'FLEET': return <DepotDashboard />;
      case 'STAFF': return <HrAdminConsole />;
      case 'INVENTORY': return <InventoryDashboard />;
      case 'REGISTRY': return <RegistryDashboard />;
      case 'PROFILE': return <div className="p-8"><h2>Profile Settings</h2><p>User management coming soon.</p></div>;
      default: return <CeoDashboard />;
    }
  };

  return (
    <div className={`app-layout ${role.toLowerCase()}`}>
      {/* MOBILE HEADER */}
      {isMobile && role !== 'DRIVER' && (
        <header className="mobile-top-nav">
          <button onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <div className="logo-text">KALLES BUSS</div>
          <button><Bell size={20} /></button>
        </header>
      )}

      {/* SIDEBAR (Desktop / Mobile Overlay) */}
      {role !== 'DRIVER' && (
        <>
          {isMobile && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
          <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile-overlay' : ''}`}>
            <div className="sidebar-header">
              <div className="logo">
                <div className="logo-icon">K</div>
                {isSidebarOpen && <span>KALLES BUSS</span>}
              </div>
              {isMobile && <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>}
            </div>

            <nav className="sidebar-nav">
              {filteredNav.map(item => (
                <button 
                  key={item.id}
                  className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveView(item.id as View);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <item.icon size={20} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="role-selector">
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="CEO">CEO View</option>
                  <option value="TRAFFIC_PLANNER">Traffic Planner</option>
                  <option value="DRIVER">Driver Portal</option>
                </select>
              </div>
              <button className="nav-btn logout">
                <LogOut size={20} />
                {isSidebarOpen && <span>Logout</span>}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`main-content ${role === 'DRIVER' ? 'full' : ''}`}>
        {!isMobile && role !== 'DRIVER' && (
          <header className="content-header">
            <div className="breadcrumb">
              {navItems.find(n => n.id === activeView)?.label || 'Overview'}
            </div>
            <div className="header-actions">
              <button className="icon-btn"><Bell size={20} /></button>
              <button className="icon-btn"><Settings size={20} /></button>
              <div className="user-pill">
                <div className="user-avatar">JH</div>
                <span>Joakim</span>
              </div>
            </div>
          </header>
        )}
        <div className="view-container">
          {renderContent()}
        </div>
      </main>

      {/* DRIVER BOTTOM NAV (Mobile Only) */}
      {role === 'DRIVER' && (
        <div className="driver-mobile-shell">
          <DriverPortal />
          {/* DEV ESCAPE HATCH: Invisible in prod, used here to escape the isolated mobile view */}
          <button 
             onClick={() => setRole('CEO')} 
             style={{
               position: 'fixed', top: 10, left: 10, zIndex: 9999, 
               background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', 
               padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
               boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
             }}
          >
             DEV: Back to Admin
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
