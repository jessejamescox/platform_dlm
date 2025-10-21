# Quick Start Guide - Enhanced DLM Features

## 5-Minute Setup

### 1. Rebuild Containers

```bash
cd /Users/jessecox/Documents/GitHub/platform_dlm
docker-compose build backend frontend
docker-compose up -d
```

### 2. Verify System Health

```bash
# Check if system is healthy
curl http://localhost:3000/health

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "uptime": ...,
#   "checks": {...},
#   "circuitBreakers": {...}
# }
```

### 3. View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Should see:
# [Init] Initializing enhanced services...
# [Init] Load shedding enabled
# [Init] Fail-safe monitoring enabled
# [Init] Enhanced services initialized successfully
# 🛡️  Enhanced Features: Safety, Control Primitives, Site Constraints
```

## Essential Commands

### Health Checks

```bash
# Liveness (is it alive?)
curl http://localhost:3000/health/live

# Readiness (ready for traffic?)
curl http://localhost:3000/health/ready

# Circuit breakers
curl http://localhost:3000/api/health/circuit-breakers

# Load shedding status
curl http://localhost:3000/api/health/load-shedding

# Site constraints
curl http://localhost:3000/api/health/site-constraints
```

### Station Control

```bash
# Discover capabilities
curl -X POST http://localhost:3000/api/control/capabilities/station_1/discover \
  -H "Content-Type: application/json" \
  -d '{"protocol":"ocpp","version":"1.6","profile":"ac_level2_three"}'

# Set AC phase currents (11kW @ 400V 3-phase)
curl -X POST http://localhost:3000/api/control/phase-currents/station_1 \
  -H "Content-Type: application/json" \
  -d '{"phases":{"A":16,"B":16,"C":16},"autoBalance":true}'

# Set DC power limit (150kW)
curl -X POST http://localhost:3000/api/control/dc-power/dcfc_1 \
  -H "Content-Type: application/json" \
  -d '{"power":150,"autoRamp":true}'
```

### Audit Logs

```bash
# View recent station control actions
curl "http://localhost:3000/api/health/audit/logs?category=station_control&limit=20"

# View audit statistics (last 7 days)
curl "http://localhost:3000/api/health/audit/stats?days=7"
```

## Environment Variables

Create or update `.env`:

```bash
# Enable enhanced features
ENABLE_LOAD_SHEDDING=true
ENABLE_FAIL_SAFE=true

# Site configuration
MAX_SERVICE_CURRENT=400
SERVICE_VOLTAGE=480
SERVICE_PHASES=3
NEC625_CONTINUOUS_FACTOR=0.80

# Load shedding thresholds
LOAD_SHEDDING_UPPER_THRESHOLD=0.95
LOAD_SHEDDING_LOWER_THRESHOLD=0.85

# Fail-safe
FAIL_SAFE_COMM_TIMEOUT=30000

# Health checks
HEALTH_CHECK_INTERVAL=30000
```

Then restart:

```bash
docker-compose restart backend
```

## Testing Scenarios

### Test 1: Health Monitoring

```bash
# 1. Check health
curl http://localhost:3000/health

# 2. View circuit breakers
curl http://localhost:3000/api/health/circuit-breakers

# 3. Check watchdogs
curl http://localhost:3000/api/health/watchdogs
```

### Test 2: Load Shedding Simulation

```bash
# Configure load shedding
curl -X POST http://localhost:3000/api/health/load-shedding/configure \
  -H "Content-Type: application/json" \
  -d '{"upperThreshold":0.95,"lowerThreshold":0.85}'

# Check status
curl http://localhost:3000/api/health/load-shedding

# When load > 95%, system will automatically shed based on priority
```

### Test 3: Capability Discovery

```bash
# Discover AC three-phase capabilities
curl -X POST http://localhost:3000/api/control/capabilities/station_1/discover \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "ocpp",
    "version": "1.6",
    "profile": "ac_level2_three"
  }'

# View capabilities
curl http://localhost:3000/api/control/capabilities/station_1
```

### Test 4: Phase Current Control

```bash
# Convert 11kW to phase currents
curl -X POST http://localhost:3000/api/control/power-to-phases/station_1 \
  -H "Content-Type: application/json" \
  -d '{"power":11}'

# Set phase currents
curl -X POST http://localhost:3000/api/control/phase-currents/station_1 \
  -H "Content-Type: application/json" \
  -d '{"phases":{"A":16,"B":16,"C":16}}'

# Check system phase balance
curl http://localhost:3000/api/control/phase-balance
```

### Test 5: Fail-Safe Testing

```bash
# Register fail-safe for a station (done automatically when station added)
# Test fail-safe
curl -X POST http://localhost:3000/api/health/fail-safe/station_1/test

# Check fail-safe status
curl http://localhost:3000/api/health/fail-safe
```

## Troubleshooting

### Issue: Services not starting

```bash
# Check logs
docker-compose logs backend

# Look for:
# [Init] Failed to initialize enhanced services: ...
```

**Solution**: Check environment variables and restart

### Issue: Circuit breaker is OPEN

```bash
# Check circuit breakers
curl http://localhost:3000/api/health/circuit-breakers

# Reset specific breaker
curl -X POST http://localhost:3000/api/health/circuit-breakers/modbus_station_1/reset
```

### Issue: Load shedding active unexpectedly

```bash
# Check status
curl http://localhost:3000/api/health/load-shedding

# Reset if needed
curl -X POST http://localhost:3000/api/health/load-shedding/reset

# Adjust thresholds
curl -X POST http://localhost:3000/api/health/load-shedding/configure \
  -H "Content-Type: application/json" \
  -d '{"upperThreshold":0.98,"lowerThreshold":0.90}'
```

### Issue: Audit logs not appearing

```bash
# Check if directory exists
docker exec platform_dlm_backend_1 ls -la /app/logs/audit

# If not, create it
docker exec platform_dlm_backend_1 mkdir -p /app/logs/audit
```

## Next Steps

1. ✅ System is running with enhanced features
2. Read [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for detailed usage
3. Read [ENHANCEMENTS_SUMMARY.md](ENHANCEMENTS_SUMMARY.md) for complete overview
4. Integrate control primitives into LoadManager (see IMPLEMENTATION_GUIDE.md Section 4.2)
5. Configure site-specific constraints
6. Set up monitoring/alerting (future enhancement)

## Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Overall system health |
| `/health/live` | Liveness probe (K8s) |
| `/health/ready` | Readiness probe (K8s) |
| `/api/health/*` | Health & management |
| `/api/control/*` | Control primitives |
| `/api/stations/*` | Station management |
| `/api/load/*` | Load balancing |

## Support

- Documentation: See IMPLEMENTATION_GUIDE.md
- Summary: See ENHANCEMENTS_SUMMARY.md
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**You now have a production-grade EV charging Dynamic Load Management system! 🚀**
