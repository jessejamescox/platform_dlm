# Energy Meter Integration Guide

This guide explains how to connect energy meters to your WAGO DLM system to monitor actual building electricity consumption. This is critical for accurate load management.

## Why Energy Meters Matter

Energy meters provide **real-time building consumption data** which enables:

✅ Accurate calculation of available capacity for EV charging
✅ Prevention of grid overload by accounting for actual building loads
✅ Better load balancing decisions
✅ Cost tracking and energy analytics
✅ Detection of consumption anomalies

## Supported Protocols

The system supports **3 communication protocols**:

| Protocol | Best For | Complexity | Cost |
|----------|----------|------------|------|
| **Modbus TCP/RTU** | Industrial meters (ABB, Schneider, etc.) | Medium | Low |
| **MQTT** | IoT-enabled meters, custom solutions | Low | Low |
| **HTTP REST API** | Cloud-connected meters, smart meters | Low | Varies |

---

## Quick Start

### Option 1: Modbus Energy Meter

**Common Modbus meters:**
- ABB B-Series Energy Meters
- Schneider iEM3000 Series
- Carlo Gavazzi EM Series
- Phoenix Contact EEM-MA Series

**Step 1: Find your meter's Modbus configuration**

Check meter documentation for:
- IP address (e.g., 192.168.1.150)
- Modbus TCP port (usually 502)
- Unit ID/Slave ID (usually 1)
- Register addresses for:
  - Active Power (W)
  - Total Energy (kWh)
  - Voltage (V)
  - Current (A)

**Example: ABB B23 Meter**
```
IP: 192.168.1.150
Port: 502
Unit ID: 1

Registers:
- Power: 0x5000 (holding register)
- Energy Low: 0x5002
- Energy High: 0x5003
- Voltage: 0x5004
- Current: 0x5006
```

**Step 2: Register the meter via API**

```bash
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Building Meter",
    "location": "main-building",
    "protocol": "modbus",
    "meterType": "grid",
    "pollInterval": 5000,
    "communication": {
      "host": "192.168.1.150",
      "port": 502,
      "unitId": 1,
      "registers": {
        "power": 20480,
        "energy": 20482,
        "energyHigh": 20483,
        "voltage": 20484,
        "current": 20486,
        "powerScale": 1,
        "energyScale": 0.001,
        "voltageScale": 0.1,
        "currentScale": 0.001
      }
    }
  }'
```

**Scaling factors explained:**
- `powerScale`: Multiply raw value (W → kW, use 0.001 if meter returns W)
- `energyScale`: Convert to kWh (often 0.001 for Wh → kWh)
- `voltageScale`: Usually 0.1 or 1.0
- `currentScale`: Usually 0.001 or 1.0

---

### Option 2: MQTT Energy Meter

**Best for:**
- Home Assistant energy monitoring
- Custom IoT solutions
- Shelly EM devices
- ESPHome energy monitors

**Step 1: Configure your meter to publish to MQTT**

Example MQTT topics:
```
building/energy/power         → Current power in kW
building/energy/total         → Total energy in kWh
building/energy/voltage       → Voltage in V
building/energy/current       → Current in A
building/energy/status        → online/offline
```

**Step 2: Register the meter**

```bash
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MQTT Building Meter",
    "location": "main-building",
    "protocol": "mqtt",
    "meterType": "grid",
    "communication": {
      "topicPower": "building/energy/power",
      "topicEnergy": "building/energy/total",
      "topicVoltage": "building/energy/voltage",
      "topicCurrent": "building/energy/current",
      "topicStatus": "building/energy/status"
    }
  }'
```

**MQTT Message Formats Supported:**

JSON format:
```json
{
  "power_kw": 25.5,
  "voltage": 230.2,
  "current": 110.8
}
```

Simple value:
```
25.5
```

Both work! The system will parse automatically.

---

### Option 3: HTTP REST API

**Best for:**
- Cloud-connected smart meters
- Utility APIs
- Custom web services

**Step 1: Find your API endpoint**

Example endpoints:
```
GET https://api.meter-provider.com/v1/meters/12345/current
GET http://192.168.1.200/api/energy
```

**Step 2: Register the meter**

```bash
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HTTP Building Meter",
    "location": "main-building",
    "protocol": "http",
    "meterType": "grid",
    "pollInterval": 10000,
    "communication": {
      "url": "http://192.168.1.200/api/energy",
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      },
      "authToken": "your-api-token-here"
    }
  }'
```

**Expected API Response Format:**

```json
{
  "power_kw": 30.2,
  "total_kwh": 15420.5,
  "voltage": 230,
  "current": 131.3,
  "power_factor": 0.95
}
```

Alternate field names also supported:
- `power` / `activePower`
- `energy` / `totalEnergy`

---

## Meter Types

Configure the correct `meterType` for your use case:

| Type | Description | Impact on Load Management |
|------|-------------|---------------------------|
| `grid` | Main building electricity meter | **Subtracted from available capacity** |
| `building` | Sub-meter for building zones | **Subtracted from available capacity** |
| `solar` | Solar/PV production meter | **Added to available capacity** |
| `zone` | Specific area monitoring | Informational only |

---

## Complete API Reference

### Register Meter

```http
POST /api/energy-meters
Content-Type: application/json

{
  "name": "Meter Name",
  "location": "building-id",
  "protocol": "modbus|mqtt|http",
  "meterType": "grid|building|solar|zone",
  "pollInterval": 5000,  // milliseconds
  "communication": {
    // Protocol-specific config
  }
}
```

### Get All Meters

```http
GET /api/energy-meters
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "meter_xxx",
      "name": "Main Building Meter",
      "location": "main-building",
      "protocol": "modbus",
      "meterType": "grid",
      "status": "online",
      "currentPower": 28.5,
      "totalEnergy": 15420.3,
      "voltage": 230.1,
      "current": 123.7,
      "powerFactor": 0.95,
      "frequency": 50.02,
      "lastUpdate": "2025-10-20T10:30:00Z"
    }
  ],
  "count": 1
}
```

### Get Specific Meter

```http
GET /api/energy-meters/{meterId}
```

### Get Current Reading

```http
GET /api/energy-meters/{meterId}/reading
```

### Get Building Consumption

```http
GET /api/energy-meters/consumption/building
```

Returns sum of all `grid` and `building` type meters:
```json
{
  "success": true,
  "data": {
    "currentPower": 45.3,
    "totalEnergy": 28450.2,
    "meterCount": 2,
    "timestamp": "2025-10-20T10:30:00Z"
  }
}
```

### Update Meter

```http
PUT /api/energy-meters/{meterId}
Content-Type: application/json

{
  "pollInterval": 10000,
  "communication": {
    // Updated config
  }
}
```

### Delete Meter

```http
DELETE /api/energy-meters/{meterId}
```

---

## Example Configurations

### ABB B23 Modbus Meter

```json
{
  "name": "ABB B23 Main Meter",
  "location": "main-building",
  "protocol": "modbus",
  "meterType": "grid",
  "pollInterval": 5000,
  "communication": {
    "host": "192.168.1.150",
    "port": 502,
    "unitId": 1,
    "registers": {
      "power": 20480,
      "energy": 20482,
      "energyHigh": 20483,
      "voltage": 20484,
      "current": 20486,
      "powerFactor": 20488,
      "frequency": 20490,
      "powerScale": 1,
      "energyScale": 0.001,
      "voltageScale": 0.1,
      "currentScale": 0.001,
      "powerFactorScale": 0.001,
      "frequencyScale": 0.01
    }
  }
}
```

### Schneider iEM3000 Modbus Meter

```json
{
  "name": "Schneider iEM3000",
  "location": "main-building",
  "protocol": "modbus",
  "meterType": "grid",
  "pollInterval": 5000,
  "communication": {
    "host": "192.168.1.151",
    "port": 502,
    "unitId": 1,
    "registers": {
      "power": 3059,
      "energy": 45056,
        "voltage": 3027,
        "current": 3000,
        "powerFactor": 3078,
        "powerScale": 1,
        "energyScale": 1,
        "voltageScale": 0.1,
        "currentScale": 0.001,
        "powerFactorScale": 0.001
      }
  }
}
```

### Shelly EM MQTT Meter

```json
{
  "name": "Shelly EM Monitor",
  "location": "main-building",
  "protocol": "mqtt",
  "meterType": "grid",
  "communication": {
    "topicPower": "shellies/shellyem-abc123/emeter/0/power",
    "topicEnergy": "shellies/shellyem-abc123/emeter/0/total",
    "topicVoltage": "shellies/shellyem-abc123/emeter/0/voltage",
    "topicCurrent": "shellies/shellyem-abc123/emeter/0/current"
  }
}
```

### Home Assistant MQTT Integration

```json
{
  "name": "Home Assistant Energy",
  "location": "main-building",
  "protocol": "mqtt",
  "meterType": "grid",
  "communication": {
    "topicPower": "homeassistant/sensor/energy/power/state",
    "topicEnergy": "homeassistant/sensor/energy/total/state"
  }
}
```

---

## Testing Your Meter Connection

### Test 1: Verify Meter Registration

```bash
curl http://localhost:3000/api/energy-meters
```

Expected: Meter appears in list with `status: "online"`

### Test 2: Check Current Reading

```bash
curl http://localhost:3000/api/energy-meters/{METER_ID}/reading
```

Expected: Real-time power and energy values

### Test 3: Monitor via Logs

```bash
docker-compose logs -f backend | grep EnergyMeterManager
```

Look for:
```
[EnergyMeterManager] Registered meter: Main Building Meter
[EnergyMeterManager] Starting monitoring for Main Building Meter via modbus
```

### Test 4: Verify Load Management Integration

```bash
curl http://localhost:3000/api/load/status
```

Check that `buildingConsumption` field shows actual meter reading (not 0).

---

## Troubleshooting

### Modbus Connection Issues

**Problem:** Meter shows `status: "error"`

**Solutions:**
1. Verify network connectivity:
   ```bash
   ping 192.168.1.150
   ```

2. Check Modbus port is open:
   ```bash
   nc -zv 192.168.1.150 502
   ```

3. Verify register addresses in meter documentation

4. Check scaling factors (wrong scale = wrong values)

5. Try Modbus diagnostic tool:
   ```bash
   # Install modbus-cli
   npm install -g modbus-cli

   # Test connection
   modbus-cli read -h 192.168.1.150 -p 502 -u 1 -a 20480 -t holding -c 10
   ```

### MQTT Connection Issues

**Problem:** No data received from MQTT topics

**Solutions:**
1. Subscribe to topic manually:
   ```bash
   mosquitto_sub -h localhost -p 1883 -t "building/energy/#" -v
   ```

2. Check if messages are being published

3. Verify topic names match exactly (case-sensitive!)

4. Check MQTT broker is running:
   ```bash
   docker-compose ps mqtt
   ```

### HTTP API Issues

**Problem:** HTTP polling returns errors

**Solutions:**
1. Test endpoint directly:
   ```bash
   curl -v http://192.168.1.200/api/energy
   ```

2. Check authentication token is valid

3. Verify response format matches expected fields

4. Check poll interval isn't too aggressive (increase from 5s to 30s)

### Wrong Values Being Reported

**Common causes:**

1. **Incorrect scaling factors**
   - Meter returns Watts but scale is 1 (should be 0.001 for kW)
   - Meter returns Wh but scale is 1 (should be 0.001 for kWh)

2. **32-bit register splitting**
   - Some meters use 2 registers for energy (low + high word)
   - Use both `energy` and `energyHigh` registers

3. **Signed vs unsigned values**
   - Check if negative values should be possible

---

## Integration with Load Management

Once meters are connected, the system automatically:

✅ Uses real building consumption in load calculations
✅ Subtracts meter power from available capacity
✅ Logs consumption to InfluxDB
✅ Broadcasts updates via WebSocket
✅ Displays consumption in dashboard

**How it works:**

```javascript
// Load Manager calculation:
Available Capacity = Grid Capacity + PV Production - Building Consumption
                   = 500 kW + 50 kW - 80 kW
                   = 470 kW available for EV charging
```

---

## Multi-Meter Setups

You can register multiple meters for complex installations:

### Example: Multi-Building Campus

```bash
# Main grid meter
POST /api/energy-meters
{
  "name": "Main Grid Connection",
  "meterType": "grid",
  "protocol": "modbus",
  ...
}

# Building A sub-meter
POST /api/energy-meters
{
  "name": "Building A Meter",
  "location": "building-a",
  "meterType": "building",
  "protocol": "modbus",
  ...
}

# Solar production meter
POST /api/energy-meters
{
  "name": "Solar Array",
  "meterType": "solar",
  "protocol": "mqtt",
  ...
}
```

The system will:
- Sum all `grid` + `building` meters for total consumption
- Sum all `solar` meters and add to PV manager production
- Use combined data for load balancing

---

## Advanced: Custom Meter Drivers

If your meter isn't supported by the 3 standard protocols, you can:

1. **Use MQTT bridge**
   - Write a simple script to poll meter and publish to MQTT
   - Use Node-RED, Python, or any MQTT client

2. **Use HTTP wrapper**
   - Create a simple web service that queries meter
   - Expose standard HTTP endpoint

3. **Extend the codebase**
   - Add new protocol driver in `src/protocols/`
   - Follow pattern of ModbusDriver or MQTTDriver

---

## Data Retention

Energy meter readings are logged to InfluxDB with the following retention:

- Raw readings: 90 days (configurable)
- Aggregated hourly: 1 year
- Aggregated daily: 5 years

Query historical data:
```bash
# Via InfluxDB UI
open http://localhost:8086

# Filter by meter:
from(bucket: "charging_data")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "meter_reading")
  |> filter(fn: (r) => r.meter_name == "Main Building Meter")
```

---

## Best Practices

1. **Use dedicated network**
   Place meters on isolated VLAN for security

2. **Monitor regularly**
   Set up alerts for meter offline conditions

3. **Validate readings**
   Cross-check with utility bill data monthly

4. **Appropriate poll intervals**
   - Modbus: 5-10 seconds
   - MQTT: Event-driven (instant)
   - HTTP: 30-60 seconds (avoid rate limits)

5. **Backup configuration**
   Meter settings are auto-saved to `persistence/state.json`

---

## Next Steps

After connecting your energy meter:

1. ✅ Verify readings in dashboard
2. ✅ Test load management with real data
3. ✅ Set up InfluxDB dashboards
4. ✅ Configure alerts for high consumption
5. ✅ Review analytics for optimization opportunities

---

**Questions?** Check the [TESTING_GUIDE.md](TESTING_GUIDE.md) for integration testing scenarios.
