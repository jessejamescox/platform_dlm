# Demo Mode - UI Implementation Guide

## Overview

Demo mode is now fully integrated with a user-friendly control panel in the frontend. You can enable, configure, and monitor demo mode directly from the Settings page without using curl commands.

## Accessing Demo Mode

1. **Open the application** in your browser: `http://localhost:8080`
2. **Navigate to Settings** - Click "Settings" in the left sidebar
3. **Find the Demo Mode panel** - It's the first card at the top of the Settings page

## Using the Demo Mode Panel

### When Demo Mode is Disabled (Initial State)

The panel will show:
- **Scenario Dropdown**: Select from 8 pre-configured scenarios
- **Speed Dropdown**: Choose simulation speed (1x to 60x)
- **Enable Demo Mode Button**: Click to start the simulation

#### Available Scenarios:

1. **Normal** - Typical operations with 5 AC + 2 DC stations (~60% capacity)
2. **Peak Load** - High demand with 8 AC + 3 DC stations (triggers load management)
3. **Load Shedding** - Overload scenario that triggers load shedding levels
4. **Phase Imbalance** - Single-phase loads causing phase imbalance
5. **Thermal Derating** - DC fast charger with temperature increase
6. **V2G Export** - Vehicle-to-Grid bidirectional power flow
7. **Mixed Fleet** - Various vehicle types (Nissan Leaf, Tesla, F-150, Ariya)
8. **Overnight Charging** - Low-priority slow charging scenario

#### Speed Options:

- **1x (Real-time)** - Normal speed, realistic progression
- **5x (Fast)** - 5 minutes pass in 1 minute
- **10x (Very Fast)** - 1 hour passes in 6 minutes
- **30x (Ultra Fast)** - 1 hour passes in 2 minutes
- **60x (Testing)** - 1 hour passes in 1 minute

### When Demo Mode is Enabled (Active State)

The panel shows:
- **Active Badge**: Green badge indicating demo mode is running
- **Status Display**: Shows current scenario, speed, station count, and elapsed time
- **Change Scenario Dropdown**: Switch to a different scenario on-the-fly
- **Simulation Speed Dropdown**: Adjust speed while running
- **Disable Demo Mode Button**: Click to stop and remove all simulated stations

## Step-by-Step: Enabling Demo Mode

1. Go to **Settings** page
2. In the **Demo Mode** panel at the top
3. Select a **Scenario** (e.g., "Normal")
4. Choose a **Speed** (start with "1x (Real-time)" for first try)
5. Click **"Enable Demo Mode"** button
6. Wait 2-3 seconds for stations to be created
7. Navigate to **Dashboard** or **Stations** page to see live data

## What Happens When You Enable Demo Mode

✅ **Simulated Stations Created**: Virtual charging stations appear in your system
✅ **Live Updates Begin**: Power, SoC, and status values update every 2 seconds
✅ **WebSocket Broadcasts**: Frontend receives real-time updates automatically
✅ **Realistic Behavior**: Stations charge realistically with tapering, thermal effects, etc.
✅ **Load Management**: Load shedding and phase balancing work with simulated data

## Monitoring Demo Mode

### View Simulated Stations

1. **Dashboard Page**: See overview of all active stations with live power readings
2. **Stations Page**: Detailed view of each station with SoC, power, status
3. **Load Management Page**: Monitor total load and capacity
4. **Energy Page**: Track energy consumption and costs

### Check Status

The Demo Mode panel automatically updates every 3 seconds when active, showing:
- Current scenario name
- Simulation speed multiplier
- Number of active stations
- Elapsed simulation time

## Changing Settings While Running

### Switch Scenario

1. In the **Demo Mode panel** (while active)
2. Use the **"Change Scenario"** dropdown
3. Select a different scenario
4. Stations will be recreated with new scenario configuration

### Adjust Speed

1. In the **Demo Mode panel** (while active)
2. Use the **"Simulation Speed"** dropdown
3. Select a new speed multiplier
4. Simulation will immediately speed up or slow down

## Disabling Demo Mode

1. In the **Demo Mode panel**
2. Click **"Disable Demo Mode"** button
3. All simulated stations are removed
4. System returns to normal operation

## Example Use Cases

### Testing Load Shedding

1. Enable demo mode with **"Load Shedding"** scenario
2. Set speed to **10x (Very Fast)** for faster testing
3. Navigate to **Load Management** page
4. Watch the load increase and see load shedding activate
5. Check **Health** API for load shedding status: `curl http://localhost:3000/api/health/load-shedding | jq`

### Testing Phase Balancing

1. Enable demo mode with **"Phase Imbalance"** scenario
2. Navigate to **Stations** page
3. See single-phase and three-phase stations
4. Check phase balance: `curl http://localhost:3000/api/control/phase-balance | jq`

### Demonstrating the System

1. Enable demo mode with **"Normal"** scenario at **1x speed**
2. Navigate to **Dashboard** for overview
3. Show **Stations** page with live updating power and SoC
4. Display **Analytics** for session data
5. Demonstrate **Schedules** for charging management

### Rapid Testing

1. Enable demo mode with **"Peak Load"** scenario
2. Set speed to **60x (Testing)**
3. Stations will charge from 20% to 80% in about 1 minute
4. Perfect for quickly testing UI updates and data flow

## Integration Points

### Frontend Components

The demo panel integrates with:
- **DemoModePanel** component (`frontend/src/components/DemoModePanel.jsx`)
- **Settings** page (`frontend/src/pages/Settings.jsx`)
- **API client** (`frontend/src/api/client.js`)

### API Endpoints

The UI uses these backend endpoints:
- `GET /api/demo/scenarios` - List available scenarios
- `GET /api/demo/status` - Get current demo status
- `POST /api/demo/enable` - Enable with scenario and speed
- `POST /api/demo/disable` - Disable and cleanup
- `POST /api/demo/scenario` - Change scenario while running
- `POST /api/demo/speed` - Adjust speed while running

### WebSocket Updates

The frontend receives real-time updates via WebSocket:
- `station.registered` - When demo station is created
- `station.updated` - Every 2 seconds with new values
- `meter.updated` - Energy meter updates

## Files Modified

### Frontend Files Created:
- `frontend/src/components/DemoModePanel.jsx` - Main control panel component

### Frontend Files Modified:
- `frontend/src/api/client.js` - Added `demoAPI` with all demo endpoints
- `frontend/src/pages/Settings.jsx` - Added DemoModePanel to page
- `frontend/src/components/Icons.jsx` - Added Play icon for enable button

### Backend Files (Already Implemented):
- `src/services/DemoModeService.js` - Core demo logic
- `src/api/demo.js` - API routes
- `src/index.js` - Service initialization

## Troubleshooting

### Demo mode button doesn't work
- Check browser console for errors
- Verify backend is running: `curl http://localhost:3000/api/demo/status`
- Check backend logs: `docker-compose logs backend`

### Stations don't appear after enabling
- Wait 3-5 seconds after enabling
- Refresh the page
- Check that stations exist: `curl http://localhost:3000/api/stations | jq '.data | length'`

### Values not updating
- Verify demo mode is enabled in the panel (shows "Active" badge)
- Check elapsed time is increasing
- Verify WebSocket connection in browser dev tools (Network tab)

### Performance issues
- Lower the time multiplier to 1x or 5x
- Use simpler scenarios like "Normal" instead of "Peak Load"
- Reduce number of browser tabs/windows

## Command Line Alternative

If you prefer command line, you can still use curl:

```bash
# Enable demo mode
curl -X POST http://localhost:3000/api/demo/enable \
  -H "Content-Type: application/json" \
  -d '{"scenario":"normal","timeMultiplier":1}'

# Check status
curl http://localhost:3000/api/demo/status | jq

# Disable
curl -X POST http://localhost:3000/api/demo/disable
```

## Next Steps

1. **Try each scenario** to see different behaviors
2. **Experiment with speed settings** for testing vs. demonstration
3. **Monitor the dashboard** to see real-time updates
4. **Use for client demos** to showcase the system's capabilities
5. **Test your own features** against realistic simulated data

Enjoy your demo mode with a beautiful UI!
