import { useState, useEffect } from 'react';
import { systemAPI, loadAPI } from '../api/client';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [peakThreshold, setPeakThreshold] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await systemAPI.getInfo();
      setConfig(response.data.config);
      setMaxCapacity(response.data.config.maxGridCapacity);
      setPeakThreshold(response.data.config.peakDemandThreshold);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await loadAPI.setLimits({
        maxGridCapacity: parseFloat(maxCapacity),
        peakDemandThreshold: parseFloat(peakThreshold)
      });
      alert('Settings saved successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Configure system parameters and limits
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Grid Configuration</h3>
            <SettingsIcon size={20} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Max Grid Capacity (kW)
                </label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Peak Demand Threshold (kW)
                </label>
                <input
                  type="number"
                  value={peakThreshold}
                  onChange={(e) => setPeakThreshold(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <button onClick={handleSave} className="btn btn-primary">
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Min Charging Power</div>
                <div style={{ fontWeight: 600 }}>{config.minChargingPower} kW</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Max Power per Station</div>
                <div style={{ fontWeight: 600 }}>{config.maxChargingPowerPerStation} kW</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Energy Cost (Normal)</div>
                <div style={{ fontWeight: 600 }}>${config.energyCostPerKWh}/kWh</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Energy Cost (Peak)</div>
                <div style={{ fontWeight: 600 }}>${config.peakCostPerKWh}/kWh</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>PV System</div>
                <div className={`badge ${config.pvSystemEnabled ? 'badge-success' : 'badge'}`}>
                  {config.pvSystemEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Load Balancing</div>
                <div className={`badge ${config.enableLoadBalancing ? 'badge-success' : 'badge'}`}>
                  {config.enableLoadBalancing ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
