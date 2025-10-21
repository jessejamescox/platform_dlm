# Complete Testing Guide - WAGO Dynamic Load Management

This guide provides a structured approach to testing all features of your DLM application.

## Table of Contents

1. [Quick Smoke Test (5 min)](#quick-smoke-test)
2. [Core Features Testing (15 min)](#core-features-testing)
3. [Advanced Features Testing (30 min)](#advanced-features-testing)
4. [Integration Testing (20 min)](#integration-testing)
5. [Performance Testing](#performance-testing)
6. [Troubleshooting](#troubleshooting)

---

## Quick Smoke Test (5 minutes)

### Step 1: Verify Services

```bash
# Check all containers are running
docker-compose ps

# Expected: All services showing "Up" status
# - backend (healthy)
# - frontend
# - influxdb
# - mqtt
```

### Step 2: Access Web UI

```bash
# Open in browser
open http://localhost
# Or manually navigate to: http://localhost
```

**Expected Results:**
- ✅ Page loads without errors
- ✅ WAGO DLM logo visible in sidebar
- ✅ Dashboard shows 0 stations
- ✅ Theme toggle works (light/dark mode)

### Step 3: Check Backend API

```bash
# Test API health
curl http://localhost:3000/api/stations

# Expected response:
# {"success":true,"data":[]}
```

### Step 4: Check WebSocket Connection

**In browser console (F12):**
```javascript
// You should see WebSocket connection messages
// Check Network tab → WS → Messages
```

---

## Core Features Testing (15 minutes)

### Test 1: Manual Station Registration

#### Using Web UI:

1. **Navigate to Stations page**
   - Click "Charging Stations" in sidebar

2. **Click "Add Station" button**

3. **Fill in station details:**
   ```
   Name: Test Station 01
   Zone: parking-lot-a
   Type: AC
   Max Power: 22 kW
   Min Power: 3.7 kW
   Priority: 5
   Protocol: OCPP
   Charge Point ID: CP_TEST_001
   Connector ID: 1
   OCPP Version: 1.6-J
   ```

4. **Click "Add Station"**

**Expected Results:**
- ✅ Modal closes
- ✅ Station appears in list
- ✅ Status shows "offline" (charger not connected yet)
- ✅ Dashboard updates with 1 station

#### Using API:

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Station 01",
    "zone": "parking-lot-b",
    "type": "ac",
    "maxPower": 11,
    "minPower": 3.7,
    "priority": 5,
    "protocol": "mqtt",
    "communication": {
      "topicStatus": "charger/station01/status",
      "topicPower": "charger/station01/power",
      "topicControl": "charger/station01/control"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "unique-station-id",
    "name": "API Station 01",
    "status": "offline",
    ...
  }
}
```

### Test 2: Load Management Configuration

#### View Current Load Status:

```bash
curl http://localhost:3000/api/load/status
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalCapacity": 500,
    "currentLoad": 0,
    "availableCapacity": 500,
    "peakThreshold": 450,
    "utilizationPercentage": 0,
    "activeStations": 0,
    "balancingEnabled": true
  }
}
```

#### Update Grid Capacity:

**Via Web UI:**
1. Go to Settings page
2. Update "Max Grid Capacity" to 300 kW
3. Click "Save Settings"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/load/limits \
  -H "Content-Type: application/json" \
  -d '{
    "maxCapacity": 300,
    "peakThreshold": 270
  }'
```

### Test 3: Real-Time Updates (WebSocket)

1. **Open web UI in browser**
2. **Open browser console (F12)**
3. **Add a station via API** (use curl command from Test 1)
4. **Watch the UI update automatically**

**Expected:**
- ✅ New station appears without page refresh
- ✅ Dashboard stats update automatically
- ✅ Console shows WebSocket message: `station.registered`

---

## Advanced Features Testing (30 minutes)

### Test 4: AI-Powered Station Setup

#### Prerequisites:

Choose one option:

**Option A: OpenAI (Fastest to test)**
```bash
# Edit .env file
# Add your OpenAI API key:
AI_PROVIDER=openai
AI_API_KEY=sk-proj-YOUR-KEY-HERE
AI_MODEL=gpt-4-turbo-preview

# Restart backend
docker-compose restart backend
```

**Option B: Local AI (No API key needed)**
```bash
# Install Ollama
brew install ollama  # macOS
# Or download from https://ollama.ai/

# Pull model
ollama pull llama2

# Start Ollama
ollama serve

# Update .env:
USE_LOCAL_AI=true
OLLAMA_URL=http://localhost:11434
AI_MODEL=llama2

# Restart backend
docker-compose restart backend
```

#### Create Test Manual:

```bash
cat > test_charger_manual.txt << 'EOF'
ABB Terra AC Wallbox
Model: TAC-W22-G5-M-0

Technical Specifications:
- Type: AC Charging Station
- Output Power: 7.4 - 22 kW
- Input Voltage: 400V AC, 3-phase
- Maximum Current: 32A per phase
- Connector: Type 2 (IEC 62196-2)

Communication Protocols:
- OCPP 1.6-J compliant
- WebSocket connection required
- Default Charge Point ID format: CP_XXX
- Connector ID: 1

Network Configuration:
- Ethernet 10/100 Mbps
- DHCP or Static IP supported
- Default IP: 192.168.1.100

Features:
- RFID authentication
- Dynamic power management
- LED status indicators
- Plug and charge ready
EOF
```

#### Test via Web UI:

1. **Go to Stations page**
2. **Click "AI Setup" button**
3. **Click "Select File"**
4. **Upload `test_charger_manual.txt`**
5. **Click "Analyze Manual"**
6. **Wait for AI processing** (5-30 seconds depending on provider)
7. **Review confidence score and extracted data**
8. **Edit fields if needed:**
   - Set Zone to "parking-lot-c"
   - Verify power specs are correct
9. **Click "Create Station"**

**Expected Results:**
- ✅ Confidence score 7-10 (high/medium)
- ✅ Manufacturer: "ABB"
- ✅ Model: "Terra AC Wallbox"
- ✅ Max Power: 22 kW
- ✅ Protocol: "ocpp"
- ✅ OCPP Version: "1.6-J"
- ✅ Station created successfully

#### Test via API:

```bash
# Test text parsing
curl -X POST http://localhost:3000/api/ai-config/parse-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Schneider EVlink Wallbox. Power: 22kW AC. OCPP 1.6-J. Modbus TCP support. IP: 192.168.1.100"
  }'

# Expected: JSON with extracted configuration and confidence score
```

### Test 5: PV Integration

#### Simulate PV Production:

```bash
# Send PV production data via MQTT
# First, install mosquitto client if not already:
# brew install mosquitto  # macOS

# Publish PV production (50 kW)
mosquitto_pub -h localhost -p 1883 \
  -t "pv/energy/production" \
  -m '{"power_kw": 50, "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

**Via Web UI:**
1. Go to Energy page
2. Click "Simulate PV Production"
3. Enter: 75 kW
4. Click "Submit"

**Check PV Status:**
```bash
curl http://localhost:3000/api/energy/pv
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "currentProduction": 75,
    "maxCapacity": 100,
    "excessChargingEnabled": true,
    "utilizationPercentage": 75
  }
}
```

### Test 6: Scheduling

#### Create a Schedule:

**Via Web UI:**
1. Go to Schedules page
2. Click "Add Schedule"
3. Fill in:
   - Name: "Night Charging"
   - Type: "recurring"
   - Cron: `0 22 * * *` (10 PM daily)
   - Action: "start_charging"
   - Target: Select a station
4. Click "Create"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Priority Boost",
    "type": "recurring",
    "cronExpression": "0 6 * * 1-5",
    "action": "set_priority",
    "targetStations": ["station-id-here"],
    "parameters": {
      "priority": 8
    },
    "enabled": true
  }'
```

#### List Schedules:

```bash
curl http://localhost:3000/api/schedules
```

---

## Integration Testing (20 minutes)

### Test 7: OCPP Station Simulation

You can simulate an OCPP charging station connecting to test the full flow:

#### Install OCPP Testing Tool:

```bash
# Using Node.js OCPP simulator
npm install -g ocpp-simple-simulator

# Or use wscat for basic testing
npm install -g wscat
```

#### Connect Simulated Station:

```bash
# Using wscat
wscat -c ws://localhost:9000/ocpp/CP_TEST_SIMULATOR

# Send BootNotification
[2, "1", "BootNotification", {
  "chargePointVendor": "SimulatedVendor",
  "chargePointModel": "SimModel1",
  "chargePointSerialNumber": "SIM001",
  "firmwareVersion": "1.0.0"
}]
```

**Expected Response:**
```json
[3, "1", {
  "status": "Accepted",
  "currentTime": "2025-10-20T...",
  "interval": 300
}]
```

**Check Backend Logs:**
```bash
docker-compose logs -f backend | grep OCPP
```

### Test 8: Modbus Station (if you have Modbus simulator)

```bash
# Update a station to use Modbus
curl -X PUT http://localhost:3000/api/stations/STATION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "modbus",
    "communication": {
      "host": "192.168.1.100",
      "port": 502,
      "unitId": 1,
      "registerStatus": 1000,
      "registerPower": 1001,
      "registerControl": 1002
    }
  }'
```

### Test 9: Complete Charging Session

#### Scenario: Start → Monitor → Stop

```bash
# 1. Start charging session
curl -X POST http://localhost:3000/api/stations/STATION_ID/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "name": "John Doe",
      "rfidCard": "1234567890",
      "class": "vip"
    }
  }'

# 2. Set charging power
curl -X POST http://localhost:3000/api/stations/STATION_ID/power \
  -H "Content-Type: application/json" \
  -d '{
    "power": 11
  }'

# 3. Monitor session (in UI or via API)
curl http://localhost:3000/api/stations/STATION_ID

# 4. Stop session
curl -X POST http://localhost:3000/api/stations/STATION_ID/session/stop
```

**Check in Web UI:**
- Session energy should be tracked
- Power allocation visible
- Load management updates automatically

---

## Performance Testing

### Test 10: Multiple Stations Load Balancing

#### Create Multiple Stations:

```bash
# Script to create 10 stations
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/stations \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Station '$i'",
      "zone": "test-zone",
      "type": "ac",
      "maxPower": 22,
      "minPower": 3.7,
      "priority": 5,
      "protocol": "mqtt",
      "communication": {
        "topicStatus": "charger/station'$i'/status",
        "topicPower": "charger/station'$i'/power",
        "topicControl": "charger/station'$i'/control"
      }
    }'
  echo ""
  sleep 0.5
done
```

#### Start Charging on All Stations:

```bash
# Get all station IDs
STATIONS=$(curl -s http://localhost:3000/api/stations | jq -r '.data[].id')

# Start charging on each
for STATION_ID in $STATIONS; do
  curl -X POST http://localhost:3000/api/stations/$STATION_ID/session/start \
    -H "Content-Type: application/json" \
    -d '{
      "user": {"name": "Test User", "class": "standard"}
    }'
  sleep 0.2
done
```

#### Check Load Distribution:

```bash
curl http://localhost:3000/api/load/status | jq

# Expected: Power distributed based on priority and capacity
```

**Monitor in UI:**
- Dashboard should show load distribution
- Load Management page shows allocation
- Real-time updates via WebSocket

### Test 11: Analytics & Reporting

```bash
# Get system overview
curl http://localhost:3000/api/analytics/overview | jq

# Get station analytics
curl http://localhost:3000/api/analytics/stations | jq

# Get energy consumption
curl http://localhost:3000/api/energy/consumption | jq
```

---

## Data Persistence Testing

### Test 12: State Persistence

```bash
# 1. Create some stations and start sessions

# 2. Restart backend
docker-compose restart backend

# 3. Check stations still exist
curl http://localhost:3000/api/stations

# Expected: All stations and their state restored from persistence/state.json
```

### Test 13: InfluxDB Data Logging

```bash
# Check if data is being logged to InfluxDB
docker-compose exec influxdb influx query \
  'from(bucket: "charging_data")
   |> range(start: -1h)
   |> filter(fn: (r) => r._measurement == "station_power")'

# Or via InfluxDB UI
open http://localhost:8086
# Login with credentials from docker-compose.yml
```

---

## Troubleshooting

### Backend Not Responding

```bash
# Check backend logs
docker-compose logs -f backend

# Check backend health
curl http://localhost:3000/api/load/status

# Restart backend
docker-compose restart backend
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs -f frontend

# Check if nginx is serving files
curl -I http://localhost

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### WebSocket Not Connecting

```bash
# Check WebSocket port
nc -zv localhost 3001

# Check backend logs for WebSocket messages
docker-compose logs backend | grep WebSocket
```

### MQTT Not Working

```bash
# Test MQTT broker
mosquitto_pub -h localhost -p 1883 -t test -m "hello"

# Subscribe to topic
mosquitto_sub -h localhost -p 1883 -t '#' -v
```

### AI Feature Not Working

```bash
# Check AI configuration
cat .env | grep AI_

# Check backend logs
docker-compose logs backend | grep AI

# Test with simple text
curl -X POST http://localhost:3000/api/ai-config/parse-text \
  -H "Content-Type: application/json" \
  -d '{"text": "ABB Charger 22kW OCPP"}'
```

---

## Testing Checklist

### Basic Functionality
- [ ] All Docker services running
- [ ] Web UI loads successfully
- [ ] Can add station manually
- [ ] Can delete station
- [ ] Dashboard shows correct stats
- [ ] Theme toggle works
- [ ] All pages load without errors

### Core Features
- [ ] Load balancing activates with multiple stations
- [ ] Power distribution follows priority rules
- [ ] Grid capacity limits respected
- [ ] Real-time WebSocket updates working
- [ ] State persists after restart

### Advanced Features
- [ ] AI manual parsing works
- [ ] Confidence scoring accurate
- [ ] PV simulation updates system
- [ ] Schedules can be created
- [ ] OCPP port accessible (9000)
- [ ] MQTT messages received

### API Endpoints
- [ ] GET /api/stations returns stations
- [ ] POST /api/stations creates station
- [ ] PUT /api/stations/:id updates station
- [ ] DELETE /api/stations/:id removes station
- [ ] POST /api/stations/:id/session/start works
- [ ] POST /api/stations/:id/session/stop works
- [ ] GET /api/load/status returns load info
- [ ] GET /api/energy/status returns energy info
- [ ] POST /api/ai-config/parse-text works

### Integration
- [ ] Multiple stations load balance correctly
- [ ] PV integration affects charging decisions
- [ ] Priority-based allocation works
- [ ] Zone limits enforced (if configured)
- [ ] Data logged to InfluxDB
- [ ] MQTT topics publish/subscribe correctly

---

## Automated Testing Script

Create a quick test script:

```bash
#!/bin/bash
# save as test_dlm.sh

echo "🧪 Testing WAGO DLM Application"
echo "================================"

echo -n "✓ Checking services... "
docker-compose ps | grep -q "Up" && echo "OK" || echo "FAILED"

echo -n "✓ Testing API health... "
curl -s http://localhost:3000/api/stations > /dev/null && echo "OK" || echo "FAILED"

echo -n "✓ Testing WebSocket port... "
nc -zv localhost 3001 2>&1 | grep -q "succeeded" && echo "OK" || echo "FAILED"

echo -n "✓ Creating test station... "
RESPONSE=$(curl -s -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","zone":"test","type":"ac","maxPower":22,"minPower":3.7,"priority":5,"protocol":"mqtt","communication":{"topicStatus":"test/status","topicPower":"test/power","topicControl":"test/control"}}')
echo "$RESPONSE" | grep -q "success" && echo "OK" || echo "FAILED"

echo -n "✓ Checking load status... "
curl -s http://localhost:3000/api/load/status | grep -q "success" && echo "OK" || echo "FAILED"

echo ""
echo "✅ Basic tests complete!"
echo "👉 Open http://localhost to test the UI"
```

Make it executable and run:
```bash
chmod +x test_dlm.sh
./test_dlm.sh
```

---

## Quick Reference Commands

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose build backend && docker-compose up -d backend

# Check service status
docker-compose ps

# Access backend shell
docker-compose exec backend sh

# Clean everything and start fresh
docker-compose down -v
docker-compose up -d
```

---

## Next Steps

After completing these tests:

1. **Add your real charging stations** using the learned configuration
2. **Configure your AI provider** for production use
3. **Set up monitoring** (check InfluxDB dashboards)
4. **Configure MQTT** for your actual PV system
5. **Set up OCPP** endpoints for real chargers
6. **Create schedules** for your specific use cases
7. **Adjust grid capacity** to match your installation

Happy testing! 🚀
