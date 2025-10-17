# WAGO Dynamic Load Management System

Intelligent control system for EV charging stations with dynamic load management, PV integration, and smart scheduling.

## Features

- **Dynamic Load Management**: Intelligent distribution of available power across charging stations
- **Grid Overload Prevention**: Continuous monitoring and regulation to prevent grid overloads
- **PV Integration**: Excess solar charging using on-site photovoltaic production
- **Smart Scheduling**: Time-based charging schedules and priority management
- **Multi-Protocol Support**: Modbus TCP/RTU and MQTT connectivity
- **RFID Authorization**: Card-based prioritization and access control
- **Real-Time Monitoring**: WebSocket-based live updates and visualization
- **Energy Analytics**: Historical data tracking and cost optimization

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Express Backend │────▶│ Charging Stations│
│   (Vite Build)  │     │   Load Manager   │     │  (Modbus/MQTT)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ├──────▶ InfluxDB (Time-series data)
                               ├──────▶ MQTT Broker (Real-time events)
                               └──────▶ PV System Integration
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd platform_dlm
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start with Docker Compose:
```bash
docker-compose up -d
```

4. Access the application:
- Web UI: http://localhost
- API: http://localhost:3000
- InfluxDB: http://localhost:8086

### Development Mode

1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Start backend (with auto-reload):
```bash
npm run dev
```

4. Start frontend (in another terminal):
```bash
cd frontend
npm run dev
```

## Configuration

### Load Management Settings

Configure in `.env`:

- `MAX_GRID_CAPACITY_KW`: Maximum grid connection capacity
- `PEAK_DEMAND_THRESHOLD_KW`: Threshold for peak demand management
- `MIN_CHARGING_POWER_KW`: Minimum power per charging station
- `MAX_CHARGING_POWER_PER_STATION_KW`: Maximum power per station

### PV System Integration

- `PV_SYSTEM_ENABLED`: Enable/disable PV integration
- `PV_MAX_CAPACITY_KW`: Maximum PV system capacity
- `ENABLE_PV_EXCESS_CHARGING`: Allow excess solar charging

### Charging Station Protocols

#### Modbus TCP/RTU
Configure charging stations with Modbus protocol:
```javascript
{
  protocol: "modbus",
  host: "192.168.1.100",
  port: 502,
  unitId: 1,
  registers: {
    power: 1000,
    status: 1001,
    energy: 1002
  }
}
```

#### MQTT
Configure charging stations with MQTT:
```javascript
{
  protocol: "mqtt",
  topics: {
    power: "charger/01/power",
    status: "charger/01/status",
    control: "charger/01/control"
  }
}
```

## API Endpoints

### Charging Stations
- `GET /api/stations` - List all charging stations
- `POST /api/stations` - Register new station
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Remove station
- `POST /api/stations/:id/power` - Set charging power

### Load Management
- `GET /api/load/status` - Current load distribution
- `GET /api/load/capacity` - Grid capacity status
- `POST /api/load/limits` - Update load limits

### Energy & Analytics
- `GET /api/energy/consumption` - Energy consumption data
- `GET /api/energy/pv` - PV production data
- `GET /api/energy/costs` - Cost analysis

### Scheduling
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

## WebSocket Events

Real-time updates on `ws://localhost:3001`:

```javascript
{
  type: "load.updated",
  data: {
    totalLoad: 250.5,
    availableCapacity: 249.5,
    stations: [...]
  }
}
```

Event types:
- `load.updated` - Load distribution changed
- `station.updated` - Station status changed
- `pv.production` - PV production update
- `alert.triggered` - System alert
- `schedule.executed` - Schedule event

## Technology Stack

### Backend
- Node.js 20 with Express.js
- WebSocket (ws) for real-time updates
- InfluxDB for time-series data
- MQTT & Modbus protocol support

### Frontend
- React 18 with Vite
- Lucide React icons
- Recharts for visualization
- WebSocket client

### Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- Mosquitto MQTT broker

## Project Structure

```
platform_dlm/
├── src/                          # Backend source
│   ├── index.js                 # Entry point
│   ├── api/                     # REST API routes
│   ├── services/                # Core services
│   │   ├── LoadManager.js       # Load distribution engine
│   │   ├── ChargingStationManager.js
│   │   ├── PVManager.js         # PV integration
│   │   ├── ScheduleManager.js   # Scheduling engine
│   │   └── DataLogger.js        # InfluxDB logging
│   ├── protocols/               # Protocol drivers
│   │   ├── ModbusDriver.js
│   │   └── MQTTDriver.js
│   └── persistence/             # State management
├── frontend/                     # React application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # Custom hooks
│   │   └── api/                # API client
│   └── Dockerfile
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## License

MIT

## Support

For issues and questions, please create an issue in the GitHub repository.
