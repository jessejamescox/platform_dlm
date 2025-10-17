# WAGO Dynamic Load Management - Setup Guide

## Overview

This guide will help you set up and run the WAGO Dynamic Load Management system for EV charging stations.

## Prerequisites

- **Docker & Docker Compose** (recommended for production)
- **Node.js 20+** (for development)
- **MQTT Broker** (Mosquitto included in Docker setup)
- **InfluxDB** (included in Docker setup)

## Quick Start with Docker

### 1. Clone and Configure

```bash
cd platform_dlm
cp .env.example .env
```

### 2. Edit Environment Variables

Open `.env` and configure:

```env
# Grid Configuration
MAX_GRID_CAPACITY_KW=500        # Your max grid connection
PEAK_DEMAND_THRESHOLD_KW=450    # Peak demand threshold

# PV System (if available)
PV_SYSTEM_ENABLED=true
PV_MAX_CAPACITY_KW=100

# MQTT (if using external broker)
MQTT_BROKER_URL=mqtt://mqtt:1883
```

### 3. Start Services

```bash
docker-compose up -d
```

This starts:
- **Backend API** (port 3000)
- **Frontend UI** (port 80)
- **WebSocket** (port 3001)
- **MQTT Broker** (port 1883)
- **InfluxDB** (port 8086)

### 4. Access the Application

Open your browser to: **http://localhost**

Default credentials for InfluxDB:
- Username: `admin`
- Password: `adminpassword`

## Development Setup

### Backend Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start backend in dev mode (with auto-reload)
npm run dev
```

The API will be available at `http://localhost:3000`

### Frontend Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Registering Charging Stations

### Via API (cURL)

#### Modbus TCP Station

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Station 01",
    "type": "ac",
    "zone": "parking-lot-a",
    "maxPower": 22,
    "minPower": 3.7,
    "priority": 5,
    "protocol": "modbus",
    "communication": {
      "host": "192.168.1.100",
      "port": 502,
      "unitId": 1,
      "registers": {
        "status": 1000,
        "power": 1001,
        "energy": 1002,
        "powerSetpoint": 1003
      }
    }
  }'
```

#### MQTT Station

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Station 02",
    "type": "ac",
    "zone": "parking-lot-b",
    "maxPower": 11,
    "priority": 5,
    "protocol": "mqtt",
    "communication": {
      "topics": {
        "status": "charger/02/status",
        "power": "charger/02/power",
        "energy": "charger/02/energy",
        "control": "charger/02/control"
      }
    }
  }'
```

### Via Web UI

1. Navigate to **Charging Stations** page
2. Click **Add Station**
3. Fill in the form:
   - Name, Zone, Location
   - Max/Min Power
   - Priority (1-10)
   - Protocol (Modbus or MQTT)
   - Communication settings
4. Click **Save**

## MQTT Topics

### Station Status (Published by Station)

```
Topic: charger/{id}/status
Payload: {
  "status": 1,  // 0=offline, 1=ready, 2=charging, 3=error
  "user": {
    "id": "user123",
    "name": "John Doe",
    "rfidCard": "1234567890"
  }
}
```

### Station Power (Published by Station)

```
Topic: charger/{id}/power
Payload: {
  "power": 11.5  // kW
}
```

### Control Commands (Published by DLM)

```
Topic: charger/{id}/control
Payload: {
  "command": "set_power",
  "power": 7.4,
  "timestamp": "2025-01-17T10:00:00Z"
}
```

### PV Production (Published by PV System)

```
Topic: pv/energy/production
Payload: {
  "power": 45.2  // kW
}
```

## Modbus Register Mapping

### Typical Register Layout

| Register | Type    | Description       | Units  |
|----------|---------|-------------------|--------|
| 1000     | Holding | Station Status    | enum   |
| 1001     | Holding | Current Power     | 0.1kW  |
| 1002     | Holding | Session Energy    | 0.01kWh|
| 1003     | Holding | Power Setpoint    | 0.1kW  |

**Status Codes:**
- 0 = Offline
- 1 = Ready
- 2 = Charging
- 3 = Error
- 4 = Unavailable

## Creating Schedules

### Example: Off-Peak Charging

```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Off-Peak Charging",
    "description": "Start charging during off-peak hours",
    "type": "recurring",
    "cronExpression": "0 22 * * *",
    "action": "start_charging",
    "stationIds": null,
    "parameters": {
      "priority": 8
    },
    "enabled": true
  }'
```

### Cron Expression Examples

- `0 22 * * *` - Every day at 10 PM
- `0 6 * * *` - Every day at 6 AM
- `0 */2 * * *` - Every 2 hours
- `0 8 * * 1-5` - Weekdays at 8 AM
- `0 0 * * 0` - Sundays at midnight

## Load Management Configuration

### Set Grid Limits

```bash
curl -X POST http://localhost:3000/api/load/limits \
  -H "Content-Type: application/json" \
  -d '{
    "maxGridCapacity": 500,
    "peakDemandThreshold": 450
  }'
```

### Manual Rebalance

```bash
curl -X POST http://localhost:3000/api/load/rebalance
```

## PV Integration

### Simulate PV Production (Testing)

```bash
curl -X POST http://localhost:3000/api/energy/pv/simulate
```

### Set PV Production (Manual)

```bash
curl -X POST http://localhost:3000/api/energy/pv/production \
  -H "Content-Type: application/json" \
  -d '{
    "production": 75.5
  }'
```

### MQTT Integration

Publish PV production to MQTT:

```bash
mosquitto_pub -h localhost -t pv/energy/production \
  -m '{"power": 75.5}'
```

## Monitoring & Logs

### Backend Logs

```bash
# Docker
docker-compose logs -f backend

# Development
# Logs appear in console
```

### InfluxDB Data

Access InfluxDB UI: `http://localhost:8086`

Buckets:
- `charging_data` - All time-series data

Measurements:
- `load_metrics` - Grid load data
- `station_power` - Station power readings
- `station_energy` - Energy delivery
- `pv_metrics` - PV production
- `charging_session` - Session records

### WebSocket Monitoring

Connect to `ws://localhost:3001` to receive real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

## Troubleshooting

### Services won't start

```bash
# Check Docker logs
docker-compose logs

# Restart services
docker-compose restart

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### Stations not connecting

1. **Modbus**: Verify IP, port, and unit ID
2. **MQTT**: Check broker connection and topics
3. **Firewall**: Ensure ports are open
4. **Network**: Verify stations are reachable

```bash
# Test Modbus connection
telnet 192.168.1.100 502

# Test MQTT connection
mosquitto_sub -h localhost -t '#' -v
```

### Load balancing not working

1. Check `.env` setting: `ENABLE_LOAD_BALANCING=true`
2. Verify stations are registered and online
3. Check backend logs for errors
4. Manually trigger rebalance via API

### PV integration not working

1. Check `.env` setting: `PV_SYSTEM_ENABLED=true`
2. Verify MQTT topic: `PV_MQTT_TOPIC=pv/energy/production`
3. Test MQTT publishing
4. Check backend logs

## Production Deployment

### Security Checklist

- [ ] Change default InfluxDB credentials
- [ ] Enable MQTT authentication
- [ ] Use HTTPS/TLS for web access
- [ ] Configure firewall rules
- [ ] Set strong JWT secret
- [ ] Enable authentication on all services

### NGINX SSL Configuration

Add to `frontend/nginx.conf`:

```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

### MQTT Authentication

1. Create password file:

```bash
mosquitto_passwd -c mqtt/config/passwd admin
```

2. Update `mqtt/config/mosquitto.conf`:

```
allow_anonymous false
password_file /mosquitto/config/passwd
```

## API Reference

Full API documentation available at: `http://localhost:3000/api/`

### Key Endpoints

- `GET /api/stations` - List stations
- `POST /api/stations` - Register station
- `GET /api/load/status` - Current load
- `GET /api/energy/pv` - PV status
- `GET /api/schedules` - List schedules
- `GET /api/analytics/overview` - System overview

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/jessejamescox/platform_dlm/issues)
- Documentation: See [README.md](README.md)

## License

MIT
