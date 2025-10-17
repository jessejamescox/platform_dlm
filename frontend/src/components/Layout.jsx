import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  Zap,
  Activity,
  Sun,
  Calendar,
  BarChart3,
  Settings,
  Moon,
  BatteryCharging
} from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/stations', icon: BatteryCharging, label: 'Charging Stations' },
    { path: '/load', icon: Zap, label: 'Load Management' },
    { path: '/energy', icon: Activity, label: 'Energy & PV' },
    { path: '/schedules', icon: Calendar, label: 'Schedules' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <Zap size={24} />
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
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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
