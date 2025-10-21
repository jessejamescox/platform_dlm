import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { analyticsAPI, systemAPI } from '../api/client';
import Icons from '../components/Icons';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const { connected, data } = useWebSocket();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data?.type === 'load.updated' || data?.type === 'station.updated') {
      loadData();
    }
  }, [data]);

  const loadData = async () => {
    try {
      const [overviewData, sysInfo] = await Promise.all([
        analyticsAPI.getOverview(),
        systemAPI.getInfo()
      ]);
      setOverview(overviewData.data);
      setSystemInfo(sysInfo.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  if (!overview || !systemInfo) {
    return (
      <div className="page-header">
        <h1 className="page-title">Loading...</h1>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Stations',
      value: overview.totalStations,
      icon: Icons.BatteryCharging,
      subValue: `${overview.activeStations} charging`
    },
    {
      label: 'Current Load',
      value: `${overview.currentLoad.toFixed(1)} kW`,
      icon: Icons.Zap,
      subValue: `${overview.utilizationPercent.toFixed(1)}% utilized`
    },
    {
      label: 'Available Capacity',
      value: `${overview.availableCapacity.toFixed(1)} kW`,
      icon: Icons.Activity,
      subValue: `of ${systemInfo.config.maxGridCapacity} kW`
    },
    {
      label: 'PV Production',
      value: overview.pvEnabled ? `${overview.pvProduction.toFixed(1)} kW` : 'Disabled',
      icon: Icons.Sun,
      subValue: overview.pvEnabled ? 'Solar active' : 'Not configured'
    },
    {
      label: 'Total Energy',
      value: `${overview.totalEnergyDelivered.toFixed(2)} kWh`,
      icon: Icons.TrendingUp,
      subValue: 'All time'
    },
    {
      label: 'System Status',
      value: connected ? 'Online' : 'Offline',
      icon: Icons.AlertCircle,
      subValue: overview.loadBalancingEnabled ? 'Balancing active' : 'Manual mode'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Overview of your dynamic load management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-3">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <div className="stat-icon">
                <stat.icon size={24} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stat.subValue}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-2" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  System Name
                </div>
                <div style={{ fontWeight: 600 }}>{systemInfo.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Version
                </div>
                <div style={{ fontWeight: 600 }}>{systemInfo.version}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Max Grid Capacity
                </div>
                <div style={{ fontWeight: 600 }}>{systemInfo.config.maxGridCapacity} kW</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Peak Threshold
                </div>
                <div style={{ fontWeight: 600 }}>{systemInfo.config.peakDemandThreshold} kW</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Station Status</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className="status-indicator status-online"></span>
                  <span>Charging</span>
                </div>
                <span className="badge badge-success">{overview.activeStations}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className="status-indicator" style={{ background: 'var(--info)' }}></span>
                  <span>Ready</span>
                </div>
                <span className="badge badge-info">{overview.readyStations}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <span className="status-indicator status-offline"></span>
                  <span>Offline</span>
                </div>
                <span className="badge">{overview.offlineStations}</span>
              </div>
              <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Active Schedules
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{overview.schedules}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <span className={`status-indicator ${connected ? 'status-online' : 'status-offline'}`}></span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            WebSocket {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
