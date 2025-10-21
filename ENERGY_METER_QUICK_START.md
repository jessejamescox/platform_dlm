# Energy Meter - Quick Start

Your WAGO DLM now supports **energy meter integration** for accurate building consumption monitoring!

## ✅ What's New

- **EnergyMeterManager service** - Manages building energy meters
- **3 Protocol support** - Modbus, MQTT, HTTP REST API
- **Real-time monitoring** - Automatic polling and updates
- **Load integration** - Actual consumption used in load balancing
- **InfluxDB logging** - Historical data tracking
- **WebSocket updates** - Real-time dashboard updates

## 🚀 Quick Test (30 seconds)

### Test via MQTT (Easiest)

```bash
# 1. Publish a test reading to MQTT
mosquitto_pub -h localhost -p 1883 \
  -t "building/energy/power" \
  -m '{"power_kw": 45.5}'

# 2. Register MQTT meter
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test MQTT Meter",
    "location": "main-building",
    "protocol": "mqtt",
    "meterType": "grid",
    "communication": {
      "topicPower": "building/energy/power",
      "topicEnergy": "building/energy/total"
    }
  }'

# 3. Check meter is receiving data
curl http://localhost:3000/api/energy-meters

# 4. Publish more readings
mosquitto_pub -h localhost -p 1883 \
  -t "building/energy/power" \
  -m '{"power_kw": 52.3}'

# 5. Verify load management is using real data
curl http://localhost:3000/api/load/status
```

Look for `buildingConsumption: 52.3` in the response!

## 📋 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/energy-meters` | GET | List all meters |
| `/api/energy-meters` | POST | Register new meter |
| `/api/energy-meters/:id` | GET | Get meter details |
| `/api/energy-meters/:id` | PUT | Update meter config |
| `/api/energy-meters/:id` | DELETE | Remove meter |
| `/api/energy-meters/:id/reading` | GET | Get current reading |
| `/api/energy-meters/consumption/building` | GET | Total building consumption |

## 🔌 Protocol Examples

### Modbus TCP Meter

```bash
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABB B23 Grid Meter",
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

### MQTT Meter

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
      "topicCurrent": "building/energy/current"
    }
  }'
```

### HTTP REST API Meter

```bash
curl -X POST http://localhost:3000/api/energy-meters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cloud Smart Meter",
    "location": "main-building",
    "protocol": "http",
    "meterType": "grid",
    "pollInterval": 30000,
    "communication": {
      "url": "http://192.168.1.200/api/energy",
      "method": "GET",
      "headers": {
        "Accept": "application/json"
      }
    }
  }'
```

## 💡 Meter Types

Choose the right type for accurate load management:

- **`grid`** - Main utility connection (subtracted from capacity) ⚡
- **`building`** - Building sub-meter (subtracted from capacity)
- **`solar`** - PV production meter (added to capacity) ☀️
- **`zone`** - Zone monitoring (informational only)

## 🎯 How It Affects Load Management

Before energy meters:
```
Available Capacity = Grid Capacity (500 kW) - Estimated Load (0 kW)
                   = 500 kW for EV charging
```

With energy meters:
```
Available Capacity = Grid Capacity (500 kW) - Actual Building Load (80 kW)
                   = 420 kW for EV charging ✅
```

Much more accurate!

## 📊 Monitoring

### Check Current Readings

```bash
# All meters
curl http://localhost:3000/api/energy-meters

# Specific meter
curl http://localhost:3000/api/energy-meters/METER_ID/reading

# Building consumption summary
curl http://localhost:3000/api/energy-meters/consumption/building
```

### Watch Logs

```bash
docker-compose logs -f backend | grep EnergyMeter
```

### InfluxDB Data

```bash
# Open InfluxDB UI
open http://localhost:8086

# Query meter data
from(bucket: "charging_data")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "meter_reading")
```

## 🔧 Troubleshooting

### Meter shows "offline"

```bash
# Check logs
docker-compose logs backend | grep -A 5 EnergyMeter

# For Modbus: test connection
nc -zv 192.168.1.150 502

# For MQTT: test subscription
mosquitto_sub -h localhost -p 1883 -t "building/energy/#" -v

# For HTTP: test endpoint
curl -v http://192.168.1.200/api/energy
```

### Wrong values

Check scaling factors in your meter configuration:
- `powerScale`: 1 for kW, 0.001 for W
- `energyScale`: 1 for kWh, 0.001 for Wh
- `voltageScale`: Usually 0.1 or 1.0
- `currentScale`: Usually 0.001 or 1.0

### Load management not using meter data

```bash
# Check if meter is registered
curl http://localhost:3000/api/energy-meters

# Check load status includes buildingConsumption
curl http://localhost:3000/api/load/status | grep buildingConsumption

# Verify meter type is "grid" or "building"
```

## 📖 Full Documentation

See **[ENERGY_METER_SETUP_GUIDE.md](ENERGY_METER_SETUP_GUIDE.md)** for:
- Detailed protocol configurations
- Manufacturer-specific examples
- Advanced multi-meter setups
- Complete troubleshooting guide
- Best practices

## 🎉 Next Steps

1. ✅ Register your first meter (use MQTT test above)
2. ✅ Verify readings are accurate
3. ✅ Check load management uses real data
4. ✅ Set up InfluxDB dashboards
5. ✅ Configure alerts for high consumption

---

**Need Help?** Check [ENERGY_METER_SETUP_GUIDE.md](ENERGY_METER_SETUP_GUIDE.md) for detailed instructions!
