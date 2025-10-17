import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import services
import { LoadManager } from './services/LoadManager.js';
import { ChargingStationManager } from './services/ChargingStationManager.js';
import { PVManager } from './services/PVManager.js';
import { ScheduleManager } from './services/ScheduleManager.js';
import { DataLogger } from './services/DataLogger.js';
import { StatePersistence } from './persistence/StatePersistence.js';

// Import API routes
import stationsRouter from './api/stations.js';
import loadRouter from './api/load.js';
import energyRouter from './api/energy.js';
import schedulesRouter from './api/schedules.js';
import analyticsRouter from './api/analytics.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global state object (similar to project_ember pattern)
export const state = {
  stations: new Map(),
  schedules: new Map(),
  clients: new Set(),
  config: {
    maxGridCapacity: parseFloat(process.env.MAX_GRID_CAPACITY_KW) || 500,
    peakDemandThreshold: parseFloat(process.env.PEAK_DEMAND_THRESHOLD_KW) || 450,
    minChargingPower: parseFloat(process.env.MIN_CHARGING_POWER_KW) || 3.7,
    maxChargingPowerPerStation: parseFloat(process.env.MAX_CHARGING_POWER_PER_STATION_KW) || 22,
    energyCostPerKWh: parseFloat(process.env.ENERGY_COST_PER_KWH) || 0.12,
    peakCostPerKWh: parseFloat(process.env.PEAK_COST_PER_KWH) || 0.25,
    pvSystemEnabled: process.env.PV_SYSTEM_ENABLED === 'true',
    enableLoadBalancing: process.env.ENABLE_LOAD_BALANCING === 'true',
    enablePVExcessCharging: process.env.ENABLE_PV_EXCESS_CHARGING === 'true'
  },
  currentLoad: {
    total: 0,
    available: 0,
    pvProduction: 0,
    gridConsumption: 0,
    chargingLoad: 0
  }
};

// Initialize services
state.persistence = new StatePersistence(join(__dirname, '..', 'persistence'));
state.dataLogger = new DataLogger();
state.stationManager = new ChargingStationManager(state);
state.loadManager = new LoadManager(state);
state.pvManager = new PVManager(state);
state.scheduleManager = new ScheduleManager(state);

// WebSocket broadcast function
state.broadcast = (message) => {
  const data = JSON.stringify(message);
  state.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stations: state.stations.size,
    totalLoad: state.currentLoad.total
  });
});

// API Routes
app.use('/api/stations', stationsRouter);
app.use('/api/load', loadRouter);
app.use('/api/energy', energyRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/analytics', analyticsRouter);

// System info endpoint
app.get('/api/system/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'WAGO Dynamic Load Management',
      version: '1.0.0',
      config: state.config,
      uptime: process.uptime()
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  WAGO Dynamic Load Management System                      ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Max Grid Capacity: ${state.config.maxGridCapacity} kW`);
  console.log(`⚡ Load Balancing: ${state.config.enableLoadBalancing ? 'Enabled' : 'Disabled'}`);
  console.log(`☀️  PV Integration: ${state.config.pvSystemEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - API: http://localhost:${PORT}/api/`);
  console.log(`   - WebSocket: ws://localhost:${WS_PORT}`);
  console.log('');
});

// Initialize WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('📱 New WebSocket client connected');
  state.clients.add(ws);

  // Send initial state
  ws.send(JSON.stringify({
    type: 'connection.established',
    data: {
      stations: Array.from(state.stations.values()),
      currentLoad: state.currentLoad,
      config: state.config
    }
  }));

  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
    state.clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    state.clients.delete(ws);
  });
});

console.log(`🔌 WebSocket server running on port ${WS_PORT}\n`);

// Load persisted state
await state.persistence.load(state);

// Initialize services
await state.stationManager.initialize();
await state.loadManager.initialize();
await state.pvManager.initialize();
await state.scheduleManager.initialize();

console.log('✅ All services initialized\n');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  await state.persistence.save(state);
  await state.stationManager.shutdown();
  await state.pvManager.shutdown();

  wss.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  await state.persistence.save(state);
  await state.stationManager.shutdown();
  await state.pvManager.shutdown();

  wss.close();
  process.exit(0);
});
