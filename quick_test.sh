#!/bin/bash

# Quick Test Script for WAGO DLM
# Run this to verify everything is working

set -e

echo "🧪 WAGO DLM - Quick Test Suite"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_service() {
  local name=$1
  local test=$2

  echo -n "Testing $name... "
  if eval "$test" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
  fi
}

test_service_with_output() {
  local name=$1
  local test=$2
  local expected=$3

  echo -n "Testing $name... "
  output=$(eval "$test" 2>&1)
  if echo "$output" | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Expected: $expected"
    echo "  Got: $output"
    ((FAILED++))
  fi
}

echo "📦 Service Health Checks"
echo "------------------------"
test_service "Backend container running" "docker-compose ps backend | grep -q 'Up'"
test_service "Frontend container running" "docker-compose ps frontend | grep -q 'Up'"
test_service "InfluxDB container running" "docker-compose ps influxdb | grep -q 'Up'"
test_service "MQTT container running" "docker-compose ps mqtt | grep -q 'Up'"
echo ""

echo "🌐 Network Connectivity"
echo "-----------------------"
test_service "Backend API port 3000" "nc -z localhost 3000"
test_service "WebSocket port 3001" "nc -z localhost 3001"
test_service "OCPP port 9000" "nc -z localhost 9000"
test_service "Frontend port 80" "nc -z localhost 80"
test_service "MQTT port 1883" "nc -z localhost 1883"
echo ""

echo "🔌 API Endpoints"
echo "----------------"
test_service_with_output "GET /api/stations" "curl -s http://localhost:3000/api/stations" "success"
test_service_with_output "GET /api/load/status" "curl -s http://localhost:3000/api/load/status" "success"
test_service_with_output "GET /api/energy/status" "curl -s http://localhost:3000/api/energy/status" "success"
test_service_with_output "GET /api/schedules" "curl -s http://localhost:3000/api/schedules" "success"
test_service_with_output "GET /api/analytics/overview" "curl -s http://localhost:3000/api/analytics/overview" "success"
echo ""

echo "📝 Data Operations"
echo "------------------"

# Create a test station
echo -n "Creating test station... "
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QuickTest Station",
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
  }')

if echo "$CREATE_RESPONSE" | grep -q "success"; then
  STATION_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ PASS${NC} (ID: ${STATION_ID:0:8}...)"
  ((PASSED++))

  # Update station
  echo -n "Updating test station... "
  UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/stations/$STATION_ID \
    -H "Content-Type: application/json" \
    -d '{"priority": 8}')

  if echo "$UPDATE_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
  fi

  # Delete station
  echo -n "Deleting test station... "
  DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:3000/api/stations/$STATION_ID)

  if echo "$DELETE_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAILED++))
fi

echo ""

echo "🎨 Frontend Tests"
echo "-----------------"
test_service "Frontend HTML served" "curl -s http://localhost | grep -q 'WAGO DLM'"
test_service "Frontend assets loaded" "curl -s http://localhost | grep -q 'index.*.js'"
echo ""

echo "💾 Data Persistence"
echo "-------------------"
if [ -d "persistence" ]; then
  echo -e "Persistence directory: ${GREEN}✓ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "Persistence directory: ${RED}✗ MISSING${NC}"
  ((FAILED++))
fi

if [ -d "logs" ]; then
  echo -e "Logs directory: ${GREEN}✓ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "Logs directory: ${RED}✗ MISSING${NC}"
  ((FAILED++))
fi

if [ -d "uploads" ]; then
  echo -e "Uploads directory: ${GREEN}✓ EXISTS${NC}"
  ((PASSED++))
else
  echo -e "Uploads directory: ${RED}✗ MISSING${NC}"
  ((FAILED++))
fi
echo ""

# Summary
echo "================================"
echo "📊 Test Results"
echo "================================"
TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✨ All tests passed! System is healthy.${NC}"
  echo ""
  echo "🎯 Next Steps:"
  echo "  1. Open http://localhost in your browser"
  echo "  2. Try adding a station via the UI"
  echo "  3. Test the AI Setup feature (see AI_FEATURE_TESTING_GUIDE.md)"
  echo "  4. Review TESTING_GUIDE.md for comprehensive tests"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
  echo ""
  echo "🔧 Troubleshooting:"
  echo "  - Check logs: docker-compose logs -f backend"
  echo "  - Restart services: docker-compose restart"
  echo "  - View status: docker-compose ps"
  echo "  - See TESTING_GUIDE.md for detailed help"
  exit 1
fi
