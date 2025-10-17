import { useState, useEffect } from 'react';
import { loadAPI } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';

export default function LoadManagement() {
  const [loadStatus, setLoadStatus] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const { data } = useWebSocket();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data?.type === 'load.updated') {
      loadData();
    }
  }, [data]);

  const loadData = async () => {
    try {
      const [statusData, capacityData] = await Promise.all([
        loadAPI.getStatus(),
        loadAPI.getCapacity()
      ]);
      setLoadStatus(statusData.data);
      setCapacity(capacityData.data);
    } catch (error) {
      console.error('Error loading load data:', error);
    }
  };

  if (!loadStatus || !capacity) {
    return <div>Loading...</div>;
  }

  const utilizationColor = capacity.utilizationPercent > 90 ? 'var(--danger)' :
                          capacity.utilizationPercent > 75 ? 'var(--warning)' :
                          'var(--success)';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Load Management</h1>
        <p className="page-description">
          Monitor and control power distribution across charging stations
        </p>
      </div>

      {/* Capacity Overview */}
      <div className="grid grid-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
              <Zap size={24} />
            </div>
          </div>
          <div className="stat-value">{capacity.currentLoad.toFixed(1)} kW</div>
          <div className="stat-label">Current Load</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{capacity.availableCapacity.toFixed(1)} kW</div>
          <div className="stat-label">Available Capacity</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${utilizationColor}, ${utilizationColor}dd)`, color: 'white' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="stat-value">{capacity.utilizationPercent.toFixed(1)}%</div>
          <div className="stat-label">Grid Utilization</div>
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Grid Capacity</h3>
          <div className={`badge ${capacity.isPeakDemand ? 'badge-danger' : 'badge-success'}`}>
            {capacity.isPeakDemand ? 'Peak Demand' : 'Normal'}
          </div>
        </div>
        <div className="card-body">
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
              <span>Current: {capacity.currentLoad.toFixed(1)} kW</span>
              <span>Max: {capacity.maxCapacity} kW</span>
            </div>
            <div style={{ height: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${capacity.utilizationPercent}%`,
                  background: `linear-gradient(90deg, ${utilizationColor}, ${utilizationColor}dd)`,
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 'var(--spacing-sm)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {capacity.utilizationPercent > 10 && `${capacity.utilizationPercent.toFixed(0)}%`}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Peak Threshold</div>
              <div style={{ fontWeight: 600 }}>{capacity.peakThreshold} kW</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Available</div>
              <div style={{ fontWeight: 600 }}>{capacity.availableCapacity.toFixed(1)} kW</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Stations */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Power Allocation</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {loadStatus.stations.length} stations
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {loadStatus.stations
              .filter(s => s.currentPower > 0)
              .sort((a, b) => b.currentPower - a.currentPower)
              .map(station => (
                <div key={station.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{station.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Priority: {station.priority}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                      {station.currentPower.toFixed(1)} kW
                    </div>
                    <div className={`badge ${station.status === 'charging' ? 'badge-success' : 'badge-info'}`}>
                      {station.status}
                    </div>
                  </div>
                </div>
              ))}

            {loadStatus.stations.filter(s => s.currentPower > 0).length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--text-muted)' }}>
                No active charging sessions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
