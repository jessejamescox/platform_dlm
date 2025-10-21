/**
 * Energy Meters API Routes
 *
 * Endpoints for managing building energy meters
 */

import express from 'express';

const router = express.Router();

export default function (energyMeterManager) {
  /**
   * GET /api/energy-meters
   * Get all registered energy meters
   */
  router.get('/', (req, res) => {
    try {
      const meters = energyMeterManager.getAllMeters();

      res.json({
        success: true,
        data: meters,
        count: meters.length
      });
    } catch (error) {
      console.error('Error fetching meters:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/energy-meters/:id
   * Get specific meter details
   */
  router.get('/:id', (req, res) => {
    try {
      const meter = energyMeterManager.getMeter(req.params.id);

      if (!meter) {
        return res.status(404).json({
          success: false,
          error: 'Meter not found'
        });
      }

      res.json({
        success: true,
        data: meter
      });
    } catch (error) {
      console.error('Error fetching meter:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/energy-meters
   * Register a new energy meter
   */
  router.post('/', async (req, res) => {
    try {
      const meterConfig = req.body;

      // Validate required fields
      if (!meterConfig.name) {
        return res.status(400).json({
          success: false,
          error: 'Meter name is required'
        });
      }

      if (!meterConfig.protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocol is required (modbus, mqtt, or http)'
        });
      }

      if (!['modbus', 'mqtt', 'http'].includes(meterConfig.protocol)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid protocol. Must be modbus, mqtt, or http'
        });
      }

      // Register meter
      const meter = await energyMeterManager.registerMeter(meterConfig);

      res.status(201).json({
        success: true,
        data: meter
      });
    } catch (error) {
      console.error('Error registering meter:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PUT /api/energy-meters/:id
   * Update meter configuration
   */
  router.put('/:id', async (req, res) => {
    try {
      const updates = req.body;
      const meter = await energyMeterManager.updateMeter(req.params.id, updates);

      res.json({
        success: true,
        data: meter
      });
    } catch (error) {
      console.error('Error updating meter:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/energy-meters/:id
   * Remove an energy meter
   */
  router.delete('/:id', (req, res) => {
    try {
      energyMeterManager.deleteMeter(req.params.id);

      res.json({
        success: true,
        message: 'Meter deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting meter:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/energy-meters/:id/reading
   * Get current reading from specific meter
   */
  router.get('/:id/reading', (req, res) => {
    try {
      const reading = energyMeterManager.getMeterReading(req.params.id);

      if (!reading) {
        return res.status(404).json({
          success: false,
          error: 'No reading available for this meter'
        });
      }

      res.json({
        success: true,
        data: reading
      });
    } catch (error) {
      console.error('Error fetching meter reading:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/energy-meters/consumption/building
   * Get total building consumption (sum of all grid meters)
   */
  router.get('/consumption/building', (req, res) => {
    try {
      const consumption = energyMeterManager.getBuildingConsumption();

      res.json({
        success: true,
        data: consumption
      });
    } catch (error) {
      console.error('Error fetching building consumption:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}
