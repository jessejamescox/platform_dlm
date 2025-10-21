/**
 * Charger Capability Discovery and Validation Manager
 *
 * Discovers and manages charger capabilities including:
 * - AC/DC power limits and current limits per phase
 * - Supported protocols and features
 * - Ramp rates and step sizes
 * - Thermal limits and derating curves
 * - Bidirectional/V2G capabilities
 */

class CapabilityManager {
  constructor() {
    this.capabilities = new Map();
    this.capabilityProfiles = this.initializeProfiles();
  }

  /**
   * Initialize standard capability profiles
   */
  initializeProfiles() {
    return {
      // AC Level 1/2 (J1772, Type 1)
      'ac_level2_single': {
        type: 'ac',
        chargingLevel: 2,
        connector: 'J1772',
        phases: 1,
        voltage: { min: 208, max: 240, nominal: 240 },
        current: { min: 6, max: 80, step: 1, unit: 'A' },
        power: { min: 1.4, max: 19.2, unit: 'kW' },
        frequency: 60,
        rampRate: { current: 6, unit: 'A/s' }, // 6A per second max
        updateInterval: { min: 1000, typical: 2000, unit: 'ms' },
        features: {
          pwmPilot: true,
          iso15118: false,
          bidirectional: false,
          phaseBalancing: false
        }
      },

      // AC Level 2 Three-Phase (Type 2, EU)
      'ac_level2_three': {
        type: 'ac',
        chargingLevel: 2,
        connector: 'Type2',
        phases: 3,
        voltage: { min: 380, max: 480, nominal: 400 },
        current: { min: 6, max: 32, step: 1, unit: 'A' }, // Per phase
        power: { min: 4.1, max: 22, unit: 'kW' },
        frequency: 50,
        rampRate: { current: 4, unit: 'A/s' },
        updateInterval: { min: 1000, typical: 2000, unit: 'ms' },
        features: {
          pwmPilot: true,
          iso15118: true,
          bidirectional: false,
          phaseBalancing: true
        }
      },

      // DC Fast Charging (CCS, 50-150kW)
      'dcfc_ccs_medium': {
        type: 'dc',
        chargingLevel: 3,
        connector: 'CCS1',
        phases: null, // DC has no phases
        voltage: { min: 200, max: 500, nominal: 400 },
        current: { min: 10, max: 200, step: 1, unit: 'A' },
        power: { min: 20, max: 150, unit: 'kW' },
        rampRate: { power: 10, unit: 'kW/s' }, // 10kW per second max
        updateInterval: { min: 500, typical: 1000, unit: 'ms' },
        features: {
          iso15118: true,
          bidirectional: false,
          vehicleTaper: true,
          thermalManagement: true
        }
      },

      // DC Fast Charging High Power (CCS, 150-350kW)
      'dcfc_ccs_high': {
        type: 'dc',
        chargingLevel: 3,
        connector: 'CCS2',
        phases: null,
        voltage: { min: 200, max: 920, nominal: 800 },
        current: { min: 10, max: 500, step: 1, unit: 'A' },
        power: { min: 50, max: 350, unit: 'kW' },
        rampRate: { power: 20, unit: 'kW/s' },
        updateInterval: { min: 250, typical: 500, unit: 'ms' },
        features: {
          iso15118: true,
          bidirectional: true,
          vehicleTaper: true,
          thermalManagement: true,
          liquidCooling: true
        }
      },

      // CHAdeMO
      'dcfc_chademo': {
        type: 'dc',
        chargingLevel: 3,
        connector: 'CHAdeMO',
        phases: null,
        voltage: { min: 50, max: 500, nominal: 400 },
        current: { min: 10, max: 125, step: 1, unit: 'A' },
        power: { min: 10, max: 62.5, unit: 'kW' },
        rampRate: { power: 10, unit: 'kW/s' },
        updateInterval: { min: 500, typical: 1000, unit: 'ms' },
        features: {
          bidirectional: true,
          vehicleTaper: true
        }
      }
    };
  }

  /**
   * Register charger capabilities
   */
  async discoverCapabilities(stationId, protocol, communicationConfig) {
    console.log(`[Capability] Discovering capabilities for station ${stationId}`);

    let capabilities;

    try {
      // Auto-detect or query capabilities based on protocol
      switch (protocol) {
        case 'ocpp':
          capabilities = await this.discoverOCPPCapabilities(stationId, communicationConfig);
          break;
        case 'modbus':
          capabilities = await this.discoverModbusCapabilities(stationId, communicationConfig);
          break;
        case 'mqtt':
          capabilities = await this.discoverMQTTCapabilities(stationId, communicationConfig);
          break;
        default:
          throw new Error(`Unsupported protocol: ${protocol}`);
      }

      // Validate capabilities
      this.validateCapabilities(capabilities);

      // Store capabilities
      this.capabilities.set(stationId, {
        ...capabilities,
        discoveredAt: new Date().toISOString(),
        protocol,
        validated: true
      });

      console.log(`[Capability] Discovered capabilities for ${stationId}:`, capabilities.summary);

      return capabilities;
    } catch (error) {
      console.error(`[Capability] Discovery failed for ${stationId}:`, error.message);

      // Fall back to safe defaults
      const fallback = this.getFallbackCapabilities();
      this.capabilities.set(stationId, {
        ...fallback,
        discoveredAt: new Date().toISOString(),
        protocol,
        validated: false,
        fallback: true,
        error: error.message
      });

      return fallback;
    }
  }

  /**
   * Discover OCPP capabilities
   */
  async discoverOCPPCapabilities(stationId, config) {
    // Query OCPP configuration keys
    const capabilities = {
      type: 'ac', // Will be refined
      protocol: 'ocpp',
      version: config.version || '1.6',
      features: {}
    };

    // Map from GetConfiguration response
    // In real implementation, this would query the charger
    // For now, use profile-based defaults

    const profile = config.profile || 'ac_level2_single';
    return {
      ...this.capabilityProfiles[profile],
      protocol: 'ocpp',
      version: config.version
    };
  }

  /**
   * Discover Modbus capabilities
   */
  async discoverModbusCapabilities(stationId, config) {
    // Query Modbus registers for capabilities
    // In real implementation, read capability registers
    // SunSpec Modbus models define standard registers

    const profile = config.profile || 'ac_level2_single';
    return {
      ...this.capabilityProfiles[profile],
      protocol: 'modbus',
      modbusUnitId: config.modbusUnitId
    };
  }

  /**
   * Discover MQTT capabilities
   */
  async discoverMQTTCapabilities(stationId, config) {
    // Subscribe to capability topic and wait for message
    // In real implementation, subscribe to <prefix>/capabilities

    const profile = config.profile || 'ac_level2_single';
    return {
      ...this.capabilityProfiles[profile],
      protocol: 'mqtt'
    };
  }

  /**
   * Get fallback capabilities (conservative defaults)
   */
  getFallbackCapabilities() {
    return {
      type: 'ac',
      chargingLevel: 2,
      connector: 'Unknown',
      phases: 1,
      voltage: { min: 208, max: 240, nominal: 240 },
      current: { min: 6, max: 16, step: 1, unit: 'A' },
      power: { min: 1.4, max: 3.7, unit: 'kW' },
      rampRate: { current: 2, unit: 'A/s' },
      updateInterval: { min: 2000, typical: 5000, unit: 'ms' },
      features: {
        pwmPilot: true,
        iso15118: false,
        bidirectional: false
      },
      summary: 'Safe fallback (6-16A, 3.7kW max)'
    };
  }

  /**
   * Validate capabilities
   */
  validateCapabilities(capabilities) {
    // Check required fields
    const required = ['type', 'power', 'current', 'updateInterval'];
    for (const field of required) {
      if (!capabilities[field]) {
        throw new Error(`Missing required capability field: ${field}`);
      }
    }

    // Validate ranges
    if (capabilities.current.min >= capabilities.current.max) {
      throw new Error('Invalid current range: min >= max');
    }

    if (capabilities.power.min >= capabilities.power.max) {
      throw new Error('Invalid power range: min >= max');
    }

    // Validate ramp rate
    if (capabilities.rampRate) {
      const rateValue = capabilities.type === 'ac' ? capabilities.rampRate.current : capabilities.rampRate.power;
      if (rateValue <= 0) {
        throw new Error('Invalid ramp rate: must be positive');
      }
    }

    return true;
  }

  /**
   * Get capabilities for a station
   */
  getCapabilities(stationId) {
    return this.capabilities.get(stationId);
  }

  /**
   * Check if command is within capabilities
   */
  validateCommand(stationId, command) {
    const capabilities = this.capabilities.get(stationId);
    if (!capabilities) {
      return {
        valid: false,
        reason: 'Capabilities not discovered',
        recommendation: 'Discover capabilities first'
      };
    }

    const errors = [];

    // Validate AC current limits
    if (command.type === 'ac_current_limit') {
      const phases = command.phases || { A: 0, B: 0, C: 0 };

      for (const [phase, current] of Object.entries(phases)) {
        if (current < capabilities.current.min) {
          errors.push(`Phase ${phase}: ${current}A below minimum ${capabilities.current.min}A`);
        }
        if (current > capabilities.current.max) {
          errors.push(`Phase ${phase}: ${current}A exceeds maximum ${capabilities.current.max}A`);
        }

        // Check step size
        if (capabilities.current.step > 1) {
          if (current % capabilities.current.step !== 0) {
            errors.push(`Phase ${phase}: ${current}A not aligned to step size ${capabilities.current.step}A`);
          }
        }
      }

      // Check phase count
      const nonZeroPhases = Object.values(phases).filter(c => c > 0).length;
      if (nonZeroPhases !== capabilities.phases) {
        errors.push(`Command uses ${nonZeroPhases} phases, charger supports ${capabilities.phases}`);
      }
    }

    // Validate DC power limits
    if (command.type === 'dc_power_limit') {
      const power = command.power;

      if (power < capabilities.power.min) {
        errors.push(`${power}kW below minimum ${capabilities.power.min}kW`);
      }
      if (power > capabilities.power.max) {
        errors.push(`${power}kW exceeds maximum ${capabilities.power.max}kW`);
      }
    }

    // Validate update rate
    if (command.updateInterval && command.updateInterval < capabilities.updateInterval.min) {
      errors.push(`Update interval ${command.updateInterval}ms too fast (min: ${capabilities.updateInterval.min}ms)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      recommendation: errors.length > 0 ? 'Adjust command to meet capability constraints' : null
    };
  }

  /**
   * Calculate ramp-limited setpoint
   */
  calculateRampedSetpoint(stationId, currentValue, targetValue, deltaTime) {
    const capabilities = this.capabilities.get(stationId);
    if (!capabilities || !capabilities.rampRate) {
      return targetValue;
    }

    const rateLimit = capabilities.type === 'ac'
      ? capabilities.rampRate.current
      : capabilities.rampRate.power;

    const maxChange = rateLimit * (deltaTime / 1000); // Convert ms to seconds
    const delta = targetValue - currentValue;

    if (Math.abs(delta) <= maxChange) {
      return targetValue;
    }

    return currentValue + Math.sign(delta) * maxChange;
  }

  /**
   * Get recommended setpoint based on capabilities
   */
  getRecommendedSetpoint(stationId, desired) {
    const capabilities = this.capabilities.get(stationId);
    if (!capabilities) {
      return desired;
    }

    if (capabilities.type === 'ac') {
      // Clamp to current limits
      const clamped = Math.max(
        capabilities.current.min,
        Math.min(desired, capabilities.current.max)
      );

      // Align to step size
      if (capabilities.current.step > 1) {
        return Math.round(clamped / capabilities.current.step) * capabilities.current.step;
      }

      return clamped;
    } else {
      // DC power limits
      return Math.max(
        capabilities.power.min,
        Math.min(desired, capabilities.power.max)
      );
    }
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(stationId, feature) {
    const capabilities = this.capabilities.get(stationId);
    if (!capabilities || !capabilities.features) {
      return false;
    }

    return capabilities.features[feature] === true;
  }

  /**
   * Get capability summary
   */
  getSummary(stationId) {
    const cap = this.capabilities.get(stationId);
    if (!cap) return null;

    return {
      stationId,
      type: cap.type,
      connector: cap.connector,
      power: `${cap.power.min}-${cap.power.max} ${cap.power.unit}`,
      current: cap.current ? `${cap.current.min}-${cap.current.max} ${cap.current.unit}` : null,
      phases: cap.phases,
      rampRate: cap.rampRate,
      updateInterval: `${cap.updateInterval.typical}ms`,
      features: Object.keys(cap.features || {}).filter(f => cap.features[f]),
      validated: cap.validated,
      fallback: cap.fallback || false,
      discoveredAt: cap.discoveredAt
    };
  }

  /**
   * Get all capabilities
   */
  getAllCapabilities() {
    const all = {};
    for (const [stationId, cap] of this.capabilities.entries()) {
      all[stationId] = this.getSummary(stationId);
    }
    return all;
  }

  /**
   * Remove capabilities
   */
  removeCapabilities(stationId) {
    this.capabilities.delete(stationId);
  }

  /**
   * Update capabilities
   */
  updateCapabilities(stationId, updates) {
    const current = this.capabilities.get(stationId);
    if (current) {
      this.capabilities.set(stationId, {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
  }
}

// Singleton instance
const capabilityManager = new CapabilityManager();

export default capabilityManager;
