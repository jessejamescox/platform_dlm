/**
 * Watchdog Timer Utility
 *
 * Monitors operations and detects stalled/hung processes.
 * Automatically triggers recovery actions when operations exceed time limits.
 */

class Watchdog {
  constructor(options = {}) {
    this.name = options.name || 'Watchdog';
    this.timeout = options.timeout || 30000; // 30s default
    this.onTimeout = options.onTimeout || this._defaultTimeoutHandler;
    this.autoReset = options.autoReset !== false;

    this.timer = null;
    this.startTime = null;
    this.active = false;
    this.timeoutCount = 0;
    this.lastTimeout = null;
  }

  /**
   * Start the watchdog timer
   */
  start() {
    if (this.active) {
      this.reset();
    }

    this.active = true;
    this.startTime = Date.now();
    this.timer = setTimeout(() => {
      this._handleTimeout();
    }, this.timeout);

    return this;
  }

  /**
   * Reset (kick) the watchdog timer
   */
  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.active && this.autoReset) {
      this.startTime = Date.now();
      this.timer = setTimeout(() => {
        this._handleTimeout();
      }, this.timeout);
    }

    return this;
  }

  /**
   * Stop the watchdog timer
   */
  stop() {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.startTime = null;
    return this;
  }

  /**
   * Handle timeout event
   */
  _handleTimeout() {
    this.timeoutCount++;
    this.lastTimeout = Date.now();
    this.active = false;

    const duration = this.lastTimeout - this.startTime;
    const error = new Error(`Watchdog ${this.name} timeout after ${duration}ms`);
    error.code = 'WATCHDOG_TIMEOUT';
    error.duration = duration;
    error.name = this.name;

    console.error(`[Watchdog:${this.name}] TIMEOUT detected after ${duration}ms`);

    // Call timeout handler
    this.onTimeout(error);
  }

  /**
   * Default timeout handler
   */
  _defaultTimeoutHandler(error) {
    console.error('[Watchdog] Operation timed out:', error.message);
  }

  /**
   * Get watchdog status
   */
  getStatus() {
    return {
      name: this.name,
      active: this.active,
      timeout: this.timeout,
      startTime: this.startTime ? new Date(this.startTime).toISOString() : null,
      elapsed: this.startTime ? Date.now() - this.startTime : 0,
      remaining: this.active && this.startTime ? Math.max(0, this.timeout - (Date.now() - this.startTime)) : 0,
      timeoutCount: this.timeoutCount,
      lastTimeout: this.lastTimeout ? new Date(this.lastTimeout).toISOString() : null
    };
  }

  /**
   * Check if watchdog is healthy (not timed out recently)
   */
  isHealthy() {
    if (!this.lastTimeout) return true;
    // Healthy if no timeout in last 5 minutes
    return Date.now() - this.lastTimeout > 300000;
  }
}

/**
 * Watchdog Registry
 * Manages multiple watchdogs
 */
class WatchdogRegistry {
  constructor() {
    this.watchdogs = new Map();
  }

  /**
   * Create and register a watchdog
   */
  create(name, options = {}) {
    const watchdog = new Watchdog({ ...options, name });
    this.watchdogs.set(name, watchdog);
    return watchdog;
  }

  /**
   * Get a watchdog by name
   */
  get(name) {
    return this.watchdogs.get(name);
  }

  /**
   * Remove a watchdog
   */
  remove(name) {
    const watchdog = this.watchdogs.get(name);
    if (watchdog) {
      watchdog.stop();
      this.watchdogs.delete(name);
    }
  }

  /**
   * Get all watchdogs
   */
  getAll() {
    return Array.from(this.watchdogs.values());
  }

  /**
   * Get status of all watchdogs
   */
  getAllStatus() {
    const status = {};
    for (const [name, watchdog] of this.watchdogs.entries()) {
      status[name] = watchdog.getStatus();
    }
    return status;
  }

  /**
   * Stop all watchdogs
   */
  stopAll() {
    for (const watchdog of this.watchdogs.values()) {
      watchdog.stop();
    }
  }

  /**
   * Check if all watchdogs are healthy
   */
  areAllHealthy() {
    for (const watchdog of this.watchdogs.values()) {
      if (!watchdog.isHealthy()) {
        return false;
      }
    }
    return true;
  }
}

// Global registry instance
const registry = new WatchdogRegistry();

export { Watchdog, WatchdogRegistry, registry as watchdogRegistry };
