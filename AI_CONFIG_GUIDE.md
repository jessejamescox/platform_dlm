# 🤖 AI-Powered Station Configuration Guide

## Overview

The WAGO DLM system includes an **AI-powered configuration parser** that can automatically extract charging station parameters from manuals, datasheets, and technical documentation. This dramatically simplifies the station onboarding process.

## How It Works

```
Manual Upload → Text Extraction → AI Analysis → Structured Config → User Review → Station Registration
```

The AI parser:
1. **Extracts text** from PDF, images, or documents
2. **Identifies key parameters** using large language models
3. **Structures the data** into station configuration format
4. **Provides confidence scores** for review
5. **Allows user corrections** before finalizing

## Supported AI Providers

### Option 1: OpenAI (Recommended)
- **Model**: GPT-4 Turbo or GPT-3.5
- **Pros**: Most accurate, fast, JSON mode
- **Cost**: ~$0.01 per manual
- **Setup**: API key required

###Option 2: Anthropic Claude
- **Model**: Claude 3.5 Sonnet or Claude 3 Opus
- **Pros**: Excellent at technical documents, long context
- **Cost**: ~$0.015 per manual
- **Setup**: API key required

### Option 3: Local AI (Ollama)
- **Model**: Llama 2, Mistral, or CodeLlama
- **Pros**: Free, private, offline
- **Cost**: $0 (uses your hardware)
- **Setup**: Install Ollama locally

## Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# Choose provider: openai, anthropic, or local
AI_PROVIDER=openai

# API Key (not needed for local)
AI_API_KEY=sk-your-api-key-here

# Model selection
AI_MODEL=gpt-4-turbo-preview
# Or: claude-3-5-sonnet-20241022
# Or: llama2 (for local)

# Local AI option
USE_LOCAL_AI=false
OLLAMA_URL=http://localhost:11434
```

### 2. OpenAI Setup

```bash
# Get API key from: https://platform.openai.com/api-keys
AI_PROVIDER=openai
AI_API_KEY=sk-proj-xxxxxxxxxxxxx
AI_MODEL=gpt-4-turbo-preview
```

### 3. Anthropic Setup

```bash
# Get API key from: https://console.anthropic.com/
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-xxxxxxxxxxxxx
AI_MODEL=claude-3-5-sonnet-20241022
```

### 4. Local AI Setup (Free & Private)

```bash
# Install Ollama: https://ollama.ai/
# Pull a model: ollama pull llama2

USE_LOCAL_AI=true
OLLAMA_URL=http://localhost:11434
AI_MODEL=llama2
```

## API Endpoints

### Upload Manual File

```bash
POST /api/ai-config/upload
Content-Type: multipart/form-data

# Form data:
# - manual: File (PDF, TXT, JPG, PNG, DOCX)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "extracted": {
      "manufacturer": "ABB",
      "model": "Terra AC Wallbox",
      "type": "ac",
      "maxPower": 22,
      "minPower": 3.7,
      "supportedProtocols": ["ocpp", "modbus"],
      "ocppVersion": "1.6J",
      "features": ["rfid", "dynamic-power-management"]
    },
    "stationConfig": {
      "name": "ABB Terra AC Wallbox",
      "type": "ac",
      "maxPower": 22,
      "minPower": 3.7,
      "protocol": "ocpp",
      "communication": {
        "chargePointId": "CP_1234567",
        "connectorId": 1,
        "ocppVersion": "1.6J"
      }
    },
    "confidence": {
      "score": 8,
      "maxScore": 10,
      "percentage": 80,
      "level": "high",
      "findings": [
        "✓ Manufacturer identified",
        "✓ Model identified",
        "✓ Max power specification found",
        "✓ Protocols identified: ocpp, modbus",
        "✓ OCPP version: 1.6J"
      ],
      "recommendation": "Configuration looks good! Review and confirm the extracted values."
    }
  }
}
```

### Parse Text Input

```bash
POST /api/ai-config/parse-text
Content-Type: application/json

{
  "text": "ABB Terra AC Wallbox. Maximum power: 22 kW. Supports OCPP 1.6J..."
}
```

### Finalize Configuration

```bash
POST /api/ai-config/finalize
Content-Type: application/json

{
  "extracted": { /* AI-extracted config */ },
  "userInput": {
    "name": "Station 01",
    "zone": "parking-lot-a",
    "chargePointId": "CP001"
  }
}
```

## Usage Examples

### Example 1: Upload PDF Manual

```bash
curl -X POST http://localhost:3000/api/ai-config/upload \
  -F "manual=@ABB_Terra_Manual.pdf"
```

### Example 2: Parse Text from Datasheet

```bash
curl -X POST http://localhost:3000/api/ai-config/parse-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Schneider EVlink Wallbox Pro\nOutput Power: 7.4-22 kW AC\nCommunication: OCPP 1.6-J, Modbus TCP\nConnectors: Type 2, 32A max\nNetwork: Ethernet 10/100, Default IP 192.168.1.100"
  }'
```

### Example 3: Complete Workflow

```javascript
// 1. Upload manual
const formData = new FormData();
formData.append('manual', file);

const response = await fetch('/api/ai-config/upload', {
  method: 'POST',
  body: formData
});

const { data } = await response.json();

// 2. Review AI-extracted config
console.log('Confidence:', data.confidence.percentage + '%');
console.log('Extracted:', data.extracted);

// 3. User makes corrections
const userInput = {
  name: 'Main Entrance Charger',
  zone: 'entrance',
  chargePointId: 'CP001'
};

// 4. Finalize and register
const finalConfig = await fetch('/api/ai-config/finalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    extracted: data.extracted,
    userInput
  })
});

// 5. Register station
await fetch('/api/stations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(finalConfig.data)
});
```

## What The AI Extracts

The AI parser attempts to extract:

### Basic Information
- ✅ Manufacturer name
- ✅ Model number/name
- ✅ Serial number (if mentioned)
- ✅ Charger type (AC/DC)

### Power Specifications
- ✅ Maximum power (kW)
- ✅ Minimum power (kW)
- ✅ Number of connectors
- ✅ Connector types (Type 1, Type 2, CCS, CHAdeMO)

### Communication Protocols
- ✅ Supported protocols (OCPP, Modbus, MQTT)
- ✅ OCPP version (1.6J, 2.0.1)
- ✅ Modbus register addresses
- ✅ MQTT topic patterns
- ✅ Network configuration (IP, ports)

### Features
- ✅ RFID support
- ✅ Plug-and-charge capability
- ✅ Dynamic power management
- ✅ Load balancing support
- ✅ Smart charging features

## Confidence Scoring

The AI provides a confidence score based on:

| Score | Level | Meaning |
|-------|-------|---------|
| 8-10 | High | All key parameters found, ready to use |
| 5-7 | Medium | Most parameters found, review needed |
| 0-4 | Low | Limited info, manual entry recommended |

**Recommendations:**
- **High confidence**: Review and confirm
- **Medium confidence**: Fill in missing fields
- **Low confidence**: Use as starting point, verify all values

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Most common, best results |
| Text | `.txt` | Direct text extraction |
| Images | `.jpg`, `.png`, `.tiff` | Requires OCR (future) |
| Word | `.docx` | Supported |

**File size limit:** 10MB

## Privacy & Security

### Cloud AI (OpenAI/Anthropic)
- ✅ Manual text sent to API for processing
- ✅ No data stored by provider (per their policies)
- ✅ HTTPS encrypted transmission
- ⚠️ Manual data leaves your infrastructure

### Local AI (Ollama)
- ✅ All processing on your hardware
- ✅ Zero data transmission
- ✅ Complete privacy
- ✅ Works offline
- ⚠️ Lower accuracy than cloud models

## Cost Analysis

### Per Manual Processed

| Provider | Model | Cost | Accuracy |
|----------|-------|------|----------|
| OpenAI | GPT-4 Turbo | ~$0.01 | ⭐⭐⭐⭐⭐ |
| OpenAI | GPT-3.5 Turbo | ~$0.001 | ⭐⭐⭐⭐ |
| Anthropic | Claude 3.5 Sonnet | ~$0.015 | ⭐⭐⭐⭐⭐ |
| Local | Llama 2 | $0 | ⭐⭐⭐ |

**Recommendation:** Start with OpenAI GPT-4 for best results. Switch to local AI if you process many manuals or require complete privacy.

## Troubleshooting

### "AI API key not configured"
```bash
# Add your API key to .env
AI_API_KEY=sk-your-key-here
```

### "Failed to query OpenAI API"
- Check your API key is valid
- Verify you have credits remaining
- Check internet connection

### "Local AI error"
```bash
# Ensure Ollama is running
ollama serve

# Pull the model
ollama pull llama2
```

### Low Confidence Scores
- Try uploading a different section of the manual
- Look for technical specifications pages
- Copy-paste text directly using `/parse-text` endpoint

## Best Practices

1. **Use Technical Pages**: Upload specification sheets, not marketing materials
2. **Check Confidence**: Always review high-confidence results before finalizing
3. **Verify Critical Values**: Double-check power ratings and protocol settings
4. **Save Originals**: Keep original manuals for reference
5. **Test First**: Test with one station before bulk processing

## Future Enhancements

Coming soon:
- 🔄 Image OCR support (Tesseract.js)
- 📄 Multi-page PDF parsing
- 🎯 Learning from corrections
- 📊 Batch processing
- 🌐 Multi-language support
- 🔗 Direct manufacturer API integration

## Support

For issues with AI parsing:
1. Check the confidence report
2. Try with different AI providers
3. Use manual configuration as fallback
4. Report parsing errors to improve the system

---

**The AI parser is designed to assist, not replace human review. Always verify extracted configurations before deploying to production charging stations.**
