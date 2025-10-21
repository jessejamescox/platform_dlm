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
import EnergyMeterManager from './services/EnergyMeterManager.js';

// Import enhanced services
import healthCheckService from './services/HealthCheckService.js';
import failSafeManager from './services/FailSafeManager.js';
import loadSheddingService from './services/LoadSheddingService.js';
import siteConstraintsManager from './services/SiteConstraintsManager.js';
import auditLogger from './services/AuditLogger.js';
import demoModeService from './services/DemoModeService.js';

// Import API routes
import stationsRouter from './api/stations.js';
import loadRouter from './api/load.js';
import energyRouter from './api/energy.js';
import schedulesRouter from './api/schedules.js';
import analyticsRouter from './api/analytics.js';
import aiConfigRouter from './api/ai-config.js';
import aiMeterRouter from './api/ai-meter.js';
import energyMetersRouter from './api/energy-meters.js';
import healthRouter from './api/health.js';
import controlRouter from './api/control.js';
import demoRouter from './api/demo.js';

// Import middleware
import { rateLimiters } from './middleware/rateLimiter.js';

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

// Apply rate limiting to API routes
app.use('/api/', rateLimiters.standard);

// Global state object (similar to project_ember pattern)
export const state = {
  stations: new Map(),
  schedules: new Map(),
  energyMeters: new Map(),
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
    buildingConsumption: 0,
    chargingLoad: 0
  }
};

// Initialize services
state.persistence = new StatePersistence(join(__dirname, '..', 'persistence'));
state.dataLogger = new DataLogger();
state.energyMeterManager = new EnergyMeterManager(state, state.dataLogger);
state.stationManager = new ChargingStationManager(state);
state.loadManager = new LoadManager(state);
state.pvManager = new PVManager(state);
state.scheduleManager = new ScheduleManager(state);

// Initialize demo mode service with state reference
demoModeService.initialize(state);

// Initialize enhanced services
async function initializeEnhancedServices() {
  console.log('[Init] Initializing enhanced services...');

  // Register health checks
  healthCheckService.registerStandardChecks({
    loadManager: state.loadManager,
    stationManager: state.stationManager,
    dataLogger: state.dataLogger
  });

  healthCheckService.startPeriodicChecks(30000); // 30s interval

  // Configure site constraints
  siteConstraintsManager.configureService({
    maxPower: state.config.maxGridCapacity,
    maxCurrent: parseInt(process.env.MAX_SERVICE_CURRENT) || 400,
    voltage: parseInt(process.env.SERVICE_VOLTAGE) || 480,
    phases: parseInt(process.env.SERVICE_PHASES) || 3,
    maxImbalance: parseFloat(process.env.MAX_PHASE_IMBALANCE) || 0.10,
    minPowerFactor: parseFloat(process.env.MIN_POWER_FACTOR) || 0.90,
    frequency: parseInt(process.env.SERVICE_FREQUENCY) || 60,
    nec625Factor: parseFloat(process.env.NEC625_CONTINUOUS_FACTOR) || 0.80
  });

  // Configure load shedding
  if (process.env.ENABLE_LOAD_SHEDDING === 'true') {
    loadSheddingService.updateHysteresis({
      upperThreshold: parseFloat(process.env.LOAD_SHEDDING_UPPER_THRESHOLD) || 0.95,
      lowerThreshold: parseFloat(process.env.LOAD_SHEDDING_LOWER_THRESHOLD) || 0.85
    });
    console.log('[Init] Load shedding enabled');
  }

  // Start fail-safe monitoring
  if (process.env.ENABLE_FAIL_SAFE === 'true') {
    failSafeManager.startHeartbeat(10000); // 10s interval
    console.log('[Init] Fail-safe monitoring enabled');
  }

  console.log('[Init] Enhanced services initialized successfully');
}

// Initialize enhanced services on startup
initializeEnhancedServices().catch(error => {
  console.error('[Init] Failed to initialize enhanced services:', error);
});

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

// Health check endpoints (before other routes, no rate limiting)
app.get('/health', async (req, res) => {
  const health = await healthCheckService.getSystemHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/health/live', async (req, res) => {
  res.json(await healthCheckService.getLiveness());
});

app.get('/health/ready', async (req, res) => {
  const readiness = await healthCheckService.getReadiness();
  res.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
});

// API Routes
app.use('/api/demo', demoRouter);
app.use('/api/health', healthRouter);
app.use('/api/control', controlRouter);
app.use('/api/stations', stationsRouter);
app.use('/api/load', loadRouter);
app.use('/api/energy', energyRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai-config', aiConfigRouter);
app.use('/api/ai-meter', aiMeterRouter);
app.use('/api/energy-meters', energyMetersRouter(state.energyMeterManager));

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

  // Audit log errors
  auditLogger.logError('http_error', err, {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] ${signal} received, shutting down gracefully...`);

  // Stop health checks
  healthCheckService.stopPeriodicChecks();

  // Stop fail-safe monitoring
  failSafeManager.stopHeartbeat();

  // Flush audit logs
  await auditLogger.shutdown();

  console.log('[Shutdown] Graceful shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start Express server
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  WAGO Dynamic Load Management System                      ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Max Grid Capacity: ${state.config.maxGridCapacity} kW`);
  console.log(`⚡ Load Balancing: ${state.config.enableLoadBalancing ? 'Enabled' : 'Disabled'}`);
  console.log(`☀️  PV Integration: ${state.config.pvSystemEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`🛡️  Enhanced Features: Safety, Control Primitives, Site Constraints`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Liveness: http://localhost:${PORT}/health/live`);
  console.log(`   - Readiness: http://localhost:${PORT}/health/ready`);
  console.log(`   - API: http://localhost:${PORT}/api/`);
  console.log(`   - Control: http://localhost:${PORT}/api/control/`);
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
await state.energyMeterManager.initialize();
await state.stationManager.initialize();
await state.loadManager.initialize();
await state.pvManager.initialize();
await state.scheduleManager.initialize();

console.log('✅ All services initialized\n');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  await state.persistence.save(state);
  await state.energyMeterManager.shutdown();
  await state.stationManager.shutdown();
  await state.pvManager.shutdown();

  wss.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  await state.persistence.save(state);
  await state.energyMeterManager.shutdown();
  await state.stationManager.shutdown();
  await state.pvManager.shutdown();

  wss.close();
  process.exit(0);
});
