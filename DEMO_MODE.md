# Demo Mode Guide

## Overview

Demo Mode provides realistic simulated charging scenarios for demonstration, testing, and training purposes. It creates virtual charging stations, vehicles, and energy meters with realistic behavior patterns.

## Features

- **8 Pre-configured Scenarios** - From normal operations to complex edge cases
- **Realistic Simulation** - SoC progression, thermal derating, phase balancing, V2G
- **Time Acceleration** - Speed up simulation 1x-100x for testing
- **Live Updates** - Real-time WebSocket updates of simulated data
- **Full Integration** - Works with all enhanced features (load shedding, health checks, etc.)

---

## Quick Start

### Enable Demo Mode

```bash
# Enable with default scenario (normal operations)
curl -X POST http://localhost:3000/api/demo/enable

# Enable with specific scenario
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"peak_load","timeMultiplier":10}'
```

### Check Status

```bash
curl http://localhost:3000/api/demo/status
```

### Disable Demo Mode

```bash
curl -X POST http://localhost:3000/api/demo/disable
```

---

## Available Scenarios

### 1. Normal Operations (`normal`)

**Description**: Typical daily operations with mixed charging load

**Configuration**:
- 5 x AC Level 2 stations (11kW each)
- 2 x DC Fast Chargers (150kW each)
- Grid meter (180kW base + variation)
- Building meter (80kW base)
- Solar meter (50kW base, follows solar curve)

**Use Case**: General demonstration, baseline testing

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal"}'
```

---

### 2. Peak Load (`peak_load`)

**Description**: High demand scenario pushing system limits

**Configuration**:
- 8 x AC Level 2 stations (11kW each)
- 3 x DC Fast Chargers (350kW each)
- High building consumption (150kW)
- Minimal solar production (10kW)
- Total charging: ~1138kW

**Use Case**: Testing load balancing under stress, approaching capacity limits

**Expected Behavior**:
- Load approaches 95% of grid capacity
- May trigger load shedding if configured
- Priority-based allocation becomes critical

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"peak_load","timeMultiplier":5}'
```

---

### 3. Load Shedding Demo (`load_shedding`)

**Description**: Demonstrates automatic load shedding as demand increases

**Configuration**:
- 5 x AC stations with priorities 1, 3, 5, 7, 9
- Building load gradually increases
- Grid meter shows increasing load pattern

**Use Case**: Demonstrating load shedding levels and priority-based reduction

**Expected Behavior**:
1. Normal operation at start
2. Load gradually increases
3. At 95% capacity: Level 1 shedding (reduce priority ≤3 by 20%)
4. At 98%: Level 2 shedding (reduce priority ≤5 by 40%)
5. At 100%+: Higher shedding levels activated
6. As load decreases below 85%, shedding releases

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"load_shedding","timeMultiplier":20}'
```

Monitor load shedding:
```bash
curl http://localhost:3000/api/health/load-shedding
```

---

### 4. Phase Imbalance (`phase_imbalance`)

**Description**: Single-phase chargers creating three-phase imbalance

**Configuration**:
- 6 x Single-phase AC stations (7.4kW each)
- 2 stations per phase (A, B, C)
- Demonstrates phase balancing

**Use Case**: Testing phase current control and balancing algorithms

**Expected Behavior**:
- Phase imbalance may exceed 10% threshold
- System should warn about imbalance
- Demonstrates need for phase balancing

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"phase_imbalance"}'
```

Check phase balance:
```bash
curl http://localhost:3000/api/control/phase-balance
```

---

### 5. Thermal Derating (`thermal_derating`)

**Description**: DC charger experiencing thermal derating

**Configuration**:
- 1 x DC Fast Charger (350kW)
- Starting temperature: 65°C
- Temperature increases 0.5°C per minute
- Derating starts at 70°C

**Use Case**: Demonstrating thermal management and automatic derating

**Expected Behavior**:
1. Initial charging at full power (300kW)
2. Temperature gradually increases
3. At 70°C: 20% derating begins
4. At 80°C: 50% derating
5. At 90°C: 80% derating (emergency)

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"thermal_derating","timeMultiplier":30}'
```

Monitor thermal state:
```bash
curl http://localhost:3000/api/control/dc/demo_dcfc_1
```

---

### 6. V2G Export (`v2g_export`)

**Description**: Vehicles exporting power back to grid

**Configuration**:
- 2 x V2G-capable DC chargers
- Vehicles at 85-90% SoC
- Exporting 50-75kW each
- Negative charging rate

**Use Case**: Demonstrating bidirectional charging and grid support

**Expected Behavior**:
- Negative power readings (export)
- SoC decreases gradually
- Grid load reduced by export amount
- Stops when target SoC reached

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"v2g_export"}'
```

---

### 7. Mixed Fleet (`mixed_fleet`)

**Description**: Variety of real-world vehicles and charger types

**Configuration**:
- Nissan Leaf (AC Level 2, 6.6kW)
- Tesla Model 3 (AC Level 2 Three-Phase, 11kW)
- Ford F-150 Lightning (DC Fast CCS, 150kW)
- Nissan Ariya (DC Fast CHAdeMO, 62.5kW)
- Solar production (40kW)

**Use Case**: Realistic mixed EV fleet demonstration

**Expected Behavior**:
- Different charging rates per vehicle
- Different SoC progression curves
- Demonstrates multi-protocol support

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"mixed_fleet"}'
```

---

### 8. Overnight Charging (`overnight_charging`)

**Description**: Low-priority overnight charging scenario

**Configuration**:
- 6 x AC Level 2 stations (7.4kW each)
- Priority: 3 (lower priority)
- Low building consumption (30kW)
- Starting SoC: 15%
- Target SoC: 100%

**Use Case**: Demonstrating off-peak charging behavior

**Expected Behavior**:
- Slower charging rates
- Lower priority in load balancing
- Can run for extended periods
- Minimal grid stress

**Example**:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"overnight_charging","timeMultiplier":50}'
```

---

## API Reference

### List Scenarios

```bash
GET /api/demo/scenarios
```

**Response**:
```json
{
  "success": true,
  "scenarios": {
    "normal": {
      "name": "Normal Operations",
      "description": "5 AC + 2 DC chargers, ~60% capacity"
    },
    ...
  }
}
```

### Get Status

```bash
GET /api/demo/status
```

**Response**:
```json
{
  "success": true,
  "enabled": true,
  "scenario": "normal",
  "timeMultiplier": 10,
  "elapsedTime": "45s",
  "stations": {
    "demo_ac_1": {
      "name": "Demo AC Station 1",
      "type": "ac",
      "status": "charging",
      "currentPower": "10.8kW",
      "soc": "45%",
      "targetSoC": "80%",
      "energyDelivered": "5.67kWh"
    },
    ...
  },
  "meters": {
    "demo_grid_meter": {
      "name": "Demo Grid Meter",
      "type": "grid",
      "currentPower": "195.3kW",
      "totalEnergy": "8.54kWh"
    },
    ...
  }
}
```

### Enable Demo Mode

```bash
POST /api/demo/enable
Content-Type: application/json

{
  "scenario": "normal",
  "timeMultiplier": 10
}
```

**Parameters**:
- `scenario` (optional): Scenario name, default: "normal"
- `timeMultiplier` (optional): 1-100, default: 1 (real-time)

**Response**:
```json
{
  "success": true,
  "scenario": "normal",
  "stations": ["demo_ac_1", "demo_ac_2", ...],
  "meters": ["demo_grid_meter", ...],
  "message": "Demo mode enabled with scenario: normal"
}
```

### Disable Demo Mode

```bash
POST /api/demo/disable
```

**Response**:
```json
{
  "success": true,
  "message": "Demo mode disabled"
}
```

### Change Scenario

```bash
POST /api/demo/scenario
Content-Type: application/json

{
  "scenario": "peak_load"
}
```

### Set Time Multiplier

```bash
POST /api/demo/speed
Content-Type: application/json

{
  "multiplier": 20
}
```

**Speed up simulation by 20x** (1 minute real-time = 20 minutes simulated)

---

## Time Multiplier Guide

| Multiplier | Use Case | 1 Hour Real-Time |
|------------|----------|------------------|
| 1 | Real-time demo | 1 hour simulated |
| 5 | Fast demo | 5 hours simulated |
| 10 | Quick testing | 10 hours simulated |
| 20 | Overnight scenario | 20 hours simulated |
| 50 | Full charge cycle | 50 hours simulated |
| 100 | Stress testing | 100 hours simulated |

---

## Integration Examples

### JavaScript/React

```javascript
// Enable demo mode
const enableDemo = async () => {
  const response = await fetch('http://localhost:3000/api/demo/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario: 'normal',
      timeMultiplier: 10
    })
  });

  const result = await response.json();
  console.log('Demo enabled:', result);
};

// Monitor status
const checkStatus = async () => {
  const response = await fetch('http://localhost:3000/api/demo/status');
  const status = await response.json();

  console.log('Stations:', status.stations);
  console.log('Meters:', status.meters);
};

// Listen to WebSocket updates
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'station.updated') {
    console.log('Station update:', data.data);
  }
};
```

### Python

```python
import requests

# Enable demo
response = requests.post('http://localhost:3000/api/demo/enable', json={
    'scenario': 'load_shedding',
    'timeMultiplier': 20
})
print(response.json())

# Check status
status = requests.get('http://localhost:3000/api/demo/status').json()
for station_id, station in status['stations'].items():
    print(f"{station['name']}: {station['soc']} SoC, {station['currentPower']}")
```

### Bash

```bash
# Enable load shedding demo
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"load_shedding","timeMultiplier":30}'

# Watch status (refresh every 2 seconds)
watch -n 2 'curl -s http://localhost:3000/api/demo/status | jq ".stations"'

# Watch load shedding
watch -n 2 'curl -s http://localhost:3000/api/health/load-shedding | jq .'
```

---

## Testing Scenarios

### Test Load Shedding Levels

```bash
# 1. Enable load shedding scenario
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"load_shedding","timeMultiplier":30}'

# 2. Monitor load shedding status
watch -n 2 'curl -s http://localhost:3000/api/health/load-shedding'

# You should see shedding levels increase as load grows:
# Level 0 → Level 1 (95%) → Level 2 (98%) → Level 3+ (100%+)
```

### Test Phase Balancing

```bash
# 1. Enable phase imbalance scenario
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"phase_imbalance"}'

# 2. Check phase balance
curl http://localhost:3000/api/control/phase-balance

# You should see imbalance warnings
```

### Test Thermal Derating

```bash
# 1. Enable thermal derating scenario
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"thermal_derating","timeMultiplier":50}'

# 2. Monitor DC charger thermal state
watch -n 1 'curl -s http://localhost:3000/api/control/dc/demo_dcfc_1 | jq .thermal'

# You should see temperature increase and derating percentage
```

---

## Tips

1. **Start with `normal` scenario** for general demonstrations
2. **Use `timeMultiplier: 10-30`** for fast demos
3. **Use `timeMultiplier: 1-5`** for realistic demonstrations
4. **Monitor WebSocket** for real-time updates
5. **Check audit logs** to see all actions: `curl http://localhost:3000/api/health/audit/logs`
6. **Demo mode persists** until explicitly disabled
7. **Restart backend** to stop demo mode if needed

---

## Troubleshooting

### Demo not starting

```bash
# Check logs
docker-compose logs backend | grep Demo

# Verify demo API is available
curl http://localhost:3000/api/demo/scenarios
```

### Data not updating

```bash
# Check if demo is enabled
curl http://localhost:3000/api/demo/status

# Re-enable with higher time multiplier
curl -X POST http://localhost:3000/api/demo/speed \
  -H "Content-Type: application/json" \
  -d '{"multiplier":20}'
```

### Disable and reset

```bash
# Disable demo mode
curl -X POST http://localhost:3000/api/demo/disable

# Restart backend
docker-compose restart backend
```

---

## Demo Mode + Enhanced Features

Demo mode integrates with all enhanced features:

- ✅ **Health Checks**: See real-time system health with simulated load
- ✅ **Circuit Breakers**: Test circuit breaker behavior
- ✅ **Load Shedding**: Trigger actual load shedding with `load_shedding` scenario
- ✅ **Fail-Safe**: Simulate station offline behavior
- ✅ **Phase Balancing**: See phase imbalance with `phase_imbalance` scenario
- ✅ **Thermal Derating**: Watch thermal derating in action
- ✅ **Audit Logs**: All demo actions are logged
- ✅ **Site Constraints**: Test constraint violations

**Demo mode is perfect for showcasing your enhanced DLM system! 🎬**
