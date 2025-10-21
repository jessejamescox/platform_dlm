/**
 * DC Fast Charging Power/Current Controller
 *
 * Manages DC fast charging with:
 * - Power and current setpoint control
 * - Ramp rate limiting (dP/dt, dI/dt)
 * - Vehicle taper curve support
 * - Thermal derating monitoring
 * - Bidirectional (V2G) support
 */

import capabilityManager from './CapabilityManager.js';
import auditLogger from './AuditLogger.js';

class DCFastChargingController {
  constructor() {
    this.setpoints = new Map(); // station -> { power, current, voltage }
    this.measurements = new Map(); // station -> actual readings
    this.taperCurves = new Map(); // station -> vehicle taper curve
    this.thermalState = new Map(); // station -> thermal derating info
    this.rampingTimers = new Map(); // station -> ramping interval
  }

  /**
   * Set DC power limit
   */
  async setPowerLimit(stationId, targetPower, options = {}) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities) {
      throw new Error(`Capabilities not discovered for station ${stationId}`);
    }

    if (capabilities.type !== 'dc') {
      throw new Error(`Station ${stationId} is not a DC fast charger`);
    }

    // Validate power limit
    const validation = this.validatePowerLimit(targetPower, capabilities);
    if (!validation.valid) {
      throw new Error(`Invalid power limit: ${validation.errors.join(', ')}`);
    }

    // Get current setpoint
    const current = this.setpoints.get(stationId) || { power: 0, timestamp: Date.now() };

    // Check if ramping is needed
    const deltaTime = Date.now() - current.timestamp;
    const rampLimited = this.applyRampLimit(
      stationId,
      current.power,
      targetPower,
      deltaTime,
      capabilities
    );

    // Apply thermal derating if active
    const derated = this.applyThermalDerating(stationId, rampLimited);

    // Apply vehicle taper curve if known
    const tapered = this.applyVehicleTaper(stationId, derated);

    // Store setpoint
    const newSetpoint = {
      power: tapered,
      targetPower, // Original target before ramping/derating
      timestamp: Date.now(),
      source: options.source || 'manual',
      ramped: rampLimited !== targetPower,
      derated: derated !== rampLimited,
      tapered: tapered !== derated
    };

    this.setpoints.set(stationId, newSetpoint);

    // Audit log
    auditLogger.logStationControl(
      options.actor || { type: 'system', id: 'dcfc_controller' },
      stationId,
      'set_dc_power',
      { power: tapered, targetPower }
    );

    console.log(`[DCFC] Set power limit for station ${stationId}: ${tapered.toFixed(1)}kW (target: ${targetPower.toFixed(1)}kW)`);

    // Start continuous ramping if not at target
    if (newSetpoint.ramped && options.autoRamp !== false) {
      this.startRamping(stationId, targetPower, capabilities);
    }

    return {
      success: true,
      stationId,
      power: tapered,
      targetPower,
      ramped: newSetpoint.ramped,
      derated: newSetpoint.derated,
      tapered: newSetpoint.tapered
    };
  }

  /**
   * Set DC current limit
   */
  async setCurrentLimit(stationId, targetCurrent, options = {}) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities || capabilities.type !== 'dc') {
      throw new Error(`Station ${stationId} is not a DC fast charger`);
    }

    // Convert to power (P = V × I)
    const measurements = this.measurements.get(stationId);
    const voltage = measurements?.voltage || capabilities.voltage.nominal;
    const targetPower = (voltage * targetCurrent) / 1000; // kW

    return this.setPowerLimit(stationId, targetPower, options);
  }

  /**
   * Validate power limit
   */
  validatePowerLimit(power, capabilities) {
    const errors = [];

    if (power < 0) {
      errors.push('Power cannot be negative');
    }

    if (power > capabilities.power.max) {
      errors.push(`${power}kW exceeds maximum ${capabilities.power.max}kW`);
    }

    if (power > 0 && power < capabilities.power.min) {
      errors.push(`${power}kW below minimum ${capabilities.power.min}kW`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply ramp rate limiting
   */
  applyRampLimit(stationId, currentPower, targetPower, deltaTime, capabilities) {
    if (!capabilities.rampRate) {
      return targetPower;
    }

    const maxRatePerSecond = capabilities.rampRate.power; // kW/s
    const maxChange = maxRatePerSecond * (deltaTime / 1000);

    const delta = targetPower - currentPower;

    if (Math.abs(delta) <= maxChange) {
      return targetPower;
    }

    const rampedPower = currentPower + Math.sign(delta) * maxChange;

    console.log(`[DCFC] Ramp limiting station ${stationId}: ${currentPower.toFixed(1)}kW → ${rampedPower.toFixed(1)}kW (target: ${targetPower.toFixed(1)}kW, rate: ${maxRatePerSecond}kW/s)`);

    return rampedPower;
  }

  /**
   * Apply thermal derating
   */
  applyThermalDerating(stationId, power) {
    const thermal = this.thermalState.get(stationId);

    if (!thermal || !thermal.derating) {
      return power;
    }

    const derated = power * (1 - thermal.derating);

    console.log(`[DCFC] Thermal derating station ${stationId}: ${power.toFixed(1)}kW → ${derated.toFixed(1)}kW (${(thermal.derating * 100).toFixed(0)}% reduction, temp: ${thermal.temperature}°C)`);

    return derated;
  }

  /**
   * Apply vehicle taper curve
   */
  applyVehicleTaper(stationId, power) {
    const taper = this.taperCurves.get(stationId);

    if (!taper || !taper.enabled) {
      return power;
    }

    // Vehicle taper typically reduces power as SoC increases
    // For now, use a simple linear taper above threshold
    if (taper.soc >= taper.taperStartSoC) {
      const taperFactor = 1 - ((taper.soc - taper.taperStartSoC) / (100 - taper.taperStartSoC)) * taper.taperRate;
      const taperedPower = power * Math.max(0.1, taperFactor);

      if (taperedPower < power) {
        console.log(`[DCFC] Vehicle taper station ${stationId}: ${power.toFixed(1)}kW → ${taperedPower.toFixed(1)}kW (SoC: ${taper.soc}%)`);
        return taperedPower;
      }
    }

    return power;
  }

  /**
   * Start continuous ramping to target
   */
  startRamping(stationId, targetPower, capabilities) {
    // Clear existing ramping timer
    this.stopRamping(stationId);

    const updateInterval = capabilities.updateInterval?.typical || 1000;

    const timer = setInterval(async () => {
      const current = this.setpoints.get(stationId);
      if (!current) {
        this.stopRamping(stationId);
        return;
      }

      // Check if target reached
      if (Math.abs(current.power - targetPower) < 0.5) {
        console.log(`[DCFC] Ramping complete for station ${stationId}: ${current.power.toFixed(1)}kW`);
        this.stopRamping(stationId);
        return;
      }

      // Continue ramping
      await this.setPowerLimit(stationId, targetPower, { autoRamp: false });
    }, updateInterval);

    this.rampingTimers.set(stationId, timer);
    console.log(`[DCFC] Started ramping for station ${stationId} (interval: ${updateInterval}ms)`);
  }

  /**
   * Stop ramping for a station
   */
  stopRamping(stationId) {
    const timer = this.rampingTimers.get(stationId);
    if (timer) {
      clearInterval(timer);
      this.rampingTimers.delete(stationId);
    }
  }

  /**
   * Update measurements from charger
   */
  updateMeasurements(stationId, measurements) {
    this.measurements.set(stationId, {
      ...measurements,
      timestamp: Date.now()
    });

    // Check for thermal derating
    if (measurements.temperature) {
      this.updateThermalState(stationId, measurements.temperature);
    }
  }

  /**
   * Update thermal state and calculate derating
   */
  updateThermalState(stationId, temperature) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    // Thermal derating thresholds (example values)
    const thresholds = {
      normal: 60,      // °C - no derating
      warning: 70,     // °C - 20% derating
      critical: 80,    // °C - 50% derating
      emergency: 90    // °C - 80% derating
    };

    let derating = 0;
    let level = 'normal';

    if (temperature >= thresholds.emergency) {
      derating = 0.80;
      level = 'emergency';
    } else if (temperature >= thresholds.critical) {
      derating = 0.50;
      level = 'critical';
    } else if (temperature >= thresholds.warning) {
      derating = 0.20;
      level = 'warning';
    }

    const previous = this.thermalState.get(stationId);
    const changed = !previous || previous.level !== level;

    this.thermalState.set(stationId, {
      temperature,
      derating,
      level,
      timestamp: Date.now()
    });

    if (changed && level !== 'normal') {
      console.warn(`[DCFC] Thermal derating active on station ${stationId}: ${level} (${temperature}°C, ${(derating * 100).toFixed(0)}% reduction)`);

      auditLogger.logStateChange(
        `dcfc_thermal_${stationId}`,
        previous?.level || 'normal',
        level,
        `Temperature: ${temperature}°C`
      );
    }
  }

  /**
   * Set vehicle taper curve
   */
  setVehicleTaper(stationId, config) {
    this.taperCurves.set(stationId, {
      enabled: config.enabled !== false,
      soc: config.soc || 0,
      taperStartSoC: config.taperStartSoC || 80, // Start tapering at 80%
      taperRate: config.taperRate || 0.7, // Reduce by 70% from 80% to 100%
      timestamp: Date.now()
    });

    console.log(`[DCFC] Set vehicle taper for station ${stationId}:`, this.taperCurves.get(stationId));
  }

  /**
   * Update vehicle SoC
   */
  updateVehicleSoC(stationId, soc) {
    const taper = this.taperCurves.get(stationId);
    if (taper) {
      taper.soc = soc;
      taper.timestamp = Date.now();
    }
  }

  /**
   * Enable bidirectional (V2G) mode
   */
  async enableBidirectional(stationId, exportPower, options = {}) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities?.features?.bidirectional) {
      throw new Error(`Station ${stationId} does not support bidirectional charging`);
    }

    // Negative power indicates export (V2G)
    return this.setPowerLimit(stationId, -Math.abs(exportPower), {
      ...options,
      source: 'v2g'
    });
  }

  /**
   * Get current setpoint
   */
  getSetpoint(stationId) {
    return this.setpoints.get(stationId);
  }

  /**
   * Get measurements
   */
  getMeasurements(stationId) {
    return this.measurements.get(stationId);
  }

  /**
   * Get thermal state
   */
  getThermalState(stationId) {
    return this.thermalState.get(stationId);
  }

  /**
   * Clear station data
   */
  clearStation(stationId) {
    this.stopRamping(stationId);
    this.setpoints.delete(stationId);
    this.measurements.delete(stationId);
    this.taperCurves.delete(stationId);
    this.thermalState.delete(stationId);
  }

  /**
   * Get controller status
   */
  getStatus() {
    const stations = {};

    for (const [stationId, setpoint] of this.setpoints.entries()) {
      const measurements = this.measurements.get(stationId);
      const thermal = this.thermalState.get(stationId);
      const taper = this.taperCurves.get(stationId);

      stations[stationId] = {
        setpoint: {
          power: setpoint.power.toFixed(1) + 'kW',
          targetPower: setpoint.targetPower?.toFixed(1) + 'kW',
          ramped: setpoint.ramped,
          derated: setpoint.derated,
          tapered: setpoint.tapered
        },
        measurements: measurements ? {
          power: measurements.power?.toFixed(1) + 'kW',
          current: measurements.current?.toFixed(1) + 'A',
          voltage: measurements.voltage?.toFixed(0) + 'V',
          soc: measurements.soc ? measurements.soc + '%' : null
        } : null,
        thermal: thermal ? {
          level: thermal.level,
          temperature: thermal.temperature + '°C',
          derating: (thermal.derating * 100).toFixed(0) + '%'
        } : null,
        taper: taper?.enabled ? {
          soc: taper.soc + '%',
          taperStartSoC: taper.taperStartSoC + '%'
        } : null,
        ramping: this.rampingTimers.has(stationId)
      };
    }

    return {
      activeStations: this.setpoints.size,
      rampingStations: this.rampingTimers.size,
      thermalDeratingActive: Array.from(this.thermalState.values()).filter(t => t.derating > 0).length,
      stations
    };
  }
}

// Singleton instance
const dcfcController = new DCFastChargingController();

export default dcfcController;
