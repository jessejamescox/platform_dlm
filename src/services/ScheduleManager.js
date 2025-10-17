/**
 * ScheduleManager - Manages charging schedules and time-based automation
 */

import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

export class ScheduleManager {
  constructor(state) {
    this.state = state;
    this.cronJobs = new Map();
  }

  async initialize() {
    if (process.env.ENABLE_SCHEDULING !== 'true') {
      console.log('📅 Scheduling disabled');
      return;
    }

    console.log('📅 Initializing Schedule Manager...');

    // Restore scheduled jobs from state
    for (const [id, schedule] of this.state.schedules) {
      if (schedule.enabled) {
        this.createCronJob(schedule);
      }
    }

    console.log(`✅ Schedule Manager initialized (${this.state.schedules.size} schedules)`);
  }

  /**
   * Create a new schedule
   */
  createSchedule(scheduleData) {
    const schedule = {
      id: uuidv4(),
      name: scheduleData.name,
      description: scheduleData.description || '',

      // Schedule type: 'recurring' or 'one-time'
      type: scheduleData.type || 'recurring',

      // Cron expression for recurring schedules
      cronExpression: scheduleData.cronExpression || '0 0 * * *',

      // Specific date/time for one-time schedules
      scheduledTime: scheduleData.scheduledTime || null,

      // Action to perform
      action: scheduleData.action, // 'start_charging', 'stop_charging', 'set_priority', 'set_power_limit'

      // Target stations (null = all stations)
      stationIds: scheduleData.stationIds || null,

      // Action parameters
      parameters: scheduleData.parameters || {},

      // Enable/disable
      enabled: scheduleData.enabled !== false,

      // Metadata
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null,
      runCount: 0
    };

    // Add to state
    this.state.schedules.set(schedule.id, schedule);

    // Create cron job if enabled
    if (schedule.enabled) {
      this.createCronJob(schedule);
    }

    // Save state
    this.state.persistence.save(this.state);

    console.log(`📅 Created schedule: ${schedule.name} (${schedule.id})`);

    return schedule;
  }

  /**
   * Create a cron job for a schedule
   */
  createCronJob(schedule) {
    try {
      let cronExpression = schedule.cronExpression;

      // For one-time schedules, convert to cron expression
      if (schedule.type === 'one-time' && schedule.scheduledTime) {
        const date = new Date(schedule.scheduledTime);
        cronExpression = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
      }

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      const job = cron.schedule(cronExpression, async () => {
        await this.executeSchedule(schedule);
      });

      this.cronJobs.set(schedule.id, job);

      // Calculate next run time
      schedule.nextRun = this.getNextRunTime(cronExpression);

      console.log(`⏰ Scheduled: ${schedule.name} - Next run: ${schedule.nextRun}`);

    } catch (error) {
      console.error(`Failed to create cron job for schedule ${schedule.id}:`, error.message);
    }
  }

  /**
   * Execute a schedule
   */
  async executeSchedule(schedule) {
    console.log(`⏰ Executing schedule: ${schedule.name}`);

    try {
      const stations = this.getTargetStations(schedule);

      switch (schedule.action) {
        case 'start_charging':
          await this.executeStartCharging(stations, schedule.parameters);
          break;

        case 'stop_charging':
          await this.executeStopCharging(stations, schedule.parameters);
          break;

        case 'set_priority':
          await this.executeSetPriority(stations, schedule.parameters);
          break;

        case 'set_power_limit':
          await this.executeSetPowerLimit(stations, schedule.parameters);
          break;

        case 'enable_excess_charging':
          await this.executeEnableExcessCharging(stations, schedule.parameters);
          break;

        default:
          console.warn(`Unknown schedule action: ${schedule.action}`);
      }

      // Update schedule metadata
      schedule.lastRun = new Date().toISOString();
      schedule.runCount++;
      schedule.nextRun = this.getNextRunTime(schedule.cronExpression);

      // If one-time schedule, disable it
      if (schedule.type === 'one-time') {
        schedule.enabled = false;
        const job = this.cronJobs.get(schedule.id);
        if (job) {
          job.stop();
          this.cronJobs.delete(schedule.id);
        }
      }

      // Broadcast update
      this.state.broadcast({
        type: 'schedule.executed',
        data: {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          action: schedule.action,
          stationCount: stations.length,
          timestamp: schedule.lastRun
        }
      });

      // Save state
      await this.state.persistence.save(this.state);

    } catch (error) {
      console.error(`Error executing schedule ${schedule.id}:`, error.message);
    }
  }

  /**
   * Get target stations for a schedule
   */
  getTargetStations(schedule) {
    if (!schedule.stationIds || schedule.stationIds.length === 0) {
      // All stations
      return Array.from(this.state.stations.values());
    }

    // Specific stations
    return schedule.stationIds
      .map(id => this.state.stations.get(id))
      .filter(s => s !== undefined);
  }

  /**
   * Execute start charging action
   */
  async executeStartCharging(stations, parameters) {
    for (const station of stations) {
      if (station.status === 'ready' && station.user !== null) {
        station.status = 'charging';
        station.chargingStartedAt = new Date().toISOString();
        station.scheduledCharging = true;

        if (parameters.priority) {
          station.priority = parameters.priority;
        }
      }
    }

    // Trigger load rebalancing
    if (this.state.loadManager) {
      this.state.loadManager.balanceLoad();
    }
  }

  /**
   * Execute stop charging action
   */
  async executeStopCharging(stations, parameters) {
    for (const station of stations) {
      if (station.status === 'charging') {
        await this.state.stationManager.stopChargingSession(station.id);
      }
    }
  }

  /**
   * Execute set priority action
   */
  async executeSetPriority(stations, parameters) {
    const priority = parameters.priority || 5;

    for (const station of stations) {
      station.priority = priority;
    }

    // Trigger load rebalancing
    if (this.state.loadManager) {
      this.state.loadManager.balanceLoad();
    }
  }

  /**
   * Execute set power limit action
   */
  async executeSetPowerLimit(stations, parameters) {
    const powerLimit = parameters.powerLimit;

    if (!powerLimit) return;

    for (const station of stations) {
      station.maxPower = Math.min(powerLimit, station.maxPower);
    }

    // Trigger load rebalancing
    if (this.state.loadManager) {
      this.state.loadManager.balanceLoad();
    }
  }

  /**
   * Execute enable excess charging action
   */
  async executeEnableExcessCharging(stations, parameters) {
    const enabled = parameters.enabled !== false;

    for (const station of stations) {
      station.enableExcessCharging = enabled;
    }
  }

  /**
   * Get next run time for a cron expression
   */
  getNextRunTime(cronExpression) {
    // This is a simplified implementation
    // In production, use a proper cron parser library
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * Update schedule
   */
  updateSchedule(scheduleId, updates) {
    const schedule = this.state.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Stop existing cron job
    const job = this.cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      this.cronJobs.delete(scheduleId);
    }

    // Update fields
    const allowedFields = ['name', 'description', 'cronExpression', 'action', 'parameters', 'enabled', 'stationIds'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        schedule[field] = updates[field];
      }
    }

    // Create new cron job if enabled
    if (schedule.enabled) {
      this.createCronJob(schedule);
    }

    this.state.persistence.save(this.state);

    return schedule;
  }

  /**
   * Delete schedule
   */
  deleteSchedule(scheduleId) {
    const schedule = this.state.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Stop cron job
    const job = this.cronJobs.get(scheduleId);
    if (job) {
      job.stop();
      this.cronJobs.delete(scheduleId);
    }

    // Remove from state
    this.state.schedules.delete(scheduleId);

    this.state.persistence.save(this.state);

    console.log(`🗑️  Deleted schedule: ${schedule.name}`);
  }

  /**
   * Get all schedules
   */
  getAllSchedules() {
    return Array.from(this.state.schedules.values());
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId) {
    return this.state.schedules.get(scheduleId);
  }

  async shutdown() {
    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    console.log('📅 Schedule Manager shut down');
  }
}
