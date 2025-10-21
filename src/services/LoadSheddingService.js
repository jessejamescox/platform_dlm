/**
 * Load Shedding Service with Hysteresis
 *
 * Implements intelligent load shedding to prevent grid overload
 * with hysteresis to prevent oscillation and chatter.
 *
 * Priority-based shedding ensures critical loads are maintained
 * while non-critical loads are shed first.
 */

class LoadSheddingService {
  constructor() {
    // Hysteresis configuration
    this.hysteresis = {
      upperThreshold: 0.95, // 95% of capacity - start shedding
      lowerThreshold: 0.85, // 85% of capacity - stop shedding
      deadband: 0.10 // 10% hysteresis band
    };

    // State
    this.sheddingActive = false;
    this.sheddingLevel = 0; // 0-5 levels of severity
    this.lastShedTime = null;
    this.lastRestoreTime = null;
    this.sheddingHistory = [];
    this.maxHistoryLength = 100;

    // Smoothing configuration
    this.smoothingWindow = 5; // Number of samples for moving average
    this.loadSamples = [];
    this.smoothedLoad = 0;

    // Ramping configuration
    this.maxLoadChangeRate = 0.05; // 5% per update cycle
    this.minUpdateInterval = 2000; // 2s minimum between updates
    this.lastUpdateTime = Date.now();

    // Shedding strategies
    this.strategies = new Map();
    this.registerDefaultStrategies();
  }

  /**
   * Register default shedding strategies
   */
  registerDefaultStrategies() {
    // Level 1: Reduce non-essential loads
    this.strategies.set(1, {
      name: 'Reduce Non-Essential',
      description: 'Reduce power to lowest priority stations by 20%',
      reduction: 0.20,
      priorityThreshold: 3,
      action: 'reduce'
    });

    // Level 2: Reduce all non-critical loads
    this.strategies.set(2, {
      name: 'Reduce Non-Critical',
      description: 'Reduce power to priority ≤5 stations by 40%',
      reduction: 0.40,
      priorityThreshold: 5,
      action: 'reduce'
    });

    // Level 3: Reduce all loads
    this.strategies.set(3, {
      name: 'Reduce All Loads',
      description: 'Reduce power to all stations by 50%',
      reduction: 0.50,
      priorityThreshold: 10,
      action: 'reduce'
    });

    // Level 4: Stop non-critical charging
    this.strategies.set(4, {
      name: 'Stop Non-Critical',
      description: 'Stop charging on priority ≤5 stations',
      reduction: 1.0,
      priorityThreshold: 5,
      action: 'stop'
    });

    // Level 5: Emergency - stop all except critical
    this.strategies.set(5, {
      name: 'Emergency Stop',
      description: 'Stop all charging except priority 9-10 stations',
      reduction: 1.0,
      priorityThreshold: 8,
      action: 'stop'
    });
  }

  /**
   * Update load measurement with smoothing
   */
  updateLoad(currentLoad, capacity) {
    // Add to samples
    this.loadSamples.push(currentLoad / capacity);
    if (this.loadSamples.length > this.smoothingWindow) {
      this.loadSamples.shift();
    }

    // Calculate smoothed load (moving average)
    this.smoothedLoad = this.loadSamples.reduce((sum, val) => sum + val, 0) / this.loadSamples.length;

    return this.smoothedLoad;
  }

  /**
   * Evaluate if load shedding is needed
   */
  evaluate(currentLoad, capacity, stations) {
    const now = Date.now();

    // Enforce minimum update interval
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      return null;
    }

    // Update smoothed load
    const loadRatio = this.updateLoad(currentLoad, capacity);

    // Determine shedding action using hysteresis
    let targetLevel = 0;

    if (loadRatio >= this.hysteresis.upperThreshold) {
      // Overload - activate or increase shedding
      targetLevel = this.calculateSheddingLevel(loadRatio);
    } else if (loadRatio <= this.hysteresis.lowerThreshold) {
      // Load reduced - deactivate or decrease shedding
      targetLevel = 0;
    } else {
      // In hysteresis band - maintain current state
      targetLevel = this.sheddingLevel;
    }

    // Check if state change is needed
    if (targetLevel !== this.sheddingLevel) {
      this.lastUpdateTime = now;
      return this.transitionToLevel(targetLevel, stations, loadRatio, capacity);
    }

    return null;
  }

  /**
   * Calculate required shedding level based on overload severity
   */
  calculateSheddingLevel(loadRatio) {
    const overload = loadRatio - this.hysteresis.upperThreshold;

    if (overload >= 0.15) return 5; // >110% capacity - emergency
    if (overload >= 0.10) return 4; // >105% capacity - critical
    if (overload >= 0.07) return 3; // >102% capacity - severe
    if (overload >= 0.04) return 2; // >99% capacity - moderate
    if (overload >= 0.00) return 1; // >95% capacity - mild

    return 0;
  }

  /**
   * Transition to a new shedding level
   */
  transitionToLevel(newLevel, stations, loadRatio, capacity) {
    const previousLevel = this.sheddingLevel;
    this.sheddingLevel = newLevel;

    const transition = {
      timestamp: new Date().toISOString(),
      previousLevel,
      newLevel,
      loadRatio: (loadRatio * 100).toFixed(2) + '%',
      capacity,
      actions: []
    };

    if (newLevel > previousLevel) {
      // Increasing shedding
      console.warn(`[LoadShedding] ⚠️  Escalating to Level ${newLevel} (load: ${transition.loadRatio})`);
      this.sheddingActive = true;
      this.lastShedTime = Date.now();
      transition.actions = this.applyShedding(newLevel, stations);
    } else if (newLevel < previousLevel) {
      // Decreasing shedding
      console.log(`[LoadShedding] ✓ De-escalating to Level ${newLevel} (load: ${transition.loadRatio})`);
      if (newLevel === 0) {
        this.sheddingActive = false;
        this.lastRestoreTime = Date.now();
      }
      transition.actions = this.restorePower(newLevel, stations);
    }

    // Record in history
    this.recordHistory(transition);

    return transition;
  }

  /**
   * Apply shedding strategy
   */
  applyShedding(level, stations) {
    const strategy = this.strategies.get(level);
    if (!strategy) {
      console.error(`[LoadShedding] Unknown shedding level: ${level}`);
      return [];
    }

    console.log(`[LoadShedding] Applying strategy: ${strategy.name}`);

    const actions = [];
    const stationsArray = Array.from(stations.values());

    // Sort stations by priority (lowest first for shedding)
    const sortedStations = stationsArray
      .filter(s => s.status === 'charging')
      .sort((a, b) => (a.priority || 5) - (b.priority || 5));

    for (const station of sortedStations) {
      const stationPriority = station.priority || 5;

      // Skip stations above priority threshold
      if (stationPriority > strategy.priorityThreshold) {
        continue;
      }

      let action;
      if (strategy.action === 'stop') {
        // Stop charging
        action = {
          stationId: station.id,
          stationName: station.name,
          action: 'stop',
          previousPower: station.currentPower,
          newPower: 0,
          priority: stationPriority,
          reason: `Shedding Level ${level}: ${strategy.description}`
        };
      } else if (strategy.action === 'reduce') {
        // Reduce power
        const newPower = Math.max(
          station.minPower || 3.7,
          station.currentPower * (1 - strategy.reduction)
        );

        action = {
          stationId: station.id,
          stationName: station.name,
          action: 'reduce',
          previousPower: station.currentPower,
          newPower: newPower,
          reduction: strategy.reduction,
          priority: stationPriority,
          reason: `Shedding Level ${level}: ${strategy.description}`
        };
      }

      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Restore power after shedding
   */
  restorePower(newLevel, stations) {
    console.log(`[LoadShedding] Restoring power to appropriate levels`);

    const actions = [];
    const strategy = newLevel > 0 ? this.strategies.get(newLevel) : null;

    for (const station of stations.values()) {
      if (station.status !== 'charging') continue;

      const stationPriority = station.priority || 5;
      const requestedPower = station.requestedPower || station.maxPower;

      // Determine target power based on new level
      let targetPower;

      if (newLevel === 0) {
        // Full restore
        targetPower = requestedPower;
      } else if (strategy) {
        // Partial restore based on new strategy
        if (stationPriority > strategy.priorityThreshold) {
          targetPower = requestedPower;
        } else {
          targetPower = Math.max(
            station.minPower || 3.7,
            requestedPower * (1 - strategy.reduction)
          );
        }
      } else {
        targetPower = requestedPower;
      }

      // Only create action if power needs to change
      if (Math.abs(targetPower - station.currentPower) > 0.1) {
        actions.push({
          stationId: station.id,
          stationName: station.name,
          action: 'restore',
          previousPower: station.currentPower,
          newPower: targetPower,
          priority: stationPriority,
          reason: newLevel === 0 ? 'Full restore' : `Partial restore to Level ${newLevel}`
        });
      }
    }

    return actions;
  }

  /**
   * Apply ramping to power change
   */
  applyRamping(currentPower, targetPower, maxPower) {
    const maxChange = maxPower * this.maxLoadChangeRate;
    const desiredChange = targetPower - currentPower;

    if (Math.abs(desiredChange) <= maxChange) {
      return targetPower;
    }

    return currentPower + Math.sign(desiredChange) * maxChange;
  }

  /**
   * Record shedding event in history
   */
  recordHistory(event) {
    this.sheddingHistory.push(event);

    // Limit history length
    if (this.sheddingHistory.length > this.maxHistoryLength) {
      this.sheddingHistory.shift();
    }
  }

  /**
   * Get shedding status
   */
  getStatus() {
    return {
      active: this.sheddingActive,
      level: this.sheddingLevel,
      smoothedLoad: (this.smoothedLoad * 100).toFixed(2) + '%',
      hysteresis: {
        upperThreshold: (this.hysteresis.upperThreshold * 100).toFixed(0) + '%',
        lowerThreshold: (this.hysteresis.lowerThreshold * 100).toFixed(0) + '%',
        deadband: (this.hysteresis.deadband * 100).toFixed(0) + '%'
      },
      lastShedTime: this.lastShedTime ? new Date(this.lastShedTime).toISOString() : null,
      lastRestoreTime: this.lastRestoreTime ? new Date(this.lastRestoreTime).toISOString() : null,
      currentStrategy: this.sheddingLevel > 0 ? this.strategies.get(this.sheddingLevel) : null,
      recentHistory: this.sheddingHistory.slice(-10)
    };
  }

  /**
   * Update hysteresis configuration
   */
  updateHysteresis(config) {
    if (config.upperThreshold !== undefined) {
      this.hysteresis.upperThreshold = config.upperThreshold;
    }
    if (config.lowerThreshold !== undefined) {
      this.hysteresis.lowerThreshold = config.lowerThreshold;
    }
    this.hysteresis.deadband = this.hysteresis.upperThreshold - this.hysteresis.lowerThreshold;

    console.log('[LoadShedding] Updated hysteresis:', this.hysteresis);
  }

  /**
   * Register custom shedding strategy
   */
  registerStrategy(level, strategy) {
    this.strategies.set(level, strategy);
    console.log(`[LoadShedding] Registered custom strategy for level ${level}: ${strategy.name}`);
  }

  /**
   * Get all strategies
   */
  getStrategies() {
    const strategies = {};
    for (const [level, strategy] of this.strategies.entries()) {
      strategies[level] = strategy;
    }
    return strategies;
  }

  /**
   * Reset state
   */
  reset() {
    this.sheddingActive = false;
    this.sheddingLevel = 0;
    this.loadSamples = [];
    this.smoothedLoad = 0;
    console.log('[LoadShedding] Reset to initial state');
  }

  /**
   * Simulate load shedding scenario
   */
  simulate(loadRatio, capacity, stations) {
    const level = this.calculateSheddingLevel(loadRatio);
    const strategy = this.strategies.get(level);

    if (!strategy) {
      return { level: 0, actions: [] };
    }

    const actions = this.applyShedding(level, stations);

    return {
      level,
      strategy,
      loadRatio: (loadRatio * 100).toFixed(2) + '%',
      actions,
      totalReduction: actions.reduce((sum, a) => sum + (a.previousPower - a.newPower), 0)
    };
  }
}

// Singleton instance
const loadSheddingService = new LoadSheddingService();

export default loadSheddingService;
