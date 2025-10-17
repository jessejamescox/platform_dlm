/**
 * PVManager - Manages PV (Photovoltaic) system integration
 * Handles excess solar charging and PV production monitoring
 */

export class PVManager {
  constructor(state) {
    this.state = state;
    this.updateInterval = null;
    this.productionHistory = [];
  }

  async initialize() {
    if (!this.state.config.pvSystemEnabled) {
      console.log('☀️  PV System disabled');
      return;
    }

    console.log('☀️  Initializing PV Manager...');

    // Subscribe to PV production data via MQTT
    if (process.env.PV_MQTT_TOPIC) {
      await this.subscribeToPVData();
    }

    // Start periodic production tracking
    this.updateInterval = setInterval(() => {
      this.updateProductionMetrics();
    }, 10000); // Every 10 seconds

    console.log('✅ PV Manager initialized');
  }

  /**
   * Subscribe to PV production data via MQTT
   */
  async subscribeToPVData() {
    const topic = process.env.PV_MQTT_TOPIC || 'pv/energy/production';

    try {
      await this.state.pvManager.mqttDriver.subscribe(topic, (message) => {
        this.handlePVProduction(message);
      });
      console.log(`📡 Subscribed to PV topic: ${topic}`);
    } catch (error) {
      console.error('Failed to subscribe to PV data:', error);
    }
  }

  /**
   * Handle PV production MQTT message
   */
  handlePVProduction(message) {
    try {
      const data = JSON.parse(message);
      const production = data.power || data.production || 0;

      this.updateProduction(production);
    } catch (error) {
      console.error('Error parsing PV production data:', error);
    }
  }

  /**
   * Update PV production value
   */
  updateProduction(production) {
    this.state.currentLoad.pvProduction = Math.max(0, production);

    // Log to history
    this.productionHistory.push({
      timestamp: new Date().toISOString(),
      production: production
    });

    // Keep last 1000 entries
    if (this.productionHistory.length > 1000) {
      this.productionHistory.shift();
    }

    // Broadcast update
    this.state.broadcast({
      type: 'pv.production',
      data: {
        production: production,
        timestamp: new Date().toISOString()
      }
    });

    // Check if excess charging should be triggered
    if (this.state.config.enablePVExcessCharging) {
      this.handleExcessCharging();
    }
  }

  /**
   * Handle excess PV charging
   * When PV production exceeds building consumption, use excess for EV charging
   */
  handleExcessCharging() {
    const pvProduction = this.state.currentLoad.pvProduction;
    const buildingConsumption = this.state.currentLoad.gridConsumption || 0;
    const chargingLoad = this.state.currentLoad.chargingLoad || 0;

    const excess = pvProduction - buildingConsumption;

    if (excess > this.state.config.minChargingPower) {
      // We have excess PV power available

      // Find stations that are ready but not charging
      const readyStations = Array.from(this.state.stations.values())
        .filter(s => s.status === 'ready' && s.user !== null);

      if (readyStations.length > 0) {
        // Prioritize stations for excess charging
        const prioritized = readyStations.sort((a, b) => {
          // Prefer stations with excess charging enabled
          if (a.enableExcessCharging && !b.enableExcessCharging) return -1;
          if (!a.enableExcessCharging && b.enableExcessCharging) return 1;
          return b.priority - a.priority;
        });

        // Start charging on highest priority ready station
        const station = prioritized[0];
        if (station && station.status === 'ready') {
          station.status = 'charging';
          station.chargingStartedAt = new Date().toISOString();
          station.excessChargingMode = true;

          this.state.broadcast({
            type: 'station.excess.charging.started',
            data: {
              stationId: station.id,
              excessPower: excess
            }
          });

          // Trigger load rebalancing
          if (this.state.loadManager) {
            this.state.loadManager.balanceLoad();
          }
        }
      }
    } else if (excess < 0) {
      // Not enough PV power, stop excess charging sessions
      const excessChargingStations = Array.from(this.state.stations.values())
        .filter(s => s.excessChargingMode && s.status === 'charging');

      for (const station of excessChargingStations) {
        // Only stop if priority is low enough
        if (station.priority < 7) {
          station.status = 'ready';
          station.excessChargingMode = false;

          this.state.broadcast({
            type: 'station.excess.charging.stopped',
            data: {
              stationId: station.id,
              reason: 'insufficient_pv_production'
            }
          });
        }
      }

      // Trigger load rebalancing
      if (this.state.loadManager) {
        this.state.loadManager.balanceLoad();
      }
    }
  }

  /**
   * Update production metrics
   */
  updateProductionMetrics() {
    // Calculate averages
    const recent = this.productionHistory.slice(-60); // Last 10 minutes
    if (recent.length > 0) {
      const avg = recent.reduce((sum, entry) => sum + entry.production, 0) / recent.length;
      const max = Math.max(...recent.map(e => e.production));
      const min = Math.min(...recent.map(e => e.production));

      // Log to InfluxDB
      if (this.state.dataLogger) {
        this.state.dataLogger.logPVMetrics({
          current: this.state.currentLoad.pvProduction,
          average: avg,
          max: max,
          min: min
        });
      }
    }
  }

  /**
   * Get PV status
   */
  getStatus() {
    const recent = this.productionHistory.slice(-60);
    const avg = recent.length > 0
      ? recent.reduce((sum, e) => sum + e.production, 0) / recent.length
      : 0;

    return {
      enabled: this.state.config.pvSystemEnabled,
      currentProduction: this.state.currentLoad.pvProduction,
      averageProduction: avg,
      maxCapacity: parseFloat(process.env.PV_MAX_CAPACITY_KW) || 100,
      excessChargingEnabled: this.state.config.enablePVExcessCharging,
      history: this.productionHistory.slice(-100)
    };
  }

  /**
   * Simulate PV production (for testing without real PV system)
   */
  simulateProduction() {
    const hour = new Date().getHours();
    const maxCapacity = parseFloat(process.env.PV_MAX_CAPACITY_KW) || 100;

    // Simple sinusoidal simulation based on time of day
    // Production peaks at noon, zero at night
    let production = 0;

    if (hour >= 6 && hour <= 18) {
      const hourFromPeak = Math.abs(12 - hour);
      const efficiency = Math.cos((hourFromPeak / 6) * (Math.PI / 2));
      production = maxCapacity * efficiency;

      // Add some randomness
      production *= (0.8 + Math.random() * 0.4);
    }

    this.updateProduction(Math.max(0, production));
  }

  async shutdown() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('☀️  PV Manager shut down');
  }
}
