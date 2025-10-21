import { useState, useEffect } from 'react';
import { systemAPI, loadAPI, stationsAPI, energyMetersAPI } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import Icons from '../components/Icons';
import StationModal from '../components/StationModal';
import AIUploadModal from '../components/AIUploadModal';
import EnergyMeterModal from '../components/EnergyMeterModal';
import AIMeterUploadModal from '../components/AIMeterUploadModal';
import DemoModePanel from '../components/DemoModePanel';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [maxCapacity, setMaxCapacity] = useState('');
  const [peakThreshold, setPeakThreshold] = useState('');
  const [stations, setStations] = useState([]);
  const [energyMeters, setEnergyMeters] = useState([]);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showMeterModal, setShowMeterModal] = useState(false);
  const [showAIMeterModal, setShowAIMeterModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data } = useWebSocket();

  useEffect(() => {
    loadSettings();
    loadStations();
    loadEnergyMeters();
  }, []);

  useEffect(() => {
    if (data?.type === 'station.updated' || data?.type === 'station.registered') {
      loadStations();
    }
  }, [data]);

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

  const loadStations = async () => {
    try {
      const response = await stationsAPI.getAll();
      setStations(response.data);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadEnergyMeters = async () => {
    try {
      const response = await energyMetersAPI.getAll();
      setEnergyMeters(response.data);
    } catch (error) {
      console.error('Error loading energy meters:', error);
    }
  };

  const handleSaveGridConfig = async () => {
    try {
      await loadAPI.setLimits({
        maxGridCapacity: parseFloat(maxCapacity),
        peakDemandThreshold: parseFloat(peakThreshold)
      });
      alert('Grid configuration saved successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleAddStation = async (stationData) => {
    setLoading(true);
    try {
      await stationsAPI.create(stationData);
      setShowStationModal(false);
      await loadStations();
    } catch (error) {
      console.error('Error adding station:', error);
      alert(`Failed to add station: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAIStationCreated = async () => {
    await loadStations();
  };

  const handleDeleteStation = async (stationId, stationName) => {
    if (!confirm(`Are you sure you want to delete "${stationName}"?`)) {
      return;
    }

    try {
      await stationsAPI.delete(stationId);
      await loadStations();
    } catch (error) {
      console.error('Error deleting station:', error);
      alert(`Failed to delete station: ${error.message}`);
    }
  };

  const handleAddMeter = async (meterData) => {
    setLoading(true);
    try {
      await energyMetersAPI.create(meterData);
      setShowMeterModal(false);
      await loadEnergyMeters();
    } catch (error) {
      console.error('Error adding meter:', error);
      alert(`Failed to add meter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAIMeterCreated = async () => {
    await loadEnergyMeters();
  };

  const handleDeleteMeter = async (meterId, meterName) => {
    if (!confirm(`Are you sure you want to delete "${meterName}"?`)) {
      return;
    }

    try {
      await energyMetersAPI.delete(meterId);
      await loadEnergyMeters();
    } catch (error) {
      console.error('Error deleting meter:', error);
      alert(`Failed to delete meter: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      charging: 'badge-success',
      ready: 'badge-info',
      offline: 'badge',
      error: 'badge-danger',
      active: 'badge-success',
      inactive: 'badge'
    };
    return badges[status] || 'badge';
  };

  const getMeterTypeBadge = (type) => {
    const badges = {
      building: 'badge-info',
      grid: 'badge-success',
      solar: 'badge-warning',
      custom: 'badge'
    };
    return badges[type] || 'badge';
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">
          Configure system parameters, charging stations, and energy meters
        </p>
      </div>

      {/* Demo Mode */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <DemoModePanel />
      </div>

      {/* Grid Configuration */}
      <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Grid Configuration</h3>
            <Icons.Settings size={20} />
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div>
                <label className="form-label">Max Grid Capacity (kW)</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Peak Demand Threshold (kW)</label>
                <input
                  type="number"
                  className="form-input"
                  value={peakThreshold}
                  onChange={(e) => setPeakThreshold(e.target.value)}
                />
              </div>

              <button onClick={handleSaveGridConfig} className="btn btn-primary">
                <Icons.Save size={18} />
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

      {/* Charging Stations Section */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Charging Stations</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setShowAIModal(true)}>
              <Icons.Sparkles size={18} />
              AI Setup
            </button>
            <button className="btn btn-primary" onClick={() => setShowStationModal(true)}>
              <Icons.Plus size={18} />
              Add Station
            </button>
          </div>
        </div>

        {stations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <Icons.BatteryCharging size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--spacing-md)' }} />
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No Stations Configured</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Add your first charging station manually or use AI to parse a manual
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {stations.map(station => (
              <div key={station.id} className="card">
                <div className="card-header">
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>{station.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {station.zone} • {station.protocol?.toUpperCase()}
                    </div>
                  </div>
                  <div className={`badge ${getStatusBadge(station.status)}`}>
                    {station.status}
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Power</div>
                      <div style={{ fontWeight: 600 }}>{station.maxPower} kW</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority</div>
                      <div style={{ fontWeight: 600 }}>{station.priority}/10</div>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ width: '100%' }}
                    onClick={() => handleDeleteStation(station.id, station.name)}
                  >
                    <Icons.Trash size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Energy Meters Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Energy Meters</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-secondary" onClick={() => setShowAIMeterModal(true)}>
              <Icons.Sparkles size={18} />
              AI Setup
            </button>
            <button className="btn btn-primary" onClick={() => setShowMeterModal(true)}>
              <Icons.Plus size={18} />
              Add Meter
            </button>
          </div>
        </div>

        {energyMeters.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <Icons.Gauge size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--spacing-md)' }} />
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>No Energy Meters Configured</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Connect energy meters to measure building consumption for accurate load management
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {energyMeters.map(meter => (
              <div key={meter.id} className="card">
                <div className="card-header">
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>{meter.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {meter.protocol?.toUpperCase()}
                    </div>
                  </div>
                  <div className={`badge ${getMeterTypeBadge(meter.meterType)}`}>
                    {meter.meterType}
                  </div>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Power</div>
                      <div style={{ fontWeight: 600 }}>{(meter.currentPower || 0).toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Poll Rate</div>
                      <div style={{ fontWeight: 600 }}>{(meter.pollInterval / 1000).toFixed(0)}s</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
                    Last Reading: {meter.lastReading ? new Date(meter.lastReading).toLocaleTimeString() : 'Never'}
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ width: '100%' }}
                    onClick={() => handleDeleteMeter(meter.id, meter.name)}
                  >
                    <Icons.Trash size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <StationModal
        isOpen={showStationModal}
        onClose={() => setShowStationModal(false)}
        onSubmit={handleAddStation}
      />

      <AIUploadModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onStationCreated={handleAIStationCreated}
      />

      <EnergyMeterModal
        isOpen={showMeterModal}
        onClose={() => setShowMeterModal(false)}
        onSubmit={handleAddMeter}
      />

      <AIMeterUploadModal
        isOpen={showAIMeterModal}
        onClose={() => setShowAIMeterModal(false)}
        onMeterCreated={handleAIMeterCreated}
      />
    </div>
  );
}
