/**
 * API routes for energy management and PV integration
 */

import express from 'express';
import { state } from '../index.js';

const router = express.Router();

/**
 * GET /api/energy/status
 * Get current energy status
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: state.currentLoad
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/energy/pv
 * Get PV system status
 */
router.get('/pv', (req, res) => {
  try {
    const pvStatus = state.pvManager.getStatus();

    res.json({
      success: true,
      data: pvStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/energy/pv/simulate
 * Simulate PV production (for testing)
 */
router.post('/pv/simulate', (req, res) => {
  try {
    state.pvManager.simulateProduction();

    res.json({
      success: true,
      message: 'PV production simulated',
      data: {
        production: state.currentLoad.pvProduction
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/energy/pv/production
 * Manually set PV production (for testing/integration)
 */
router.post('/pv/production', (req, res) => {
  try {
    const { production } = req.body;

    if (typeof production !== 'number' || production < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid production value'
      });
    }

    state.pvManager.updateProduction(production);

    res.json({
      success: true,
      data: {
        production: state.currentLoad.pvProduction
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/energy/consumption
 * Get energy consumption data
 */
router.get('/consumption', (req, res) => {
  try {
    const stations = Array.from(state.stations.values());

    const consumption = {
      total: stations.reduce((sum, s) => sum + (s.energyDelivered || 0), 0),
      current: state.currentLoad.chargingLoad,
      byStation: stations.map(s => ({
        id: s.id,
        name: s.name,
        totalEnergy: s.energyDelivered || 0,
        sessionEnergy: s.sessionEnergy || 0,
        currentPower: s.currentPower || 0
      }))
    };

    res.json({
      success: true,
      data: consumption
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/energy/costs
 * Calculate energy costs
 */
router.get('/costs', (req, res) => {
  try {
    const stations = Array.from(state.stations.values());
    const totalEnergy = stations.reduce((sum, s) => sum + (s.energyDelivered || 0), 0);

    const isPeakDemand = state.currentLoad.total >= state.config.peakDemandThreshold;
    const costPerKWh = isPeakDemand
      ? state.config.peakCostPerKWh
      : state.config.energyCostPerKWh;

    const totalCost = totalEnergy * costPerKWh;

    res.json({
      success: true,
      data: {
        totalEnergy,
        costPerKWh,
        totalCost,
        isPeakDemand,
        currency: 'USD'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
