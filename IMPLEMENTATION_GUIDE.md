# DLM Enhanced Features Implementation Guide

## Overview

This document provides a comprehensive guide to the enhanced features added to the Dynamic Load Management (DLM) system for professional-grade EV charging management.

## Table of Contents

1. [Phase 1: Safety & Reliability](#phase-1-safety--reliability)
2. [Phase 2: Control Primitives](#phase-2-control-primitives)
3. [Phase 3: Site Constraints](#phase-3-site-constraints)
4. [Integration Guide](#integration-guide)
5. [API Reference](#api-reference)
6. [Configuration Examples](#configuration-examples)

---

## Phase 1: Safety & Reliability

### 1.1 Circuit Breaker Pattern

**File:** `src/utils/CircuitBreaker.js`

**Purpose:** Prevents cascading failures by automatically stopping requests to failing services.

**States:**
- `CLOSED`: Normal operation
- `OPEN`: Too many failures, requests fail immediately
- `HALF_OPEN`: Testing if service recovered

**Usage:**

```javascript
import { circuitBreakerRegistry } from './utils/CircuitBreaker.js';

// Get or create a circuit breaker
const breaker = circuitBreakerRegistry.get('modbus_station_1', {
  failureThreshold: 5,     // Open after 5 failures
  successThreshold: 2,     // Close after 2 successes
  timeout: 60000,          // 60s operation timeout
  resetTimeout: 30000,     // 30s before retry
  maxRetries: 3            // 3 retry attempts
});

// Execute with circuit breaker protection
try {
  const result = await breaker.execute(async () => {
    return await modbusDriver.readRegister(stationId, register);
  });
} catch (error) {
  if (error.code === 'CIRCUIT_OPEN') {
    // Circuit is open, service unavailable
  }
}

// Get circuit breaker status
const status = breaker.getStatus();
console.log(`Circuit ${status.name} is ${status.state}`);
```

### 1.2 Watchdog Timers

**File:** `src/utils/Watchdog.js`

**Purpose:** Detects stalled or hung operations.

**Usage:**

```javascript
import { watchdogRegistry } from './utils/Watchdog.js';

// Create watchdog
const watchdog = watchdogRegistry.create('load_balancing', {
  timeout: 30000,          // 30s timeout
  onTimeout: (error) => {
    console.error('Load balancing stalled:', error);
    // Trigger recovery action
  }
});

// Start monitoring
watchdog.start();

// Reset (kick) watchdog during operation
watchdog.reset();

// Stop when done
watchdog.stop();
```

### 1.3 Health Check Service

**File:** `src/services/HealthCheckService.js`

**Purpose:** Comprehensive health monitoring for container orchestration.

**Usage:**

```javascript
import healthCheckService from './services/HealthCheckService.js';

// Register health checks
healthCheckService.registerCheck('database', async () => {
  const isConnected = await checkDatabaseConnection();
  return {
    healthy: isConnected,
    message: isConnected ? 'Connected' : 'Disconnected'
  };
}, { critical: true });

// Start periodic checks
healthCheckService.startPeriodicChecks(30000); // Every 30s

// Get system health
const health = await healthCheckService.getSystemHealth();
console.log(`System is ${health.status}`);

// Kubernetes-style probes
const liveness = await healthCheckService.getLiveness();   // Is service alive?
const readiness = await healthCheckService.getReadiness(); // Ready for traffic?
```

**API Endpoints:**

```javascript
// In your Express app
app.get('/health', async (req, res) => {
  const health = await healthCheckService.getSystemHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/health/live', async (req, res) => {
  const liveness = await healthCheckService.getLiveness();
  res.json(liveness);
});

app.get('/health/ready', async (req, res) => {
  const readiness = await healthCheckService.getReadiness();
  res.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
});
```

### 1.4 Fail-Safe Manager

**File:** `src/services/FailSafeManager.js`

**Purpose:** Ensures safe operation when communication is lost with chargers.

**Usage:**

```javascript
import failSafeManager from './services/FailSafeManager.js';

// Register station fail-safe defaults
failSafeManager.registerStation('station_1', {
  safePowerLimit: 3.7,         // kW - minimum safe charging
  offlineAction: 'reduce',     // 'maintain', 'reduce', or 'stop'
  commTimeout: 30000           // 30s before triggering fail-safe
});

// Update communication timestamp
failSafeManager.updateStationComm('station_1');

// Record last known good configuration
failSafeManager.recordGoodConfig('station_1', {
  currentPower: 7.4,
  status: 'charging'
});

// Start heartbeat monitoring
failSafeManager.startHeartbeat(10000); // Check every 10s

// System heartbeat
failSafeManager.heartbeat(); // Call this regularly to indicate system is healthy

// Get fail-safe status
const status = failSafeManager.getStatus();
```

### 1.5 Load Shedding Service

**File:** `src/services/LoadSheddingService.js`

**Purpose:** Intelligent load shedding with hysteresis to prevent grid overload.

**Usage:**

```javascript
import loadSheddingService from './services/LoadSheddingService.js';

// Configure hysteresis
loadSheddingService.updateHysteresis({
  upperThreshold: 0.95,  // 95% - start shedding
  lowerThreshold: 0.85   // 85% - stop shedding
});

// Evaluate load and apply shedding if needed
const result = loadSheddingService.evaluate(
  currentLoad,    // Current power (kW)
  capacity,       // Total capacity (kW)
  stations        // Map of stations
);

if (result) {
  console.log(`Shedding level ${result.newLevel}`);
  for (const action of result.actions) {
    if (action.action === 'stop') {
      await stopCharging(action.stationId);
    } else if (action.action === 'reduce') {
      await setPower(action.stationId, action.newPower);
    }
  }
}

// Get status
const status = loadSheddingService.getStatus();
console.log(`Load shedding ${status.active ? 'ACTIVE' : 'inactive'} at level ${status.level}`);
```

**Shedding Levels:**
1. Level 1: Reduce non-essential (priority ≤3) by 20%
2. Level 2: Reduce non-critical (priority ≤5) by 40%
3. Level 3: Reduce all by 50%
4. Level 4: Stop non-critical (priority ≤5)
5. Level 5: Emergency - stop all except critical (priority 9-10)

### 1.6 Rate Limiting

**File:** `src/middleware/rateLimiter.js`

**Purpose:** Protect API endpoints from abuse and DoS attacks.

**Usage:**

```javascript
import { rateLimiters, createEndpointLimiter } from './middleware/rateLimiter.js';

// Use predefined limiters
app.use('/api/auth', rateLimiters.strict);      // 10 req/15min
app.use('/api/', rateLimiters.standard);         // 100 req/min
app.use('/api/status', rateLimiters.relaxed);    // 300 req/min

// Create custom limiter
const customLimiter = createEndpointLimiter('/api/stations', {
  windowMs: 60000,
  maxRequests: 50
});
app.use('/api/stations', customLimiter);
```

### 1.7 Audit Logging

**File:** `src/services/AuditLogger.js`

**Purpose:** Comprehensive audit trail for all critical operations.

**Usage:**

```javascript
import auditLogger from './services/AuditLogger.js';

// Log configuration change
auditLogger.logConfigChange(
  { type: 'user', id: 'admin', name: 'Admin User' },
  'max_grid_capacity',
  { old: 100, new: 150 }
);

// Log station control action
auditLogger.logStationControl(
  { type: 'user', id: 'admin' },
  'station_1',
  'set_power',
  { power: 7.4 }
);

// Log authentication
auditLogger.logAuth('login', user, true, { ip: req.ip });

// Log load management decision
auditLogger.logLoadManagement({
  action: 'redistribute',
  stationsAffected: 5,
  totalPowerChange: 10
});

// Query audit logs
const logs = await auditLogger.query({
  category: 'station_control',
  startDate: '2025-01-01',
  limit: 100
});

// Get statistics
const stats = await auditLogger.getStats(7); // Last 7 days
```

---

## Phase 2: Control Primitives

### 2.1 Capability Discovery

**File:** `src/services/CapabilityManager.js`

**Purpose:** Discover and validate charger capabilities.

**Usage:**

```javascript
import capabilityManager from './services/CapabilityManager.js';

// Discover capabilities
const capabilities = await capabilityManager.discoverCapabilities(
  'station_1',
  'ocpp',
  { version: '1.6', profile: 'ac_level2_three' }
);

// Get capabilities
const cap = capabilityManager.getCapabilities('station_1');
console.log(`Station supports ${cap.current.min}-${cap.current.max}A, ${cap.phases} phases`);

// Validate command
const validation = capabilityManager.validateCommand('station_1', {
  type: 'ac_current_limit',
  phases: { A: 16, B: 16, C: 16 }
});

if (!validation.valid) {
  console.error('Invalid command:', validation.errors);
}

// Get recommended setpoint
const recommended = capabilityManager.getRecommendedSetpoint('station_1', 18); // Clamps to 16A max

// Check feature support
if (capabilityManager.supportsFeature('station_1', 'bidirectional')) {
  console.log('Station supports V2G');
}
```

**Built-in Profiles:**
- `ac_level2_single`: J1772, 240V, 6-80A, single phase
- `ac_level2_three`: Type 2, 400V, 6-32A, three phase
- `dcfc_ccs_medium`: CCS, 200-500V, 10-200A, 20-150kW
- `dcfc_ccs_high`: CCS, 200-920V, 10-500A, 50-350kW
- `dcfc_chademo`: CHAdeMO, 50-500V, 10-125A, 10-62.5kW

### 2.2 AC Per-Phase Current Control

**File:** `src/services/PhaseCurrentController.js`

**Purpose:** Manage per-phase current limits for AC charging.

**Usage:**

```javascript
import phaseCurrentController from './services/PhaseCurrentController.js';

// Set per-phase currents
await phaseCurrentController.setPhaseCurrents('station_1', {
  A: 16,  // Phase A: 16A
  B: 16,  // Phase B: 16A
  C: 16   // Phase C: 16A
}, { autoBalance: true });

// Convert power to phase currents
const phases = phaseCurrentController.powerToPhaseCurrents('station_1', 11); // 11kW
console.log(`Phase currents: A=${phases.A}A, B=${phases.B}A, C=${phases.C}A`);

// Convert phase currents to power
const power = phaseCurrentController.phaseCurrentsToPower('station_1', { A: 16, B: 16, C: 16 });
console.log(`Total power: ${power.toFixed(1)}kW`);

// Ramp currents gradually (avoids session drops)
await phaseCurrentController.rampPhaseCurrents('station_1',
  { A: 32, B: 32, C: 32 },  // Target
  2000                       // 2s steps
);

// Get system-wide phase balance
const balance = phaseCurrentController.getSystemPhaseBalance();
if (!balance.balanced) {
  console.warn(`Phase imbalance: ${balance.imbalance}`);
}

// Configure phase balancing
phaseCurrentController.setPhaseBalancing(true);
phaseCurrentController.setMaxImbalance(0.20); // 20% max
```

### 2.3 DC Fast Charging Controller

**File:** `src/services/DCFastChargingController.js`

**Purpose:** Manage DC fast charging with ramp rate limiting and thermal derating.

**Usage:**

```javascript
import dcfcController from './services/DCFastChargingController.js';

// Set DC power limit
await dcfcController.setPowerLimit('dcfc_1', 150, { // 150kW target
  autoRamp: true  // Automatically ramp to target
});

// Set DC current limit
await dcfcController.setCurrentLimit('dcfc_1', 200); // 200A

// Update measurements
dcfcController.updateMeasurements('dcfc_1', {
  power: 145.2,
  current: 195.5,
  voltage: 742,
  temperature: 65,  // Cable temperature
  soc: 45           // Vehicle SoC
});

// Configure vehicle taper curve
dcfcController.setVehicleTaper('dcfc_1', {
  enabled: true,
  soc: 45,
  taperStartSoC: 80,  // Start tapering at 80%
  taperRate: 0.7      // Reduce by 70% from 80% to 100%
});

// Update vehicle SoC
dcfcController.updateVehicleSoC('dcfc_1', 82);

// Enable bidirectional (V2G) mode
await dcfcController.enableBidirectional('dcfc_1', 50); // Export 50kW

// Get status
const status = dcfcController.getStatus();
console.log(`DCFC status:`, status);
```

**Features:**
- Automatic ramp rate limiting (configurable kW/s)
- Thermal derating based on temperature
- Vehicle taper curve support
- Bidirectional (V2G) support
- Continuous ramping to target

---

## Phase 3: Site Constraints

### 3.1 Site Constraints Manager

**File:** `src/services/SiteConstraintsManager.js`

**Purpose:** Enforce site-level electrical constraints.

**Usage:**

```javascript
import siteConstraintsManager from './services/SiteConstraintsManager.js';

// Configure service entrance
siteConstraintsManager.configureService({
  maxCurrent: 400,          // 400A per phase
  maxPower: 250,            // 250kW total
  voltage: 480,             // 480V
  phases: 3,
  maxImbalance: 0.10,       // 10% max phase imbalance
  minPowerFactor: 0.90,
  frequency: 60,
  nec625Factor: 0.80        // NEC 625 continuous load factor
});

// Configure feeder
siteConstraintsManager.configureFeeder('feeder_1', {
  name: 'Main Parking Lot',
  maxCurrent: 200,
  maxPower: 120,
  phases: 3,
  breakerRating: 225,       // 225A breaker
  cableAmpacity: 200,
  connectedStations: ['station_1', 'station_2', 'station_3']
});

// Configure transformer
siteConstraintsManager.configureTransformer('transformer_1', {
  name: 'Main Transformer',
  ratedPower: 300,          // 300kVA
  continuousFactor: 0.80,   // 80% continuous
  maxTemp: 80,              // 80°C max
  coolingMethod: 'ONAN',
  connectedFeeders: ['feeder_1', 'feeder_2']
});

// Update measurements
siteConstraintsManager.updateServiceMeasurements({
  power: 180,
  current: { A: 250, B: 260, C: 255 },
  voltage: { A: 480, B: 478, C: 482 },
  powerFactor: 0.95,
  frequency: 60.1
});

// Get available capacity (considering all constraints)
const available = siteConstraintsManager.getAvailableCapacity();
console.log(`Available capacity: ${available.toFixed(1)}kW`);

// Get violations
const violations = siteConstraintsManager.getViolations({
  severity: 'critical',
  limit: 10
});

for (const violation of violations) {
  console.error(`VIOLATION: ${violation.message}`);
}

// Get status
const status = siteConstraintsManager.getStatus();
```

**Monitored Constraints:**
- Service power and current limits
- Phase imbalance
- Power factor
- Voltage deviation
- Frequency deviation
- Feeder current and breaker ratings
- Cable ampacity
- Transformer thermal limits
- NEC 625 continuous load factor

---

## Integration Guide

### 4.1 Integrate into Main Application

**File:** `src/index.js`

```javascript
import healthCheckService from './services/HealthCheckService.js';
import failSafeManager from './services/FailSafeManager.js';
import loadSheddingService from './services/LoadSheddingService.js';
import auditLogger from './services/AuditLogger.js';
import capabilityManager from './services/CapabilityManager.js';
import siteConstraintsManager from './services/SiteConstraintsManager.js';
import { rateLimiters } from './middleware/rateLimiter.js';

// ... (existing imports)

// Initialize services
async function initializeServices() {
  // Register health checks
  healthCheckService.registerStandardChecks({
    loadManager,
    stationManager,
    dataLogger,
    mqttDriver,
    ocppDriver
  });

  healthCheckService.startPeriodicChecks(30000);

  // Configure site constraints
  siteConstraintsManager.configureService({
    maxPower: parseInt(process.env.MAX_GRID_CAPACITY_KW) || 100,
    maxCurrent: parseInt(process.env.MAX_SERVICE_CURRENT) || 400,
    voltage: 480,
    phases: 3,
    nec625Factor: 0.80
  });

  // Start fail-safe monitoring
  failSafeManager.startHeartbeat(10000);

  console.log('[App] Enhanced services initialized');
}

// Apply rate limiting
app.use('/api/', rateLimiters.standard);

// Health check endpoints
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[App] SIGTERM received, shutting down gracefully...');

  healthCheckService.stopPeriodicChecks();
  failSafeManager.stopHeartbeat();
  await auditLogger.shutdown();

  process.exit(0);
});

// Start app
initializeServices().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

### 4.2 Update LoadManager Integration

**File:** `src/services/LoadManager.js`

Add to existing LoadManager:

```javascript
import loadSheddingService from './LoadSheddingService.js';
import siteConstraintsManager from './SiteConstraintsManager.js';
import phaseCurrentController from './PhaseCurrentController.js';
import dcfcController from './DCFastChargingController.js';
import capabilityManager from './CapabilityManager.js';
import failSafeManager from './FailSafeManager.js';
import auditLogger from './AuditLogger.js';

class LoadManager {
  async balanceLoad() {
    try {
      // Update fail-safe heartbeat
      failSafeManager.heartbeat();

      // Get available capacity from site constraints
      const totalCapacity = siteConstraintsManager.getAvailableCapacity();

      // Check for offline stations and apply fail-safe
      await failSafeManager.checkStations();

      // Evaluate load shedding
      const currentLoad = this.calculateTotalLoad();
      const sheddingResult = loadSheddingService.evaluate(
        currentLoad,
        totalCapacity,
        this.stationManager.stations
      );

      if (sheddingResult) {
        // Apply shedding actions
        for (const action of sheddingResult.actions) {
          await this.applySheddingAction(action);
        }
        return;
      }

      // Normal load balancing...
      const allocations = this.calculateAllocations(totalCapacity);

      for (const allocation of allocations) {
        await this.applyAllocation(allocation);
      }

      // Audit log
      auditLogger.logLoadManagement({
        action: 'rebalance',
        totalCapacity,
        allocations: allocations.length
      });

    } catch (error) {
      console.error('[LoadManager] Balance failed:', error);
      auditLogger.logError('load_management', error);
    }
  }

  async applyAllocation(allocation) {
    const station = this.stationManager.stations.get(allocation.stationId);
    const capabilities = capabilityManager.getCapabilities(allocation.stationId);

    if (!capabilities) {
      // Discover capabilities first
      await capabilityManager.discoverCapabilities(
        allocation.stationId,
        station.protocol,
        station.communication
      );
    }

    // Update fail-safe record
    failSafeManager.updateStationComm(allocation.stationId);
    failSafeManager.recordGoodConfig(allocation.stationId, {
      currentPower: allocation.power
    });

    if (capabilities.type === 'ac') {
      // Use phase current controller
      const phases = phaseCurrentController.powerToPhaseCurrents(
        allocation.stationId,
        allocation.power
      );
      await phaseCurrentController.setPhaseCurrents(allocation.stationId, phases);
    } else if (capabilities.type === 'dc') {
      // Use DC controller
      await dcfcController.setPowerLimit(allocation.stationId, allocation.power);
    }
  }
}
```

### 4.3 Update Protocol Drivers to Use Circuit Breaker

**Example for ModbusDriver.js:**

```javascript
import { circuitBreakerRegistry } from '../utils/CircuitBreaker.js';

class ModbusDriver {
  async readRegister(stationId, address) {
    const breaker = circuitBreakerRegistry.get(`modbus_${stationId}`, {
      failureThreshold: 5,
      timeout: 5000,
      maxRetries: 3
    });

    return await breaker.execute(async () => {
      // Original modbus read logic
      const client = this.getClient(host, port);
      const result = await client.readHoldingRegisters(address, 1);
      return result.data[0];
    });
  }
}
```

---

## API Reference

### Health Endpoints

```
GET /health
GET /health/live
GET /health/ready
GET /api/circuit-breakers
GET /api/watchdogs
GET /api/fail-safe/status
GET /api/load-shedding/status
GET /api/site-constraints/status
GET /api/capabilities/:stationId
GET /api/audit/logs
GET /api/audit/stats
```

### Control Endpoints

```
POST /api/stations/:id/phase-currents
POST /api/stations/:id/dc-power
POST /api/stations/:id/capabilities/discover
POST /api/load-shedding/configure
POST /api/site-constraints/service
POST /api/site-constraints/feeder
POST /api/site-constraints/transformer
```

---

## Configuration Examples

### Environment Variables

```bash
# Existing
MAX_GRID_CAPACITY_KW=250
PEAK_DEMAND_THRESHOLD_KW=200

# New
MAX_SERVICE_CURRENT=400
SERVICE_VOLTAGE=480
SERVICE_PHASES=3
NEC625_CONTINUOUS_FACTOR=0.80
MAX_PHASE_IMBALANCE=0.10
ENABLE_LOAD_SHEDDING=true
LOAD_SHEDDING_UPPER_THRESHOLD=0.95
LOAD_SHEDDING_LOWER_THRESHOLD=0.85
ENABLE_FAIL_SAFE=true
FAIL_SAFE_COMM_TIMEOUT=30000
AUDIT_LOG_DIR=./logs/audit
HEALTH_CHECK_INTERVAL=30000
```

### Docker Compose

```yaml
services:
  backend:
    environment:
      - MAX_GRID_CAPACITY_KW=250
      - MAX_SERVICE_CURRENT=400
      - SERVICE_VOLTAGE=480
      - ENABLE_LOAD_SHEDDING=true
      - ENABLE_FAIL_SAFE=true
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Testing

### Test Circuit Breaker

```bash
curl http://localhost:3000/api/circuit-breakers
```

### Test Health Checks

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

### Test Capability Discovery

```bash
curl -X POST http://localhost:3000/api/stations/station_1/capabilities/discover \
  -H "Content-Type: application/json" \
  -d '{"profile": "ac_level2_three"}'
```

### Test Phase Current Control

```bash
curl -X POST http://localhost:3000/api/stations/station_1/phase-currents \
  -H "Content-Type: application/json" \
  -d '{"phases": {"A": 16, "B": 16, "C": 16}}'
```

### View Audit Logs

```bash
curl http://localhost:3000/api/audit/logs?category=station_control&limit=50
```

---

## Summary

This implementation adds production-grade features to your DLM system:

**Safety & Reliability:**
- Circuit breakers prevent cascading failures
- Watchdogs detect stalled operations
- Health checks enable container orchestration
- Fail-safe defaults ensure safe offline operation
- Load shedding prevents grid overload
- Audit logging provides compliance trail

**Control Primitives:**
- Capability discovery validates commands
- Per-phase AC current control
- DC fast charging with ramp limiting
- Thermal derating support
- Bidirectional (V2G) support

**Site Constraints:**
- Service/feeder/transformer limits
- Phase balancing enforcement
- Power quality monitoring
- NEC 625 compliance

All services are production-ready, fully documented, and include comprehensive error handling.
