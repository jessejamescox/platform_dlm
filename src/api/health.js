/**
 * Health and System Management API Routes
 */

import express from 'express';
import healthCheckService from '../services/HealthCheckService.js';
import { circuitBreakerRegistry } from '../utils/CircuitBreaker.js';
import { watchdogRegistry } from '../utils/Watchdog.js';
import failSafeManager from '../services/FailSafeManager.js';
import loadSheddingService from '../services/LoadSheddingService.js';
import siteConstraintsManager from '../services/SiteConstraintsManager.js';
import auditLogger from '../services/AuditLogger.js';

const router = express.Router();

/**
 * GET /api/health - Comprehensive system health
 */
router.get('/', async (req, res) => {
  try {
    const health = await healthCheckService.getSystemHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/live - Liveness probe
 */
router.get('/live', async (req, res) => {
  try {
    const liveness = await healthCheckService.getLiveness();
    res.json(liveness);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/ready - Readiness probe
 */
router.get('/ready', async (req, res) => {
  try {
    const readiness = await healthCheckService.getReadiness();
    res.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/circuit-breakers - Circuit breaker status
 */
router.get('/circuit-breakers', (req, res) => {
  try {
    const status = circuitBreakerRegistry.getAllStatus();
    res.json({
      success: true,
      allHealthy: circuitBreakerRegistry.areAllHealthy(),
      breakers: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/circuit-breakers/:name/reset - Reset circuit breaker
 */
router.post('/circuit-breakers/:name/reset', (req, res) => {
  try {
    const breaker = circuitBreakerRegistry.get(req.params.name);
    if (!breaker) {
      return res.status(404).json({ success: false, error: 'Circuit breaker not found' });
    }

    breaker.reset();

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      `circuit_breaker_${req.params.name}`,
      { action: 'reset' }
    );

    res.json({
      success: true,
      message: `Circuit breaker ${req.params.name} reset`,
      status: breaker.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/watchdogs - Watchdog status
 */
router.get('/watchdogs', (req, res) => {
  try {
    const status = watchdogRegistry.getAllStatus();
    res.json({
      success: true,
      allHealthy: watchdogRegistry.areAllHealthy(),
      watchdogs: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/fail-safe - Fail-safe status
 */
router.get('/fail-safe', (req, res) => {
  try {
    const status = failSafeManager.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/fail-safe/:stationId/test - Test fail-safe for a station
 */
router.post('/fail-safe/:stationId/test', async (req, res) => {
  try {
    const result = await failSafeManager.testFailSafe(req.params.stationId);

    auditLogger.logStationControl(
      { type: 'api', id: req.ip },
      req.params.stationId,
      'test_fail_safe',
      result
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/load-shedding - Load shedding status
 */
router.get('/load-shedding', (req, res) => {
  try {
    const status = loadSheddingService.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/load-shedding/configure - Configure load shedding
 */
router.post('/load-shedding/configure', (req, res) => {
  try {
    const { upperThreshold, lowerThreshold } = req.body;

    loadSheddingService.updateHysteresis({
      upperThreshold: parseFloat(upperThreshold),
      lowerThreshold: parseFloat(lowerThreshold)
    });

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'load_shedding',
      { upperThreshold, lowerThreshold }
    );

    res.json({
      success: true,
      message: 'Load shedding configuration updated',
      status: loadSheddingService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/load-shedding/reset - Reset load shedding
 */
router.post('/load-shedding/reset', (req, res) => {
  try {
    loadSheddingService.reset();

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'load_shedding',
      { action: 'reset' }
    );

    res.json({
      success: true,
      message: 'Load shedding reset',
      status: loadSheddingService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/site-constraints - Site constraints status
 */
router.get('/site-constraints', (req, res) => {
  try {
    const status = siteConstraintsManager.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/site-constraints/violations - Get constraint violations
 */
router.get('/site-constraints/violations', (req, res) => {
  try {
    const violations = siteConstraintsManager.getViolations({
      component: req.query.component,
      type: req.query.type,
      severity: req.query.severity,
      limit: parseInt(req.query.limit) || 100
    });

    res.json({
      success: true,
      count: violations.length,
      violations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/site-constraints/service - Configure service constraints
 */
router.post('/site-constraints/service', (req, res) => {
  try {
    siteConstraintsManager.configureService(req.body);

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'site_constraints_service',
      req.body
    );

    res.json({
      success: true,
      message: 'Service constraints configured'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/site-constraints/feeder - Configure feeder constraints
 */
router.post('/site-constraints/feeder', (req, res) => {
  try {
    const feederId = req.body.id || `feeder_${Date.now()}`;
    siteConstraintsManager.configureFeeder(feederId, req.body);

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      `site_constraints_feeder_${feederId}`,
      req.body
    );

    res.json({
      success: true,
      message: 'Feeder constraints configured',
      feederId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/health/site-constraints/transformer - Configure transformer constraints
 */
router.post('/site-constraints/transformer', (req, res) => {
  try {
    const transformerId = req.body.id || `transformer_${Date.now()}`;
    siteConstraintsManager.configureTransformer(transformerId, req.body);

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      `site_constraints_transformer_${transformerId}`,
      req.body
    );

    res.json({
      success: true,
      message: 'Transformer constraints configured',
      transformerId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/audit/logs - Query audit logs
 */
router.get('/audit/logs', async (req, res) => {
  try {
    const logs = await auditLogger.query({
      category: req.query.category,
      action: req.query.action,
      actor: req.query.actor,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100
    });

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/health/audit/stats - Get audit statistics
 */
router.get('/audit/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await auditLogger.getStats(days);

    res.json({
      success: true,
      period: `${days} days`,
      ...stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
