import { useState } from 'react';
import Icons from './Icons';

export default function EnergyMeterModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    protocol: 'modbus',
    meterType: 'building',
    pollInterval: 5000,
    // Modbus fields
    modbusHost: '',
    modbusPort: 502,
    modbusUnitId: 1,
    modbusPowerRegister: 0,
    modbusVoltageRegister: 2,
    modbusCurrentRegister: 6,
    modbusEnergyRegister: 40,
    // MQTT fields
    mqttBroker: 'mqtt://localhost:1883',
    mqttTopic: '',
    mqttUsername: '',
    mqttPassword: '',
    // HTTP fields
    httpUrl: '',
    httpMethod: 'GET',
    httpAuthToken: '',
    httpDataPath: 'power'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build communication object based on protocol
    let communication = {};

    if (formData.protocol === 'modbus') {
      communication = {
        host: formData.modbusHost,
        port: parseInt(formData.modbusPort),
        unitId: parseInt(formData.modbusUnitId),
        registers: {
          power: parseInt(formData.modbusPowerRegister),
          voltage: parseInt(formData.modbusVoltageRegister),
          current: parseInt(formData.modbusCurrentRegister),
          totalEnergy: parseInt(formData.modbusEnergyRegister)
        }
      };
    } else if (formData.protocol === 'mqtt') {
      communication = {
        broker: formData.mqttBroker,
        topic: formData.mqttTopic,
        username: formData.mqttUsername || undefined,
        password: formData.mqttPassword || undefined
      };
    } else if (formData.protocol === 'http') {
      communication = {
        url: formData.httpUrl,
        method: formData.httpMethod,
        headers: formData.httpAuthToken ? {
          'Authorization': `Bearer ${formData.httpAuthToken}`
        } : undefined,
        dataPath: formData.httpDataPath
      };
    }

    const meterData = {
      name: formData.name,
      protocol: formData.protocol,
      meterType: formData.meterType,
      pollInterval: parseInt(formData.pollInterval),
      communication
    };

    await onSubmit(meterData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Energy Meter</h2>
          <button className="modal-close" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Basic Info */}
            <div className="form-group">
              <label className="form-label">Meter Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Building Main Meter"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Protocol</label>
                <select
                  name="protocol"
                  className="form-input"
                  value={formData.protocol}
                  onChange={handleChange}
                >
                  <option value="modbus">Modbus TCP/RTU</option>
                  <option value="mqtt">MQTT</option>
                  <option value="http">HTTP REST API</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Meter Type</label>
                <select
                  name="meterType"
                  className="form-input"
                  value={formData.meterType}
                  onChange={handleChange}
                >
                  <option value="building">Building Consumption</option>
                  <option value="grid">Grid Connection</option>
                  <option value="solar">Solar Production</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Poll Interval (ms)</label>
              <input
                type="number"
                name="pollInterval"
                className="form-input"
                value={formData.pollInterval}
                onChange={handleChange}
                min="1000"
                step="1000"
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                How often to read the meter (minimum 1000ms)
              </small>
            </div>

            {/* Protocol-specific fields */}
            {formData.protocol === 'modbus' && (
              <>
                <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Modbus Configuration
                  </h4>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Host/IP Address</label>
                    <input
                      type="text"
                      name="modbusHost"
                      className="form-input"
                      value={formData.modbusHost}
                      onChange={handleChange}
                      placeholder="192.168.1.100"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Port</label>
                    <input
                      type="number"
                      name="modbusPort"
                      className="form-input"
                      value={formData.modbusPort}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Unit ID</label>
                    <input
                      type="number"
                      name="modbusUnitId"
                      className="form-input"
                      value={formData.modbusUnitId}
                      onChange={handleChange}
                      min="1"
                      max="247"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Register Addresses</h5>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Power (W)</label>
                    <input
                      type="number"
                      name="modbusPowerRegister"
                      className="form-input"
                      value={formData.modbusPowerRegister}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Voltage (V)</label>
                    <input
                      type="number"
                      name="modbusVoltageRegister"
                      className="form-input"
                      value={formData.modbusVoltageRegister}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current (A)</label>
                    <input
                      type="number"
                      name="modbusCurrentRegister"
                      className="form-input"
                      value={formData.modbusCurrentRegister}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Energy (Wh)</label>
                    <input
                      type="number"
                      name="modbusEnergyRegister"
                      className="form-input"
                      value={formData.modbusEnergyRegister}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.protocol === 'mqtt' && (
              <>
                <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    MQTT Configuration
                  </h4>
                </div>

                <div className="form-group">
                  <label className="form-label">Broker URL</label>
                  <input
                    type="text"
                    name="mqttBroker"
                    className="form-input"
                    value={formData.mqttBroker}
                    onChange={handleChange}
                    placeholder="mqtt://localhost:1883"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Topic</label>
                  <input
                    type="text"
                    name="mqttTopic"
                    className="form-input"
                    value={formData.mqttTopic}
                    onChange={handleChange}
                    placeholder="energy/building/meter"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Username (optional)</label>
                    <input
                      type="text"
                      name="mqttUsername"
                      className="form-input"
                      value={formData.mqttUsername}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password (optional)</label>
                    <input
                      type="password"
                      name="mqttPassword"
                      className="form-input"
                      value={formData.mqttPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {formData.protocol === 'http' && (
              <>
                <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    HTTP Configuration
                  </h4>
                </div>

                <div className="form-group">
                  <label className="form-label">API URL</label>
                  <input
                    type="url"
                    name="httpUrl"
                    className="form-input"
                    value={formData.httpUrl}
                    onChange={handleChange}
                    placeholder="http://meter.local/api/reading"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">HTTP Method</label>
                    <select
                      name="httpMethod"
                      className="form-input"
                      value={formData.httpMethod}
                      onChange={handleChange}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Data Path</label>
                    <input
                      type="text"
                      name="httpDataPath"
                      className="form-input"
                      value={formData.httpDataPath}
                      onChange={handleChange}
                      placeholder="data.power or power"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Auth Token (optional)</label>
                  <input
                    type="password"
                    name="httpAuthToken"
                    className="form-input"
                    value={formData.httpAuthToken}
                    onChange={handleChange}
                    placeholder="Bearer token for Authorization header"
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Icons.CheckCircle size={18} />
              Add Meter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
