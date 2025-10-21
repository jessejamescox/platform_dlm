# Troubleshooting Guide

## Build Errors

### Error: "executor failed running [/bin/sh -c npm install --production]: exit code: 1"

This error can occur during Docker build of the backend service. Here are the solutions:

#### Solution 1: Clear Docker Cache and Rebuild

```bash
# Stop all containers
docker-compose down

# Remove old images
docker-compose rm -f

# Rebuild without cache
docker-compose build --no-cache backend

# Start services
docker-compose up -d
```

#### Solution 2: Full Docker Cleanup

If the above doesn't work, perform a full Docker cleanup:

```bash
# Stop all containers
docker-compose down

# Remove all stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove build cache
docker builder prune -a -f

# Rebuild and start
docker-compose up -d --build
```

#### Solution 3: Check Network Issues

If npm install fails due to network issues:

```bash
# Test network connectivity
docker run --rm node:20-alpine sh -c "npm config get registry"

# If registry is unreachable, try using a different npm registry
# Add this to your Dockerfile before npm install:
# RUN npm config set registry https://registry.npmjs.org/
```

#### Solution 4: Check Node Modules

Sometimes corrupted node_modules can cause issues:

```bash
# Remove local node_modules (if you have them)
rm -rf node_modules package-lock.json

# Rebuild
docker-compose build --no-cache backend
docker-compose up -d
```

### Error: Frontend Build Fails

```bash
# Clear frontend build cache
docker-compose build --no-cache frontend

# If still failing, check for JavaScript syntax errors
cd frontend
npm run build
```

## Runtime Errors

### Demo Mode Not Working

**Symptoms:**
- Enable button doesn't work
- No stations appear after enabling
- Values don't update

**Solutions:**

1. **Check Backend is Running:**
   ```bash
   curl http://localhost:3000/api/demo/status
   ```

2. **Check Backend Logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Verify Demo Service Initialized:**
   ```bash
   docker-compose logs backend | grep "\[Demo\]"
   ```
   Should show: `[Demo] Initialized with app state`

4. **Restart Backend:**
   ```bash
   docker-compose restart backend
   ```

5. **Check for JavaScript Errors in Browser Console:**
   - Open browser dev tools (F12)
   - Look for red errors in Console tab
   - Check Network tab for failed API calls

### Stations Not Appearing in Frontend

**Solution 1: Verify Stations Exist**
```bash
# Check if stations were created
curl http://localhost:3000/api/stations | jq '.data | length'

# Should return 7 for "normal" scenario
```

**Solution 2: Check WebSocket Connection**
- Open browser dev tools → Network tab
- Look for WebSocket connection to `ws://localhost:3001`
- Should show "101 Switching Protocols"

**Solution 3: Refresh Page**
```bash
# Sometimes a hard refresh helps
# In browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### Values Not Updating in Real-Time

**Check Simulation is Running:**
```bash
curl http://localhost:3000/api/demo/status | jq '.elapsedTime'
```

If elapsed time is not increasing, restart demo mode:
```bash
# Disable
curl -X POST http://localhost:3000/api/demo/disable

# Enable again
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal"}'
```

### Port Already in Use

**Error:** `bind: address already in use`

**Solution:**
```bash
# Find what's using the port (replace 3000 with the port number)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
```

## Database Issues

### InfluxDB Connection Failed

```bash
# Check InfluxDB is running
docker-compose ps influxdb

# View InfluxDB logs
docker-compose logs influxdb

# Restart InfluxDB
docker-compose restart influxdb
```

### MQTT Connection Failed

```bash
# Check MQTT broker is running
docker-compose ps mqtt

# Test MQTT connection
docker-compose exec mqtt mosquitto_pub -h localhost -t test -m "hello"

# Restart MQTT
docker-compose restart mqtt
```

## Performance Issues

### Slow Frontend Loading

```bash
# Check if using production build
cd frontend
npm run build

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### High CPU Usage with Demo Mode

**Solution:** Lower the time multiplier

1. In UI: Change "Simulation Speed" to 1x or 5x
2. Via API:
   ```bash
   curl -X POST http://localhost:3000/api/demo/speed \
     -H "Content-Type: application/json" \
     -d '{"timeMultiplier":1}'
   ```

### Memory Issues

```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limit in Docker Desktop settings
# Recommended: At least 4GB for this application

# Or restart services
docker-compose restart
```

## Logs and Debugging

### View All Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50 backend

# Since specific time
docker-compose logs --since 5m backend
```

### Enable Debug Mode

Add to `backend/.env`:
```env
DEBUG=*
LOG_LEVEL=debug
```

Then restart:
```bash
docker-compose restart backend
```

### Check System Health

```bash
# Comprehensive health check
curl http://localhost:3000/health | jq

# Check if all services are healthy
curl http://localhost:3000/health/ready | jq

# Check circuit breakers
curl http://localhost:3000/api/health/circuit-breakers | jq
```

## Clean Slate Restart

If nothing else works, perform a complete reset:

```bash
# Stop everything
docker-compose down -v

# Remove all Docker resources for this project
docker-compose rm -f
docker volume rm $(docker volume ls -q | grep platform_dlm)
docker network rm platform_dlm_default

# Remove local state
rm -rf persistence/

# Rebuild from scratch
docker-compose up -d --build

# Wait for services to start
sleep 10

# Verify
curl http://localhost:3000/health
curl http://localhost:80
```

## Common Issues Summary

| Issue | Quick Fix |
|-------|-----------|
| Build fails | `docker-compose build --no-cache backend` |
| Demo mode doesn't work | Check browser console for errors |
| No stations appear | `curl http://localhost:3000/api/stations` to verify |
| Port conflict | `lsof -i :3000` and kill process |
| Values not updating | Refresh page, check WebSocket in Network tab |
| High CPU | Lower demo mode speed to 1x |
| MQTT error | `docker-compose restart mqtt` |

## Getting Help

If issues persist:

1. **Check logs:**
   ```bash
   docker-compose logs backend > backend.log
   ```

2. **Check browser console** (F12 → Console tab)

3. **Verify all services are healthy:**
   ```bash
   docker-compose ps
   curl http://localhost:3000/health
   ```

4. **Test API endpoints:**
   ```bash
   curl http://localhost:3000/api/system/info
   curl http://localhost:3000/api/stations
   curl http://localhost:3000/api/demo/status
   ```

5. **Include in bug report:**
   - Docker version: `docker --version`
   - Docker Compose version: `docker-compose --version`
   - OS and version
   - Full error message
   - Backend logs
   - Browser console errors
