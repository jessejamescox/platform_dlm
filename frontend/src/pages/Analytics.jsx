import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api/client';
import Icons from '../components/Icons';

export default function Analytics() {
  const [stationAnalytics, setStationAnalytics] = useState([]);
  const [zoneAnalytics, setZoneAnalytics] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stations, zones] = await Promise.all([
        analyticsAPI.getStations(),
        analyticsAPI.getZones()
      ]);
      setStationAnalytics(stations.data);
      setZoneAnalytics(zones.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-description">
          Detailed analytics and performance insights
        </p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h3 className="card-title">Station Performance</h3>
          <Icons.Chart size={20} />
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {stationAnalytics.slice(0, 10).map(station => (
              <div key={station.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{station.name}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'var(--spacing-sm)' }}>
                      {station.zone}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{station.totalEnergy.toFixed(2)} kWh</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (station.totalEnergy / (stationAnalytics[0]?.totalEnergy || 1)) * 100)}%`,
                      background: 'linear-gradient(90deg, var(--primary), var(--primary-dark))',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {zoneAnalytics.length > 0 && (
        <div className="grid grid-3">
          {zoneAnalytics.map(zone => (
            <div key={zone.zone} className="card">
              <div className="card-header">
                <h3 className="card-title">{zone.zone}</h3>
                <Icons.Activity size={20} />
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Stations</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{zone.stations}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Active Now</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{zone.activeStations}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Current Power</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{zone.totalPower.toFixed(1)} kW</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Energy</div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)' }}>
                      {zone.totalEnergy.toFixed(2)} kWh
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
