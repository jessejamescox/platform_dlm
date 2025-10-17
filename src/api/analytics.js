/**
 * API routes for analytics and reporting
 */

import express from 'express';
import { state } from '../index.js';

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Get system overview analytics
 */
router.get('/overview', (req, res) => {
  try {
    const stations = Array.from(state.stations.values());

    const overview = {
      totalStations: stations.length,
      activeStations: stations.filter(s => s.status === 'charging').length,
      readyStations: stations.filter(s => s.status === 'ready').length,
      offlineStations: stations.filter(s => s.status === 'offline').length,

      totalEnergyDelivered: stations.reduce((sum, s) => sum + (s.energyDelivered || 0), 0),
      currentLoad: state.currentLoad.total,
      availableCapacity: state.currentLoad.available,
      utilizationPercent: (state.currentLoad.total / state.config.maxGridCapacity) * 100,

      pvProduction: state.currentLoad.pvProduction,
      pvEnabled: state.config.pvSystemEnabled,

      schedules: state.schedules.size,
      loadBalancingEnabled: state.config.enableLoadBalancing
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/stations
 * Get station analytics
 */
router.get('/stations', (req, res) => {
  try {
    const stations = Array.from(state.stations.values());

    const analytics = stations.map(station => ({
      id: station.id,
      name: station.name,
      zone: station.zone,
      status: station.status,
      totalEnergy: station.energyDelivered || 0,
      sessionEnergy: station.sessionEnergy || 0,
      currentPower: station.currentPower || 0,
      maxPower: station.maxPower,
      priority: station.priority,
      uptime: station.online ? 'online' : 'offline',
      lastUpdate: station.lastUpdate
    }));

    // Sort by total energy delivered
    analytics.sort((a, b) => b.totalEnergy - a.totalEnergy);

    res.json({
      success: true,
      data: analytics,
      count: analytics.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/zones
 * Get analytics by zone
 */
router.get('/zones', (req, res) => {
  try {
    const stations = Array.from(state.stations.values());
    const zones = new Map();

    for (const station of stations) {
      const zone = station.zone || 'default';

      if (!zones.has(zone)) {
        zones.set(zone, {
          zone,
          stations: 0,
          activeStations: 0,
          totalPower: 0,
          totalEnergy: 0
        });
      }

      const zoneData = zones.get(zone);
      zoneData.stations++;

      if (station.status === 'charging') {
        zoneData.activeStations++;
        zoneData.totalPower += station.currentPower || 0;
      }

      zoneData.totalEnergy += station.energyDelivered || 0;
    }

    res.json({
      success: true,
      data: Array.from(zones.values()),
      count: zones.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
