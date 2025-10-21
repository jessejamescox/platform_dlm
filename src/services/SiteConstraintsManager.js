/**
 * Site Electrical Constraints Manager
 *
 * Manages and enforces site-level electrical constraints including:
 * - Service/feeder/transformer limits
 * - Circuit breaker ratings and selective coordination
 * - Phase imbalance limits
 * - Cable ampacity and thermal limits
 * - Power quality monitoring (voltage, frequency, PF)
 * - Demand charge management
 */

class SiteConstraintsManager {
  constructor() {
    this.constraints = {
      service: null,
      feeders: new Map(),
      transformers: new Map(),
      breakers: new Map(),
      cables: new Map(),
      zones: new Map()
    };

    this.measurements = {
      service: null,
      feeders: new Map(),
      transformers: new Map()
    };

    this.violations = [];
    this.maxViolationHistory = 1000;
  }

  /**
   * Configure service entrance constraints
   */
  configureService(config) {
    this.constraints.service = {
      maxCurrent: config.maxCurrent, // A per phase
      maxPower: config.maxPower,     // kW total
      voltage: config.voltage,       // Nominal voltage
      phases: config.phases || 3,
      maxImbalance: config.maxImbalance || 0.10, // 10%
      powerFactor: {
        min: config.minPowerFactor || 0.90,
        max: config.maxPowerFactor || 1.0
      },
      frequency: {
        nominal: config.frequency || 60,
        tolerance: config.frequencyTolerance || 0.5 // ±0.5 Hz
      },
      nec625ContinuousFactor: config.nec625Factor || 0.80, // NEC 625 - 80% continuous
      ...config
    };

    console.log('[SiteConstraints] Service configured:', this.constraints.service);
  }

  /**
   * Configure feeder constraints
   */
  configureFeeder(feederId, config) {
    this.constraints.feeders.set(feederId, {
      id: feederId,
      name: config.name,
      maxCurrent: config.maxCurrent,
      maxPower: config.maxPower,
      phases: config.phases || 3,
      breakerRating: config.breakerRating,
      cableAmpacity: config.cableAmpacity,
      connectedStations: config.connectedStations || [],
      priority: config.priority || 5,
      ...config
    });

    console.log(`[SiteConstraints] Feeder ${feederId} configured`);
  }

  /**
   * Configure transformer constraints
   */
  configureTransformer(transformerId, config) {
    this.constraints.transformers.set(transformerId, {
      id: transformerId,
      name: config.name,
      ratedPower: config.ratedPower, // kVA
      maxContinuousPower: config.ratedPower * (config.continuousFactor || 0.80),
      thermalLimitCurve: config.thermalLimitCurve || this.getDefaultThermalCurve(),
      coolingMethod: config.coolingMethod || 'ONAN', // Oil Natural Air Natural
      ambientTemp: config.ambientTemp || 25,
      maxTemp: config.maxTemp || 80,
      connectedFeeders: config.connectedFeeders || [],
      ...config
    });

    console.log(`[SiteConstraints] Transformer ${transformerId} configured`);
  }

  /**
   * Get default transformer thermal limit curve
   */
  getDefaultThermalCurve() {
    // Simplified thermal curve: time at overload vs. temperature rise
    return {
      // Load factor -> max time (minutes)
      1.00: Infinity, // 100% - continuous
      1.10: 240,      // 110% - 4 hours
      1.20: 120,      // 120% - 2 hours
      1.30: 60,       // 130% - 1 hour
      1.50: 30,       // 150% - 30 minutes
      2.00: 10        // 200% - 10 minutes
    };
  }

  /**
   * Configure cable constraints
   */
  configureCable(cableId, config) {
    this.constraints.cables.set(cableId, {
      id: cableId,
      ampacity: config.ampacity,
      temperature: {
        max: config.maxTemp || 90, // °C
        ambient: config.ambientTemp || 30
      },
      deratingFactors: config.deratingFactors || {
        bundling: 1.0,
        temperature: 1.0,
        conduit: 1.0
      },
      effectiveAmpacity: this.calculateEffectiveAmpacity(config),
      ...config
    });
  }

  /**
   * Calculate effective cable ampacity with derating
   */
  calculateEffectiveAmpacity(config) {
    const baseAmpacity = config.ampacity;
    const factors = config.deratingFactors || {};

    const effectiveAmpacity = baseAmpacity *
      (factors.bundling || 1.0) *
      (factors.temperature || 1.0) *
      (factors.conduit || 1.0);

    return Math.floor(effectiveAmpacity);
  }

  /**
   * Update measurements
   */
  updateServiceMeasurements(measurements) {
    this.measurements.service = {
      ...measurements,
      timestamp: Date.now()
    };

    // Check for violations
    this.checkServiceConstraints();
  }

  /**
   * Update feeder measurements
   */
  updateFeederMeasurements(feederId, measurements) {
    this.measurements.feeders.set(feederId, {
      ...measurements,
      timestamp: Date.now()
    });

    // Check for violations
    this.checkFeederConstraints(feederId);
  }

  /**
   * Update transformer measurements
   */
  updateTransformerMeasurements(transformerId, measurements) {
    this.measurements.transformers.set(transformerId, {
      ...measurements,
      timestamp: Date.now()
    });

    // Check for violations
    this.checkTransformerConstraints(transformerId);
  }

  /**
   * Check service constraints
   */
  checkServiceConstraints() {
    const service = this.constraints.service;
    const measurements = this.measurements.service;

    if (!service || !measurements) return;

    const violations = [];

    // Check power limit
    if (measurements.power > service.maxPower) {
      violations.push({
        type: 'service_power_exceeded',
        severity: 'critical',
        value: measurements.power,
        limit: service.maxPower,
        message: `Service power ${measurements.power.toFixed(1)}kW exceeds limit ${service.maxPower.toFixed(1)}kW`
      });
    }

    // Check current per phase
    if (measurements.current) {
      ['A', 'B', 'C'].forEach(phase => {
        const current = measurements.current[phase];
        if (current > service.maxCurrent) {
          violations.push({
            type: 'service_current_exceeded',
            severity: 'critical',
            phase,
            value: current,
            limit: service.maxCurrent,
            message: `Service phase ${phase} current ${current.toFixed(1)}A exceeds limit ${service.maxCurrent.toFixed(1)}A`
          });
        }
      });

      // Check phase imbalance
      const imbalance = this.calculateImbalance(measurements.current);
      if (imbalance > service.maxImbalance) {
        violations.push({
          type: 'phase_imbalance',
          severity: 'warning',
          value: imbalance,
          limit: service.maxImbalance,
          message: `Phase imbalance ${(imbalance * 100).toFixed(1)}% exceeds limit ${(service.maxImbalance * 100).toFixed(1)}%`
        });
      }
    }

    // Check power factor
    if (measurements.powerFactor) {
      if (measurements.powerFactor < service.powerFactor.min) {
        violations.push({
          type: 'low_power_factor',
          severity: 'warning',
          value: measurements.powerFactor,
          limit: service.powerFactor.min,
          message: `Power factor ${measurements.powerFactor.toFixed(2)} below minimum ${service.powerFactor.min.toFixed(2)}`
        });
      }
    }

    // Check voltage
    if (measurements.voltage) {
      const nominalVoltage = service.voltage;
      const voltageTolerance = service.voltageTolerance || 0.05; // ±5%

      Object.entries(measurements.voltage).forEach(([phase, voltage]) => {
        const deviation = Math.abs(voltage - nominalVoltage) / nominalVoltage;
        if (deviation > voltageTolerance) {
          violations.push({
            type: 'voltage_deviation',
            severity: deviation > 0.10 ? 'critical' : 'warning',
            phase,
            value: voltage,
            nominal: nominalVoltage,
            message: `Phase ${phase} voltage ${voltage.toFixed(1)}V deviates ${(deviation * 100).toFixed(1)}% from nominal`
          });
        }
      });
    }

    // Check frequency
    if (measurements.frequency) {
      const deviation = Math.abs(measurements.frequency - service.frequency.nominal);
      if (deviation > service.frequency.tolerance) {
        violations.push({
          type: 'frequency_deviation',
          severity: 'warning',
          value: measurements.frequency,
          nominal: service.frequency.nominal,
          message: `Frequency ${measurements.frequency.toFixed(2)}Hz deviates from nominal ${service.frequency.nominal}Hz`
        });
      }
    }

    if (violations.length > 0) {
      this.recordViolations('service', violations);
    }

    return violations;
  }

  /**
   * Check feeder constraints
   */
  checkFeederConstraints(feederId) {
    const feeder = this.constraints.feeders.get(feederId);
    const measurements = this.measurements.feeders.get(feederId);

    if (!feeder || !measurements) return [];

    const violations = [];

    // Check current limit
    if (measurements.current > feeder.maxCurrent) {
      violations.push({
        type: 'feeder_current_exceeded',
        severity: 'critical',
        feederId,
        value: measurements.current,
        limit: feeder.maxCurrent,
        message: `Feeder ${feeder.name} current ${measurements.current.toFixed(1)}A exceeds limit ${feeder.maxCurrent.toFixed(1)}A`
      });
    }

    // Check breaker rating
    if (feeder.breakerRating && measurements.current > feeder.breakerRating * 0.80) {
      violations.push({
        type: 'breaker_warning',
        severity: 'warning',
        feederId,
        value: measurements.current,
        limit: feeder.breakerRating * 0.80,
        message: `Feeder ${feeder.name} current approaching breaker rating`
      });
    }

    // Check cable ampacity
    if (feeder.cableAmpacity && measurements.current > feeder.cableAmpacity) {
      violations.push({
        type: 'cable_ampacity_exceeded',
        severity: 'critical',
        feederId,
        value: measurements.current,
        limit: feeder.cableAmpacity,
        message: `Feeder ${feeder.name} current exceeds cable ampacity`
      });
    }

    if (violations.length > 0) {
      this.recordViolations(`feeder_${feederId}`, violations);
    }

    return violations;
  }

  /**
   * Check transformer constraints
   */
  checkTransformerConstraints(transformerId) {
    const transformer = this.constraints.transformers.get(transformerId);
    const measurements = this.measurements.transformers.get(transformerId);

    if (!transformer || !measurements) return [];

    const violations = [];

    // Check power limit
    const loadFactor = measurements.power / transformer.ratedPower;

    if (measurements.power > transformer.maxContinuousPower) {
      // Check thermal limit curve
      const thermalLimit = this.getThermalLimit(transformer, loadFactor);

      violations.push({
        type: 'transformer_overload',
        severity: loadFactor > 1.5 ? 'critical' : 'warning',
        transformerId,
        loadFactor: loadFactor.toFixed(2),
        power: measurements.power,
        limit: transformer.ratedPower,
        thermalLimit,
        message: `Transformer ${transformer.name} at ${(loadFactor * 100).toFixed(0)}% load (max continuous time: ${thermalLimit} min)`
      });
    }

    // Check temperature
    if (measurements.temperature && measurements.temperature > transformer.maxTemp) {
      violations.push({
        type: 'transformer_temperature',
        severity: 'critical',
        transformerId,
        value: measurements.temperature,
        limit: transformer.maxTemp,
        message: `Transformer ${transformer.name} temperature ${measurements.temperature}°C exceeds limit ${transformer.maxTemp}°C`
      });
    }

    if (violations.length > 0) {
      this.recordViolations(`transformer_${transformerId}`, violations);
    }

    return violations;
  }

  /**
   * Get thermal time limit for transformer load
   */
  getThermalLimit(transformer, loadFactor) {
    const curve = transformer.thermalLimitCurve;

    // Find the closest load factor in curve
    const loadFactors = Object.keys(curve).map(Number).sort((a, b) => b - a);

    for (const factor of loadFactors) {
      if (loadFactor >= factor) {
        return curve[factor];
      }
    }

    return curve[loadFactors[loadFactors.length - 1]];
  }

  /**
   * Calculate phase imbalance
   */
  calculateImbalance(phases) {
    const values = Object.values(phases).filter(v => v > 0);
    if (values.length === 0) return 0;

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const maxDeviation = Math.max(...values.map(v => Math.abs(v - avg)));

    return avg > 0 ? maxDeviation / avg : 0;
  }

  /**
   * Record violations
   */
  recordViolations(component, violations) {
    for (const violation of violations) {
      this.violations.push({
        ...violation,
        component,
        timestamp: new Date().toISOString()
      });

      // Log critical violations
      if (violation.severity === 'critical') {
        console.error(`[SiteConstraints] VIOLATION: ${violation.message}`);
      } else {
        console.warn(`[SiteConstraints] Warning: ${violation.message}`);
      }
    }

    // Trim history
    if (this.violations.length > this.maxViolationHistory) {
      this.violations = this.violations.slice(-this.maxViolationHistory);
    }
  }

  /**
   * Get available capacity considering all constraints
   */
  getAvailableCapacity() {
    const service = this.constraints.service;
    const measurements = this.measurements.service;

    if (!service || !measurements) {
      return 0;
    }

    // Start with service limit
    let available = service.maxPower - measurements.power;

    // Apply NEC 625 continuous load factor
    available *= service.nec625ContinuousFactor;

    // Check each feeder
    for (const [feederId, feeder] of this.constraints.feeders.entries()) {
      const feederMeasurements = this.measurements.feeders.get(feederId);
      if (feederMeasurements) {
        const feederAvailable = feeder.maxPower - feederMeasurements.power;
        available = Math.min(available, feederAvailable);
      }
    }

    // Check each transformer
    for (const [transformerId, transformer] of this.constraints.transformers.entries()) {
      const transformerMeasurements = this.measurements.transformers.get(transformerId);
      if (transformerMeasurements) {
        const transformerAvailable = transformer.maxContinuousPower - transformerMeasurements.power;
        available = Math.min(available, transformerAvailable);
      }
    }

    return Math.max(0, available);
  }

  /**
   * Get recent violations
   */
  getViolations(filters = {}) {
    let filtered = [...this.violations];

    if (filters.component) {
      filtered = filtered.filter(v => v.component === filters.component);
    }

    if (filters.type) {
      filtered = filtered.filter(v => v.type === filters.type);
    }

    if (filters.severity) {
      filtered = filtered.filter(v => v.severity === filters.severity);
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  /**
   * Get constraint status
   */
  getStatus() {
    return {
      service: this.measurements.service ? {
        power: this.measurements.service.power?.toFixed(1) + 'kW',
        limit: this.constraints.service?.maxPower?.toFixed(1) + 'kW',
        utilization: this.constraints.service ? ((this.measurements.service.power / this.constraints.service.maxPower) * 100).toFixed(1) + '%' : null
      } : null,
      feeders: Array.from(this.constraints.feeders.entries()).map(([id, feeder]) => {
        const meas = this.measurements.feeders.get(id);
        return {
          id,
          name: feeder.name,
          current: meas?.current?.toFixed(1) + 'A',
          limit: feeder.maxCurrent?.toFixed(1) + 'A',
          utilization: meas ? ((meas.current / feeder.maxCurrent) * 100).toFixed(1) + '%' : null
        };
      }),
      transformers: Array.from(this.constraints.transformers.entries()).map(([id, transformer]) => {
        const meas = this.measurements.transformers.get(id);
        return {
          id,
          name: transformer.name,
          power: meas?.power?.toFixed(1) + 'kW',
          limit: transformer.ratedPower?.toFixed(1) + 'kVA',
          temperature: meas?.temperature + '°C',
          loadFactor: meas ? (meas.power / transformer.ratedPower).toFixed(2) : null
        };
      }),
      availableCapacity: this.getAvailableCapacity().toFixed(1) + 'kW',
      recentViolations: this.getViolations({ limit: 10 })
    };
  }
}

// Singleton instance
const siteConstraintsManager = new SiteConstraintsManager();

export default siteConstraintsManager;
