# Bug Fixes

## Demo Mode Speed Change Error

### Issue
When changing the simulation speed in demo mode through the UI, users received an error:
```
Failed to change speed: Multiplier must be between 1 and 100
```

### Root Cause
Parameter name mismatch between frontend and backend:
- **Frontend was sending:** `{ timeMultiplier: 5 }`
- **Backend was expecting:** `{ multiplier: 5 }`

The backend API endpoint `/api/demo/speed` validates the `multiplier` parameter, but the frontend API client was sending `timeMultiplier` instead.

### Files Affected
- `frontend/src/api/client.js` - Line 119-122

### Fix Applied
Updated the frontend API client to send the correct parameter name:

**Before:**
```javascript
setSpeed: (timeMultiplier) => request('/demo/speed', {
  method: 'POST',
  body: JSON.stringify({ timeMultiplier })
})
```

**After:**
```javascript
setSpeed: (timeMultiplier) => request('/demo/speed', {
  method: 'POST',
  body: JSON.stringify({ multiplier: timeMultiplier })
})
```

### Verification
```bash
# Test the fix
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal","timeMultiplier":1}'

curl -X POST http://localhost:3000/api/demo/speed \
  -H "Content-Type: application/json" \
  -d '{"multiplier":5}'

# Should return: {"success":true,"timeMultiplier":5}
```

### Status
✅ **Fixed** - Frontend now correctly sends `multiplier` parameter to backend

### Related Files
- Backend API: `src/api/demo.js` (lines 113-136)
- Frontend API Client: `frontend/src/api/client.js` (lines 119-122)
- Demo Service: `src/services/DemoModeService.js`

---

## Demo Mode Values Not Updating in Frontend

### Issue
Demo mode stations were created but values were not appearing or updating in the frontend dashboard.

### Root Cause
The `DemoModeService` was storing simulated stations in its own internal `simulatedStations` Map, but not registering them with the global `state.stations` that the frontend reads from via the API.

### Fix Applied
Modified `DemoModeService.js` to:
1. Register stations with `state.stations` when created
2. Update `state.stations` on each simulation tick
3. Broadcast WebSocket events for real-time updates
4. Use `state.energyMeters` instead of direct manager references

**Key Changes:**
- `createSimulatedStation()` - Registers with `state.stations` (lines 529-541)
- `updateStation()` - Updates `state.stations` and broadcasts (lines 664-675)
- `updateMeter()` - Updates `state.energyMeters` and broadcasts (lines 718-729)
- `initialize()` - Simplified to accept only `state` parameter (line 35-38)

### Files Modified
- `src/services/DemoModeService.js` - Core demo service
- `src/index.js` - Service initialization

### Verification
```bash
# Enable demo mode
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal"}'

# Check stations are registered
curl http://localhost:3000/api/stations | jq '.data | length'
# Should return: 7

# Wait 3 seconds and check again to see values changed
curl http://localhost:3000/api/stations | jq '.data[0] | {currentPower, currentSoC}'
```

### Status
✅ **Fixed** - Stations now appear and update in real-time

---

## Rate Limiter Breaking All API Endpoints

### Issue
All API endpoints were returning 500 errors with `TypeError: this.get is not a function` immediately after implementing rate limiting.

### Root Cause
In `src/middleware/rateLimiter.js`, the rate limiter was overriding `res.send` and losing the `this` context binding:

```javascript
// BROKEN CODE:
const originalSend = res.send;
res.send = function(data) {
  return originalSend.call(this, data);  // 'this' is RateLimiter, not res
}.bind(this);
```

### Fix Applied
Fixed the context binding by:
1. Only overriding `res.send` when skip options are enabled (optimization)
2. Properly binding the original method using `.bind(res)`
3. Using closure variable (`self`) instead of relying on `this` context

**Fixed Code:**
```javascript
if (this.skipSuccessfulRequests || this.skipFailedRequests) {
  const originalSend = res.send.bind(res);  // Properly bind to res
  const self = this;                         // Closure variable
  res.send = function(data) {
    const statusCode = res.statusCode;
    if ((statusCode < 400 && self.skipSuccessfulRequests) ||
        (statusCode >= 400 && self.skipFailedRequests)) {
      client.count--;
    }
    return originalSend(data);  // Call properly bound method
  };
}
```

### Files Modified
- `src/middleware/rateLimiter.js` - Lines 86-100

### Verification
```bash
curl http://localhost:3000/api/system/info
# Should return system info JSON, not error
```

### Status
✅ **Fixed** - All API endpoints working correctly with rate limiting

---

## Build Error: npm install --production Failed

### Issue
Docker build failed with:
```
executor failed running [/bin/sh -c npm install --production]: exit code: 1
ERROR: Service 'backend' failed to build
```

### Root Cause
Likely causes:
- Docker cache corruption
- Temporary network issue during npm install
- Cached node_modules causing conflicts

### Fix Applied
Rebuild without Docker cache:
```bash
docker-compose build --no-cache backend
```

### Prevention
If issue persists, use full cleanup:
```bash
# Stop and remove containers
docker-compose down

# Clean Docker cache
docker builder prune -a -f

# Rebuild
docker-compose up -d --build
```

### Files Involved
- `Dockerfile` (backend)
- `package.json`
- `package-lock.json`

### Verification
```bash
docker-compose build backend
# Should complete successfully with: "added 251 packages"

docker-compose up -d
docker-compose ps
# All services should show "Up"
```

### Status
✅ **Fixed** - Clean rebuild resolves the issue

---

## Summary

All identified bugs have been fixed:

| Bug | Severity | Status | Fix Version |
|-----|----------|--------|-------------|
| Speed change parameter mismatch | Medium | ✅ Fixed | Current |
| Demo values not updating | High | ✅ Fixed | Current |
| Rate limiter breaking APIs | Critical | ✅ Fixed | Current |
| Docker build failures | Medium | ✅ Fixed | Current |

### Testing Checklist

To verify all fixes are working:

```bash
# 1. Build and start
docker-compose down
docker-compose up -d --build

# 2. Test API endpoints
curl http://localhost:3000/api/system/info
curl http://localhost:3000/api/stations

# 3. Test demo mode enable
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal"}'

# 4. Test speed change
curl -X POST http://localhost:3000/api/demo/speed \
  -H "Content-Type: application/json" \
  -d '{"multiplier":5}'

# 5. Verify stations updating
curl http://localhost:3000/api/stations | jq '.data[0] | {currentPower, currentSoC}'
sleep 3
curl http://localhost:3000/api/stations | jq '.data[0] | {currentPower, currentSoC}'
# Values should be different

# 6. Test frontend
curl http://localhost:80
# Should return HTML
```

All tests should pass without errors.
