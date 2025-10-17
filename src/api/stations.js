/**
 * API routes for charging stations
 */

import express from 'express';
import { state } from '../index.js';

const router = express.Router();

/**
 * GET /api/stations
 * Get all charging stations
 */
router.get('/', (req, res) => {
  try {
    const stations = state.stationManager.getAllStations();

    res.json({
      success: true,
      data: stations,
      count: stations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stations/:id
 * Get a specific charging station
 */
router.get('/:id', (req, res) => {
  try {
    const station = state.stationManager.getStation(req.params.id);

    if (!station) {
      return res.status(404).json({
        success: false,
        error: 'Station not found'
      });
    }

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stations
 * Register a new charging station
 */
router.post('/', async (req, res) => {
  try {
    const station = await state.stationManager.registerStation(req.body);

    res.status(201).json({
      success: true,
      data: station
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/stations/:id
 * Update a charging station
 */
router.put('/:id', async (req, res) => {
  try {
    const station = await state.stationManager.updateStation(req.params.id, req.body);

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/stations/:id
 * Delete a charging station
 */
router.delete('/:id', async (req, res) => {
  try {
    await state.stationManager.deleteStation(req.params.id);

    res.json({
      success: true,
      message: 'Station deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stations/:id/power
 * Set charging power for a station
 */
router.post('/:id/power', async (req, res) => {
  try {
    const { power } = req.body;

    if (typeof power !== 'number' || power < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid power value'
      });
    }

    await state.stationManager.setPower(req.params.id, power);

    res.json({
      success: true,
      message: 'Power set successfully',
      data: { power }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stations/:id/session/start
 * Start a charging session
 */
router.post('/:id/session/start', async (req, res) => {
  try {
    const { user } = req.body;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User information required'
      });
    }

    const station = await state.stationManager.startChargingSession(req.params.id, user);

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stations/:id/session/stop
 * Stop a charging session
 */
router.post('/:id/session/stop', async (req, res) => {
  try {
    const sessionData = await state.stationManager.stopChargingSession(req.params.id);

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
