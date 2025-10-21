import { useState } from 'react';
import Icons from './Icons';

export default function StationModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'ac',
    zone: '',
    location: '',
    maxPower: 22,
    minPower: 3.7,
    priority: 5,
    protocol: 'ocpp',
    manufacturer: '',
    model: '',
    serialNumber: '',
    // Protocol-specific fields
    // OCPP
    chargePointId: '',
    connectorId: 1,
    // Modbus
    modbusHost: '',
    modbusPort: 502,
    modbusUnitId: 1,
    registerStatus: 1000,
    registerPower: 1001,
    registerEnergy: 1002,
    registerPowerSetpoint: 1003,
    // MQTT
    topicStatus: '',
    topicPower: '',
    topicEnergy: '',
    topicControl: ''
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Station name is required';
    }

    if (!formData.zone.trim()) {
      newErrors.zone = 'Zone is required';
    }

    if (formData.maxPower <= 0) {
      newErrors.maxPower = 'Max power must be greater than 0';
    }

    if (formData.minPower <= 0) {
      newErrors.minPower = 'Min power must be greater than 0';
    }

    if (formData.minPower >= formData.maxPower) {
      newErrors.minPower = 'Min power must be less than max power';
    }

    // Protocol-specific validation
    if (formData.protocol === 'ocpp') {
      if (!formData.chargePointId.trim()) {
        newErrors.chargePointId = 'Charge Point ID is required for OCPP';
      }
    } else if (formData.protocol === 'modbus') {
      if (!formData.modbusHost.trim()) {
        newErrors.modbusHost = 'Modbus host is required';
      }
    } else if (formData.protocol === 'mqtt') {
      if (!formData.topicStatus.trim() || !formData.topicPower.trim() || !formData.topicControl.trim()) {
        newErrors.mqtt = 'All MQTT topics are required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Build station object based on protocol
    const stationData = {
      name: formData.name,
      type: formData.type,
      zone: formData.zone,
      location: formData.location,
      maxPower: formData.maxPower,
      minPower: formData.minPower,
      priority: formData.priority,
      protocol: formData.protocol,
      manufacturer: formData.manufacturer,
      model: formData.model,
      serialNumber: formData.serialNumber,
      communication: {}
    };

    // Add protocol-specific communication settings
    if (formData.protocol === 'ocpp') {
      stationData.communication = {
        chargePointId: formData.chargePointId,
        connectorId: formData.connectorId
      };
    } else if (formData.protocol === 'modbus') {
      stationData.communication = {
        host: formData.modbusHost,
        port: formData.modbusPort,
        unitId: formData.modbusUnitId,
        registers: {
          status: formData.registerStatus,
          power: formData.registerPower,
          energy: formData.registerEnergy,
          powerSetpoint: formData.registerPowerSetpoint
        }
      };
    } else if (formData.protocol === 'mqtt') {
      stationData.communication = {
        topics: {
          status: formData.topicStatus,
          power: formData.topicPower,
          energy: formData.topicEnergy,
          control: formData.topicControl
        }
      };
    }

    onSubmit(stationData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Add Charging Station</h2>
          <button className="modal-close" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Basic Information */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Station Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Station 01"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${errors.name ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
              {errors.name && <div style={{ fontSize: '0.875rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.name}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="ac">AC</option>
                  <option value="dc">DC</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Zone *
                </label>
                <input
                  type="text"
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  placeholder="e.g., Parking Lot A"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${errors.zone ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
                {errors.zone && <div style={{ fontSize: '0.875rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.zone}</div>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Building 1, Floor 2"
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

            {/* Power Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Max Power (kW) *
                </label>
                <input
                  type="number"
                  name="maxPower"
                  value={formData.maxPower}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${errors.maxPower ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
                {errors.maxPower && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.maxPower}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Min Power (kW) *
                </label>
                <input
                  type="number"
                  name="minPower"
                  value={formData.minPower}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${errors.minPower ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
                {errors.minPower && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.minPower}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  min="1"
                  max="10"
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
            </div>

            {/* Protocol Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Protocol *
              </label>
              <select
                name="protocol"
                value={formData.protocol}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              >
                <option value="ocpp">OCPP (Open Charge Point Protocol)</option>
                <option value="modbus">Modbus TCP/RTU</option>
                <option value="mqtt">MQTT</option>
              </select>
            </div>

            {/* OCPP Settings */}
            {formData.protocol === 'ocpp' && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>OCPP Configuration</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                      Charge Point ID *
                    </label>
                    <input
                      type="text"
                      name="chargePointId"
                      value={formData.chargePointId}
                      onChange={handleChange}
                      placeholder="e.g., CP001"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${errors.chargePointId ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                    {errors.chargePointId && <div style={{ fontSize: '0.875rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.chargePointId}</div>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Charge point connects to: ws://your-server:9000/ocpp/{formData.chargePointId || 'CP001'}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                      Connector ID
                    </label>
                    <input
                      type="number"
                      name="connectorId"
                      value={formData.connectorId}
                      onChange={handleChange}
                      min="1"
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
                </div>
              </div>
            )}

            {/* Modbus Settings */}
            {formData.protocol === 'modbus' && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Modbus Configuration</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Host/IP *
                      </label>
                      <input
                        type="text"
                        name="modbusHost"
                        value={formData.modbusHost}
                        onChange={handleChange}
                        placeholder="e.g., 192.168.1.100"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: `1px solid ${errors.modbusHost ? 'var(--danger)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontSize: '1rem'
                        }}
                      />
                      {errors.modbusHost && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>{errors.modbusHost}</div>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                        Port
                      </label>
                      <input
                        type="number"
                        name="modbusPort"
                        value={formData.modbusPort}
                        onChange={handleChange}
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
                        Unit ID
                      </label>
                      <input
                        type="number"
                        name="modbusUnitId"
                        value={formData.modbusUnitId}
                        onChange={handleChange}
                        min="1"
                        max="255"
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
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--spacing-sm)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Status Reg
                      </label>
                      <input
                        type="number"
                        name="registerStatus"
                        value={formData.registerStatus}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Power Reg
                      </label>
                      <input
                        type="number"
                        name="registerPower"
                        value={formData.registerPower}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Energy Reg
                      </label>
                      <input
                        type="number"
                        name="registerEnergy"
                        value={formData.registerEnergy}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                        Setpoint Reg
                      </label>
                      <input
                        type="number"
                        name="registerPowerSetpoint"
                        value={formData.registerPowerSetpoint}
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MQTT Settings */}
            {formData.protocol === 'mqtt' && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>MQTT Configuration</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                      Status Topic *
                    </label>
                    <input
                      type="text"
                      name="topicStatus"
                      value={formData.topicStatus}
                      onChange={handleChange}
                      placeholder="e.g., charger/01/status"
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
                      Power Topic *
                    </label>
                    <input
                      type="text"
                      name="topicPower"
                      value={formData.topicPower}
                      onChange={handleChange}
                      placeholder="e.g., charger/01/power"
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
                      Energy Topic
                    </label>
                    <input
                      type="text"
                      name="topicEnergy"
                      value={formData.topicEnergy}
                      onChange={handleChange}
                      placeholder="e.g., charger/01/energy"
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
                      Control Topic *
                    </label>
                    <input
                      type="text"
                      name="topicControl"
                      value={formData.topicControl}
                      onChange={handleChange}
                      placeholder="e.g., charger/01/control"
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
                  {errors.mqtt && <div style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{errors.mqtt}</div>}
                </div>
              </div>
            )}

            {/* Optional Metadata */}
            <details>
              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Optional: Manufacturer Information
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="e.g., ABB, Schneider, etc."
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
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
                      Serial Number
                    </label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={formData.serialNumber}
                      onChange={handleChange}
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
                </div>
              </div>
            </details>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              <Icons.CheckCircle size={18} />
              Add Station
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
