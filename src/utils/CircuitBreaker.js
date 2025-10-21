/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking errors and automatically
 * stopping requests to failing services, allowing time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60s default
    this.resetTimeout = options.resetTimeout || 30000; // 30s default
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1s default

    // State
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    this.lastSuccessTime = null;

    // Statistics
    this.stats = {
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalRejections: 0,
      lastError: null
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, ...args) {
    this.stats.totalCalls++;

    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.stats.totalRejections++;
        const error = new Error(`Circuit breaker ${this.name} is OPEN`);
        error.code = 'CIRCUIT_OPEN';
        throw error;
      }
      // Transition to HALF_OPEN to test recovery
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN state`);
    }

    // Execute with retry logic
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this._executeWithTimeout(fn, args);

        // Record success
        this._onSuccess();
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on timeout or explicit non-retryable errors
        if (error.code === 'TIMEOUT' || error.retryable === false) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }

    // All retries failed
    this._onFailure(lastError);
    throw lastError;
  }

  /**
   * Execute function with timeout
   */
  async _executeWithTimeout(fn, args) {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        this.stats.totalTimeouts++;
        const error = new Error(`Operation timed out after ${this.timeout}ms`);
        error.code = 'TIMEOUT';
        reject(error);
      }, this.timeout);

      try {
        const result = await fn(...args);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  _onSuccess() {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    this.stats.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        console.log(`[CircuitBreaker:${this.name}] Transitioning to CLOSED state`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  _onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.stats.totalFailures++;
    this.stats.lastError = {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.error(`[CircuitBreaker:${this.name}] Transitioning to OPEN state. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    console.log(`[CircuitBreaker:${this.name}] Manually reset to CLOSED state`);
  }

  /**
   * Get current state and statistics
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
      stats: this.stats,
      config: {
        failureThreshold: this.failureThreshold,
        successThreshold: this.successThreshold,
        timeout: this.timeout,
        resetTimeout: this.resetTimeout,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      }
    };
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy() {
    return this.state === 'CLOSED';
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers by name
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker
   */
  get(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ ...options, name }));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll() {
    return Array.from(this.breakers.values());
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers.entries()) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Check if all circuits are healthy
   */
  areAllHealthy() {
    for (const breaker of this.breakers.values()) {
      if (!breaker.isHealthy()) {
        return false;
      }
    }
    return true;
  }
}

// Global registry instance
const registry = new CircuitBreakerRegistry();

export { CircuitBreaker, CircuitBreakerRegistry, registry as circuitBreakerRegistry };
