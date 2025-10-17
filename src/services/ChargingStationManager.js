/**
 * ChargingStationManager - Manages charging stations and their communication
 */

import { v4 as uuidv4 } from 'uuid';
import { ModbusDriver } from '../protocols/ModbusDriver.js';
import { MQTTDriver } from '../protocols/MQTTDriver.js';

export class ChargingStationManager {
  constructor(state) {
    this.state = state;
    this.drivers = new Map();
    this.pollingIntervals = new Map();
  }

  async initialize() {
    console.log('🔌 Initializing Charging Station Manager...');

    // Initialize protocol drivers
    this.modbusDriver = new ModbusDriver();
    this.mqttDriver = new MQTTDriver(process.env.MQTT_BROKER_URL);

    await this.mqttDriver.connect();

    console.log('✅ Charging Station Manager initialized');
  }

  /**
   * Register a new charging station
   */
  async registerStation(stationData) {
    const station = {
      id: uuidv4(),
      name: stationData.name,
      type: stationData.type || 'ac', // ac or dc
      zone: stationData.zone || 'default',
      location: stationData.location || '',

      // Power specifications
      maxPower: stationData.maxPower || this.state.config.maxChargingPowerPerStation,
      minPower: stationData.minPower || this.state.config.minChargingPower,
      currentPower: 0,
      requestedPower: 0,

      // Status
      status: 'offline', // offline, ready, charging, error, unavailable
      online: false,

      // Priority
      priority: stationData.priority || 5, // 1-10, higher = more important
      scheduledCharging: false,

      // User/Vehicle info
      user: null,
      vehicle: null,
      rfidCard: null,

      // Communication
      protocol: stationData.protocol, // modbus or mqtt
      communication: stationData.communication,

      // Energy metrics
      energyDelivered: 0, // Total kWh delivered
      sessionEnergy: 0, // Current session kWh
      chargingStartedAt: null,
      lastUpdate: new Date().toISOString(),

      // Metadata
      manufacturer: stationData.manufacturer || '',
      model: stationData.model || '',
      firmwareVersion: stationData.firmwareVersion || '',
      serialNumber: stationData.serialNumber || '',

      createdAt: new Date().toISOString()
    };

    // Add to state
    this.state.stations.set(station.id, station);

    // Initialize communication
    await this.initializeStationCommunication(station);

    // Save state
    await this.state.persistence.save(this.state);

    // Broadcast update
    this.state.broadcast({
      type: 'station.registered',
      data: station
    });

    console.log(`✅ Registered station: ${station.name} (${station.id})`);

    return station;
  }

  /**
   * Initialize communication with a station based on protocol
   */
  async initializeStationCommunication(station) {
    try {
      if (station.protocol === 'modbus') {
        await this.initializeModbusStation(station);
      } else if (station.protocol === 'mqtt') {
        await this.initializeMQTTStation(station);
      }

      station.online = true;
      station.status = 'ready';

      // Start polling for status updates
      this.startStationPolling(station);

    } catch (error) {
      console.error(`Failed to initialize station ${station.id}:`, error.message);
      station.online = false;
      station.status = 'error';
    }
  }

  /**
   * Initialize Modbus station
   */
  async initializeModbusStation(station) {
    const { host, port, unitId, registers } = station.communication;

    await this.modbusDriver.connect(host, port);

    // Read initial status
    const status = await this.modbusDriver.readRegister(host, port, unitId, registers.status);
    const power = await this.modbusDriver.readRegister(host, port, unitId, registers.power);

    station.currentPower = power / 10; // Assume register is in 0.1kW units
    this.updateStationStatus(station, status);
  }

  /**
   * Initialize MQTT station
   */
  async initializeMQTTStation(station) {
    const { topics } = station.communication;

    // Subscribe to station topics
    await this.mqttDriver.subscribe(topics.status, (message) => {
      this.handleMQTTStatus(station, message);
    });

    await this.mqttDriver.subscribe(topics.power, (message) => {
      this.handleMQTTPower(station, message);
    });

    if (topics.energy) {
      await this.mqttDriver.subscribe(topics.energy, (message) => {
        this.handleMQTTEnergy(station, message);
      });
    }
  }

  /**
   * Handle MQTT status message
   */
  handleMQTTStatus(station, message) {
    const data = JSON.parse(message);
    this.updateStationStatus(station, data.status);

    if (data.user) {
      station.user = data.user;
    }

    if (data.rfidCard) {
      station.rfidCard = data.rfidCard;
    }

    this.state.broadcast({
      type: 'station.updated',
      data: {
        id: station.id,
        status: station.status,
        user: station.user
      }
    });
  }

  /**
   * Handle MQTT power message
   */
  handleMQTTPower(station, message) {
    const data = JSON.parse(message);
    station.currentPower = data.power || 0;
    station.lastUpdate = new Date().toISOString();
  }

  /**
   * Handle MQTT energy message
   */
  handleMQTTEnergy(station, message) {
    const data = JSON.parse(message);
    station.sessionEnergy = data.sessionEnergy || 0;
    station.energyDelivered = data.totalEnergy || 0;
  }

  /**
   * Update station status
   */
  updateStationStatus(station, statusCode) {
    const statusMap = {
      0: 'offline',
      1: 'ready',
      2: 'charging',
      3: 'error',
      4: 'unavailable'
    };

    const newStatus = statusMap[statusCode] || 'offline';

    if (newStatus === 'charging' && station.status !== 'charging') {
      // Charging started
      station.chargingStartedAt = new Date().toISOString();
      station.sessionEnergy = 0;
    } else if (newStatus !== 'charging' && station.status === 'charging') {
      // Charging stopped
      station.chargingStartedAt = null;
    }

    station.status = newStatus;
    station.online = newStatus !== 'offline';
  }

  /**
   * Start polling a station for updates
   */
  startStationPolling(station) {
    if (station.protocol === 'mqtt') {
      return; // MQTT uses push, no polling needed
    }

    const interval = setInterval(async () => {
      try {
        await this.pollStation(station);
      } catch (error) {
        console.error(`Error polling station ${station.id}:`, error.message);
        station.online = false;
        station.status = 'error';
      }
    }, 10000); // Poll every 10 seconds

    this.pollingIntervals.set(station.id, interval);
  }

  /**
   * Poll a Modbus station for updates
   */
  async pollStation(station) {
    if (station.protocol !== 'modbus') return;

    const { host, port, unitId, registers } = station.communication;

    // Read status
    const status = await this.modbusDriver.readRegister(host, port, unitId, registers.status);
    this.updateStationStatus(station, status);

    // Read current power
    const power = await this.modbusDriver.readRegister(host, port, unitId, registers.power);
    station.currentPower = power / 10;

    // Read energy if available
    if (registers.energy) {
      const energy = await this.modbusDriver.readRegister(host, port, unitId, registers.energy);
      station.sessionEnergy = energy / 100; // Assume register is in 0.01kWh units
    }

    station.lastUpdate = new Date().toISOString();
  }

  /**
   * Set charging power for a station
   */
  async setPower(stationId, power) {
    const station = this.state.stations.get(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    if (!station.online) {
      throw new Error(`Station ${stationId} is offline`);
    }

    // Clamp power to station limits
    const clampedPower = Math.max(0, Math.min(power, station.maxPower));

    if (station.protocol === 'modbus') {
      await this.setPowerModbus(station, clampedPower);
    } else if (station.protocol === 'mqtt') {
      await this.setPowerMQTT(station, clampedPower);
    }

    station.requestedPower = clampedPower;
    station.lastUpdate = new Date().toISOString();

    // Log to InfluxDB
    if (this.state.dataLogger) {
      this.state.dataLogger.logStationPower(stationId, clampedPower);
    }
  }

  /**
   * Set power via Modbus
   */
  async setPowerModbus(station, power) {
    const { host, port, unitId, registers } = station.communication;

    // Convert power to register value (0.1kW units)
    const registerValue = Math.round(power * 10);

    await this.modbusDriver.writeRegister(
      host,
      port,
      unitId,
      registers.powerSetpoint || registers.power,
      registerValue
    );
  }

  /**
   * Set power via MQTT
   */
  async setPowerMQTT(station, power) {
    const { topics } = station.communication;

    await this.mqttDriver.publish(topics.control, JSON.stringify({
      command: 'set_power',
      power: power,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Update station
   */
  async updateStation(stationId, updates) {
    const station = this.state.stations.get(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Update allowed fields
    const allowedFields = ['name', 'zone', 'location', 'priority', 'maxPower', 'minPower'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        station[field] = updates[field];
      }
    }

    station.lastUpdate = new Date().toISOString();

    await this.state.persistence.save(this.state);

    this.state.broadcast({
      type: 'station.updated',
      data: station
    });

    return station;
  }

  /**
   * Delete station
   */
  async deleteStation(stationId) {
    const station = this.state.stations.get(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Stop polling
    const interval = this.pollingIntervals.get(stationId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(stationId);
    }

    // Remove from state
    this.state.stations.delete(stationId);

    await this.state.persistence.save(this.state);

    this.state.broadcast({
      type: 'station.deleted',
      data: { id: stationId }
    });

    console.log(`🗑️  Deleted station: ${station.name} (${stationId})`);
  }

  /**
   * Start charging session (e.g., via RFID)
   */
  async startChargingSession(stationId, user) {
    const station = this.state.stations.get(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    station.user = {
      id: user.id,
      name: user.name,
      rfidCard: user.rfidCard,
      priorityClass: user.priorityClass || 5
    };

    station.status = 'charging';
    station.chargingStartedAt = new Date().toISOString();
    station.sessionEnergy = 0;

    this.state.broadcast({
      type: 'station.session.started',
      data: {
        stationId: station.id,
        user: station.user,
        timestamp: station.chargingStartedAt
      }
    });

    // Trigger load rebalancing
    if (this.state.loadManager) {
      this.state.loadManager.balanceLoad();
    }

    return station;
  }

  /**
   * Stop charging session
   */
  async stopChargingSession(stationId) {
    const station = this.state.stations.get(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    const sessionData = {
      stationId: station.id,
      user: station.user,
      startTime: station.chargingStartedAt,
      endTime: new Date().toISOString(),
      energyDelivered: station.sessionEnergy,
      duration: station.chargingStartedAt
        ? (new Date() - new Date(station.chargingStartedAt)) / 1000 / 60
        : 0
    };

    station.user = null;
    station.status = 'ready';
    station.chargingStartedAt = null;

    await this.setPower(stationId, 0);

    this.state.broadcast({
      type: 'station.session.stopped',
      data: sessionData
    });

    // Trigger load rebalancing
    if (this.state.loadManager) {
      this.state.loadManager.balanceLoad();
    }

    return sessionData;
  }

  /**
   * Get all stations
   */
  getAllStations() {
    return Array.from(this.state.stations.values());
  }

  /**
   * Get station by ID
   */
  getStation(stationId) {
    return this.state.stations.get(stationId);
  }

  async shutdown() {
    // Stop all polling
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }

    // Disconnect protocols
    if (this.mqttDriver) {
      await this.mqttDriver.disconnect();
    }

    console.log('🔌 Charging Station Manager shut down');
  }
}
