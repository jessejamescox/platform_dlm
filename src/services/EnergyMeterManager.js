/**
 * Energy Meter Manager
 *
 * Manages building energy meters for accurate consumption tracking.
 * Supports multiple protocols: Modbus, MQTT, HTTP REST API.
 *
 * Key responsibilities:
 * - Connect to energy meters via various protocols
 * - Read real-time power consumption
 * - Track total energy consumption
 * - Provide data for load balancing decisions
 * - Log consumption to InfluxDB
 * - Support multiple meters for multi-building setups
 */

import { ModbusDriver } from '../protocols/ModbusDriver.js';
import { MQTTDriver } from '../protocols/MQTTDriver.js';
import axios from 'axios';

class EnergyMeterManager {
  constructor(state, dataLogger) {
    this.state = state;
    this.dataLogger = dataLogger;
    this.modbusDriver = new ModbusDriver();
    this.mqttDriver = null;
    this.meters = new Map(); // Map of meter ID to meter config
    this.pollingIntervals = new Map(); // Active polling intervals
    this.currentReadings = new Map(); // Latest readings per meter
  }

  /**
   * Initialize the manager and start monitoring configured meters
   */
  async initialize() {
    console.log('[EnergyMeterManager] Initializing...');

    // Initialize MQTT driver if needed
    if (process.env.MQTT_BROKER_URL) {
      this.mqttDriver = new MQTTDriver(process.env.MQTT_BROKER_URL);
      await this.mqttDriver.connect();
      console.log('[EnergyMeterManager] MQTT driver initialized');
    }

    // Load meters from state
    if (this.state.energyMeters) {
      for (const [id, meter] of this.state.energyMeters.entries()) {
        await this.startMonitoring(id, meter);
      }
    }

    console.log('[EnergyMeterManager] Initialized');
  }

  /**
   * Register a new energy meter
   */
  async registerMeter(meterConfig) {
    const meterId = `meter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const meter = {
      id: meterId,
      name: meterConfig.name,
      location: meterConfig.location || 'main-building',
      protocol: meterConfig.protocol, // 'modbus', 'mqtt', 'http'
      meterType: meterConfig.meterType || 'grid', // 'grid', 'solar', 'building', 'zone'
      communication: meterConfig.communication,
      pollInterval: meterConfig.pollInterval || 5000, // ms
      registeredAt: new Date().toISOString(),
      status: 'offline',
      currentPower: 0,
      totalEnergy: 0,
      voltage: 0,
      current: 0,
      powerFactor: 1.0,
      frequency: 50
    };

    this.meters.set(meterId, meter);
    this.state.energyMeters.set(meterId, meter);

    // Start monitoring
    await this.startMonitoring(meterId, meter);

    this.state.broadcast({
      type: 'energy_meter.registered',
      data: meter
    });

    console.log(`[EnergyMeterManager] Registered meter: ${meter.name} (${meterId})`);
    return meter;
  }

  /**
   * Start monitoring a meter based on its protocol
   */
  async startMonitoring(meterId, meter) {
    console.log(`[EnergyMeterManager] Starting monitoring for ${meter.name} via ${meter.protocol}`);

    switch (meter.protocol) {
      case 'modbus':
        await this.startModbusMonitoring(meterId, meter);
        break;
      case 'mqtt':
        await this.startMQTTMonitoring(meterId, meter);
        break;
      case 'http':
        await this.startHTTPMonitoring(meterId, meter);
        break;
      default:
        console.error(`[EnergyMeterManager] Unsupported protocol: ${meter.protocol}`);
    }
  }

  /**
   * Modbus protocol monitoring
   */
  async startModbusMonitoring(meterId, meter) {
    const { host, port, unitId, registers } = meter.communication;

    const pollMeter = async () => {
      try {
        // Read multiple registers in one call for efficiency
        const registerAddresses = [
          registers.power || 0,
          registers.energy || 2,
          registers.voltage || 4,
          registers.current || 6,
          registers.powerFactor || 8,
          registers.frequency || 10
        ].filter(r => r !== undefined);

        if (registerAddresses.length === 0) {
          console.warn(`[EnergyMeterManager] No registers configured for ${meter.name}`);
          return;
        }

        // Connect to Modbus device
        await this.modbusDriver.connect(host, port, 'tcp');

        // Read power (usually in Watts, may need scaling)
        let power = 0;
        if (registers.power !== undefined) {
          power = await this.modbusDriver.readRegister(unitId, registers.power);
          power = power * (registers.powerScale || 1); // Apply scaling factor
        }

        // Read total energy (usually in kWh)
        let energy = 0;
        if (registers.energy !== undefined) {
          const energyLow = await this.modbusDriver.readRegister(unitId, registers.energy);
          const energyHigh = registers.energyHigh
            ? await this.modbusDriver.readRegister(unitId, registers.energyHigh)
            : 0;
          energy = (energyHigh << 16) | energyLow;
          energy = energy * (registers.energyScale || 0.001); // Convert to kWh
        }

        // Read voltage (V)
        let voltage = 0;
        if (registers.voltage !== undefined) {
          voltage = await this.modbusDriver.readRegister(unitId, registers.voltage);
          voltage = voltage * (registers.voltageScale || 0.1);
        }

        // Read current (A)
        let current = 0;
        if (registers.current !== undefined) {
          current = await this.modbusDriver.readRegister(unitId, registers.current);
          current = current * (registers.currentScale || 0.001);
        }

        // Read power factor
        let powerFactor = 1.0;
        if (registers.powerFactor !== undefined) {
          powerFactor = await this.modbusDriver.readRegister(unitId, registers.powerFactor);
          powerFactor = powerFactor * (registers.powerFactorScale || 0.001);
        }

        // Read frequency (Hz)
        let frequency = 50;
        if (registers.frequency !== undefined) {
          frequency = await this.modbusDriver.readRegister(unitId, registers.frequency);
          frequency = frequency * (registers.frequencyScale || 0.01);
        }

        // Update meter readings
        this.updateMeterReading(meterId, {
          power: power / 1000, // Convert to kW
          totalEnergy: energy,
          voltage,
          current,
          powerFactor,
          frequency,
          status: 'online',
          lastUpdate: new Date().toISOString()
        });

      } catch (error) {
        console.error(`[EnergyMeterManager] Modbus read error for ${meter.name}:`, error.message);
        this.updateMeterReading(meterId, { status: 'error' });
      }
    };

    // Initial read
    await pollMeter();

    // Start polling interval
    const interval = setInterval(pollMeter, meter.pollInterval);
    this.pollingIntervals.set(meterId, interval);
  }

  /**
   * MQTT protocol monitoring
   */
  async startMQTTMonitoring(meterId, meter) {
    const { topicPower, topicEnergy, topicVoltage, topicCurrent, topicStatus } = meter.communication;

    // Subscribe to power topic
    if (topicPower) {
      this.mqttDriver.subscribe(topicPower, (data) => {
        const power = typeof data === 'object' ? (data.power_kw || data.power || 0) : parseFloat(data);
        this.updateMeterReading(meterId, {
          power,
          lastUpdate: new Date().toISOString()
        });
      });
    }

    // Subscribe to energy topic
    if (topicEnergy) {
      this.mqttDriver.subscribe(topicEnergy, (data) => {
        const energy = typeof data === 'object' ? (data.total_kwh || data.energy || 0) : parseFloat(data);
        this.updateMeterReading(meterId, {
          totalEnergy: energy,
          lastUpdate: new Date().toISOString()
        });
      });
    }

    // Subscribe to voltage topic
    if (topicVoltage) {
      this.mqttDriver.subscribe(topicVoltage, (data) => {
        const voltage = typeof data === 'object' ? data.voltage : parseFloat(data);
        this.updateMeterReading(meterId, { voltage });
      });
    }

    // Subscribe to current topic
    if (topicCurrent) {
      this.mqttDriver.subscribe(topicCurrent, (data) => {
        const current = typeof data === 'object' ? data.current : parseFloat(data);
        this.updateMeterReading(meterId, { current });
      });
    }

    // Subscribe to status topic
    if (topicStatus) {
      this.mqttDriver.subscribe(topicStatus, (data) => {
        const status = typeof data === 'object' ? data.status : data;
        this.updateMeterReading(meterId, { status });
      });
    }

    console.log(`[EnergyMeterManager] MQTT monitoring started for ${meter.name}`);
  }

  /**
   * HTTP REST API monitoring
   */
  async startHTTPMonitoring(meterId, meter) {
    const { url, method, headers, authToken } = meter.communication;

    const pollMeter = async () => {
      try {
        const config = {
          method: method || 'GET',
          url,
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...headers
          }
        };

        const response = await axios(config);
        const data = response.data;

        // Parse response based on expected format
        const power = data.power_kw || data.power || data.activePower || 0;
        const energy = data.total_kwh || data.energy || data.totalEnergy || 0;
        const voltage = data.voltage || 0;
        const current = data.current || 0;
        const powerFactor = data.power_factor || data.powerFactor || 1.0;
        const frequency = data.frequency || 50;

        this.updateMeterReading(meterId, {
          power,
          totalEnergy: energy,
          voltage,
          current,
          powerFactor,
          frequency,
          status: 'online',
          lastUpdate: new Date().toISOString()
        });

      } catch (error) {
        console.error(`[EnergyMeterManager] HTTP read error for ${meter.name}:`, error.message);
        this.updateMeterReading(meterId, { status: 'error' });
      }
    };

    // Initial read
    await pollMeter();

    // Start polling interval
    const interval = setInterval(pollMeter, meter.pollInterval);
    this.pollingIntervals.set(meterId, interval);
  }

  /**
   * Update meter reading and notify system
   */
  updateMeterReading(meterId, updates) {
    const meter = this.meters.get(meterId);
    if (!meter) return;

    // Update meter object
    Object.assign(meter, updates);

    // Store current reading
    this.currentReadings.set(meterId, {
      meterId,
      ...updates,
      timestamp: new Date().toISOString()
    });

    // Update state
    this.state.energyMeters.set(meterId, meter);

    // Log to InfluxDB
    if (this.dataLogger && updates.power !== undefined) {
      this.dataLogger.logMeterReading({
        meterId,
        meterName: meter.name,
        meterType: meter.meterType,
        location: meter.location,
        power: updates.power,
        totalEnergy: updates.totalEnergy || meter.totalEnergy,
        voltage: updates.voltage || meter.voltage,
        current: updates.current || meter.current,
        powerFactor: updates.powerFactor || meter.powerFactor,
        timestamp: new Date().toISOString()
      });
    }

    // Broadcast update
    this.state.broadcast({
      type: 'energy_meter.reading',
      data: {
        meterId,
        ...updates
      }
    });
  }

  /**
   * Get current building consumption (sum of all grid meters)
   */
  getBuildingConsumption() {
    let totalPower = 0;
    let totalEnergy = 0;
    let meterCount = 0;

    for (const [_, meter] of this.meters) {
      if (meter.meterType === 'grid' || meter.meterType === 'building') {
        totalPower += meter.currentPower || 0;
        totalEnergy += meter.totalEnergy || 0;
        meterCount++;
      }
    }

    return {
      currentPower: totalPower,
      totalEnergy,
      meterCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get reading from specific meter
   */
  getMeterReading(meterId) {
    return this.currentReadings.get(meterId) || null;
  }

  /**
   * Get all meters
   */
  getAllMeters() {
    return Array.from(this.meters.values());
  }

  /**
   * Get meter by ID
   */
  getMeter(meterId) {
    return this.meters.get(meterId);
  }

  /**
   * Update meter configuration
   */
  async updateMeter(meterId, updates) {
    const meter = this.meters.get(meterId);
    if (!meter) {
      throw new Error('Meter not found');
    }

    // Stop current monitoring
    this.stopMonitoring(meterId);

    // Update configuration
    Object.assign(meter, updates);
    this.state.energyMeters.set(meterId, meter);

    // Restart monitoring with new config
    await this.startMonitoring(meterId, meter);

    this.state.broadcast({
      type: 'energy_meter.updated',
      data: meter
    });

    return meter;
  }

  /**
   * Delete meter
   */
  deleteMeter(meterId) {
    this.stopMonitoring(meterId);
    this.meters.delete(meterId);
    this.state.energyMeters.delete(meterId);
    this.currentReadings.delete(meterId);

    this.state.broadcast({
      type: 'energy_meter.deleted',
      data: { meterId }
    });
  }

  /**
   * Stop monitoring a meter
   */
  stopMonitoring(meterId) {
    const interval = this.pollingIntervals.get(meterId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(meterId);
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.log('[EnergyMeterManager] Shutting down...');

    // Stop all monitoring
    for (const meterId of this.pollingIntervals.keys()) {
      this.stopMonitoring(meterId);
    }

    // Disconnect MQTT
    if (this.mqttDriver) {
      await this.mqttDriver.disconnect();
    }

    console.log('[EnergyMeterManager] Shutdown complete');
  }
}

export default EnergyMeterManager;
