/**
 * Demo Mode API Routes
 */

import express from 'express';
import demoModeService from '../services/DemoModeService.js';
import auditLogger from '../services/AuditLogger.js';

const router = express.Router();

/**
 * GET /api/demo/scenarios - Get available scenarios
 */
router.get('/scenarios', (req, res) => {
  try {
    const scenarios = demoModeService.getScenarios();
    res.json({ success: true, scenarios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/demo/status - Get demo mode status
 */
router.get('/status', (req, res) => {
  try {
    const status = demoModeService.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/demo/enable - Enable demo mode with scenario
 */
router.post('/enable', async (req, res) => {
  try {
    const { scenario, timeMultiplier } = req.body;

    // Set time multiplier if provided
    if (timeMultiplier) {
      demoModeService.setTimeMultiplier(parseFloat(timeMultiplier));
    }

    const result = await demoModeService.enable(scenario || 'normal');

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'demo_mode',
      { action: 'enable', scenario, timeMultiplier }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/demo/disable - Disable demo mode
 */
router.post('/disable', async (req, res) => {
  try {
    const result = await demoModeService.disable();

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'demo_mode',
      { action: 'disable' }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/demo/scenario - Change scenario
 */
router.post('/scenario', async (req, res) => {
  try {
    const { scenario } = req.body;

    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'Scenario name required'
      });
    }

    // Disable current scenario and enable new one
    await demoModeService.disable();
    const result = await demoModeService.enable(scenario);

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'demo_mode',
      { action: 'change_scenario', scenario }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/demo/speed - Set time multiplier
 */
router.post('/speed', (req, res) => {
  try {
    const { multiplier } = req.body;

    if (!multiplier || multiplier < 1 || multiplier > 100) {
      return res.status(400).json({
        success: false,
        error: 'Multiplier must be between 1 and 100'
      });
    }

    const result = demoModeService.setTimeMultiplier(parseFloat(multiplier));

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'demo_mode',
      { action: 'set_speed', multiplier }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
