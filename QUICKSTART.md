# Quick Start Guide

Get your WAGO Dynamic Load Management system running in 5 minutes!

## Option 1: Docker (Recommended)

```bash
# 1. Navigate to project
cd platform_dlm

# 2. Start all services
docker-compose up -d

# 3. Open browser
open http://localhost
```

That's it! The system is now running with:
- ✅ Web UI on port 80
- ✅ API on port 3000
- ✅ WebSocket on port 3001
- ✅ MQTT broker on port 1883
- ✅ InfluxDB on port 8086

## Option 2: Development Mode

```bash
# 1. Install backend dependencies
npm install

# 2. Start backend
npm run dev

# 3. In a new terminal, start frontend
cd frontend
npm install
npm run dev

# 4. Open browser
open http://localhost:5173
```

## Add Your First Charging Station

### Via Web UI
1. Go to **Charging Stations** page
2. Click **Add Station**
3. Fill in the details
4. Click **Save**

### Via API (Example: Modbus Station)

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Station 01",
    "zone": "parking-lot-a",
    "maxPower": 22,
    "protocol": "modbus",
    "communication": {
      "host": "192.168.1.100",
      "port": 502,
      "unitId": 1,
      "registers": {
        "status": 1000,
        "power": 1001,
        "powerSetpoint": 1003
      }
    }
  }'
```

### Via API (Example: MQTT Station)

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Station 02",
    "zone": "parking-lot-b",
    "maxPower": 11,
    "protocol": "mqtt",
    "communication": {
      "topics": {
        "status": "charger/02/status",
        "power": "charger/02/power",
        "control": "charger/02/control"
      }
    }
  }'
```

## Test the System

### 1. Check System Health
```bash
curl http://localhost:3000/health
```

### 2. View Current Load
```bash
curl http://localhost:3000/api/load/status
```

### 3. Simulate PV Production
```bash
curl -X POST http://localhost:3000/api/energy/pv/simulate
```

### 4. View Stations
```bash
curl http://localhost:3000/api/stations
```

## Configure Your System

1. Go to **Settings** page in the web UI
2. Set your grid capacity (default: 500 kW)
3. Set peak threshold (default: 450 kW)
4. Save changes

Or via API:

```bash
curl -X POST http://localhost:3000/api/load/limits \
  -H "Content-Type: application/json" \
  -d '{
    "maxGridCapacity": 500,
    "peakDemandThreshold": 450
  }'
```

## Enable PV Integration

Edit `.env`:

```bash
PV_SYSTEM_ENABLED=true
PV_MAX_CAPACITY_KW=100
ENABLE_PV_EXCESS_CHARGING=true
```

Restart services:

```bash
docker-compose restart backend
```

## Create a Schedule

Example: Start charging every night at 10 PM

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Night Charging",
    "cronExpression": "0 22 * * *",
    "action": "start_charging",
    "enabled": true
  }'
```

## Monitor Real-Time

Open the **Dashboard** page to see:
- Total stations and their status
- Current grid load
- Available capacity
- PV production (if enabled)
- Real-time updates via WebSocket

## Stop Services

```bash
# Docker
docker-compose down

# Development
# Press Ctrl+C in terminal windows
```

## What's Next?

- Read the full [SETUP.md](SETUP.md) for detailed configuration
- See [README.md](README.md) for feature overview
- Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for architecture details

## Need Help?

- API not responding? Check `docker-compose logs backend`
- UI not loading? Check `docker-compose logs frontend`
- MQTT not working? Check `docker-compose logs mqtt`
- Database issues? Check `docker-compose logs influxdb`

## Default Ports

| Service  | Port | URL |
|----------|------|-----|
| Web UI   | 80   | http://localhost |
| API      | 3000 | http://localhost:3000 |
| WebSocket| 3001 | ws://localhost:3001 |
| MQTT     | 1883 | mqtt://localhost:1883 |
| InfluxDB | 8086 | http://localhost:8086 |

---

**You're all set! Happy charging! ⚡🔋**
