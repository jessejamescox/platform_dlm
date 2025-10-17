/**
 * ModbusDriver - Handles Modbus TCP/RTU communication with charging stations
 */

import ModbusRTU from 'modbus-serial';

export class ModbusDriver {
  constructor() {
    this.clients = new Map(); // host:port -> client
  }

  /**
   * Get or create Modbus client for host:port
   */
  async getClient(host, port) {
    const key = `${host}:${port}`;

    if (this.clients.has(key)) {
      return this.clients.get(key);
    }

    const client = new ModbusRTU();
    await client.connectTCP(host, { port });
    client.setTimeout(5000);

    this.clients.set(key, client);

    return client;
  }

  /**
   * Connect to Modbus device
   */
  async connect(host, port = 502) {
    try {
      await this.getClient(host, port);
      console.log(`🔌 Connected to Modbus device at ${host}:${port}`);
      return true;
    } catch (error) {
      console.error(`Failed to connect to Modbus device at ${host}:${port}:`, error.message);
      throw error;
    }
  }

  /**
   * Read holding register
   */
  async readRegister(host, port, unitId, address) {
    try {
      const client = await this.getClient(host, port);
      client.setID(unitId);

      const data = await client.readHoldingRegisters(address, 1);
      return data.data[0];

    } catch (error) {
      console.error(`Modbus read error (${host}:${port} unit ${unitId} addr ${address}):`, error.message);
      throw error;
    }
  }

  /**
   * Read multiple holding registers
   */
  async readRegisters(host, port, unitId, address, length) {
    try {
      const client = await this.getClient(host, port);
      client.setID(unitId);

      const data = await client.readHoldingRegisters(address, length);
      return data.data;

    } catch (error) {
      console.error(`Modbus read error (${host}:${port} unit ${unitId} addr ${address}):`, error.message);
      throw error;
    }
  }

  /**
   * Write holding register
   */
  async writeRegister(host, port, unitId, address, value) {
    try {
      const client = await this.getClient(host, port);
      client.setID(unitId);

      await client.writeRegister(address, value);
      return true;

    } catch (error) {
      console.error(`Modbus write error (${host}:${port} unit ${unitId} addr ${address}):`, error.message);
      throw error;
    }
  }

  /**
   * Write multiple holding registers
   */
  async writeRegisters(host, port, unitId, address, values) {
    try {
      const client = await this.getClient(host, port);
      client.setID(unitId);

      await client.writeRegisters(address, values);
      return true;

    } catch (error) {
      console.error(`Modbus write error (${host}:${port} unit ${unitId} addr ${address}):`, error.message);
      throw error;
    }
  }

  /**
   * Disconnect from all Modbus devices
   */
  async disconnectAll() {
    for (const [key, client] of this.clients) {
      try {
        await client.close();
        console.log(`🔌 Disconnected from Modbus device at ${key}`);
      } catch (error) {
        console.error(`Error disconnecting from ${key}:`, error.message);
      }
    }
    this.clients.clear();
  }
}
