import { useState, useEffect } from 'react';
import { demoAPI } from '../api/client';
import Icons from './Icons';

export default function DemoModePanel() {
  const [demoStatus, setDemoStatus] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('normal');
  const [timeMultiplier, setTimeMultiplier] = useState(1);

  useEffect(() => {
    loadScenarios();
    loadStatus();

    // Poll status every 3 seconds when enabled
    const interval = setInterval(() => {
      if (demoStatus?.enabled) {
        loadStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [demoStatus?.enabled]);

  const loadScenarios = async () => {
    try {
      const response = await demoAPI.getScenarios();
      setScenarios(response.scenarios || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await demoAPI.getStatus();
      setDemoStatus(response);
    } catch (error) {
      console.error('Error loading demo status:', error);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      await demoAPI.enable(selectedScenario, timeMultiplier);
      await loadStatus();
    } catch (error) {
      console.error('Error enabling demo mode:', error);
      alert(`Failed to enable demo mode: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await demoAPI.disable();
      await loadStatus();
    } catch (error) {
      console.error('Error disabling demo mode:', error);
      alert(`Failed to disable demo mode: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioChange = async (scenario) => {
    if (!demoStatus?.enabled) {
      setSelectedScenario(scenario);
      return;
    }

    setLoading(true);
    try {
      await demoAPI.setScenario(scenario);
      await loadStatus();
    } catch (error) {
      console.error('Error changing scenario:', error);
      alert(`Failed to change scenario: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedChange = async (speed) => {
    if (!demoStatus?.enabled) {
      setTimeMultiplier(speed);
      return;
    }

    setLoading(true);
    try {
      await demoAPI.setSpeed(speed);
      await loadStatus();
    } catch (error) {
      console.error('Error changing speed:', error);
      alert(`Failed to change speed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scenarioDescriptions = {
    normal: 'Typical operations with 5 AC + 2 DC stations (~60% capacity)',
    peak_load: 'High demand with 8 AC + 3 DC stations (triggers load management)',
    load_shedding: 'Overload scenario that triggers load shedding levels',
    phase_imbalance: 'Single-phase loads causing phase imbalance',
    thermal_derating: 'DC fast charger with temperature increase',
    v2g_export: 'Vehicle-to-Grid bidirectional power flow',
    mixed_fleet: 'Various vehicle types (Nissan Leaf, Tesla, F-150, Ariya)',
    overnight_charging: 'Low-priority slow charging scenario'
  };

  const speedOptions = [
    { value: 1, label: '1x (Real-time)' },
    { value: 5, label: '5x (Fast)' },
    { value: 10, label: '10x (Very Fast)' },
    { value: 30, label: '30x (Ultra Fast)' },
    { value: 60, label: '60x (Testing)' }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Icons.Sparkles size={20} />
          <h3 className="card-title">Demo Mode</h3>
        </div>
        {demoStatus?.enabled && (
          <div className="badge badge-success">
            Active
          </div>
        )}
      </div>

      <div className="card-body">
        {!demoStatus?.enabled ? (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
              Simulate realistic charging scenarios for demonstration and testing. Demo mode creates virtual stations with live updating values.
            </p>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label">Scenario</label>
              <select
                className="form-input"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                disabled={loading}
              >
                {Object.keys(scenarioDescriptions).map(scenario => (
                  <option key={scenario} value={scenario}>
                    {scenario.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                {scenarioDescriptions[selectedScenario]}
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="form-label">Speed</label>
              <select
                className="form-input"
                value={timeMultiplier}
                onChange={(e) => setTimeMultiplier(parseInt(e.target.value))}
                disabled={loading}
              >
                {speedOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
                Higher speeds are useful for testing long scenarios
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleEnable}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <Icons.Play size={18} />
              Enable Demo Mode
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--background-elevated)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scenario</div>
                  <div style={{ fontWeight: 600 }}>
                    {demoStatus.scenario?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed</div>
                  <div style={{ fontWeight: 600 }}>{demoStatus.timeMultiplier}x</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stations</div>
                  <div style={{ fontWeight: 600 }}>{Object.keys(demoStatus.stations || {}).length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Elapsed Time</div>
                  <div style={{ fontWeight: 600 }}>{demoStatus.elapsedTime || '0s'}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="form-label">Change Scenario</label>
              <select
                className="form-input"
                value={demoStatus.scenario}
                onChange={(e) => handleScenarioChange(e.target.value)}
                disabled={loading}
              >
                {Object.keys(scenarioDescriptions).map(scenario => (
                  <option key={scenario} value={scenario}>
                    {scenario.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="form-label">Simulation Speed</label>
              <select
                className="form-input"
                value={demoStatus.timeMultiplier}
                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                disabled={loading}
              >
                {speedOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-danger"
              onClick={handleDisable}
              disabled={loading}
              style={{ width: '100%' }}
            >
              <Icons.X size={18} />
              Disable Demo Mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
