import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Icons from './Icons';

export default function Layout({ children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', icon: Icons.Dashboard, label: 'Dashboard' },
    { path: '/stations', icon: Icons.BatteryCharging, label: 'Charging Stations' },
    { path: '/load', icon: Icons.Zap, label: 'Load Management' },
    { path: '/energy', icon: Icons.Sun, label: 'Energy & PV' },
    { path: '/schedules', icon: Icons.Calendar, label: 'Schedules' },
    { path: '/analytics', icon: Icons.Chart, label: 'Analytics' },
    { path: '/settings', icon: Icons.Settings, label: 'Settings' }
  ];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <Icons.Zap size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>WAGO DLM</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Load Management
              </div>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Navigation</div>
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <div className="header-title">Dynamic Load Management</div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={toggleTheme}
              style={{ padding: '8px 12px' }}
            >
              {theme === 'light' ? <Icons.Moon size={18} /> : <Icons.Sun size={18} />}
            </button>
          </div>
        </header>

        <main className="content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
