/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse and DoS attacks using
 * token bucket algorithm with configurable limits per endpoint.
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
    this.handler = options.handler || this.defaultHandler;
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;

    // Store request counts per key
    this.clients = new Map();

    // Cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * Default key generator (IP-based)
   */
  defaultKeyGenerator(req) {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Default rate limit exceeded handler
   */
  defaultHandler(req, res) {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again later.`,
      retryAfter: Math.ceil(this.windowMs / 1000)
    });
  }

  /**
   * Middleware function
   */
  middleware() {
    return async (req, res, next) => {
      const key = this.keyGenerator(req);
      const now = Date.now();

      // Get or create client record
      let client = this.clients.get(key);
      if (!client) {
        client = {
          count: 0,
          resetTime: now + this.windowMs,
          firstRequest: now
        };
        this.clients.set(key, client);
      }

      // Reset if window expired
      if (now > client.resetTime) {
        client.count = 0;
        client.resetTime = now + this.windowMs;
        client.firstRequest = now;
      }

      // Check rate limit
      if (client.count >= this.maxRequests) {
        // Add rate limit headers
        this.addHeaders(res, client);

        // Call handler
        return this.handler(req, res);
      }

      // Increment counter
      client.count++;
      client.lastRequest = now;

      // Add rate limit headers
      this.addHeaders(res, client);

      // Handle successful/failed requests
      const originalSend = res.send;
      res.send = function(data) {
        const statusCode = res.statusCode;

        // Decrement count if skipping successful/failed requests
        if ((statusCode < 400 && this.skipSuccessfulRequests) ||
            (statusCode >= 400 && this.skipFailedRequests)) {
          client.count--;
        }

        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Add rate limit headers to response
   */
  addHeaders(res, client) {
    const remaining = Math.max(0, this.maxRequests - client.count);
    const resetTime = Math.ceil(client.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (client.count >= this.maxRequests) {
      res.setHeader('Retry-After', Math.ceil((client.resetTime - Date.now()) / 1000));
    }
  }

  /**
   * Cleanup expired clients
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, client] of this.clients.entries()) {
      // Remove clients that haven't made requests in 2x window period
      if (client.lastRequest && (now - client.lastRequest) > (this.windowMs * 2)) {
        this.clients.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RateLimiter] Cleaned up ${cleaned} expired client entries`);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      clients: []
    };

    for (const [key, client] of this.clients.entries()) {
      stats.clients.push({
        key: key.substring(0, 20) + '...', // Truncate for privacy
        count: client.count,
        remaining: Math.max(0, this.maxRequests - client.count),
        resetTime: new Date(client.resetTime).toISOString(),
        firstRequest: new Date(client.firstRequest).toISOString(),
        lastRequest: client.lastRequest ? new Date(client.lastRequest).toISOString() : null
      });
    }

    return stats;
  }

  /**
   * Reset all limits
   */
  reset() {
    this.clients.clear();
  }

  /**
   * Reset limit for specific key
   */
  resetKey(key) {
    this.clients.delete(key);
  }

  /**
   * Destroy rate limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clients.clear();
  }
}

/**
 * Create rate limiter middleware with options
 */
function createRateLimiter(options = {}) {
  const limiter = new RateLimiter(options);
  return limiter.middleware();
}

/**
 * Predefined rate limiters for common use cases
 */
const rateLimiters = {
  // Strict - for sensitive endpoints (auth, config changes)
  strict: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10
  }),

  // Standard - for general API endpoints
  standard: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }),

  // Relaxed - for read-only endpoints
  relaxed: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300
  }),

  // Upload - for file uploads
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20
  })
};

/**
 * Create custom rate limiter by endpoint
 */
function createEndpointLimiter(endpoint, limits) {
  return createRateLimiter({
    windowMs: limits.windowMs || 60000,
    maxRequests: limits.maxRequests || 100,
    keyGenerator: (req) => {
      // Combine IP and endpoint for per-endpoint limiting
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `${ip}:${endpoint}`;
    }
  });
}

/**
 * Adaptive rate limiter - adjusts limits based on system load
 */
class AdaptiveRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.baseMaxRequests = this.maxRequests;
    this.loadThreshold = options.loadThreshold || 0.8; // 80%
    this.minMaxRequests = options.minMaxRequests || Math.floor(this.baseMaxRequests * 0.5);
  }

  /**
   * Adjust limits based on system load
   */
  adjustLimits(systemLoad) {
    if (systemLoad > this.loadThreshold) {
      // Reduce limits when system is under heavy load
      const reduction = (systemLoad - this.loadThreshold) / (1 - this.loadThreshold);
      this.maxRequests = Math.max(
        this.minMaxRequests,
        Math.floor(this.baseMaxRequests * (1 - reduction * 0.5))
      );
      console.log(`[AdaptiveRateLimiter] Reduced limit to ${this.maxRequests} (load: ${(systemLoad * 100).toFixed(1)}%)`);
    } else {
      // Restore to base limits
      this.maxRequests = this.baseMaxRequests;
    }
  }
}

/**
 * Create adaptive rate limiter
 */
function createAdaptiveRateLimiter(options = {}) {
  const limiter = new AdaptiveRateLimiter(options);
  return limiter.middleware();
}

export {
  RateLimiter,
  AdaptiveRateLimiter,
  createRateLimiter,
  createEndpointLimiter,
  createAdaptiveRateLimiter,
  rateLimiters
};
