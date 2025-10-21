/**
 * AC Per-Phase Current Control
 *
 * Manages per-phase current limits for AC charging (Level 1/2).
 * Handles single-phase and three-phase configurations with
 * independent phase current control and balancing.
 */

import capabilityManager from './CapabilityManager.js';
import auditLogger from './AuditLogger.js';

class PhaseCurrentController {
  constructor() {
    this.phaseSetpoints = new Map(); // station -> { A, B, C }
    this.phaseReadings = new Map();  // station -> { A, B, C } actual readings
    this.phaseBalancingEnabled = true;
    this.maxPhaseImbalance = 0.20; // 20% max imbalance
    this.minPhaseCurrentThreshold = 6; // 6A minimum per IEC 61851
  }

  /**
   * Set per-phase current limits for a station
   */
  async setPhaseCurrents(stationId, phases, options = {}) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities) {
      throw new Error(`Capabilities not discovered for station ${stationId}`);
    }

    if (capabilities.type !== 'ac') {
      throw new Error(`Station ${stationId} is not an AC charger`);
    }

    // Validate phase configuration
    const validation = this.validatePhaseCurrents(stationId, phases, capabilities);
    if (!validation.valid) {
      throw new Error(`Invalid phase currents: ${validation.errors.join(', ')}`);
    }

    // Normalize phase object based on charger configuration
    const normalizedPhases = this.normalizePhases(phases, capabilities.phases);

    // Check for excessive phase imbalance
    if (this.phaseBalancingEnabled && capabilities.phases === 3) {
      const imbalance = this.calculatePhaseImbalance(normalizedPhases);
      if (imbalance > this.maxPhaseImbalance) {
        console.warn(`[PhaseControl] Warning: Phase imbalance ${(imbalance * 100).toFixed(1)}% exceeds threshold on station ${stationId}`);

        if (options.autoBalance) {
          const balanced = this.balancePhases(normalizedPhases);
          console.log(`[PhaseControl] Auto-balanced phases for station ${stationId}`);
          Object.assign(normalizedPhases, balanced);
        }
      }
    }

    // Store setpoints
    this.phaseSetpoints.set(stationId, {
      ...normalizedPhases,
      timestamp: Date.now(),
      source: options.source || 'manual'
    });

    // Audit log
    auditLogger.logStationControl(
      options.actor || { type: 'system', id: 'phase_controller' },
      stationId,
      'set_phase_currents',
      { phases: normalizedPhases }
    );

    console.log(`[PhaseControl] Set phase currents for station ${stationId}:`, normalizedPhases);

    return {
      success: true,
      stationId,
      phases: normalizedPhases,
      imbalance: capabilities.phases === 3 ? this.calculatePhaseImbalance(normalizedPhases) : 0
    };
  }

  /**
   * Normalize phase object based on charger configuration
   */
  normalizePhases(phases, phaseCount) {
    if (phaseCount === 1) {
      // Single phase - use phase A (or L1) only
      return {
        A: phases.A || phases.L1 || phases.current || 0,
        B: 0,
        C: 0
      };
    } else if (phaseCount === 3) {
      // Three phase
      return {
        A: phases.A || phases.L1 || 0,
        B: phases.B || phases.L2 || 0,
        C: phases.C || phases.L3 || 0
      };
    }

    throw new Error(`Unsupported phase count: ${phaseCount}`);
  }

  /**
   * Validate phase current setpoints
   */
  validatePhaseCurrents(stationId, phases, capabilities) {
    const errors = [];

    const phaseKeys = capabilities.phases === 1 ? ['A'] : ['A', 'B', 'C'];

    for (const phase of phaseKeys) {
      const current = phases[phase] || phases[`L${phaseKeys.indexOf(phase) + 1}`] || 0;

      // Check minimum current
      if (current > 0 && current < this.minPhaseCurrentThreshold) {
        errors.push(`Phase ${phase}: ${current}A below minimum ${this.minPhaseCurrentThreshold}A`);
      }

      // Check maximum current
      if (current > capabilities.current.max) {
        errors.push(`Phase ${phase}: ${current}A exceeds maximum ${capabilities.current.max}A`);
      }

      // Check step size
      if (capabilities.current.step > 1 && current > 0) {
        if (current % capabilities.current.step !== 0) {
          errors.push(`Phase ${phase}: ${current}A not aligned to step size ${capabilities.current.step}A`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate phase imbalance (for 3-phase systems)
   */
  calculatePhaseImbalance(phases) {
    const currents = [phases.A, phases.B, phases.C].filter(c => c > 0);

    if (currents.length === 0) return 0;

    const avg = currents.reduce((sum, c) => sum + c, 0) / currents.length;
    const maxDeviation = Math.max(...currents.map(c => Math.abs(c - avg)));

    return avg > 0 ? maxDeviation / avg : 0;
  }

  /**
   * Balance three-phase currents to minimize imbalance
   */
  balancePhases(phases) {
    const total = phases.A + phases.B + phases.C;
    const balanced = total / 3;

    // Round to nearest amp
    return {
      A: Math.round(balanced),
      B: Math.round(balanced),
      C: Math.round(balanced)
    };
  }

  /**
   * Update phase readings from actual measurements
   */
  updatePhaseReadings(stationId, readings) {
    this.phaseReadings.set(stationId, {
      ...readings,
      timestamp: Date.now()
    });
  }

  /**
   * Get phase setpoints for a station
   */
  getPhaseSetpoints(stationId) {
    return this.phaseSetpoints.get(stationId);
  }

  /**
   * Get phase readings for a station
   */
  getPhaseReadings(stationId) {
    return this.phaseReadings.get(stationId);
  }

  /**
   * Convert total power to per-phase currents
   */
  powerToPhaseCurrents(stationId, totalPower) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities || capabilities.type !== 'ac') {
      throw new Error(`Cannot convert power for non-AC station ${stationId}`);
    }

    const voltage = capabilities.voltage.nominal;
    const phases = capabilities.phases;

    if (phases === 1) {
      // Single phase: P = V × I
      const current = (totalPower * 1000) / voltage;
      return {
        A: Math.round(current),
        B: 0,
        C: 0
      };
    } else if (phases === 3) {
      // Three phase: P = √3 × V × I (line-to-line voltage)
      const current = (totalPower * 1000) / (Math.sqrt(3) * voltage);
      return {
        A: Math.round(current),
        B: Math.round(current),
        C: Math.round(current)
      };
    }

    throw new Error(`Unsupported phase configuration: ${phases}`);
  }

  /**
   * Convert per-phase currents to total power
   */
  phaseCurrentsToPower(stationId, phases) {
    const capabilities = capabilityManager.getCapabilities(stationId);

    if (!capabilities || capabilities.type !== 'ac') {
      throw new Error(`Cannot convert currents for non-AC station ${stationId}`);
    }

    const voltage = capabilities.voltage.nominal;
    const phaseCount = capabilities.phases;

    if (phaseCount === 1) {
      // Single phase: P = V × I
      return (voltage * phases.A) / 1000; // kW
    } else if (phaseCount === 3) {
      // Three phase: P = √3 × V × I_avg
      const avgCurrent = (phases.A + phases.B + phases.C) / 3;
      return (Math.sqrt(3) * voltage * avgCurrent) / 1000; // kW
    }

    throw new Error(`Unsupported phase configuration: ${phaseCount}`);
  }

  /**
   * Ramp phase currents gradually to avoid EV session drops
   */
  async rampPhaseCurrents(stationId, targetPhases, stepTime = 2000) {
    const current = this.phaseSetpoints.get(stationId);
    if (!current) {
      // No current setpoint, set directly
      return this.setPhaseCurrents(stationId, targetPhases);
    }

    const capabilities = capabilityManager.getCapabilities(stationId);
    const rampRate = capabilities?.rampRate?.current || 2; // A/s

    const phaseKeys = ['A', 'B', 'C'];
    let needsRamping = false;

    // Check if ramping is needed
    for (const phase of phaseKeys) {
      const delta = Math.abs((targetPhases[phase] || 0) - (current[phase] || 0));
      if (delta > rampRate * (stepTime / 1000)) {
        needsRamping = true;
        break;
      }
    }

    if (!needsRamping) {
      // Can reach target in one step
      return this.setPhaseCurrents(stationId, targetPhases);
    }

    // Ramp gradually
    console.log(`[PhaseControl] Ramping phase currents for station ${stationId}`);

    const maxChange = rampRate * (stepTime / 1000);
    const rampedPhases = {};

    for (const phase of phaseKeys) {
      const currentValue = current[phase] || 0;
      const targetValue = targetPhases[phase] || 0;
      const delta = targetValue - currentValue;

      if (Math.abs(delta) <= maxChange) {
        rampedPhases[phase] = targetValue;
      } else {
        rampedPhases[phase] = currentValue + Math.sign(delta) * maxChange;
      }
    }

    await this.setPhaseCurrents(stationId, rampedPhases);

    // Schedule next ramp step if not at target
    const atTarget = phaseKeys.every(p =>
      Math.abs((rampedPhases[p] || 0) - (targetPhases[p] || 0)) < 1
    );

    if (!atTarget) {
      setTimeout(() => {
        this.rampPhaseCurrents(stationId, targetPhases, stepTime);
      }, stepTime);
    }

    return {
      success: true,
      ramping: !atTarget,
      current: rampedPhases,
      target: targetPhases
    };
  }

  /**
   * Get system-wide phase balance status
   */
  getSystemPhaseBalance() {
    const totals = { A: 0, B: 0, C: 0 };
    let stationCount = 0;

    for (const [stationId, setpoints] of this.phaseSetpoints.entries()) {
      const capabilities = capabilityManager.getCapabilities(stationId);
      if (capabilities?.phases === 3) {
        totals.A += setpoints.A || 0;
        totals.B += setpoints.B || 0;
        totals.C += setpoints.C || 0;
        stationCount++;
      }
    }

    const imbalance = this.calculatePhaseImbalance(totals);

    return {
      totals,
      imbalance: (imbalance * 100).toFixed(1) + '%',
      stationCount,
      balanced: imbalance <= this.maxPhaseImbalance,
      warning: imbalance > this.maxPhaseImbalance ? `Phase imbalance exceeds ${(this.maxPhaseImbalance * 100).toFixed(0)}% threshold` : null
    };
  }

  /**
   * Enable/disable automatic phase balancing
   */
  setPhaseBalancing(enabled) {
    this.phaseBalancingEnabled = enabled;
    console.log(`[PhaseControl] Phase balancing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set maximum allowed phase imbalance
   */
  setMaxImbalance(imbalance) {
    if (imbalance < 0 || imbalance > 1) {
      throw new Error('Imbalance must be between 0 and 1');
    }
    this.maxPhaseImbalance = imbalance;
    console.log(`[PhaseControl] Max phase imbalance set to ${(imbalance * 100).toFixed(0)}%`);
  }

  /**
   * Clear setpoints for a station
   */
  clearStation(stationId) {
    this.phaseSetpoints.delete(stationId);
    this.phaseReadings.delete(stationId);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      phaseBalancingEnabled: this.phaseBalancingEnabled,
      maxPhaseImbalance: (this.maxPhaseImbalance * 100).toFixed(0) + '%',
      minPhaseCurrentThreshold: this.minPhaseCurrentThreshold + 'A',
      activeStations: this.phaseSetpoints.size,
      systemPhaseBalance: this.getSystemPhaseBalance()
    };
  }
}

// Singleton instance
const phaseCurrentController = new PhaseCurrentController();

export default phaseCurrentController;
