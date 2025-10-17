/**
 * MQTTDriver - Handles MQTT communication with charging stations and PV systems
 */

import mqtt from 'mqtt';

export class MQTTDriver {
  constructor(brokerUrl) {
    this.brokerUrl = brokerUrl || process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.client = null;
    this.subscriptions = new Map(); // topic -> callback
    this.connected = false;
  }

  /**
   * Connect to MQTT broker
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const options = {
        clientId: `dlm_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000
      };

      // Add credentials if provided
      if (process.env.MQTT_USERNAME) {
        options.username = process.env.MQTT_USERNAME;
        options.password = process.env.MQTT_PASSWORD;
      }

      this.client = mqtt.connect(this.brokerUrl, options);

      this.client.on('connect', () => {
        console.log(`📡 Connected to MQTT broker: ${this.brokerUrl}`);
        this.connected = true;

        // Resubscribe to all topics
        for (const topic of this.subscriptions.keys()) {
          this.client.subscribe(topic);
        }

        resolve();
      });

      this.client.on('error', (error) => {
        console.error('MQTT connection error:', error.message);
        if (!this.connected) {
          reject(error);
        }
      });

      this.client.on('offline', () => {
        console.log('📡 MQTT client offline');
        this.connected = false;
      });

      this.client.on('reconnect', () => {
        console.log('📡 MQTT client reconnecting...');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      // Timeout if connection takes too long
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('MQTT connection timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(topic, callback) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`Failed to subscribe to ${topic}:`, error.message);
          reject(error);
        } else {
          this.subscriptions.set(topic, callback);
          console.log(`📡 Subscribed to MQTT topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic) {
    if (!this.client) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client.unsubscribe(topic, (error) => {
        if (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error.message);
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          console.log(`📡 Unsubscribed from MQTT topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic, message, options = {}) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);

      this.client.publish(topic, payload, options, (error) => {
        if (error) {
          console.error(`Failed to publish to ${topic}:`, error.message);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming MQTT message
   */
  handleMessage(topic, message) {
    const callback = this.subscriptions.get(topic);

    if (callback) {
      try {
        const messageStr = message.toString();
        callback(messageStr);
      } catch (error) {
        console.error(`Error handling message from ${topic}:`, error.message);
      }
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect() {
    if (this.client) {
      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          console.log('📡 Disconnected from MQTT broker');
          this.connected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}
