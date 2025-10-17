/**
 * LoadManager - Core service for dynamic load distribution
 * Manages power allocation across charging stations based on:
 * - Available grid capacity
 * - PV production
 * - Station priorities
 * - Schedules
 * - Building/housing unit limits
 */

export class LoadManager {
  constructor(state) {
    this.state = state;
    this.updateInterval = null;
    this.allocationHistory = [];
  }

  async initialize() {
    console.log('⚡ Initializing Load Manager...');

    // Start periodic load balancing
    this.updateInterval = setInterval(() => {
      this.balanceLoad();
    }, 5000); // Every 5 seconds

    console.log('✅ Load Manager initialized');
  }

  /**
   * Main load balancing algorithm
   */
  balanceLoad() {
    try {
      const stations = Array.from(this.state.stations.values());
      const activeStations = stations.filter(s => s.status === 'charging' || s.status === 'ready');

      if (activeStations.length === 0) {
        this.updateCurrentLoad(0, 0);
        return;
      }

      // Calculate available capacity
      const availableCapacity = this.calculateAvailableCapacity();

      // Get stations sorted by priority
      const prioritizedStations = this.prioritizeStations(activeStations);

      // Distribute power
      const allocations = this.distributePower(prioritizedStations, availableCapacity);

      // Apply allocations
      this.applyAllocations(allocations);

      // Update current load metrics
      const totalAllocated = allocations.reduce((sum, a) => sum + a.power, 0);
      this.updateCurrentLoad(totalAllocated, availableCapacity);

      // Log allocation
      this.logAllocation(allocations);

      // Broadcast update
      this.state.broadcast({
        type: 'load.updated',
        data: {
          totalLoad: this.state.currentLoad.total,
          availableCapacity: this.state.currentLoad.available,
          pvProduction: this.state.currentLoad.pvProduction,
          allocations: allocations.map(a => ({
            stationId: a.station.id,
            stationName: a.station.name,
            power: a.power,
            priority: a.station.priority
          }))
        }
      });

    } catch (error) {
      console.error('Error in load balancing:', error);
    }
  }

  /**
   * Calculate available capacity considering grid, PV, and other consumers
   */
  calculateAvailableCapacity() {
    const { maxGridCapacity, pvSystemEnabled } = this.state.config;

    let baseCapacity = maxGridCapacity;

    // Add PV production if enabled
    if (pvSystemEnabled && this.state.currentLoad.pvProduction > 0) {
      baseCapacity += this.state.currentLoad.pvProduction;
    }

    // Subtract other building loads (simulated for now)
    const otherLoads = this.state.currentLoad.gridConsumption || 0;
    const available = baseCapacity - otherLoads;

    return Math.max(0, available);
  }

  /**
   * Prioritize stations based on multiple factors
   */
  prioritizeStations(stations) {
    return stations.sort((a, b) => {
      // Priority 1: Explicit priority level (1-10)
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }

      // Priority 2: RFID/User class priority
      const aPriorityClass = a.user?.priorityClass || 5;
      const bPriorityClass = b.user?.priorityClass || 5;
      if (aPriorityClass !== bPriorityClass) {
        return aPriorityClass - bPriorityClass; // Lower class number = higher priority
      }

      // Priority 3: Scheduled charging
      if (a.scheduledCharging && !b.scheduledCharging) return -1;
      if (!a.scheduledCharging && b.scheduledCharging) return 1;

      // Priority 4: First come, first served (charging start time)
      const aStart = new Date(a.chargingStartedAt || 0);
      const bStart = new Date(b.chargingStartedAt || 0);
      return aStart - bStart;
    });
  }

  /**
   * Distribute available power among stations
   */
  distributePower(stations, availableCapacity) {
    const allocations = [];
    const { minChargingPower, maxChargingPowerPerStation } = this.state.config;

    let remainingCapacity = availableCapacity;

    // First pass: Allocate minimum power to all stations
    for (const station of stations) {
      const minPower = station.minPower || minChargingPower;

      if (remainingCapacity >= minPower) {
        const maxPower = station.maxPower || maxChargingPowerPerStation;
        const requestedPower = station.requestedPower || maxPower;

        // Allocate minimum or requested power (whichever is lower)
        const allocated = Math.min(minPower, requestedPower, remainingCapacity);

        allocations.push({
          station,
          power: allocated,
          isMinimum: true
        });

        remainingCapacity -= allocated;
      } else {
        // Not enough power for this station
        allocations.push({
          station,
          power: 0,
          isMinimum: false,
          reason: 'insufficient_capacity'
        });
      }
    }

    // Second pass: Distribute remaining capacity to stations that need more
    if (remainingCapacity > 0) {
      for (const allocation of allocations) {
        if (allocation.power === 0) continue;

        const station = allocation.station;
        const maxPower = station.maxPower || maxChargingPowerPerStation;
        const requestedPower = station.requestedPower || maxPower;

        const additionalNeeded = Math.min(
          requestedPower - allocation.power,
          maxPower - allocation.power
        );

        if (additionalNeeded > 0 && remainingCapacity > 0) {
          const additionalAllocated = Math.min(additionalNeeded, remainingCapacity);
          allocation.power += additionalAllocated;
          allocation.isMinimum = false;
          remainingCapacity -= additionalAllocated;
        }
      }
    }

    // Handle housing unit/zone limits
    this.applyZoneLimits(allocations);

    return allocations;
  }

  /**
   * Apply power limits per housing unit or zone
   */
  applyZoneLimits(allocations) {
    const zoneGroups = new Map();

    // Group stations by zone
    for (const allocation of allocations) {
      const zone = allocation.station.zone || 'default';
      if (!zoneGroups.has(zone)) {
        zoneGroups.set(zone, []);
      }
      zoneGroups.get(zone).push(allocation);
    }

    // Check and enforce zone limits
    for (const [zone, zoneAllocations] of zoneGroups) {
      const totalZonePower = zoneAllocations.reduce((sum, a) => sum + a.power, 0);

      // Get zone limit (could be configured per zone)
      const zoneLimit = this.getZoneLimit(zone);

      if (zoneLimit && totalZonePower > zoneLimit) {
        // Scale down all stations in this zone proportionally
        const scale = zoneLimit / totalZonePower;
        for (const allocation of zoneAllocations) {
          allocation.power *= scale;
          allocation.zoneLimited = true;
        }
      }
    }
  }

  /**
   * Get power limit for a specific zone/housing unit
   */
  getZoneLimit(zone) {
    // This could be configured per zone
    // For now, return null (no limit)
    return null;
  }

  /**
   * Apply power allocations to stations
   */
  async applyAllocations(allocations) {
    for (const allocation of allocations) {
      const station = allocation.station;
      const newPower = Math.round(allocation.power * 10) / 10; // Round to 1 decimal

      // Only update if power changed significantly (>0.1 kW difference)
      if (Math.abs((station.currentPower || 0) - newPower) > 0.1) {
        station.currentPower = newPower;
        station.lastUpdate = new Date().toISOString();

        // Update physical station via protocol driver
        try {
          await this.state.stationManager.setPower(station.id, newPower);
        } catch (error) {
          console.error(`Failed to set power for station ${station.id}:`, error.message);
        }

        // Broadcast individual station update
        this.state.broadcast({
          type: 'station.power.updated',
          data: {
            stationId: station.id,
            power: newPower,
            reason: allocation.reason || 'load_balancing'
          }
        });
      }
    }
  }

  /**
   * Update current load metrics
   */
  updateCurrentLoad(totalLoad, availableCapacity) {
    this.state.currentLoad.chargingLoad = totalLoad;
    this.state.currentLoad.total = totalLoad + (this.state.currentLoad.gridConsumption || 0);
    this.state.currentLoad.available = availableCapacity - totalLoad;

    // Log to InfluxDB
    if (this.state.dataLogger) {
      this.state.dataLogger.logLoadMetrics({
        totalLoad: this.state.currentLoad.total,
        chargingLoad: totalLoad,
        availableCapacity: this.state.currentLoad.available,
        pvProduction: this.state.currentLoad.pvProduction,
        gridConsumption: this.state.currentLoad.gridConsumption
      });
    }
  }

  /**
   * Log allocation for history/analytics
   */
  logAllocation(allocations) {
    const entry = {
      timestamp: new Date().toISOString(),
      allocations: allocations.map(a => ({
        stationId: a.station.id,
        power: a.power,
        priority: a.station.priority,
        reason: a.reason
      })),
      totalAllocated: allocations.reduce((sum, a) => sum + a.power, 0),
      availableCapacity: this.state.currentLoad.available
    };

    // Keep last 100 entries
    this.allocationHistory.push(entry);
    if (this.allocationHistory.length > 100) {
      this.allocationHistory.shift();
    }
  }

  /**
   * Get current load status
   */
  getLoadStatus() {
    return {
      currentLoad: this.state.currentLoad,
      gridCapacity: this.state.config.maxGridCapacity,
      utilizationPercent: (this.state.currentLoad.total / this.state.config.maxGridCapacity) * 100,
      stations: Array.from(this.state.stations.values()).map(s => ({
        id: s.id,
        name: s.name,
        currentPower: s.currentPower || 0,
        status: s.status,
        priority: s.priority
      }))
    };
  }

  /**
   * Set grid capacity limit
   */
  setGridCapacity(capacity) {
    this.state.config.maxGridCapacity = capacity;
    this.balanceLoad(); // Rebalance immediately
  }

  /**
   * Get allocation history
   */
  getAllocationHistory(limit = 10) {
    return this.allocationHistory.slice(-limit);
  }

  async shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('⚡ Load Manager shut down');
  }
}
