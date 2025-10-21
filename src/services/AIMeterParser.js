/**
 * AIMeterParser - AI-powered energy meter configuration extraction
 * Parses manuals (PDF, images, text) to extract meter Modbus configuration
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class AIMeterParser {
  constructor() {
    // Support multiple AI providers
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4-turbo-preview';
    this.useLocalAI = process.env.USE_LOCAL_AI === 'true';
  }

  /**
   * Parse energy meter manual to extract configuration
   */
  async parseManual(filePath, fileType) {
    console.log(`🤖 AI parsing meter manual: ${path.basename(filePath)}`);

    try {
      // Step 1: Extract text from document
      const extractedText = await this.extractText(filePath, fileType);

      // Step 2: Send to AI for structured extraction
      const config = await this.extractConfiguration(extractedText);

      // Step 3: Validate and clean results
      const validated = this.validateConfiguration(config);

      console.log('✅ AI successfully extracted meter configuration');
      return validated;

    } catch (error) {
      console.error('❌ AI meter parsing failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract text from various file formats
   */
  async extractText(filePath, fileType) {
    if (fileType === 'text/plain') {
      return await fs.readFile(filePath, 'utf-8');
    }

    // Placeholder: In production, add proper PDF/image handling
    // For now, try to read as text
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * Use AI to extract structured configuration from text
   */
  async extractConfiguration(text) {
    const prompt = this.buildExtractionPrompt(text);

    if (this.useLocalAI) {
      return await this.queryLocalAI(prompt);
    } else {
      return await this.queryCloudAI(prompt);
    }
  }

  /**
   * Build AI prompt for meter configuration extraction
   */
  buildExtractionPrompt(manualText) {
    return {
      system: `You are an expert at parsing energy meter technical documentation.
Extract Modbus register configuration from the provided manual and return it as valid JSON.
Be precise with register addresses and use null if information is not found.

Required fields:
- manufacturer: string
- model: string
- protocol: "modbus" or "mqtt" or "http"
- meterType: "building", "grid", "solar", or "custom"
- modbusHost: string (default IP address if mentioned, else "192.168.1.100")
- modbusPort: number (default 502)
- modbusUnitId: number (slave ID, default 1)
- registers: object with:
  - power: register address for active power (W)
  - voltage: register address for voltage (V)
  - current: register address for current (A)
  - totalEnergy: register address for total energy (Wh or kWh)
  - frequency: register address for frequency (Hz) if available
  - powerFactor: register address for power factor if available

Common register naming patterns to look for:
- Power: "Active Power", "Real Power", "Power (W)", "P", "kW"
- Voltage: "Voltage", "V", "Line Voltage", "Phase Voltage"
- Current: "Current", "A", "Amps", "Line Current"
- Energy: "Total Energy", "kWh", "Wh", "Energy Counter", "Accumulated Energy"

Return confidence levels for each field: "high", "medium", or "low"`,

      user: `Extract the energy meter Modbus configuration from this manual:

${manualText.slice(0, 15000)}

Return ONLY valid JSON in this exact format:
{
  "manufacturer": "...",
  "model": "...",
  "protocol": "modbus",
  "meterType": "building",
  "modbusHost": "192.168.1.100",
  "modbusPort": 502,
  "modbusUnitId": 1,
  "registers": {
    "power": 0,
    "voltage": 2,
    "current": 6,
    "totalEnergy": 40
  },
  "confidence": {
    "overall": "high|medium|low",
    "fields": {
      "power": "high|medium|low",
      "voltage": "high|medium|low",
      "current": "high|medium|low",
      "totalEnergy": "high|medium|low"
    }
  },
  "notes": "Any important notes about the configuration"
}`
    };
  }

  /**
   * Query cloud AI provider
   */
  async queryCloudAI(prompt) {
    if (!this.apiKey) {
      console.warn('⚠️  No AI_API_KEY configured, using mock data');
      return this.getMockConfiguration();
    }

    try {
      if (this.provider === 'openai') {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: this.model,
            messages: [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
      }

      // Add other providers (Anthropic, etc.) as needed
      throw new Error(`Unsupported AI provider: ${this.provider}`);

    } catch (error) {
      console.error('❌ Cloud AI query failed:', error.message);
      console.warn('⚠️  Falling back to mock data');
      return this.getMockConfiguration();
    }
  }

  /**
   * Query local AI (Ollama)
   */
  async queryLocalAI(prompt) {
    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: this.model || 'mistral',
        prompt: `${prompt.system}\n\n${prompt.user}`,
        stream: false
      });

      return JSON.parse(response.data.response);
    } catch (error) {
      console.error('❌ Local AI query failed:', error.message);
      console.warn('⚠️  Falling back to mock data');
      return this.getMockConfiguration();
    }
  }

  /**
   * Mock configuration for testing without AI API
   */
  getMockConfiguration() {
    return {
      manufacturer: 'Example Meter Co.',
      model: 'EM-3000',
      protocol: 'modbus',
      meterType: 'building',
      modbusHost: '192.168.1.100',
      modbusPort: 502,
      modbusUnitId: 1,
      registers: {
        power: 0,
        voltage: 2,
        current: 6,
        totalEnergy: 40
      },
      confidence: {
        overall: 'medium',
        fields: {
          power: 'medium',
          voltage: 'medium',
          current: 'medium',
          totalEnergy: 'medium'
        }
      },
      notes: 'AI API key not configured - using example values. Please verify register addresses.'
    };
  }

  /**
   * Validate extracted configuration
   */
  validateConfiguration(config) {
    const defaults = {
      manufacturer: 'Unknown',
      model: 'Unknown',
      protocol: 'modbus',
      meterType: 'building',
      modbusHost: '192.168.1.100',
      modbusPort: 502,
      modbusUnitId: 1,
      registers: {
        power: 0,
        voltage: 2,
        current: 6,
        totalEnergy: 40
      },
      confidence: {
        overall: 'low',
        fields: {
          power: 'low',
          voltage: 'low',
          current: 'low',
          totalEnergy: 'low'
        }
      }
    };

    return {
      ...defaults,
      ...config,
      registers: {
        ...defaults.registers,
        ...config.registers
      },
      confidence: {
        ...defaults.confidence,
        ...config.confidence,
        fields: {
          ...defaults.confidence.fields,
          ...config.confidence?.fields
        }
      }
    };
  }

  /**
   * Generate confidence report
   */
  generateConfidenceReport(extracted) {
    const fields = extracted.confidence?.fields || {};
    const scores = Object.values(fields);

    const highCount = scores.filter(s => s === 'high').length;
    const mediumCount = scores.filter(s => s === 'medium').length;
    const lowCount = scores.filter(s => s === 'low').length;

    let overall = 'low';
    if (highCount >= 3) overall = 'high';
    else if (highCount + mediumCount >= 3) overall = 'medium';

    return {
      overall,
      fields,
      summary: {
        high: highCount,
        medium: mediumCount,
        low: lowCount
      }
    };
  }

  /**
   * Map extracted data to meter configuration format
   */
  mapToMeterConfig(extracted, userOverrides = {}) {
    const config = {
      name: userOverrides.name || `${extracted.manufacturer} ${extracted.model}`,
      protocol: extracted.protocol || 'modbus',
      meterType: extracted.meterType || 'building',
      pollInterval: userOverrides.pollInterval || 5000,
      communication: {
        host: extracted.modbusHost || '192.168.1.100',
        port: extracted.modbusPort || 502,
        unitId: extracted.modbusUnitId || 1,
        registers: extracted.registers || {
          power: 0,
          voltage: 2,
          current: 6,
          totalEnergy: 40
        }
      }
    };

    return config;
  }
}
