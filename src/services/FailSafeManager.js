/**
 * Fail-Safe Defaults Manager
 *
 * Manages fallback behavior when communication is lost with charging stations
 * or when the DLM controller becomes unavailable. Ensures safe operation
 * even during system failures.
 */

class FailSafeManager {
  constructor() {
    this.defaults = new Map();
    this.stationStates = new Map();
    this.offlineMode = false;
    this.lastHeartbeat = Date.now();
    this.heartbeatTimeout = 60000; // 60s
    this.heartbeatInterval = null;
  }

  /**
   * Register fail-safe defaults for a station
   */
  registerStation(stationId, options = {}) {
    const defaults = {
      stationId,
      // Fail-safe power limit (conservative)
      safePowerLimit: options.safePowerLimit || 3.7, // kW - minimum safe charging
      // Action to take when offline: 'maintain', 'reduce', 'stop'
      offlineAction: options.offlineAction || 'reduce',
      // Time before triggering fail-safe (ms)
      commTimeout: options.commTimeout || 30000, // 30s
      // Last known good configuration
      lastKnownGoodConfig: null,
      // Timestamps
      lastComm: Date.now(),
      lastFailSafe: null,
      // State
      isOffline: false,
      failSafeActive: false,
      consecutiveTimeouts: 0
    };

    this.defaults.set(stationId, defaults);
    return defaults;
  }

  /**
   * Update station communication timestamp
   */
  updateStationComm(stationId) {
    const config = this.defaults.get(stationId);
    if (config) {
      config.lastComm = Date.now();
      config.consecutiveTimeouts = 0;

      // Clear offline state if was offline
      if (config.isOffline) {
        console.log(`[FailSafe] Station ${stationId} back online`);
        config.isOffline = false;
        config.failSafeActive = false;
      }
    }
  }

  /**
   * Record last known good configuration
   */
  recordGoodConfig(stationId, config) {
    const failsafe = this.defaults.get(stationId);
    if (failsafe) {
      failsafe.lastKnownGoodConfig = {
        ...config,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check for offline stations and apply fail-safe
   */
  async checkStations() {
    const now = Date.now();
    const offlineStations = [];

    for (const [stationId, config] of this.defaults.entries()) {
      const timeSinceComm = now - config.lastComm;

      // Check if station is offline
      if (timeSinceComm > config.commTimeout) {
        if (!config.isOffline) {
          console.warn(`[FailSafe] Station ${stationId} offline (${timeSinceComm}ms since last comm)`);
          config.isOffline = true;
          config.consecutiveTimeouts++;
          offlineStations.push(stationId);

          // Apply fail-safe action
          await this.applyFailSafe(stationId);
        }
      }
    }

    return offlineStations;
  }

  /**
   * Apply fail-safe action to a station
   */
  async applyFailSafe(stationId) {
    const config = this.defaults.get(stationId);
    if (!config || config.failSafeActive) return;

    config.failSafeActive = true;
    config.lastFailSafe = Date.now();

    console.log(`[FailSafe] Applying fail-safe action '${config.offlineAction}' to station ${stationId}`);

    const action = {
      stationId,
      action: config.offlineAction,
      timestamp: Date.now(),
      reason: 'communication_timeout'
    };

    switch (config.offlineAction) {
      case 'maintain':
        // Maintain last known power setting (do nothing)
        action.powerLimit = config.lastKnownGoodConfig?.currentPower || config.safePowerLimit;
        break;

      case 'reduce':
        // Reduce to safe minimum
        action.powerLimit = config.safePowerLimit;
        break;

      case 'stop':
        // Stop charging
        action.powerLimit = 0;
        break;

      default:
        console.warn(`[FailSafe] Unknown offline action: ${config.offlineAction}`);
        action.powerLimit = config.safePowerLimit;
    }

    return action;
  }

  /**
   * Get fail-safe configuration for a station
   */
  getStationFailSafe(stationId) {
    return this.defaults.get(stationId);
  }

  /**
   * Enter offline mode (entire system)
   */
  enterOfflineMode() {
    if (this.offlineMode) return;

    console.warn('[FailSafe] ⚠️  ENTERING OFFLINE MODE - System running on fail-safe defaults');
    this.offlineMode = true;

    // Apply fail-safe to all stations
    for (const stationId of this.defaults.keys()) {
      this.applyFailSafe(stationId);
    }
  }

  /**
   * Exit offline mode
   */
  exitOfflineMode() {
    if (!this.offlineMode) return;

    console.log('[FailSafe] ✓ EXITING OFFLINE MODE - Resuming normal operation');
    this.offlineMode = false;

    // Reset fail-safe flags
    for (const config of this.defaults.values()) {
      config.failSafeActive = false;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat(interval = 10000) {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(async () => {
      try {
        // Check for offline stations
        await this.checkStations();

        // Check if system should enter offline mode
        const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
        if (timeSinceHeartbeat > this.heartbeatTimeout && !this.offlineMode) {
          this.enterOfflineMode();
        }
      } catch (error) {
        console.error('[FailSafe] Heartbeat check failed:', error);
      }
    }, interval);

    console.log(`[FailSafe] Started heartbeat monitoring (${interval}ms interval)`);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update system heartbeat
   */
  heartbeat() {
    this.lastHeartbeat = Date.now();

    // Exit offline mode if we were in it
    if (this.offlineMode) {
      this.exitOfflineMode();
    }
  }

  /**
   * Get fail-safe status
   */
  getStatus() {
    const stations = {};
    for (const [stationId, config] of this.defaults.entries()) {
      stations[stationId] = {
        isOffline: config.isOffline,
        failSafeActive: config.failSafeActive,
        offlineAction: config.offlineAction,
        safePowerLimit: config.safePowerLimit,
        lastComm: new Date(config.lastComm).toISOString(),
        lastFailSafe: config.lastFailSafe ? new Date(config.lastFailSafe).toISOString() : null,
        consecutiveTimeouts: config.consecutiveTimeouts,
        timeSinceComm: Date.now() - config.lastComm
      };
    }

    return {
      offlineMode: this.offlineMode,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      timeSinceHeartbeat: Date.now() - this.lastHeartbeat,
      heartbeatTimeout: this.heartbeatTimeout,
      stations,
      summary: {
        total: this.defaults.size,
        offline: Array.from(this.defaults.values()).filter(c => c.isOffline).length,
        failSafeActive: Array.from(this.defaults.values()).filter(c => c.failSafeActive).length
      }
    };
  }

  /**
   * Remove a station
   */
  removeStation(stationId) {
    this.defaults.delete(stationId);
  }

  /**
   * Update fail-safe configuration
   */
  updateStationConfig(stationId, updates) {
    const config = this.defaults.get(stationId);
    if (config) {
      Object.assign(config, updates);
    }
  }

  /**
   * Get recommended action for a station based on current state
   */
  getRecommendedAction(stationId, currentState) {
    const config = this.defaults.get(stationId);
    if (!config) {
      return { action: 'none', reason: 'not_registered' };
    }

    // If offline, use fail-safe action
    if (config.isOffline || this.offlineMode) {
      return {
        action: config.offlineAction,
        powerLimit: config.safePowerLimit,
        reason: 'offline_mode'
      };
    }

    // If communication is degraded
    const timeSinceComm = Date.now() - config.lastComm;
    if (timeSinceComm > config.commTimeout * 0.5) {
      return {
        action: 'maintain',
        powerLimit: currentState.currentPower,
        reason: 'degraded_communication',
        warning: true
      };
    }

    return { action: 'normal', reason: 'healthy' };
  }

  /**
   * Test fail-safe for a station
   */
  async testFailSafe(stationId) {
    const config = this.defaults.get(stationId);
    if (!config) {
      throw new Error(`Station ${stationId} not registered for fail-safe`);
    }

    console.log(`[FailSafe] Testing fail-safe for station ${stationId}`);

    // Simulate offline
    const originalIsOffline = config.isOffline;
    const originalFailSafeActive = config.failSafeActive;

    config.isOffline = true;
    const action = await this.applyFailSafe(stationId);

    // Restore state
    config.isOffline = originalIsOffline;
    config.failSafeActive = originalFailSafeActive;

    return {
      success: true,
      stationId,
      action,
      config: {
        offlineAction: config.offlineAction,
        safePowerLimit: config.safePowerLimit
      }
    };
  }
}

// Singleton instance
const failSafeManager = new FailSafeManager();

export default failSafeManager;
