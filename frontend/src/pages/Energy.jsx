import { useState, useEffect } from 'react';
import { energyAPI } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { Sun, Battery, TrendingUp, DollarSign } from 'lucide-react';

export default function Energy() {
  const [pvStatus, setPvStatus] = useState(null);
  const [consumption, setConsumption] = useState(null);
  const [costs, setCosts] = useState(null);
  const { data } = useWebSocket();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data?.type === 'pv.production') {
      loadData();
    }
  }, [data]);

  const loadData = async () => {
    try {
      const [pvData, consumptionData, costsData] = await Promise.all([
        energyAPI.getPV(),
        energyAPI.getConsumption(),
        energyAPI.getCosts()
      ]);
      setPvStatus(pvData.data);
      setConsumption(consumptionData.data);
      setCosts(costsData.data);
    } catch (error) {
      console.error('Error loading energy data:', error);
    }
  };

  if (!pvStatus || !consumption || !costs) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Energy & PV</h1>
        <p className="page-description">
          Monitor energy consumption and photovoltaic production
        </p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
              <Sun size={24} />
            </div>
          </div>
          <div className="stat-value">{pvStatus.currentProduction.toFixed(1)} kW</div>
          <div className="stat-label">PV Production</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {pvStatus.enabled ? 'Active' : 'Disabled'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white' }}>
              <Battery size={24} />
            </div>
          </div>
          <div className="stat-value">{consumption.current.toFixed(1)} kW</div>
          <div className="stat-label">Current Consumption</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="stat-value">{consumption.total.toFixed(2)} kWh</div>
          <div className="stat-label">Total Energy</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div className="stat-value">${costs.totalCost.toFixed(2)}</div>
          <div className="stat-label">Total Cost</div>
        </div>
      </div>

      {pvStatus.enabled && (
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="card-header">
            <h3 className="card-title">Photovoltaic System</h3>
            <div className="badge badge-success">Active</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Current Production</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{pvStatus.currentProduction.toFixed(1)} kW</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Average Production</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{pvStatus.averageProduction.toFixed(1)} kW</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Max Capacity</div>
                <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{pvStatus.maxCapacity} kW</div>
              </div>
            </div>
            {pvStatus.excessChargingEnabled && (
              <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Sun size={18} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontWeight: 600 }}>Excess Charging Enabled</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Surplus solar power is automatically used for EV charging
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Energy Costs</h3>
          <div className={`badge ${costs.isPeakDemand ? 'badge-warning' : 'badge-info'}`}>
            {costs.isPeakDemand ? 'Peak Rate' : 'Normal Rate'}
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Energy</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{costs.totalEnergy.toFixed(2)} kWh</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Rate</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>${costs.costPerKWh.toFixed(3)}/kWh</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Cost</div>
              <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)' }}>
                ${costs.totalCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
