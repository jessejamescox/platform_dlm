# Demo Mode - Quick Start Guide

Demo mode is now fully integrated with the frontend and will display live updating values.

## Enabling Demo Mode

Enable demo mode with the default "normal" scenario:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal"}'
```

Enable with a specific scenario:
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"peak_load"}'
```

Enable with faster time (10x speed):
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal","timeMultiplier":10}'
```

## Disabling Demo Mode

```bash
curl -X POST http://localhost:3000/api/demo/disable
```

## Checking Status

```bash
curl http://localhost:3000/api/demo/status | jq
```

## Available Scenarios

1. **normal** - Typical operations with 5 AC + 2 DC stations (~60% capacity)
2. **peak_load** - High demand with 8 AC + 3 DC stations (triggers load management)
3. **load_shedding** - Overload scenario that triggers load shedding levels
4. **phase_imbalance** - Single-phase loads causing phase imbalance
5. **thermal_derating** - DC fast charger with temperature increase
6. **v2g_export** - Vehicle-to-Grid bidirectional power flow
7. **mixed_fleet** - Various vehicle types (Nissan Leaf, Tesla, F-150, Ariya)
8. **overnight_charging** - Low-priority slow charging scenario

## Switching Scenarios

While demo mode is running, you can switch to a different scenario:
```bash
curl -X POST http://localhost:3000/api/demo/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"load_shedding"}'
```

## Adjusting Speed

Change the time multiplier while demo is running:
```bash
curl -X POST http://localhost:3000/api/demo/speed \
  -H "Content-Type: application/json" \
  -d '{"timeMultiplier":5}'
```

Time multiplier examples:
- `1` = real-time (default)
- `5` = 5x faster (5 minutes passes in 1 minute)
- `10` = 10x faster (1 hour passes in 6 minutes)
- `60` = very fast testing (1 hour passes in 1 minute)

## Viewing in Frontend

Once demo mode is enabled, the simulated stations will appear in your frontend dashboard:
- Station power values update every 2 seconds
- State of Charge (SoC) increases realistically
- Thermal derating visible on temperature-sensitive scenarios
- Load shedding events visible during overload scenarios

## Monitoring Updates

Watch station values change in real-time:
```bash
# Check every 2 seconds
watch -n 2 'curl -s http://localhost:3000/api/stations | jq ".data[0] | {id, currentPower, currentSoC}"'
```

Check overall system load:
```bash
curl http://localhost:3000/api/load/current | jq
```

Check site constraints:
```bash
curl http://localhost:3000/api/health/site-constraints | jq
```

## Integration with Frontend

Demo mode automatically:
- ✅ Registers stations in `state.stations` (visible in frontend)
- ✅ Registers meters in `state.energyMeters` (visible in energy dashboard)
- ✅ Broadcasts WebSocket updates every 2 seconds
- ✅ Updates all control primitives (phase currents, DC power, thermal state)
- ✅ Triggers load shedding when capacity exceeded
- ✅ Updates site constraint measurements

## Testing Specific Features

### Test Load Shedding
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"load_shedding","timeMultiplier":5}'
```

Watch for load shedding events:
```bash
watch -n 1 'curl -s http://localhost:3000/api/health/load-shedding | jq "{active, level, actions}"'
```

### Test Phase Balancing
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"phase_imbalance"}'
```

Check phase balance:
```bash
curl http://localhost:3000/api/control/phase-balance | jq
```

### Test Thermal Derating
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"thermal_derating","timeMultiplier":10}'
```

Monitor DC station temperature:
```bash
watch -n 2 'curl -s http://localhost:3000/api/control/dc/demo_dcfc_1 | jq "{temp: .thermal.temperature, derating: .thermal.deratingFactor}"'
```

### Test V2G Export
```bash
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"v2g_export"}'
```

Check for negative power (export):
```bash
curl http://localhost:3000/api/stations | jq '.data[] | select(.currentPower < 0)'
```

## Troubleshooting

### Demo stations not appearing in frontend?
1. Check demo is enabled: `curl http://localhost:3000/api/demo/status`
2. Verify stations exist: `curl http://localhost:3000/api/stations | jq '.data | length'`
3. Check WebSocket connection in browser console

### Values not updating?
1. Verify simulation is running: check `elapsedTime` in status
2. Check backend logs: `docker-compose logs -f backend`
3. Restart demo mode: disable then enable again

### Unrealistic behavior?
- Try different time multiplier (lower = more realistic)
- Switch to a simpler scenario like "normal"
- Check for load shedding or thermal derating effects
