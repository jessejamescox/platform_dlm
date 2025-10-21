# Demo Mode Quick Reference

## One-Liners

```bash
# Enable normal scenario (10x speed)
curl -X POST http://localhost:3000/api/demo/enable -H "Content-Type: application/json" -d '{"scenario":"normal","timeMultiplier":10}'

# Check status
curl http://localhost:3000/api/demo/status | jq .

# Disable demo
curl -X POST http://localhost:3000/api/demo/disable

# List scenarios
curl http://localhost:3000/api/demo/scenarios | jq .

# Change to load shedding (30x speed)
curl -X POST http://localhost:3000/api/demo/scenario -H "Content-Type: application/json" -d '{"scenario":"load_shedding"}'

# Speed up to 50x
curl -X POST http://localhost:3000/api/demo/speed -H "Content-Type: application/json" -d '{"multiplier":50}'
```

## Scenarios At-a-Glance

| Scenario | Stations | Focus | Speed |
|----------|----------|-------|-------|
| `normal` | 5 AC + 2 DC | General demo | 10x |
| `peak_load` | 8 AC + 3 DC | High load | 5-10x |
| `load_shedding` | 5 AC (priority 1-9) | Shedding levels | 20-30x |
| `phase_imbalance` | 6 AC (single-phase) | Phase balance | 10x |
| `thermal_derating` | 1 DC (hot) | Thermal mgmt | 30-50x |
| `v2g_export` | 2 DC (export) | Bidirectional | 10x |
| `mixed_fleet` | Leaf, Tesla, F-150, Ariya | Real vehicles | 10x |
| `overnight_charging` | 6 AC (slow) | Off-peak | 50x |

## Watch Commands

```bash
# Watch demo status
watch -n 2 'curl -s http://localhost:3000/api/demo/status | jq ".stations"'

# Watch load shedding
watch -n 2 'curl -s http://localhost:3000/api/health/load-shedding | jq .'

# Watch phase balance
watch -n 2 'curl -s http://localhost:3000/api/control/phase-balance | jq .'

# Watch DC thermal
watch -n 1 'curl -s http://localhost:3000/api/control/dc/demo_dcfc_1 | jq .thermal'

# Watch site constraints
watch -n 2 'curl -s http://localhost:3000/api/health/site-constraints | jq .'
```

## Quick Tests

### Test Load Shedding
```bash
curl -X POST http://localhost:3000/api/demo/enable -H "Content-Type: application/json" -d '{"scenario":"load_shedding","timeMultiplier":30}'
watch -n 2 'curl -s http://localhost:3000/api/health/load-shedding'
# Wait for load to increase and watch shedding levels activate
```

### Test Thermal Derating
```bash
curl -X POST http://localhost:3000/api/demo/enable -H "Content-Type: application/json" -d '{"scenario":"thermal_derating","timeMultiplier":50}'
watch -n 1 'curl -s http://localhost:3000/api/control/dc/demo_dcfc_1 | jq .thermal'
# Watch temperature increase and derating activate
```

### Test V2G Export
```bash
curl -X POST http://localhost:3000/api/demo/enable -H "Content-Type: application/json" -d '{"scenario":"v2g_export"}'
curl http://localhost:3000/api/demo/status | jq '.stations | to_entries[] | select(.value.currentPower | contains("-"))'
# Shows stations with negative power (exporting)
```

## URL Shortcuts

- **Scenarios**: http://localhost:3000/api/demo/scenarios
- **Status**: http://localhost:3000/api/demo/status
- **Health**: http://localhost:3000/health
- **Load Shedding**: http://localhost:3000/api/health/load-shedding
- **Phase Balance**: http://localhost:3000/api/control/phase-balance
- **Audit Logs**: http://localhost:3000/api/health/audit/logs

## Common Issues

**Demo not updating?**
```bash
curl -X POST http://localhost:3000/api/demo/speed -H "Content-Type: application/json" -d '{"multiplier":20}'
```

**Want to reset?**
```bash
curl -X POST http://localhost:3000/api/demo/disable
curl -X POST http://localhost:3000/api/demo/enable
```

**Backend restart needed?**
```bash
docker-compose restart backend
```

---

**Full docs**: See [DEMO_MODE.md](DEMO_MODE.md)
