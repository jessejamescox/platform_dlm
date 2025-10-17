/**
 * API routes for schedules
 */

import express from 'express';
import { state } from '../index.js';

const router = express.Router();

/**
 * GET /api/schedules
 * Get all schedules
 */
router.get('/', (req, res) => {
  try {
    const schedules = state.scheduleManager.getAllSchedules();

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule
 */
router.get('/:id', (req, res) => {
  try {
    const schedule = state.scheduleManager.getSchedule(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post('/', (req, res) => {
  try {
    const schedule = state.scheduleManager.createSchedule(req.body);

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put('/:id', (req, res) => {
  try {
    const schedule = state.scheduleManager.updateSchedule(req.params.id, req.body);

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', (req, res) => {
  try {
    state.scheduleManager.deleteSchedule(req.params.id);

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
