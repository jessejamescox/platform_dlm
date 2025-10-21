/**
 * API routes for AI-powered meter configuration extraction
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AIMeterParser } from '../services/AIMeterParser.js';

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
    cb(null, 'meter-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

const aiParser = new AIMeterParser();

/**
 * POST /api/ai-meter/upload
 * Upload and parse energy meter manual
 */
router.post('/upload', upload.single('manual'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Processing uploaded meter manual: ${req.file.originalname}`);

    // Parse the manual with AI
    const extracted = await aiParser.parseManual(req.file.path, req.file.mimetype);

    // Generate confidence report
    const confidence = aiParser.generateConfidenceReport(extracted);

    // Map to meter config format
    const meterConfig = aiParser.mapToMeterConfig(extracted, {});

    res.json({
      success: true,
      data: {
        extracted,
        confidence,
        meterConfig
      }
    });

  } catch (error) {
    console.error('❌ AI meter parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse meter manual'
    });
  }
});

export default router;
