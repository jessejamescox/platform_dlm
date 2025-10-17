# AI Station Configuration - Testing Guide

This guide will help you test the new AI-powered station configuration feature.

## Prerequisites

### Option 1: Using OpenAI (Recommended for testing)

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update your `.env` file:
   ```bash
   AI_PROVIDER=openai
   AI_API_KEY=sk-proj-xxxxxxxxxxxxx
   AI_MODEL=gpt-4-turbo-preview
   ```
3. Restart the backend:
   ```bash
   docker-compose restart backend
   ```

### Option 2: Using Anthropic Claude

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Update your `.env` file:
   ```bash
   AI_PROVIDER=anthropic
   AI_API_KEY=sk-ant-xxxxxxxxxxxxx
   AI_MODEL=claude-3-5-sonnet-20241022
   ```
3. Restart the backend:
   ```bash
   docker-compose restart backend
   ```

### Option 3: Using Local AI (Free, no API key needed)

1. Install Ollama:
   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.ai/
   ```

2. Pull a model:
   ```bash
   ollama pull llama2
   ```

3. Start Ollama server:
   ```bash
   ollama serve
   ```

4. Update your `.env` file:
   ```bash
   USE_LOCAL_AI=true
   OLLAMA_URL=http://localhost:11434
   AI_MODEL=llama2
   ```

5. Restart the backend:
   ```bash
   docker-compose restart backend
   ```

## Test 1: Upload a Manual via Web UI

### Step 1: Access the Web UI
```bash
open http://localhost
```

### Step 2: Navigate to Stations Page
- Click "Charging Stations" in the sidebar

### Step 3: Click "AI Setup" Button
- You'll see two buttons: "AI Setup" and "Add Station"
- Click "AI Setup" (with sparkle icon)

### Step 4: Upload a Test Manual

**Option A: Create a sample text file**

Create `test_charger_manual.txt`:
```
ABB Terra AC Wallbox
Model: TAC-W22-G5-M-0

Technical Specifications:
- Type: AC Charging Station
- Output Power: 7.4 - 22 kW
- Input Voltage: 400V AC, 3-phase
- Maximum Current: 32A per phase
- Connector: Type 2 (IEC 62196-2)

Communication:
- OCPP 1.6-J compliant
- WebSocket connection required
- Charge Point ID: CP_001
- Default Connector ID: 1

Network Configuration:
- Ethernet 10/100 Mbps
- DHCP or Static IP
- Default IP: 192.168.1.100

Features:
- RFID authentication
- Dynamic power management
- LED status indicators
- Plug and charge ready
```

**Option B: Use a real PDF manual**
- Find any EV charger PDF manual online
- Look for technical specification pages

### Step 5: Review AI-Extracted Configuration
- The AI will analyze the manual
- You'll see a confidence score (0-10)
- Review the extracted parameters:
  - Station name
  - Type (AC/DC)
  - Max power
  - Protocol
  - OCPP configuration

### Step 6: Edit and Confirm
- Modify any incorrect values
- Add a zone name
- Click "Create Station"

### Step 7: Verify Station Created
- Check the Stations page
- Verify the new station appears with correct configuration

## Test 2: Test via API (Backend Only)

### Test with Text Input

```bash
curl -X POST http://localhost:3000/api/ai-config/parse-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Schneider EVlink Wallbox Pro. Output Power: 7.4-22 kW AC. Communication: OCPP 1.6-J, Modbus TCP. Connectors: Type 2, 32A max. Network: Ethernet 10/100, Default IP 192.168.1.100"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "extracted": {
      "manufacturer": "Schneider",
      "model": "EVlink Wallbox Pro",
      "type": "ac",
      "maxPower": 22,
      "minPower": 7.4,
      "supportedProtocols": ["ocpp", "modbus"],
      "ocppVersion": "1.6-J"
    },
    "stationConfig": {
      "name": "Schneider EVlink Wallbox Pro",
      "type": "ac",
      "maxPower": 22,
      "minPower": 7.4,
      "protocol": "ocpp"
    },
    "confidence": {
      "score": 8,
      "percentage": 80,
      "level": "high",
      "findings": [
        "✓ Manufacturer identified",
        "✓ Model identified",
        "✓ Max power specification found"
      ]
    }
  }
}
```

### Test with File Upload

```bash
# Create a test file
echo "ABB Terra AC Wallbox. Maximum power: 22 kW. Supports OCPP 1.6J. Type 2 connector." > test_manual.txt

# Upload it
curl -X POST http://localhost:3000/api/ai-config/upload \
  -F "manual=@test_manual.txt"
```

## Confidence Score Guide

| Score | Level | What It Means | Action Required |
|-------|-------|---------------|-----------------|
| 8-10 | High | All key parameters found | Review and confirm |
| 5-7 | Medium | Most parameters found | Fill in missing fields |
| 0-4 | Low | Limited information | Verify all values carefully |

## Common Test Scenarios

### Scenario 1: OCPP Station
Upload a manual with:
- OCPP version mentioned
- Charge Point ID or format
- Connector information

### Scenario 2: Modbus Station
Upload a manual with:
- Modbus TCP/RTU mentioned
- Register addresses
- IP address and port

### Scenario 3: MQTT Station
Upload a manual with:
- MQTT mentioned
- Topic structure
- Broker information

## Troubleshooting

### "AI API key not configured"
```bash
# Check your .env file
cat .env | grep AI_API_KEY

# Make sure it's set and not empty
AI_API_KEY=sk-your-actual-key-here

# Restart backend
docker-compose restart backend
```

### "Failed to query OpenAI API"
- Verify your API key is valid
- Check you have credits in your OpenAI account
- Check internet connection
- Try switching to Anthropic or local AI

### "Low confidence score"
- Try a different section of the manual (technical specs page)
- Copy-paste text directly instead of uploading
- Use the manual configuration instead

### Backend not processing uploads
```bash
# Check backend logs
docker-compose logs -f backend

# Verify uploads directory exists
ls -la uploads/

# Verify multer is installed
docker-compose exec backend npm list multer
```

## Expected Results

### High Confidence (8-10)
- All major fields populated correctly
- Protocol identified
- Power ratings accurate
- Communication details present

### Medium Confidence (5-7)
- Basic info (manufacturer, model, power) present
- Some protocol details missing
- May need manual adjustment

### Low Confidence (0-4)
- Generic manual or marketing material
- Missing technical specifications
- Use as starting point only

## Sample Test Data

### Sample 1: ABB Terra AC
```
Manufacturer: ABB
Model: Terra AC Wallbox
Power: 22kW
Protocol: OCPP 1.6J
Charge Point ID: CP_ABB_001
Connector: Type 2
```

### Sample 2: Schneider EVlink
```
Manufacturer: Schneider Electric
Model: EVlink Wallbox
Power: 7.4-22kW
Protocol: Modbus TCP
IP: 192.168.1.100
Port: 502
Unit ID: 1
```

### Sample 3: Webasto Pure
```
Manufacturer: Webasto
Model: Pure
Power: 11kW
Protocol: MQTT
Topics:
  - Status: charger/webasto/status
  - Power: charger/webasto/power
  - Control: charger/webasto/control
```

## Frontend Development Testing

If you're running the frontend in development mode:

```bash
cd frontend
npm run dev
```

Access at: http://localhost:5173

The AI modal should:
1. Open when clicking "AI Setup" button
2. Show file upload area with drag-and-drop
3. Display processing animation during AI analysis
4. Show confidence card with color-coded score
5. Allow editing of extracted values
6. Support protocol-specific fields
7. Create station successfully

## Integration Test Workflow

Complete end-to-end test:

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Configure AI provider** (choose one option from above)

3. **Create test manual file** (use sample above)

4. **Open web UI** → Stations page

5. **Click "AI Setup"**

6. **Upload manual**

7. **Wait for AI processing** (5-30 seconds depending on provider)

8. **Review confidence score and findings**

9. **Edit configuration** if needed
   - Update station name
   - Set zone
   - Verify power limits

10. **Click "Create Station"**

11. **Verify station appears** in station list

12. **Check station details** are correct

## Success Criteria

✅ AI modal opens without errors
✅ File upload works
✅ Processing animation displays
✅ AI returns extracted configuration
✅ Confidence score calculated correctly
✅ All form fields editable
✅ Protocol-specific fields show based on detected protocol
✅ Station created successfully
✅ Station appears in list with correct details

## Performance Benchmarks

| Provider | Typical Time | Cost per Manual |
|----------|--------------|-----------------|
| OpenAI GPT-4 | 3-8 seconds | ~$0.01 |
| Anthropic Claude | 4-10 seconds | ~$0.015 |
| Ollama (local) | 10-30 seconds | Free |

## Next Steps After Testing

1. Test with real charging station manuals
2. Fine-tune confidence scoring thresholds
3. Add support for image OCR (future enhancement)
4. Create manual templates for common manufacturers
5. Build learning system to improve accuracy

## Getting Help

If you encounter issues:

1. Check backend logs: `docker-compose logs -f backend`
2. Check browser console for frontend errors
3. Verify AI provider configuration
4. Test with the API endpoints first
5. Try the simple text parsing endpoint before file upload
6. Review the [AI_CONFIG_GUIDE.md](AI_CONFIG_GUIDE.md) for detailed documentation

---

**Happy Testing!** The AI configuration parser is designed to save time, but always review the extracted values before deploying to production.
