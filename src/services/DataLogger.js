/**
 * DataLogger - Logs time-series data to InfluxDB
 */

import { InfluxDB, Point } from '@influxdata/influxdb-client';

export class DataLogger {
  constructor() {
    this.influxDB = null;
    this.writeApi = null;
    this.enabled = false;
  }

  async initialize() {
    try {
      const url = process.env.INFLUXDB_URL;
      const token = process.env.INFLUXDB_TOKEN;
      const org = process.env.INFLUXDB_ORG || 'wago_dlm';
      const bucket = process.env.INFLUXDB_BUCKET || 'charging_data';

      if (!url || !token) {
        console.log('📊 InfluxDB not configured, data logging disabled');
        return;
      }

      this.influxDB = new InfluxDB({ url, token });
      this.writeApi = this.influxDB.getWriteApi(org, bucket, 'ms');

      this.enabled = true;
      console.log('📊 Data Logger initialized (InfluxDB connected)');

    } catch (error) {
      console.error('Failed to initialize InfluxDB:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Log load metrics
   */
  logLoadMetrics(metrics) {
    if (!this.enabled) return;

    try {
      const point = new Point('load_metrics')
        .floatField('total_load', metrics.totalLoad || 0)
        .floatField('charging_load', metrics.chargingLoad || 0)
        .floatField('available_capacity', metrics.availableCapacity || 0)
        .floatField('pv_production', metrics.pvProduction || 0)
        .floatField('grid_consumption', metrics.gridConsumption || 0)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging load metrics:', error);
    }
  }

  /**
   * Log station power
   */
  logStationPower(stationId, power) {
    if (!this.enabled) return;

    try {
      const point = new Point('station_power')
        .tag('station_id', stationId)
        .floatField('power', power)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging station power:', error);
    }
  }

  /**
   * Log station energy
   */
  logStationEnergy(stationId, energy, sessionEnergy) {
    if (!this.enabled) return;

    try {
      const point = new Point('station_energy')
        .tag('station_id', stationId)
        .floatField('total_energy', energy)
        .floatField('session_energy', sessionEnergy)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging station energy:', error);
    }
  }

  /**
   * Log PV metrics
   */
  logPVMetrics(metrics) {
    if (!this.enabled) return;

    try {
      const point = new Point('pv_metrics')
        .floatField('current', metrics.current || 0)
        .floatField('average', metrics.average || 0)
        .floatField('max', metrics.max || 0)
        .floatField('min', metrics.min || 0)
        .timestamp(new Date());

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging PV metrics:', error);
    }
  }

  /**
   * Log charging session
   */
  logChargingSession(session) {
    if (!this.enabled) return;

    try {
      const point = new Point('charging_session')
        .tag('station_id', session.stationId)
        .tag('user_id', session.userId || 'unknown')
        .floatField('energy_delivered', session.energyDelivered || 0)
        .floatField('duration_minutes', session.duration || 0)
        .floatField('average_power', session.averagePower || 0)
        .floatField('cost', session.cost || 0)
        .timestamp(new Date(session.endTime));

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging charging session:', error);
    }
  }

  /**
   * Log energy meter reading
   */
  logMeterReading(reading) {
    if (!this.enabled) return;

    try {
      const point = new Point('meter_reading')
        .tag('meter_id', reading.meterId)
        .tag('meter_name', reading.meterName)
        .tag('meter_type', reading.meterType)
        .tag('location', reading.location)
        .floatField('power', reading.power || 0)
        .floatField('total_energy', reading.totalEnergy || 0)
        .floatField('voltage', reading.voltage || 0)
        .floatField('current', reading.current || 0)
        .floatField('power_factor', reading.powerFactor || 1.0)
        .timestamp(new Date(reading.timestamp || Date.now()));

      this.writeApi.writePoint(point);
    } catch (error) {
      console.error('Error logging meter reading:', error);
    }
  }

  /**
   * Flush pending writes
   */
  async flush() {
    if (!this.enabled) return;

    try {
      await this.writeApi.flush();
    } catch (error) {
      console.error('Error flushing InfluxDB writes:', error);
    }
  }

  async shutdown() {
    if (this.writeApi) {
      await this.flush();
      await this.writeApi.close();
    }
    console.log('📊 Data Logger shut down');
  }
}
