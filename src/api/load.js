/**
 * API routes for load management
 */

import express from 'express';
import { state } from '../index.js';

const router = express.Router();

/**
 * GET /api/load/status
 * Get current load status
 */
router.get('/status', (req, res) => {
  try {
    const status = state.loadManager.getLoadStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/load/capacity
 * Get grid capacity information
 */
router.get('/capacity', (req, res) => {
  try {
    const { maxGridCapacity, peakDemandThreshold } = state.config;
    const { total, available } = state.currentLoad;

    res.json({
      success: true,
      data: {
        maxCapacity: maxGridCapacity,
        peakThreshold: peakDemandThreshold,
        currentLoad: total,
        availableCapacity: available,
        utilizationPercent: (total / maxGridCapacity) * 100,
        isPeakDemand: total >= peakDemandThreshold
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/load/limits
 * Update load limits
 */
router.post('/limits', (req, res) => {
  try {
    const { maxGridCapacity, peakDemandThreshold } = req.body;

    if (maxGridCapacity !== undefined) {
      if (typeof maxGridCapacity !== 'number' || maxGridCapacity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid maxGridCapacity value'
        });
      }
      state.loadManager.setGridCapacity(maxGridCapacity);
    }

    if (peakDemandThreshold !== undefined) {
      if (typeof peakDemandThreshold !== 'number' || peakDemandThreshold <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid peakDemandThreshold value'
        });
      }
      state.config.peakDemandThreshold = peakDemandThreshold;
    }

    res.json({
      success: true,
      data: {
        maxGridCapacity: state.config.maxGridCapacity,
        peakDemandThreshold: state.config.peakDemandThreshold
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
 * GET /api/load/history
 * Get allocation history
 */
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = state.loadManager.getAllocationHistory(limit);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/load/rebalance
 * Manually trigger load rebalancing
 */
router.post('/rebalance', (req, res) => {
  try {
    state.loadManager.balanceLoad();

    res.json({
      success: true,
      message: 'Load rebalancing triggered'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
