/**
 * AIConfigParser - AI-powered charging station configuration extraction
 * Parses manuals (PDF, images, text) to extract station configuration
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class AIConfigParser {
  constructor() {
    // Support multiple AI providers
    this.provider = process.env.AI_PROVIDER || 'openai'; // openai, anthropic, ollama
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-4-turbo-preview';
    this.useLocalAI = process.env.USE_LOCAL_AI === 'true';
  }

  /**
   * Parse charging station manual to extract configuration
   */
  async parseManual(filePath, fileType) {
    console.log(`🤖 AI parsing manual: ${path.basename(filePath)}`);

    try {
      // Step 1: Extract text from document
      const extractedText = await this.extractText(filePath, fileType);

      // Step 2: Send to AI for structured extraction
      const config = await this.extractConfiguration(extractedText);

      // Step 3: Validate and clean results
      const validated = this.validateConfiguration(config);

      console.log('✅ AI successfully extracted configuration');
      return validated;

    } catch (error) {
      console.error('❌ AI parsing failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract text from various file formats
   */
  async extractText(filePath, fileType) {
    // For PDF files, you'd use a library like pdf-parse
    // For images, you'd use OCR like Tesseract
    // For now, we'll handle text files and assume preprocessing for others

    if (fileType === 'text/plain') {
      return await fs.readFile(filePath, 'utf-8');
    }

    // For PDF: const pdfParse = require('pdf-parse');
    // const dataBuffer = await fs.readFile(filePath);
    // const data = await pdfParse(dataBuffer);
    // return data.text;

    // For images: Use Tesseract.js or cloud OCR

    // Placeholder: In production, add proper PDF/image handling
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
   * Build AI prompt for configuration extraction
   */
  buildExtractionPrompt(manualText) {
    return {
      system: `You are an expert at parsing EV charging station technical documentation.
Extract the following information from the provided manual and return it as valid JSON.
Be precise with numerical values and use null if information is not found.

Required fields:
- manufacturer: string
- model: string
- serialNumber: string (if mentioned, else null)
- type: "ac" or "dc"
- maxPower: number (in kW)
- minPower: number (in kW)
- numberOfConnectors: number
- supportedProtocols: array of strings (e.g., ["ocpp", "modbus", "mqtt"])
- ocppVersion: string (e.g., "1.6J" or "2.0.1") if OCPP is supported
- modbusRegisters: object with register addresses if Modbus is mentioned
- mqttTopics: object with topic patterns if MQTT is mentioned
- networkConfig: object with default IP, port, etc.
- features: array of strings (e.g., ["rfid", "plug-and-charge", "dynamic-power-management"])

Return ONLY valid JSON, no markdown formatting.`,
      user: `Parse this charging station manual and extract the configuration:\n\n${manualText.substring(0, 15000)}`
    };
  }

  /**
   * Query OpenAI or Anthropic
   */
  async queryCloudAI(prompt) {
    if (this.provider === 'openai') {
      return await this.queryOpenAI(prompt);
    } else if (this.provider === 'anthropic') {
      return await this.queryAnthropic(prompt);
    }
    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }

  /**
   * Query OpenAI API
   */
  async queryOpenAI(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured (AI_API_KEY)');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          temperature: 0.1, // Low temperature for factual extraction
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;
      return JSON.parse(result);

    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to query OpenAI API');
    }
  }

  /**
   * Query Anthropic Claude API
   */
  async queryAnthropic(prompt) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured (AI_API_KEY)');
    }

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          system: prompt.system,
          messages: [
            { role: 'user', content: prompt.user }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.content[0].text;
      // Claude might wrap in markdown, clean it
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);

    } catch (error) {
      console.error('Anthropic API error:', error.response?.data || error.message);
      throw new Error('Failed to query Anthropic API');
    }
  }

  /**
   * Query local AI (Ollama)
   */
  async queryLocalAI(prompt) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    try {
      const response = await axios.post(
        `${ollamaUrl}/api/generate`,
        {
          model: this.model || 'llama2',
          prompt: `${prompt.system}\n\n${prompt.user}`,
          stream: false,
          format: 'json'
        }
      );

      return JSON.parse(response.data.response);

    } catch (error) {
      console.error('Local AI error:', error.message);
      throw new Error('Failed to query local AI');
    }
  }

  /**
   * Validate and clean extracted configuration
   */
  validateConfiguration(config) {
    const validated = {
      // Basic info
      manufacturer: config.manufacturer || 'Unknown',
      model: config.model || 'Unknown',
      serialNumber: config.serialNumber || null,
      type: ['ac', 'dc'].includes(config.type?.toLowerCase()) ? config.type.toLowerCase() : 'ac',

      // Power specs
      maxPower: this.validateNumber(config.maxPower, 3.7, 350),
      minPower: this.validateNumber(config.minPower, 1, 50),

      // Connectors
      numberOfConnectors: this.validateNumber(config.numberOfConnectors, 1, 10, 1),

      // Protocols
      supportedProtocols: Array.isArray(config.supportedProtocols)
        ? config.supportedProtocols.filter(p => ['ocpp', 'modbus', 'mqtt'].includes(p.toLowerCase()))
        : ['ocpp'],

      // Protocol-specific
      ocppVersion: config.ocppVersion || null,
      modbusRegisters: config.modbusRegisters || null,
      mqttTopics: config.mqttTopics || null,
      networkConfig: config.networkConfig || null,

      // Features
      features: Array.isArray(config.features) ? config.features : [],

      // Metadata
      confidence: config.confidence || 'medium',
      aiExtracted: true,
      extractedAt: new Date().toISOString()
    };

    // Ensure minPower < maxPower
    if (validated.minPower >= validated.maxPower) {
      validated.minPower = Math.min(3.7, validated.maxPower * 0.2);
    }

    return validated;
  }

  /**
   * Validate numeric value with bounds
   */
  validateNumber(value, min, max, defaultValue = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Map extracted config to station registration format
   */
  mapToStationConfig(extracted, userInput = {}) {
    // Determine primary protocol
    const protocol = this.determinePrimaryProtocol(extracted);

    const stationConfig = {
      name: userInput.name || `${extracted.manufacturer} ${extracted.model}`,
      type: extracted.type,
      zone: userInput.zone || 'default',
      location: userInput.location || '',
      maxPower: extracted.maxPower,
      minPower: extracted.minPower,
      priority: userInput.priority || 5,
      protocol: protocol,
      manufacturer: extracted.manufacturer,
      model: extracted.model,
      serialNumber: extracted.serialNumber,
      communication: this.buildCommunicationConfig(protocol, extracted, userInput)
    };

    return stationConfig;
  }

  /**
   * Determine which protocol to use as primary
   */
  determinePrimaryProtocol(extracted) {
    const protocols = extracted.supportedProtocols || [];

    // Prefer OCPP as industry standard
    if (protocols.includes('ocpp')) return 'ocpp';
    if (protocols.includes('modbus')) return 'modbus';
    if (protocols.includes('mqtt')) return 'mqtt';

    return 'ocpp'; // Default
  }

  /**
   * Build protocol-specific communication config
   */
  buildCommunicationConfig(protocol, extracted, userInput) {
    if (protocol === 'ocpp') {
      return {
        chargePointId: userInput.chargePointId || `CP_${extracted.serialNumber || Date.now()}`,
        connectorId: userInput.connectorId || 1,
        ocppVersion: extracted.ocppVersion || '1.6J'
      };
    } else if (protocol === 'modbus') {
      return {
        host: userInput.modbusHost || extracted.networkConfig?.defaultIP || '192.168.1.100',
        port: userInput.modbusPort || extracted.networkConfig?.modbusPort || 502,
        unitId: userInput.modbusUnitId || 1,
        registers: extracted.modbusRegisters || {
          status: 1000,
          power: 1001,
          energy: 1002,
          powerSetpoint: 1003
        }
      };
    } else if (protocol === 'mqtt') {
      const baseId = (userInput.stationId || extracted.serialNumber || 'station01').toLowerCase();
      return {
        topics: extracted.mqttTopics || {
          status: `charger/${baseId}/status`,
          power: `charger/${baseId}/power`,
          energy: `charger/${baseId}/energy`,
          control: `charger/${baseId}/control`
        }
      };
    }

    return {};
  }

  /**
   * Generate AI confidence report
   */
  generateConfidenceReport(extracted) {
    const findings = [];
    let score = 0;
    const maxScore = 10;

    // Check completeness
    if (extracted.manufacturer && extracted.manufacturer !== 'Unknown') {
      score += 1;
      findings.push('✓ Manufacturer identified');
    } else {
      findings.push('⚠ Manufacturer not found');
    }

    if (extracted.model && extracted.model !== 'Unknown') {
      score += 1;
      findings.push('✓ Model identified');
    } else {
      findings.push('⚠ Model not found');
    }

    if (extracted.maxPower && extracted.maxPower > 0) {
      score += 2;
      findings.push('✓ Max power specification found');
    } else {
      findings.push('⚠ Max power not found, using default');
    }

    if (extracted.supportedProtocols && extracted.supportedProtocols.length > 0) {
      score += 2;
      findings.push(`✓ Protocols identified: ${extracted.supportedProtocols.join(', ')}`);
    } else {
      findings.push('⚠ Protocols not clearly specified, defaulting to OCPP');
    }

    if (extracted.ocppVersion) {
      score += 1;
      findings.push(`✓ OCPP version: ${extracted.ocppVersion}`);
    }

    if (extracted.modbusRegisters) {
      score += 1;
      findings.push('✓ Modbus registers found');
    }

    if (extracted.features && extracted.features.length > 0) {
      score += 1;
      findings.push(`✓ Features identified: ${extracted.features.join(', ')}`);
    }

    score += 1; // Base score for successful parsing

    const confidenceLevel = score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low';

    return {
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      level: confidenceLevel,
      findings,
      recommendation: this.getRecommendation(confidenceLevel, findings)
    };
  }

  /**
   * Get recommendation based on confidence
   */
  getRecommendation(level, findings) {
    if (level === 'high') {
      return 'Configuration looks good! Review and confirm the extracted values.';
    } else if (level === 'medium') {
      return 'Please review and fill in any missing information before proceeding.';
    } else {
      return 'Manual has limited information. You may need to enter configuration manually.';
    }
  }
}
