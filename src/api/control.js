/**
 * Advanced Control Primitives API Routes
 */

import express from 'express';
import capabilityManager from '../services/CapabilityManager.js';
import phaseCurrentController from '../services/PhaseCurrentController.js';
import dcfcController from '../services/DCFastChargingController.js';
import auditLogger from '../services/AuditLogger.js';

const router = express.Router();

/**
 * GET /api/control/capabilities - Get all capabilities
 */
router.get('/capabilities', (req, res) => {
  try {
    const capabilities = capabilityManager.getAllCapabilities();
    res.json({ success: true, capabilities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/control/capabilities/:stationId - Get station capabilities
 */
router.get('/capabilities/:stationId', (req, res) => {
  try {
    const capabilities = capabilityManager.getSummary(req.params.stationId);

    if (!capabilities) {
      return res.status(404).json({
        success: false,
        error: 'Capabilities not discovered for this station'
      });
    }

    res.json({ success: true, ...capabilities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/capabilities/:stationId/discover - Discover capabilities
 */
router.post('/capabilities/:stationId/discover', async (req, res) => {
  try {
    const { protocol, profile, ...config } = req.body;

    const capabilities = await capabilityManager.discoverCapabilities(
      req.params.stationId,
      protocol,
      { ...config, profile }
    );

    auditLogger.logStationControl(
      { type: 'api', id: req.ip },
      req.params.stationId,
      'discover_capabilities',
      { protocol, profile }
    );

    res.json({
      success: true,
      stationId: req.params.stationId,
      capabilities: capabilityManager.getSummary(req.params.stationId)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/phase-currents/:stationId - Set per-phase currents
 */
router.post('/phase-currents/:stationId', async (req, res) => {
  try {
    const { phases, autoBalance } = req.body;

    const result = await phaseCurrentController.setPhaseCurrents(
      req.params.stationId,
      phases,
      {
        autoBalance,
        actor: { type: 'api', id: req.ip }
      }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/phase-currents/:stationId/ramp - Ramp phase currents
 */
router.post('/phase-currents/:stationId/ramp', async (req, res) => {
  try {
    const { targetPhases, stepTime } = req.body;

    const result = await phaseCurrentController.rampPhaseCurrents(
      req.params.stationId,
      targetPhases,
      stepTime || 2000
    );

    auditLogger.logStationControl(
      { type: 'api', id: req.ip },
      req.params.stationId,
      'ramp_phase_currents',
      { targetPhases, stepTime }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/control/phase-currents/:stationId - Get phase current setpoints
 */
router.get('/phase-currents/:stationId', (req, res) => {
  try {
    const setpoints = phaseCurrentController.getPhaseSetpoints(req.params.stationId);
    const readings = phaseCurrentController.getPhaseReadings(req.params.stationId);

    if (!setpoints) {
      return res.status(404).json({
        success: false,
        error: 'No phase current setpoints for this station'
      });
    }

    res.json({
      success: true,
      stationId: req.params.stationId,
      setpoints,
      readings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/control/phase-balance - Get system-wide phase balance
 */
router.get('/phase-balance', (req, res) => {
  try {
    const balance = phaseCurrentController.getSystemPhaseBalance();
    res.json({ success: true, ...balance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/phase-balance/configure - Configure phase balancing
 */
router.post('/phase-balance/configure', (req, res) => {
  try {
    const { enabled, maxImbalance } = req.body;

    if (enabled !== undefined) {
      phaseCurrentController.setPhaseBalancing(enabled);
    }

    if (maxImbalance !== undefined) {
      phaseCurrentController.setMaxImbalance(parseFloat(maxImbalance));
    }

    auditLogger.logConfigChange(
      { type: 'api', id: req.ip },
      'phase_balancing',
      { enabled, maxImbalance }
    );

    res.json({
      success: true,
      message: 'Phase balancing configuration updated',
      status: phaseCurrentController.getStatus()
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/dc-power/:stationId - Set DC power limit
 */
router.post('/dc-power/:stationId', async (req, res) => {
  try {
    const { power, autoRamp } = req.body;

    const result = await dcfcController.setPowerLimit(
      req.params.stationId,
      parseFloat(power),
      {
        autoRamp: autoRamp !== false,
        actor: { type: 'api', id: req.ip }
      }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/dc-current/:stationId - Set DC current limit
 */
router.post('/dc-current/:stationId', async (req, res) => {
  try {
    const { current, autoRamp } = req.body;

    const result = await dcfcController.setCurrentLimit(
      req.params.stationId,
      parseFloat(current),
      {
        autoRamp: autoRamp !== false,
        actor: { type: 'api', id: req.ip }
      }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/control/dc/:stationId - Get DC charging status
 */
router.get('/dc/:stationId', (req, res) => {
  try {
    const setpoint = dcfcController.getSetpoint(req.params.stationId);
    const measurements = dcfcController.getMeasurements(req.params.stationId);
    const thermal = dcfcController.getThermalState(req.params.stationId);

    if (!setpoint) {
      return res.status(404).json({
        success: false,
        error: 'No DC charging data for this station'
      });
    }

    res.json({
      success: true,
      stationId: req.params.stationId,
      setpoint,
      measurements,
      thermal
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/dc/:stationId/taper - Configure vehicle taper curve
 */
router.post('/dc/:stationId/taper', (req, res) => {
  try {
    const { enabled, soc, taperStartSoC, taperRate } = req.body;

    dcfcController.setVehicleTaper(req.params.stationId, {
      enabled: enabled !== false,
      soc: parseFloat(soc) || 0,
      taperStartSoC: parseFloat(taperStartSoC) || 80,
      taperRate: parseFloat(taperRate) || 0.7
    });

    auditLogger.logStationControl(
      { type: 'api', id: req.ip },
      req.params.stationId,
      'configure_taper',
      { enabled, soc, taperStartSoC, taperRate }
    );

    res.json({
      success: true,
      message: 'Taper configuration updated',
      stationId: req.params.stationId
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/dc/:stationId/soc - Update vehicle SoC
 */
router.post('/dc/:stationId/soc', (req, res) => {
  try {
    const { soc } = req.body;

    dcfcController.updateVehicleSoC(
      req.params.stationId,
      parseFloat(soc)
    );

    res.json({
      success: true,
      stationId: req.params.stationId,
      soc: parseFloat(soc)
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/dc/:stationId/measurements - Update DC measurements
 */
router.post('/dc/:stationId/measurements', (req, res) => {
  try {
    dcfcController.updateMeasurements(req.params.stationId, req.body);

    res.json({
      success: true,
      stationId: req.params.stationId,
      message: 'Measurements updated'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/v2g/:stationId/enable - Enable V2G export
 */
router.post('/v2g/:stationId/enable', async (req, res) => {
  try {
    const { exportPower } = req.body;

    const result = await dcfcController.enableBidirectional(
      req.params.stationId,
      parseFloat(exportPower),
      { actor: { type: 'api', id: req.ip } }
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/control/dcfc/status - Get all DCFC status
 */
router.get('/dcfc/status', (req, res) => {
  try {
    const status = dcfcController.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/power-to-phases/:stationId - Convert power to phase currents
 */
router.post('/power-to-phases/:stationId', (req, res) => {
  try {
    const { power } = req.body;

    const phases = phaseCurrentController.powerToPhaseCurrents(
      req.params.stationId,
      parseFloat(power)
    );

    res.json({
      success: true,
      stationId: req.params.stationId,
      power: parseFloat(power),
      phases
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/control/phases-to-power/:stationId - Convert phase currents to power
 */
router.post('/phases-to-power/:stationId', (req, res) => {
  try {
    const { phases } = req.body;

    const power = phaseCurrentController.phaseCurrentsToPower(
      req.params.stationId,
      phases
    );

    res.json({
      success: true,
      stationId: req.params.stationId,
      phases,
      power
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
