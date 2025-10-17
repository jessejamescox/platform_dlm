/**
 * API routes for AI-powered configuration extraction
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AIConfigParser } from '../services/AIConfigParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, TXT, JPEG, PNG, TIFF, DOCX'));
    }
  }
});

const aiParser = new AIConfigParser();

/**
 * POST /api/ai-config/upload
 * Upload and parse charging station manual
 */
router.post('/upload', upload.single('manual'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Processing uploaded manual: ${req.file.originalname}`);

    // Parse the manual with AI
    const extracted = await aiParser.parseManual(req.file.path, req.file.mimetype);

    // Generate confidence report
    const confidence = aiParser.generateConfidenceReport(extracted);

    // Map to station config format
    const stationConfig = aiParser.mapToStationConfig(extracted, {});

    res.json({
      success: true,
      data: {
        extracted,
        stationConfig,
        confidence,
        file: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        }
      }
    });

  } catch (error) {
    console.error('Error parsing manual:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse manual'
    });
  }
});

/**
 * POST /api/ai-config/parse-text
 * Parse manual from text input (for copy-paste)
 */
router.post('/parse-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text provided'
      });
    }

    console.log('📄 Processing text input for AI parsing');

    // Extract configuration from text
    const extracted = await aiParser.extractConfiguration(text);

    // Generate confidence report
    const confidence = aiParser.generateConfidenceReport(extracted);

    // Map to station config format
    const stationConfig = aiParser.mapToStationConfig(extracted, {});

    res.json({
      success: true,
      data: {
        extracted,
        stationConfig,
        confidence
      }
    });

  } catch (error) {
    console.error('Error parsing text:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse text'
    });
  }
});

/**
 * POST /api/ai-config/finalize
 * Finalize AI-extracted config with user modifications
 */
router.post('/finalize', async (req, res) => {
  try {
    const { extracted, userInput } = req.body;

    if (!extracted) {
      return res.status(400).json({
        success: false,
        error: 'No extracted configuration provided'
      });
    }

    // Merge AI-extracted config with user inputs
    const finalConfig = aiParser.mapToStationConfig(extracted, userInput);

    res.json({
      success: true,
      data: finalConfig
    });

  } catch (error) {
    console.error('Error finalizing config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to finalize configuration'
    });
  }
});

/**
 * GET /api/ai-config/supported-formats
 * Get list of supported file formats
 */
router.get('/supported-formats', (req, res) => {
  res.json({
    success: true,
    data: {
      formats: [
        { extension: '.pdf', type: 'application/pdf', description: 'PDF Document' },
        { extension: '.txt', type: 'text/plain', description: 'Text File' },
        { extension: '.jpg', type: 'image/jpeg', description: 'JPEG Image' },
        { extension: '.png', type: 'image/png', description: 'PNG Image' },
        { extension: '.tif', type: 'image/tiff', description: 'TIFF Image' },
        { extension: '.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Word Document' }
      ],
      maxSize: '10MB',
      aiProviders: {
        openai: process.env.AI_PROVIDER === 'openai' && !!process.env.AI_API_KEY,
        anthropic: process.env.AI_PROVIDER === 'anthropic' && !!process.env.AI_API_KEY,
        local: process.env.USE_LOCAL_AI === 'true'
      }
    }
  });
});

export default router;
