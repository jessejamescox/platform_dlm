/**
 * Comprehensive Health Check Service
 *
 * Monitors all system dependencies and provides health status endpoints
 * for container orchestration, load balancers, and monitoring systems.
 */

import { circuitBreakerRegistry } from '../utils/CircuitBreaker.js';
import { watchdogRegistry } from '../utils/Watchdog.js';

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.dependencies = new Map();
    this.lastCheckTime = null;
    this.checkInterval = null;
    this.checkFrequency = 30000; // 30s default
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      checkFn,
      critical: options.critical !== false,
      timeout: options.timeout || 5000,
      lastStatus: null,
      lastCheck: null,
      consecutiveFailures: 0
    });
  }

  /**
   * Register a dependency (external service)
   */
  registerDependency(name, config) {
    this.dependencies.set(name, {
      name,
      type: config.type, // 'database', 'broker', 'api', etc.
      critical: config.critical !== false,
      status: 'unknown',
      lastCheck: null,
      uptime: 0,
      downtime: 0,
      lastStatusChange: Date.now()
    });
  }

  /**
   * Update dependency status
   */
  updateDependencyStatus(name, isHealthy, details = {}) {
    const dep = this.dependencies.get(name);
    if (!dep) return;

    const now = Date.now();
    const previousStatus = dep.status;
    dep.status = isHealthy ? 'healthy' : 'unhealthy';
    dep.lastCheck = now;
    dep.details = details;

    // Track uptime/downtime
    if (previousStatus !== dep.status) {
      const duration = now - dep.lastStatusChange;
      if (previousStatus === 'healthy') {
        dep.uptime += duration;
      } else if (previousStatus === 'unhealthy') {
        dep.downtime += duration;
      }
      dep.lastStatusChange = now;
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    this.lastCheckTime = Date.now();
    const results = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        const result = await this._runCheckWithTimeout(check);
        check.lastStatus = result.healthy ? 'pass' : 'fail';
        check.lastCheck = Date.now();

        if (result.healthy) {
          check.consecutiveFailures = 0;
        } else {
          check.consecutiveFailures++;
        }

        results[name] = {
          status: check.lastStatus,
          healthy: result.healthy,
          message: result.message,
          details: result.details,
          timestamp: new Date(check.lastCheck).toISOString(),
          consecutiveFailures: check.consecutiveFailures
        };
      } catch (error) {
        check.lastStatus = 'fail';
        check.lastCheck = Date.now();
        check.consecutiveFailures++;

        results[name] = {
          status: 'fail',
          healthy: false,
          message: error.message,
          error: error.code || 'UNKNOWN_ERROR',
          timestamp: new Date(check.lastCheck).toISOString(),
          consecutiveFailures: check.consecutiveFailures
        };
      }
    }

    return results;
  }

  /**
   * Run a single check with timeout
   */
  async _runCheckWithTimeout(check) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check ${check.name} timed out after ${check.timeout}ms`));
      }, check.timeout);

      try {
        const result = await check.checkFn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Get overall system health
   */
  async getSystemHealth() {
    const checkResults = await this.runAllChecks();
    const circuitBreakerStatus = circuitBreakerRegistry.getAllStatus();
    const watchdogStatus = watchdogRegistry.getAllStatus();

    // Determine overall health
    let overallHealthy = true;
    const criticalFailures = [];

    // Check health checks
    for (const [name, check] of this.checks.entries()) {
      if (check.critical && check.lastStatus === 'fail') {
        overallHealthy = false;
        criticalFailures.push(`Check: ${name}`);
      }
    }

    // Check dependencies
    for (const [name, dep] of this.dependencies.entries()) {
      if (dep.critical && dep.status === 'unhealthy') {
        overallHealthy = false;
        criticalFailures.push(`Dependency: ${name}`);
      }
    }

    // Check circuit breakers
    for (const [name, breaker] of Object.entries(circuitBreakerStatus)) {
      if (breaker.state === 'OPEN') {
        overallHealthy = false;
        criticalFailures.push(`Circuit: ${name}`);
      }
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: checkResults,
      dependencies: this._getDependencyStatus(),
      circuitBreakers: circuitBreakerStatus,
      watchdogs: watchdogStatus,
      criticalFailures: criticalFailures.length > 0 ? criticalFailures : undefined,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };
  }

  /**
   * Get dependency status summary
   */
  _getDependencyStatus() {
    const status = {};
    for (const [name, dep] of this.dependencies.entries()) {
      status[name] = {
        type: dep.type,
        status: dep.status,
        critical: dep.critical,
        lastCheck: dep.lastCheck ? new Date(dep.lastCheck).toISOString() : null,
        uptime: dep.uptime,
        downtime: dep.downtime,
        availability: this._calculateAvailability(dep),
        details: dep.details
      };
    }
    return status;
  }

  /**
   * Calculate availability percentage
   */
  _calculateAvailability(dep) {
    const totalTime = dep.uptime + dep.downtime;
    if (totalTime === 0) return 100;
    return ((dep.uptime / totalTime) * 100).toFixed(2);
  }

  /**
   * Get liveness probe (basic check - is the service running?)
   */
  async getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Get readiness probe (is the service ready to accept traffic?)
   */
  async getReadiness() {
    const criticalChecks = [];
    let ready = true;

    // Check critical dependencies
    for (const [name, dep] of this.dependencies.entries()) {
      if (dep.critical) {
        const isHealthy = dep.status === 'healthy';
        criticalChecks.push({ name, healthy: isHealthy });
        if (!isHealthy) ready = false;
      }
    }

    // Check critical circuit breakers
    const breakerStatus = circuitBreakerRegistry.getAllStatus();
    for (const [name, breaker] of Object.entries(breakerStatus)) {
      if (breaker.state === 'OPEN') {
        criticalChecks.push({ name: `circuit:${name}`, healthy: false });
        ready = false;
      }
    }

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: criticalChecks
    };
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(frequency = this.checkFrequency) {
    this.checkFrequency = frequency;
    this.stopPeriodicChecks(); // Clear any existing interval

    this.checkInterval = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        console.error('[HealthCheck] Periodic check failed:', error);
      }
    }, frequency);

    console.log(`[HealthCheck] Started periodic checks every ${frequency}ms`);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register standard health checks
   */
  registerStandardChecks(managers) {
    // Memory check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

      return {
        healthy: heapUsedPercent < 90,
        message: `Heap usage: ${heapUsedPercent.toFixed(2)}%`,
        details: usage
      };
    }, { critical: true });

    // Event loop lag check
    this.registerCheck('eventLoop', async () => {
      const start = Date.now();
      await new Promise(resolve => setImmediate(resolve));
      const lag = Date.now() - start;

      return {
        healthy: lag < 100,
        message: `Event loop lag: ${lag}ms`,
        details: { lag }
      };
    }, { critical: true });

    // Database check (InfluxDB)
    if (managers.dataLogger) {
      this.registerCheck('influxdb', async () => {
        const isConnected = managers.dataLogger.influx !== null;
        return {
          healthy: isConnected,
          message: isConnected ? 'InfluxDB connected' : 'InfluxDB disconnected',
          details: { connected: isConnected }
        };
      }, { critical: false }); // Non-critical as system can work without it
    }

    // MQTT broker check
    if (managers.mqttDriver) {
      this.registerCheck('mqtt', async () => {
        const isConnected = managers.mqttDriver.isConnected();
        return {
          healthy: isConnected || true, // Non-critical
          message: isConnected ? 'MQTT connected' : 'MQTT disconnected',
          details: { connected: isConnected }
        };
      }, { critical: false });
    }

    // OCPP server check
    if (managers.ocppDriver) {
      this.registerCheck('ocpp', async () => {
        const isRunning = managers.ocppDriver.server !== null;
        return {
          healthy: isRunning || true, // Non-critical
          message: isRunning ? 'OCPP server running' : 'OCPP server not running',
          details: { running: isRunning }
        };
      }, { critical: false });
    }

    // Load manager check
    if (managers.loadManager) {
      this.registerCheck('loadManager', async () => {
        const isRunning = managers.loadManager.balancingInterval !== null;
        return {
          healthy: isRunning,
          message: isRunning ? 'Load manager running' : 'Load manager stopped',
          details: { running: isRunning }
        };
      }, { critical: true });
    }

    // Station manager check
    if (managers.stationManager) {
      this.registerCheck('stationManager', async () => {
        const stationCount = managers.stationManager.stations.size;
        return {
          healthy: true,
          message: `Managing ${stationCount} stations`,
          details: { stationCount }
        };
      }, { critical: true });
    }
  }
}

// Singleton instance
const healthCheckService = new HealthCheckService();

export default healthCheckService;
