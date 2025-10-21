# Quick Start Testing - WAGO DLM

## ✅ System Status: READY

All services are running and ready for testing!

```
✓ Backend API    - http://localhost:3000
✓ Frontend UI    - http://localhost
✓ WebSocket      - ws://localhost:3001
✓ OCPP Server    - ws://localhost:9000
✓ MQTT Broker    - localhost:1883
✓ InfluxDB       - http://localhost:8086
```

---

## 🚀 Start Testing NOW (30 seconds)

### Option 1: Web UI (Recommended)

```bash
# Open in browser
open http://localhost
```

**What to do:**
1. Click "Charging Stations" in sidebar
2. Click "Add Station" button
3. Fill in the form with any values
4. Click "Add Station"
5. ✅ Station appears in the list!

### Option 2: API Test

```bash
# Create a test station
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quick Test Station",
    "zone": "test-zone",
    "type": "ac",
    "maxPower": 22,
    "minPower": 3.7,
    "priority": 5,
    "protocol": "mqtt",
    "communication": {
      "topicStatus": "test/status",
      "topicPower": "test/power",
      "topicControl": "test/control"
    }
  }'

# Check it exists
curl http://localhost:3000/api/stations
```

---

## 🎯 5-Minute Feature Tour

### 1. Dashboard (30 sec)
- Open http://localhost
- View system overview
- Check stats cards
- Toggle theme (light/dark)

### 2. Stations Management (2 min)
- Click "Charging Stations"
- Add a station (manual)
- View station details
- Delete station

### 3. AI Setup (2 min)
**First, configure AI:**
```bash
# Edit .env and add:
AI_API_KEY=sk-proj-YOUR-OPENAI-KEY

# Restart backend
docker-compose restart backend
```

**Then test:**
1. Create `test.txt`: "ABB Terra 22kW OCPP 1.6-J charger"
2. Go to Stations → Click "AI Setup"
3. Upload test.txt
4. Review AI extraction
5. Create station

### 4. Load Management (30 sec)
- Add 2-3 stations
- Go to "Load Management"
- See capacity distribution
- Check utilization percentage

---

## 📖 Testing Guides by Depth

| Guide | Time | What's Covered |
|-------|------|----------------|
| **QUICK_START_TESTING.md** (this file) | 5 min | Basic smoke test |
| **AI_FEATURE_TESTING_GUIDE.md** | 15 min | AI manual parsing feature |
| **TESTING_GUIDE.md** | 60 min | Complete feature testing |

---

## 🔥 Quick Tests by Feature

### Test: Basic Functionality
```bash
curl http://localhost:3000/api/stations
# Expected: {"success":true,"data":[]}
```

### Test: Load Status
```bash
curl http://localhost:3000/api/load/status
# Expected: JSON with capacity, load, etc.
```

### Test: Energy Status
```bash
curl http://localhost:3000/api/energy/status
# Expected: JSON with PV and consumption data
```

### Test: Create Station
```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","zone":"z1","type":"ac","maxPower":22,"minPower":3.7,"priority":5,"protocol":"ocpp","communication":{"chargePointId":"CP001","connectorId":1}}'
```

### Test: PV Simulation
```bash
curl -X POST http://localhost:3000/api/energy/pv/simulate \
  -H "Content-Type: application/json" \
  -d '{"power": 50}'
```

---

## 🐛 Troubleshooting

### Backend not responding
```bash
docker-compose logs backend
docker-compose restart backend
```

### Frontend not loading
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### Need fresh start
```bash
docker-compose down
docker-compose up -d
```

### Check specific service
```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# All services
docker-compose ps
```

---

## 📊 Test Checklist

Quick validation checklist:

- [ ] Web UI loads at http://localhost
- [ ] Can navigate through all pages (Dashboard, Stations, etc.)
- [ ] Can add a station via UI
- [ ] Can add a station via API
- [ ] Station appears in list immediately
- [ ] Dashboard shows correct station count
- [ ] Theme toggle works
- [ ] Load Management page shows data
- [ ] Energy page shows data

---

## 🎓 What to Test Next

After basic testing works:

1. **Multiple Stations** - Add 5 stations, see load distribution
2. **Priority Levels** - Create stations with different priorities (1-10)
3. **Protocols** - Test OCPP, Modbus, and MQTT configurations
4. **AI Feature** - Upload real charger manuals
5. **Schedules** - Create charging schedules
6. **PV Integration** - Simulate solar production
7. **Real-Time** - Watch WebSocket updates in browser console
8. **Analytics** - Check analytics page with data

---

## 🚨 Known Limitations

- **OCPP**: Requires actual charger connection (simulator available)
- **Modbus**: Requires Modbus device or simulator
- **MQTT**: Works with included Mosquitto broker
- **AI Feature**: Requires API key (OpenAI/Anthropic) or local Ollama
- **InfluxDB**: Data retention set to 90 days

---

## ✨ Pro Tips

**Fastest way to populate with data:**
```bash
# Create 5 test stations
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/stations \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Station $i\",\"zone\":\"zone-a\",\"type\":\"ac\",\"maxPower\":22,\"minPower\":3.7,\"priority\":$i,\"protocol\":\"mqtt\",\"communication\":{\"topicStatus\":\"s$i/status\",\"topicPower\":\"s$i/power\",\"topicControl\":\"s$i/control\"}}"
  sleep 0.2
done
```

**Monitor real-time updates:**
```bash
# Watch backend logs
docker-compose logs -f backend | grep -E "station|load|WebSocket"
```

**Check data in InfluxDB:**
```bash
# Open InfluxDB UI
open http://localhost:8086
# Login: admin/adminpassword (from docker-compose.yml)
```

---

## 📞 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f backend`
2. Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed scenarios
3. Verify services: `docker-compose ps`
4. Restart if needed: `docker-compose restart`

---

## 🎉 Success Criteria

You've successfully tested the app when:

✅ Web UI loads and is navigable
✅ Can create stations via UI
✅ Can create stations via API
✅ Stations appear in dashboard
✅ Load management shows capacity
✅ Real-time updates work (add station, see it appear)
✅ All pages load without errors

**You're ready to use the WAGO DLM system!** 🚀

---

**Next:** See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing scenarios.
