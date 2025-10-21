/**
 * Audit Logging Service
 *
 * Comprehensive audit trail for all critical operations including:
 * - Configuration changes
 * - Station control actions
 * - Authentication/authorization events
 * - Load management decisions
 * - System state changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AuditLogger {
  constructor(options = {}) {
    this.logDir = options.logDir || path.join(__dirname, '../../logs/audit');
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 30; // Keep 30 days
    this.bufferSize = options.bufferSize || 100; // Buffer 100 entries
    this.flushInterval = options.flushInterval || 5000; // Flush every 5s

    this.buffer = [];
    this.currentFile = null;
    this.flushTimer = null;

    this.initialize();
  }

  /**
   * Initialize audit logger
   */
  initialize() {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Start flush timer
    this.startFlushTimer();

    console.log(`[AuditLogger] Initialized (dir: ${this.logDir})`);
  }

  /**
   * Log an audit event
   */
  log(event) {
    const entry = {
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId(),
      ...event,
      metadata: {
        hostname: process.env.HOSTNAME || 'unknown',
        pid: process.pid,
        ...event.metadata
      }
    };

    // Add to buffer
    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    return entry.eventId;
  }

  /**
   * Log configuration change
   */
  logConfigChange(actor, target, changes, details = {}) {
    return this.log({
      category: 'configuration',
      action: 'update',
      severity: 'info',
      actor: this.sanitizeActor(actor),
      target,
      changes,
      ...details
    });
  }

  /**
   * Log station control action
   */
  logStationControl(actor, stationId, action, params = {}) {
    return this.log({
      category: 'station_control',
      action,
      severity: action === 'stop_emergency' ? 'warning' : 'info',
      actor: this.sanitizeActor(actor),
      target: { type: 'station', id: stationId },
      parameters: params
    });
  }

  /**
   * Log authentication event
   */
  logAuth(action, user, success, details = {}) {
    return this.log({
      category: 'authentication',
      action,
      severity: success ? 'info' : 'warning',
      actor: { type: 'user', id: user?.id || 'unknown', name: user?.name || 'unknown' },
      success,
      ...details
    });
  }

  /**
   * Log authorization event
   */
  logAuthz(actor, resource, action, granted, reason = '') {
    return this.log({
      category: 'authorization',
      action,
      severity: granted ? 'info' : 'warning',
      actor: this.sanitizeActor(actor),
      target: { type: 'resource', id: resource },
      granted,
      reason
    });
  }

  /**
   * Log load management decision
   */
  logLoadManagement(decision, details = {}) {
    return this.log({
      category: 'load_management',
      action: decision.action,
      severity: details.emergency ? 'critical' : 'info',
      actor: { type: 'system', id: 'load_manager' },
      decision,
      ...details
    });
  }

  /**
   * Log security event
   */
  logSecurity(event, severity, details = {}) {
    return this.log({
      category: 'security',
      action: event,
      severity: severity || 'warning',
      actor: { type: 'system', id: 'security' },
      ...details
    });
  }

  /**
   * Log system state change
   */
  logStateChange(component, previousState, newState, reason = '') {
    return this.log({
      category: 'state_change',
      action: 'transition',
      severity: 'info',
      actor: { type: 'system', id: component },
      previousState,
      newState,
      reason
    });
  }

  /**
   * Log error/failure
   */
  logError(category, error, context = {}) {
    return this.log({
      category,
      action: 'error',
      severity: 'error',
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      ...context
    });
  }

  /**
   * Sanitize actor information
   */
  sanitizeActor(actor) {
    if (typeof actor === 'string') {
      return { type: 'user', id: actor };
    }
    return {
      type: actor.type || 'user',
      id: actor.id || 'unknown',
      name: actor.name,
      ip: actor.ip
    };
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Flush buffer to file
   */
  async flush() {
    if (this.buffer.length === 0) return;

    try {
      const entries = [...this.buffer];
      this.buffer = [];

      // Get current log file
      const logFile = this.getCurrentLogFile();

      // Write entries
      const logData = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.promises.appendFile(logFile, logData);

      // Check file size and rotate if needed
      await this.checkRotation(logFile);
    } catch (error) {
      console.error('[AuditLogger] Failed to flush buffer:', error);
      // Put entries back in buffer if write failed
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Get current log file path
   */
  getCurrentLogFile() {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `audit-${date}.log`);
  }

  /**
   * Check if log rotation is needed
   */
  async checkRotation(logFile) {
    try {
      const stats = await fs.promises.stat(logFile);

      if (stats.size >= this.maxFileSize) {
        // Rotate by renaming with timestamp
        const timestamp = Date.now();
        const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
        await fs.promises.rename(logFile, rotatedFile);
        console.log(`[AuditLogger] Rotated log file: ${rotatedFile}`);

        // Cleanup old files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[AuditLogger] Failed to check rotation:', error);
      }
    }
  }

  /**
   * Cleanup old log files
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const auditFiles = files
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          time: fs.statSync(path.join(this.logDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Remove files beyond maxFiles limit
      const toRemove = auditFiles.slice(this.maxFiles);
      for (const file of toRemove) {
        await fs.promises.unlink(file.path);
        console.log(`[AuditLogger] Removed old log file: ${file.name}`);
      }
    } catch (error) {
      console.error('[AuditLogger] Failed to cleanup old logs:', error);
    }
  }

  /**
   * Start flush timer
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Query audit logs
   */
  async query(filters = {}) {
    const {
      startDate,
      endDate,
      category,
      action,
      actor,
      severity,
      limit = 100
    } = filters;

    try {
      const files = await this.getLogFiles(startDate, endDate);
      const results = [];

      for (const file of files) {
        const content = await fs.promises.readFile(file, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);

            // Apply filters
            if (category && entry.category !== category) continue;
            if (action && entry.action !== action) continue;
            if (actor && entry.actor?.id !== actor) continue;
            if (severity && entry.severity !== severity) continue;

            results.push(entry);

            if (results.length >= limit) break;
          } catch (error) {
            // Skip malformed lines
          }
        }

        if (results.length >= limit) break;
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('[AuditLogger] Query failed:', error);
      return [];
    }
  }

  /**
   * Get log files within date range
   */
  async getLogFiles(startDate, endDate) {
    const files = await fs.promises.readdir(this.logDir);
    const auditFiles = files
      .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
      .map(f => path.join(this.logDir, f))
      .sort()
      .reverse(); // Most recent first

    if (!startDate && !endDate) {
      return auditFiles;
    }

    // Filter by date range
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Date.now();

    return auditFiles.filter(f => {
      const stats = fs.statSync(f);
      const mtime = stats.mtime.getTime();
      return mtime >= start && mtime <= end;
    });
  }

  /**
   * Get statistics
   */
  async getStats(days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const entries = await this.query({ startDate, limit: 10000 });

    const stats = {
      totalEvents: entries.length,
      byCategory: {},
      bySeverity: {},
      byActor: {},
      recentErrors: []
    };

    for (const entry of entries) {
      // By category
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;

      // By severity
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;

      // By actor
      const actorId = entry.actor?.id || 'unknown';
      stats.byActor[actorId] = (stats.byActor[actorId] || 0) + 1;

      // Collect recent errors
      if (entry.severity === 'error' && stats.recentErrors.length < 10) {
        stats.recentErrors.push(entry);
      }
    }

    return stats;
  }

  /**
   * Shutdown - flush and cleanup
   */
  async shutdown() {
    this.stopFlushTimer();
    await this.flush();
    console.log('[AuditLogger] Shutdown complete');
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

export default auditLogger;
