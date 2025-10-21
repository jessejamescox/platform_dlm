/**
 * Demo Mode Service
 *
 * Simulates realistic charging scenarios for demonstration and testing:
 * - Simulated charging stations with realistic behavior
 * - Simulated energy meters with fluctuating readings
 * - Simulated vehicles with SoC progression
 * - Pre-configured scenarios (normal, peak load, load shedding, etc.)
 */

import capabilityManager from './CapabilityManager.js';
import phaseCurrentController from './PhaseCurrentController.js';
import dcfcController from './DCFastChargingController.js';
import siteConstraintsManager from './SiteConstraintsManager.js';
import loadSheddingService from './LoadSheddingService.js';

class DemoModeService {
  constructor() {
    this.enabled = false;
    this.scenario = null;
    this.simulationInterval = null;
    this.simulatedStations = new Map();
    this.simulatedMeters = new Map();
    this.simulatedVehicles = new Map();
    this.timeMultiplier = 1; // Speed up time (1 = real-time, 10 = 10x speed)
    this.startTime = null;

    // References to app state (will be set by initialize)
    this.state = null;
  }

  /**
   * Initialize demo mode with app state
   */
  initialize(state) {
    this.state = state;
    console.log('[Demo] Initialized with app state');
  }

  /**
   * Enable demo mode with a specific scenario
   */
  async enable(scenarioName = 'normal') {
    if (this.enabled) {
      console.log('[Demo] Already enabled, stopping current scenario...');
      await this.disable();
    }

    this.enabled = true;
    this.scenario = scenarioName;
    this.startTime = Date.now();

    console.log(`[Demo] 🎬 Enabling demo mode with scenario: ${scenarioName}`);

    // Load scenario
    await this.loadScenario(scenarioName);

    // Start simulation loop
    this.startSimulation();

    return {
      success: true,
      scenario: scenarioName,
      stations: Array.from(this.simulatedStations.keys()),
      meters: Array.from(this.simulatedMeters.keys()),
      message: `Demo mode enabled with scenario: ${scenarioName}`
    };
  }

  /**
   * Disable demo mode
   */
  async disable() {
    if (!this.enabled) {
      return { success: false, message: 'Demo mode not enabled' };
    }

    console.log('[Demo] 🛑 Disabling demo mode...');

    // Stop simulation
    this.stopSimulation();

    // Clear simulated data
    this.simulatedStations.clear();
    this.simulatedMeters.clear();
    this.simulatedVehicles.clear();

    this.enabled = false;
    this.scenario = null;
    this.startTime = null;

    return {
      success: true,
      message: 'Demo mode disabled'
    };
  }

  /**
   * Load a specific scenario
   */
  async loadScenario(scenarioName) {
    const scenarios = {
      normal: this.scenarioNormal.bind(this),
      peak_load: this.scenarioPeakLoad.bind(this),
      load_shedding: this.scenarioLoadShedding.bind(this),
      phase_imbalance: this.scenarioPhaseImbalance.bind(this),
      thermal_derating: this.scenarioThermalDerating.bind(this),
      v2g_export: this.scenarioV2GExport.bind(this),
      mixed_fleet: this.scenarioMixedFleet.bind(this),
      overnight_charging: this.scenarioOvernightCharging.bind(this)
    };

    const scenarioFn = scenarios[scenarioName];
    if (!scenarioFn) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }

    await scenarioFn();
  }

  /**
   * Scenario: Normal Operations
   * - 5 AC Level 2 stations
   * - 2 DC fast chargers
   * - Normal load (~60% capacity)
   */
  async scenarioNormal() {
    // AC stations
    for (let i = 1; i <= 5; i++) {
      await this.createSimulatedStation({
        id: `demo_ac_${i}`,
        name: `Demo AC Station ${i}`,
        type: 'ac',
        profile: 'ac_level2_three',
        protocol: 'ocpp',
        maxPower: 11,
        priority: 5,
        initialSoC: 20 + Math.random() * 30,
        targetSoC: 80,
        chargingRate: 11 // kW
      });
    }

    // DC fast chargers
    for (let i = 1; i <= 2; i++) {
      await this.createSimulatedStation({
        id: `demo_dcfc_${i}`,
        name: `Demo DCFC ${i}`,
        type: 'dc',
        profile: 'dcfc_ccs_medium',
        protocol: 'ocpp',
        maxPower: 150,
        priority: 7,
        initialSoC: 30 + Math.random() * 20,
        targetSoC: 80,
        chargingRate: 120 // kW
      });
    }

    // Energy meters
    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      name: 'Demo Grid Meter',
      type: 'grid',
      baseLoad: 180, // kW
      variation: 30
    });

    this.createSimulatedMeter({
      id: 'demo_building_meter',
      name: 'Demo Building Meter',
      type: 'building',
      baseLoad: 80,
      variation: 20
    });

    this.createSimulatedMeter({
      id: 'demo_solar_meter',
      name: 'Demo Solar Meter',
      type: 'solar',
      baseLoad: 50,
      variation: 30,
      pattern: 'solar' // Follows solar curve
    });
  }

  /**
   * Scenario: Peak Load
   * - All stations active
   * - High building consumption
   * - Minimal solar
   */
  async scenarioPeakLoad() {
    // 8 AC stations all charging
    for (let i = 1; i <= 8; i++) {
      await this.createSimulatedStation({
        id: `demo_ac_${i}`,
        name: `Demo AC Station ${i}`,
        type: 'ac',
        profile: 'ac_level2_three',
        maxPower: 11,
        priority: Math.floor(Math.random() * 10) + 1,
        initialSoC: 20,
        targetSoC: 80,
        chargingRate: 11
      });
    }

    // 3 DC fast chargers
    for (let i = 1; i <= 3; i++) {
      await this.createSimulatedStation({
        id: `demo_dcfc_${i}`,
        name: `Demo DCFC ${i}`,
        type: 'dc',
        profile: 'dcfc_ccs_high',
        maxPower: 350,
        priority: 8,
        initialSoC: 25,
        targetSoC: 85,
        chargingRate: 300
      });
    }

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 250,
      variation: 20
    });

    this.createSimulatedMeter({
      id: 'demo_building_meter',
      type: 'building',
      baseLoad: 150,
      variation: 30
    });

    this.createSimulatedMeter({
      id: 'demo_solar_meter',
      type: 'solar',
      baseLoad: 10, // Minimal solar
      variation: 5
    });
  }

  /**
   * Scenario: Load Shedding Demo
   * - Gradually increase load to trigger shedding levels
   */
  async scenarioLoadShedding() {
    // Stations with different priorities
    const priorities = [1, 3, 5, 7, 9];
    for (let i = 0; i < 5; i++) {
      await this.createSimulatedStation({
        id: `demo_ac_${i + 1}`,
        name: `Demo AC Station ${i + 1} (Priority ${priorities[i]})`,
        type: 'ac',
        profile: 'ac_level2_three',
        maxPower: 11,
        priority: priorities[i],
        initialSoC: 20,
        targetSoC: 80,
        chargingRate: 11
      });
    }

    // Meter with increasing load
    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 200,
      variation: 50,
      pattern: 'increasing' // Gradually increases to trigger shedding
    });

    this.createSimulatedMeter({
      id: 'demo_building_meter',
      type: 'building',
      baseLoad: 120,
      variation: 20,
      pattern: 'increasing'
    });
  }

  /**
   * Scenario: Phase Imbalance
   * - Single-phase AC chargers creating imbalance
   */
  async scenarioPhaseImbalance() {
    // 6 single-phase AC stations (2 per phase)
    const phases = ['A', 'B', 'C'];
    for (let i = 0; i < 6; i++) {
      await this.createSimulatedStation({
        id: `demo_ac_${i + 1}`,
        name: `Demo AC Station ${i + 1} (Phase ${phases[i % 3]})`,
        type: 'ac',
        profile: 'ac_level2_single',
        maxPower: 7.4,
        priority: 5,
        initialSoC: 30,
        targetSoC: 80,
        chargingRate: 7.4,
        phaseAssignment: phases[i % 3]
      });
    }

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 150,
      variation: 20
    });
  }

  /**
   * Scenario: Thermal Derating
   * - DC chargers with increasing temperature
   */
  async scenarioThermalDerating() {
    await this.createSimulatedStation({
      id: 'demo_dcfc_1',
      name: 'Demo DCFC 1 (Hot)',
      type: 'dc',
      profile: 'dcfc_ccs_high',
      maxPower: 350,
      priority: 8,
      initialSoC: 20,
      targetSoC: 90,
      chargingRate: 300,
      initialTemp: 65,
      tempIncrease: 0.5 // °C per minute
    });

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 100,
      variation: 10
    });
  }

  /**
   * Scenario: V2G Export
   * - Vehicles exporting power back to grid
   */
  async scenarioV2GExport() {
    await this.createSimulatedStation({
      id: 'demo_v2g_1',
      name: 'Demo V2G Station 1',
      type: 'dc',
      profile: 'dcfc_ccs_high',
      maxPower: 150,
      priority: 9,
      initialSoC: 85,
      targetSoC: 80, // Exporting to reach lower SoC
      chargingRate: -50, // Negative = exporting
      v2gCapable: true
    });

    await this.createSimulatedStation({
      id: 'demo_v2g_2',
      name: 'Demo V2G Station 2',
      type: 'dc',
      profile: 'dcfc_ccs_high',
      maxPower: 150,
      priority: 9,
      initialSoC: 90,
      targetSoC: 85,
      chargingRate: -75,
      v2gCapable: true
    });

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 200,
      variation: 20
    });
  }

  /**
   * Scenario: Mixed Fleet
   * - Variety of charger types and vehicles
   */
  async scenarioMixedFleet() {
    // AC Level 2
    await this.createSimulatedStation({
      id: 'demo_ac_1',
      name: 'Nissan Leaf (AC)',
      type: 'ac',
      profile: 'ac_level2_single',
      maxPower: 6.6,
      priority: 5,
      initialSoC: 25,
      targetSoC: 80,
      chargingRate: 6.6
    });

    // AC Level 2 Three-Phase
    await this.createSimulatedStation({
      id: 'demo_ac_2',
      name: 'Tesla Model 3 (AC)',
      type: 'ac',
      profile: 'ac_level2_three',
      maxPower: 11,
      priority: 6,
      initialSoC: 30,
      targetSoC: 90,
      chargingRate: 11
    });

    // DC Fast - CCS
    await this.createSimulatedStation({
      id: 'demo_dcfc_1',
      name: 'Ford F-150 Lightning (DC)',
      type: 'dc',
      profile: 'dcfc_ccs_high',
      maxPower: 150,
      priority: 8,
      initialSoC: 20,
      targetSoC: 80,
      chargingRate: 120
    });

    // DC Fast - CHAdeMO
    await this.createSimulatedStation({
      id: 'demo_chademo_1',
      name: 'Nissan Ariya (CHAdeMO)',
      type: 'dc',
      profile: 'dcfc_chademo',
      maxPower: 62.5,
      priority: 7,
      initialSoC: 35,
      targetSoC: 85,
      chargingRate: 50
    });

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 180,
      variation: 25
    });

    this.createSimulatedMeter({
      id: 'demo_solar_meter',
      type: 'solar',
      baseLoad: 40,
      variation: 20,
      pattern: 'solar'
    });
  }

  /**
   * Scenario: Overnight Charging
   * - Lower priority, slower charging
   */
  async scenarioOvernightCharging() {
    for (let i = 1; i <= 6; i++) {
      await this.createSimulatedStation({
        id: `demo_ac_${i}`,
        name: `Demo Overnight AC ${i}`,
        type: 'ac',
        profile: 'ac_level2_three',
        maxPower: 11,
        priority: 3,
        initialSoC: 15,
        targetSoC: 100,
        chargingRate: 7.4 // Slower charging
      });
    }

    this.createSimulatedMeter({
      id: 'demo_grid_meter',
      type: 'grid',
      baseLoad: 100,
      variation: 15
    });

    this.createSimulatedMeter({
      id: 'demo_building_meter',
      type: 'building',
      baseLoad: 30, // Low overnight building load
      variation: 10
    });
  }

  /**
   * Create simulated charging station
   */
  async createSimulatedStation(config) {
    const station = {
      ...config,
      status: 'charging',
      currentPower: 0,
      currentSoC: config.initialSoC,
      temperature: config.initialTemp || 25,
      sessionStart: Date.now(),
      energyDelivered: 0,
      sessionEnergy: 0,
      user: null,
      vehicle: null,
      rfidCard: null,
      location: 'Demo Lot',
      zone: 'demo',
      scheduledCharging: false,
      requestedPower: config.maxPower,
      minPower: config.minPower || 3.7,
      manufacturer: 'Demo',
      model: `${config.type.toUpperCase()} Demo`,
      firmwareVersion: '1.0.0-demo',
      serialNumber: `DEMO-${config.id}`,
      communication: {}
    };

    // Discover capabilities
    await capabilityManager.discoverCapabilities(
      config.id,
      config.protocol,
      { profile: config.profile }
    );

    this.simulatedStations.set(config.id, station);

    // Register with state.stations if available
    if (this.state && this.state.stations) {
      this.state.stations.set(config.id, station);
      console.log(`[Demo] Registered station with state: ${config.name}`);

      // Broadcast station registration
      if (this.state.broadcast) {
        this.state.broadcast({
          type: 'station.registered',
          data: station
        });
      }
    }

    console.log(`[Demo] Created simulated station: ${config.name}`);
  }

  /**
   * Create simulated energy meter
   */
  createSimulatedMeter(config) {
    const meter = {
      ...config,
      currentPower: config.baseLoad,
      totalEnergy: 0,
      pattern: config.pattern || 'random'
    };

    this.simulatedMeters.set(config.id, meter);

    console.log(`[Demo] Created simulated meter: ${config.name}`);
  }

  /**
   * Start simulation loop
   */
  startSimulation() {
    const updateInterval = 2000 / this.timeMultiplier; // 2s real-time

    this.simulationInterval = setInterval(() => {
      this.updateSimulation();
    }, updateInterval);

    console.log(`[Demo] Simulation started (update interval: ${updateInterval}ms)`);
  }

  /**
   * Stop simulation loop
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Update simulation state
   */
  updateSimulation() {
    const deltaTime = (2 * this.timeMultiplier) / 60; // Minutes elapsed

    // Update stations
    for (const [id, station] of this.simulatedStations.entries()) {
      this.updateStation(station, deltaTime);
    }

    // Update meters
    for (const [id, meter] of this.simulatedMeters.entries()) {
      this.updateMeter(meter, deltaTime);
    }

    // Update site constraints
    this.updateSiteConstraints();
  }

  /**
   * Update simulated station
   */
  updateStation(station, deltaTime) {
    const capabilities = capabilityManager.getCapabilities(station.id);
    if (!capabilities) return;

    // Calculate power based on SoC (with taper)
    let targetPower = station.chargingRate;

    // Apply taper curve for high SoC
    if (station.currentSoC > 80) {
      const taperFactor = 1 - ((station.currentSoC - 80) / 20) * 0.7;
      targetPower *= taperFactor;
    }

    // Thermal derating
    if (station.tempIncrease) {
      station.temperature += station.tempIncrease * deltaTime;

      if (station.temperature > 70) {
        const derating = Math.min(0.5, (station.temperature - 70) / 20);
        targetPower *= (1 - derating);
      }
    }

    // Update current power (with some variation)
    station.currentPower = targetPower * (0.95 + Math.random() * 0.1);

    // Update SoC
    const batteryCapacity = 60; // kWh (assumed)
    const energyAdded = (station.currentPower / 60) * deltaTime; // kWh
    station.currentSoC += (energyAdded / batteryCapacity) * 100;
    station.energyDelivered += energyAdded;
    station.sessionEnergy = station.energyDelivered;

    // Clamp SoC
    station.currentSoC = Math.max(0, Math.min(100, station.currentSoC));

    // Update controllers
    if (station.type === 'ac') {
      const phases = phaseCurrentController.powerToPhaseCurrents(station.id, station.currentPower);
      phaseCurrentController.updatePhaseReadings(station.id, phases);
    } else if (station.type === 'dc') {
      dcfcController.updateMeasurements(station.id, {
        power: station.currentPower,
        current: (station.currentPower * 1000) / 400, // Assume 400V
        voltage: 400,
        temperature: station.temperature,
        soc: Math.round(station.currentSoC)
      });
    }

    // Stop if target SoC reached
    if (station.currentSoC >= station.targetSoC) {
      station.status = 'ready';
      station.currentPower = 0;
    }

    // Update state.stations if available
    if (this.state && this.state.stations) {
      this.state.stations.set(station.id, station);

      // Broadcast station update via WebSocket
      if (this.state.broadcast) {
        this.state.broadcast({
          type: 'station.updated',
          data: station
        });
      }
    }
  }

  /**
   * Update simulated meter
   */
  updateMeter(meter, deltaTime) {
    switch (meter.pattern) {
      case 'solar':
        // Solar follows sine curve (peak at noon)
        const elapsedHours = ((Date.now() - this.startTime) / 1000 / 3600) * this.timeMultiplier;
        const hourOfDay = (elapsedHours % 24);
        const solarFactor = Math.max(0, Math.sin((hourOfDay - 6) / 12 * Math.PI));
        meter.currentPower = meter.baseLoad * solarFactor + (Math.random() - 0.5) * meter.variation;
        break;

      case 'increasing':
        // Gradually increase
        meter.currentPower += meter.variation * 0.1 * deltaTime;
        meter.currentPower = Math.min(meter.currentPower, meter.baseLoad + meter.variation * 2);
        break;

      case 'random':
      default:
        // Random variation around base load
        meter.currentPower = meter.baseLoad + (Math.random() - 0.5) * meter.variation;
        break;
    }

    // Update total energy
    meter.totalEnergy += (meter.currentPower / 60) * deltaTime;

    // Update site constraints
    if (meter.type === 'grid') {
      siteConstraintsManager.updateServiceMeasurements({
        power: meter.currentPower,
        current: { A: 240, B: 245, C: 250 },
        voltage: { A: 480, B: 478, C: 482 },
        powerFactor: 0.95,
        frequency: 60.0
      });
    }

    // Update state.energyMeters if available
    if (this.state && this.state.energyMeters) {
      this.state.energyMeters.set(meter.id, meter);

      // Broadcast meter update via WebSocket
      if (this.state.broadcast) {
        this.state.broadcast({
          type: 'meter.updated',
          data: meter
        });
      }
    }
  }

  /**
   * Update site constraints
   */
  updateSiteConstraints() {
    // Calculate total charging load
    let totalChargingLoad = 0;
    for (const station of this.simulatedStations.values()) {
      totalChargingLoad += station.currentPower;
    }

    // Get building load
    const buildingMeter = this.simulatedMeters.get('demo_building_meter');
    const buildingLoad = buildingMeter?.currentPower || 0;

    // Get grid capacity (assumed 500kW)
    const gridCapacity = 500;

    // Evaluate load shedding
    const currentLoad = totalChargingLoad + buildingLoad;
    const loadRatio = currentLoad / gridCapacity;

    console.log(`[Demo] Load: ${currentLoad.toFixed(1)}kW / ${gridCapacity}kW (${(loadRatio * 100).toFixed(1)}%)`);
  }

  /**
   * Set time multiplier
   */
  setTimeMultiplier(multiplier) {
    this.timeMultiplier = Math.max(1, Math.min(100, multiplier));

    if (this.enabled) {
      // Restart simulation with new interval
      this.stopSimulation();
      this.startSimulation();
    }

    return {
      success: true,
      timeMultiplier: this.timeMultiplier
    };
  }

  /**
   * Get demo status
   */
  getStatus() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: 'Demo mode not enabled'
      };
    }

    const stations = {};
    for (const [id, station] of this.simulatedStations.entries()) {
      stations[id] = {
        name: station.name,
        type: station.type,
        status: station.status,
        currentPower: station.currentPower.toFixed(1) + 'kW',
        soc: Math.round(station.currentSoC) + '%',
        targetSoC: station.targetSoC + '%',
        temperature: station.temperature?.toFixed(1) + '°C',
        energyDelivered: station.energyDelivered.toFixed(2) + 'kWh'
      };
    }

    const meters = {};
    for (const [id, meter] of this.simulatedMeters.entries()) {
      meters[id] = {
        name: meter.name,
        type: meter.type,
        currentPower: meter.currentPower.toFixed(1) + 'kW',
        totalEnergy: meter.totalEnergy.toFixed(2) + 'kWh'
      };
    }

    return {
      enabled: true,
      scenario: this.scenario,
      timeMultiplier: this.timeMultiplier,
      elapsedTime: Math.round((Date.now() - this.startTime) / 1000) + 's',
      stations,
      meters
    };
  }

  /**
   * Get available scenarios
   */
  getScenarios() {
    return {
      normal: {
        name: 'Normal Operations',
        description: '5 AC + 2 DC chargers, ~60% capacity, normal building load'
      },
      peak_load: {
        name: 'Peak Load',
        description: '8 AC + 3 DC chargers, high building load, minimal solar'
      },
      load_shedding: {
        name: 'Load Shedding Demo',
        description: 'Gradually increasing load to trigger shedding levels'
      },
      phase_imbalance: {
        name: 'Phase Imbalance',
        description: '6 single-phase chargers creating phase imbalance'
      },
      thermal_derating: {
        name: 'Thermal Derating',
        description: 'DC charger with increasing temperature and derating'
      },
      v2g_export: {
        name: 'V2G Export',
        description: 'Vehicles exporting power back to grid'
      },
      mixed_fleet: {
        name: 'Mixed Fleet',
        description: 'Variety of vehicles: Leaf, Tesla, F-150, Ariya'
      },
      overnight_charging: {
        name: 'Overnight Charging',
        description: '6 AC chargers, lower priority, slow charging'
      }
    };
  }
}

// Singleton instance
const demoModeService = new DemoModeService();

export default demoModeService;
