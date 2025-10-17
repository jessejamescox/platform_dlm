import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';

const AIUploadModal = ({ isOpen, onClose, onStationCreated }) => {
  const [step, setStep] = useState('upload'); // upload, processing, review, confirm
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const [aiResponse, setAiResponse] = useState(null);
  const [editedConfig, setEditedConfig] = useState(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, TXT, JPG, PNG, or DOCX');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setStep('processing');

    try {
      const formData = new FormData();
      formData.append('manual', selectedFile);

      const response = await fetch('http://localhost:3000/api/ai-config/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse manual');
      }

      setAiResponse(result.data);
      setEditedConfig({ ...result.data.stationConfig });
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setEditedConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedConfigChange = (parent, field, value) => {
    setEditedConfig(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleFinalize = async () => {
    try {
      setIsUploading(true);

      const response = await fetch('http://localhost:3000/api/ai-config/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted: aiResponse.extracted,
          userInput: editedConfig
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to finalize configuration');
      }

      // Create the station
      const stationResponse = await fetch('http://localhost:3000/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data)
      });

      const stationResult = await stationResponse.json();

      if (!stationResult.success) {
        throw new Error(stationResult.error || 'Failed to create station');
      }

      onStationCreated(stationResult.data);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setSelectedFile(null);
    setAiResponse(null);
    setEditedConfig(null);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI-Powered Station Setup</h2>
          <button className="icon-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="ai-upload-section">
              <div className="upload-area">
                <Upload size={48} className="upload-icon" />
                <h3>Upload Charging Station Manual</h3>
                <p>Upload a PDF, text file, or image of the station's technical documentation</p>

                <input
                  type="file"
                  id="manual-upload"
                  accept=".pdf,.txt,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <label htmlFor="manual-upload" className="btn btn-primary">
                  <FileText size={20} />
                  Select File
                </label>

                {selectedFile && (
                  <div className="selected-file">
                    <CheckCircle size={20} className="text-success" />
                    <span>{selectedFile.name}</span>
                    <span className="file-size">
                      ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                )}

                <div className="supported-formats">
                  <p><strong>Supported formats:</strong></p>
                  <ul>
                    <li>PDF documents (.pdf)</li>
                    <li>Text files (.txt)</li>
                    <li>Images (.jpg, .png)</li>
                    <li>Word documents (.docx)</li>
                  </ul>
                  <p className="text-muted">Maximum file size: 10MB</p>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="processing-section">
              <Loader size={48} className="spinner" />
              <h3>Analyzing Manual...</h3>
              <p>AI is extracting configuration parameters from your document</p>
              <div className="processing-steps">
                <div className="processing-step active">
                  <CheckCircle size={20} />
                  <span>Extracting text</span>
                </div>
                <div className="processing-step active">
                  <Loader size={20} className="spinner-small" />
                  <span>Analyzing with AI</span>
                </div>
                <div className="processing-step">
                  <span>Structuring configuration</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && aiResponse && (
            <div className="review-section">
              {/* Confidence Report */}
              <div className={`confidence-card confidence-${aiResponse.confidence.level}`}>
                <div className="confidence-header">
                  <h3>AI Confidence Score</h3>
                  <div className="confidence-score">
                    {aiResponse.confidence.score}/10
                  </div>
                </div>
                <div className="confidence-bar">
                  <div
                    className="confidence-progress"
                    style={{ width: `${aiResponse.confidence.percentage}%` }}
                  />
                </div>
                <span className={`badge badge-${getConfidenceColor(aiResponse.confidence.level)}`}>
                  {aiResponse.confidence.level.toUpperCase()} CONFIDENCE
                </span>

                <div className="confidence-findings">
                  <h4>Findings:</h4>
                  <ul>
                    {aiResponse.confidence.findings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                  <p className="recommendation">
                    <strong>Recommendation:</strong> {aiResponse.confidence.recommendation}
                  </p>
                </div>
              </div>

              {/* Extracted Configuration */}
              <div className="config-review">
                <h3>Extracted Configuration</h3>
                <p className="text-muted">Review and edit the AI-extracted values below</p>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Station Name</label>
                    <input
                      type="text"
                      value={editedConfig.name || ''}
                      onChange={(e) => handleConfigChange('name', e.target.value)}
                      placeholder="e.g., Station 01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Zone/Location</label>
                    <input
                      type="text"
                      value={editedConfig.zone || ''}
                      onChange={(e) => handleConfigChange('zone', e.target.value)}
                      placeholder="e.g., parking-lot-a"
                    />
                  </div>

                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={editedConfig.type || 'ac'}
                      onChange={(e) => handleConfigChange('type', e.target.value)}
                    >
                      <option value="ac">AC</option>
                      <option value="dc">DC</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Max Power (kW)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedConfig.maxPower || ''}
                      onChange={(e) => handleConfigChange('maxPower', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Min Power (kW)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editedConfig.minPower || ''}
                      onChange={(e) => handleConfigChange('minPower', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Protocol</label>
                    <select
                      value={editedConfig.protocol || 'ocpp'}
                      onChange={(e) => handleConfigChange('protocol', e.target.value)}
                    >
                      <option value="ocpp">OCPP</option>
                      <option value="modbus">Modbus</option>
                      <option value="mqtt">MQTT</option>
                    </select>
                  </div>
                </div>

                {/* Protocol-specific fields */}
                {editedConfig.protocol === 'ocpp' && editedConfig.communication && (
                  <div className="protocol-config">
                    <h4>OCPP Configuration</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Charge Point ID</label>
                        <input
                          type="text"
                          value={editedConfig.communication.chargePointId || ''}
                          onChange={(e) => handleNestedConfigChange('communication', 'chargePointId', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Connector ID</label>
                        <input
                          type="number"
                          value={editedConfig.communication.connectorId || 1}
                          onChange={(e) => handleNestedConfigChange('communication', 'connectorId', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="form-group">
                        <label>OCPP Version</label>
                        <input
                          type="text"
                          value={editedConfig.communication.ocppVersion || ''}
                          onChange={(e) => handleNestedConfigChange('communication', 'ocppVersion', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Raw extracted data (collapsible) */}
                <details className="raw-data">
                  <summary>View Raw Extracted Data</summary>
                  <pre>{JSON.stringify(aiResponse.extracted, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}

          {error && step === 'review' && (
            <div className="alert alert-danger">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'upload' && (
            <>
              <button className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Processing...' : 'Analyze Manual'}
              </button>
            </>
          )}

          {step === 'processing' && (
            <button className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          )}

          {step === 'review' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setStep('upload')}
              >
                Back
              </button>
              <button
                className="btn btn-success"
                onClick={handleFinalize}
                disabled={isUploading}
              >
                {isUploading ? 'Creating Station...' : 'Create Station'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIUploadModal;
