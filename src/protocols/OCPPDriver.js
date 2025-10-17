/**
 * OCPPDriver - Handles OCPP (Open Charge Point Protocol) communication
 * Supports OCPP 1.6J and OCPP 2.0.1
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class OCPPDriver {
  constructor(port = 9000) {
    this.port = port;
    this.wss = null;
    this.clients = new Map(); // chargePointId -> WebSocket
    this.messageHandlers = new Map(); // chargePointId -> handler function
    this.pendingRequests = new Map(); // messageId -> { resolve, reject, timeout }
  }

  /**
   * Start OCPP WebSocket server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('listening', () => {
          console.log(`🔌 OCPP Server listening on port ${this.port}`);
          resolve();
        });

        this.wss.on('connection', (ws, request) => {
          this.handleConnection(ws, request);
        });

        this.wss.on('error', (error) => {
          console.error('OCPP WebSocket Server error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Failed to start OCPP server:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle new charge point connection
   */
  handleConnection(ws, request) {
    // Extract charge point ID from URL path
    // Format: /ocpp/{chargePointId}
    const urlParts = request.url.split('/');
    const chargePointId = urlParts[urlParts.length - 1] || 'unknown';

    console.log(`🔌 OCPP Charge Point connected: ${chargePointId}`);

    // Store connection
    this.clients.set(chargePointId, ws);

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(chargePointId, data);
    });

    ws.on('close', () => {
      console.log(`🔌 OCPP Charge Point disconnected: ${chargePointId}`);
      this.clients.delete(chargePointId);
    });

    ws.on('error', (error) => {
      console.error(`OCPP WebSocket error for ${chargePointId}:`, error);
    });

    // Send BootNotification response
    this.sendCallResult(chargePointId, '0', {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 300
    });
  }

  /**
   * Handle incoming OCPP message
   */
  handleMessage(chargePointId, data) {
    try {
      const message = JSON.parse(data.toString());
      const [messageType, messageId, ...payload] = message;

      // Message types: 2=CALL, 3=CALLRESULT, 4=CALLERROR
      switch (messageType) {
        case 2: // CALL - Request from charge point
          this.handleCall(chargePointId, messageId, payload[0], payload[1]);
          break;

        case 3: // CALLRESULT - Response to our request
          this.handleCallResult(messageId, payload[0]);
          break;

        case 4: // CALLERROR - Error response
          this.handleCallError(messageId, payload[0], payload[1], payload[2]);
          break;

        default:
          console.warn(`Unknown OCPP message type: ${messageType}`);
      }

    } catch (error) {
      console.error(`Error parsing OCPP message from ${chargePointId}:`, error);
    }
  }

  /**
   * Handle CALL message (request from charge point)
   */
  async handleCall(chargePointId, messageId, action, payload) {
    console.log(`📥 OCPP ${action} from ${chargePointId}`);

    // Get message handler for this charge point
    const handler = this.messageHandlers.get(chargePointId);

    let response;
    try {
      // Handle common OCPP messages
      switch (action) {
        case 'BootNotification':
          response = await this.handleBootNotification(chargePointId, payload);
          break;

        case 'Heartbeat':
          response = await this.handleHeartbeat(chargePointId, payload);
          break;

        case 'StatusNotification':
          response = await this.handleStatusNotification(chargePointId, payload);
          break;

        case 'MeterValues':
          response = await this.handleMeterValues(chargePointId, payload);
          break;

        case 'StartTransaction':
          response = await this.handleStartTransaction(chargePointId, payload);
          break;

        case 'StopTransaction':
          response = await this.handleStopTransaction(chargePointId, payload);
          break;

        case 'Authorize':
          response = await this.handleAuthorize(chargePointId, payload);
          break;

        default:
          console.warn(`Unhandled OCPP action: ${action}`);
          response = {};
      }

      // Send CALLRESULT
      this.sendCallResult(chargePointId, messageId, response);

      // Notify external handler if registered
      if (handler) {
        handler({ action, payload, chargePointId });
      }

    } catch (error) {
      console.error(`Error handling ${action}:`, error);
      this.sendCallError(chargePointId, messageId, 'InternalError', error.message);
    }
  }

  /**
   * Handle CALLRESULT message
   */
  handleCallResult(messageId, payload) {
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(payload);
      this.pendingRequests.delete(messageId);
    }
  }

  /**
   * Handle CALLERROR message
   */
  handleCallError(messageId, errorCode, errorDescription, errorDetails) {
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`${errorCode}: ${errorDescription}`));
      this.pendingRequests.delete(messageId);
    }
  }

  /**
   * Send CALL message (request to charge point)
   */
  async sendCall(chargePointId, action, payload, timeoutMs = 30000) {
    const ws = this.clients.get(chargePointId);
    if (!ws || ws.readyState !== 1) {
      throw new Error(`Charge point ${chargePointId} not connected`);
    }

    const messageId = uuidv4();
    const message = [2, messageId, action, payload];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request timeout: ${action}`));
      }, timeoutMs);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(messageId);
          reject(error);
        }
      });
    });
  }

  /**
   * Send CALLRESULT message
   */
  sendCallResult(chargePointId, messageId, payload) {
    const ws = this.clients.get(chargePointId);
    if (!ws || ws.readyState !== 1) return;

    const message = [3, messageId, payload];
    ws.send(JSON.stringify(message));
  }

  /**
   * Send CALLERROR message
   */
  sendCallError(chargePointId, messageId, errorCode, errorDescription, errorDetails = {}) {
    const ws = this.clients.get(chargePointId);
    if (!ws || ws.readyState !== 1) return;

    const message = [4, messageId, errorCode, errorDescription, errorDetails];
    ws.send(JSON.stringify(message));
  }

  // ========== OCPP Message Handlers ==========

  async handleBootNotification(chargePointId, payload) {
    console.log(`📡 BootNotification from ${chargePointId}:`, payload);
    return {
      status: 'Accepted',
      currentTime: new Date().toISOString(),
      interval: 300 // Heartbeat interval in seconds
    };
  }

  async handleHeartbeat(chargePointId, payload) {
    return {
      currentTime: new Date().toISOString()
    };
  }

  async handleStatusNotification(chargePointId, payload) {
    console.log(`📊 StatusNotification from ${chargePointId}:`, payload);
    return {};
  }

  async handleMeterValues(chargePointId, payload) {
    console.log(`📈 MeterValues from ${chargePointId}:`, payload);
    return {};
  }

  async handleStartTransaction(chargePointId, payload) {
    console.log(`🔋 StartTransaction from ${chargePointId}:`, payload);
    return {
      transactionId: Math.floor(Math.random() * 1000000),
      idTagInfo: {
        status: 'Accepted'
      }
    };
  }

  async handleStopTransaction(chargePointId, payload) {
    console.log(`🛑 StopTransaction from ${chargePointId}:`, payload);
    return {
      idTagInfo: {
        status: 'Accepted'
      }
    };
  }

  async handleAuthorize(chargePointId, payload) {
    console.log(`🔐 Authorize from ${chargePointId}:`, payload);
    return {
      idTagInfo: {
        status: 'Accepted'
      }
    };
  }

  // ========== Control Commands ==========

  /**
   * Change charging power (OCPP 1.6: SetChargingProfile / OCPP 2.0: SetChargingProfile)
   */
  async setChargingPower(chargePointId, power, connectorId = 1) {
    const chargingProfile = {
      chargingProfileId: Date.now(),
      stackLevel: 0,
      chargingProfilePurpose: 'TxDefaultProfile',
      chargingProfileKind: 'Absolute',
      chargingSchedule: {
        chargingRateUnit: 'W',
        chargingSchedulePeriod: [
          {
            startPeriod: 0,
            limit: power * 1000 // Convert kW to W
          }
        ]
      }
    };

    return this.sendCall(chargePointId, 'SetChargingProfile', {
      connectorId,
      csChargingProfiles: chargingProfile
    });
  }

  /**
   * Remote start transaction
   */
  async remoteStartTransaction(chargePointId, idTag, connectorId = 1) {
    return this.sendCall(chargePointId, 'RemoteStartTransaction', {
      connectorId,
      idTag
    });
  }

  /**
   * Remote stop transaction
   */
  async remoteStopTransaction(chargePointId, transactionId) {
    return this.sendCall(chargePointId, 'RemoteStopTransaction', {
      transactionId
    });
  }

  /**
   * Get configuration
   */
  async getConfiguration(chargePointId, keys = []) {
    return this.sendCall(chargePointId, 'GetConfiguration', {
      key: keys
    });
  }

  /**
   * Change configuration
   */
  async changeConfiguration(chargePointId, key, value) {
    return this.sendCall(chargePointId, 'ChangeConfiguration', {
      key,
      value
    });
  }

  /**
   * Reset charge point
   */
  async reset(chargePointId, type = 'Soft') {
    return this.sendCall(chargePointId, 'Reset', { type });
  }

  /**
   * Register message handler for a charge point
   */
  registerMessageHandler(chargePointId, handler) {
    this.messageHandlers.set(chargePointId, handler);
  }

  /**
   * Check if charge point is connected
   */
  isConnected(chargePointId) {
    const ws = this.clients.get(chargePointId);
    return ws && ws.readyState === 1;
  }

  /**
   * Get all connected charge points
   */
  getConnectedChargePoints() {
    return Array.from(this.clients.keys()).filter(id => this.isConnected(id));
  }

  /**
   * Stop OCPP server
   */
  async stop() {
    if (this.wss) {
      // Close all client connections
      for (const ws of this.clients.values()) {
        ws.close();
      }
      this.clients.clear();

      // Close server
      return new Promise((resolve) => {
        this.wss.close(() => {
          console.log('🔌 OCPP Server stopped');
          resolve();
        });
      });
    }
  }
}
