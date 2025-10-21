import { useState } from 'react';
import Icons from './Icons';

const AIMeterUploadModal = ({ isOpen, onClose, onMeterCreated }) => {
  const [step, setStep] = useState('upload'); // upload, processing, review
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

      const response = await fetch('http://localhost:3000/api/ai-meter/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to parse manual');
      }

      setAiResponse(result.data);
      setEditedConfig({ ...result.data.meterConfig });
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

  const handleRegisterChange = (register, value) => {
    setEditedConfig(prev => ({
      ...prev,
      communication: {
        ...prev.communication,
        registers: {
          ...prev.communication.registers,
          [register]: parseInt(value)
        }
      }
    }));
  };

  const handleFinalize = async () => {
    try {
      setIsUploading(true);

      // Create the meter directly
      const response = await fetch('http://localhost:3000/api/energy-meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedConfig)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create meter');
      }

      onMeterCreated(result.data);
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
          <h2>AI-Powered Meter Setup</h2>
          <button className="icon-btn" onClick={handleClose}>
            <Icons.X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="ai-upload-section">
              <div className="upload-area">
                <Icons.Upload size={48} className="upload-icon" />
                <h3>Upload Energy Meter Manual</h3>
                <p>Upload a PDF, text file, or image of the meter's technical documentation</p>

                <input
                  type="file"
                  id="meter-manual-upload"
                  accept=".pdf,.txt,.jpg,.jpeg,.png,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <label htmlFor="meter-manual-upload" className="btn btn-primary">
                  <Icons.FileText size={20} />
                  Select File
                </label>

                {selectedFile && (
                  <div className="selected-file">
                    <Icons.CheckCircle size={20} className="text-success" />
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
                </div>

                {error && (
                  <div className="alert alert-danger">
                    <Icons.AlertCircle size={20} />
                    {error}
                  </div>
                )}
              </div>

              <div className="upload-tips">
                <h4>
                  <Icons.Info size={20} />
                  Tips for best results
                </h4>
                <ul>
                  <li>Upload technical specifications or communication protocol sections</li>
                  <li>Ensure Modbus register tables are clearly visible</li>
                  <li>Include manufacturer and model information</li>
                  <li>Higher resolution images work better</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="ai-processing">
              <Icons.Loader size={64} className="spinner" />
              <h3>Analyzing Manual...</h3>
              <p>Our AI is extracting meter configuration from your document</p>
              <div className="processing-steps">
                <div className="step active">
                  <Icons.CheckCircle size={20} />
                  Document uploaded
                </div>
                <div className="step active">
                  <Icons.Loader size={20} className="spinner-sm" />
                  Extracting text and images
                </div>
                <div className="step">
                  <Icons.Sparkles size={20} />
                  Identifying Modbus registers
                </div>
                <div className="step">
                  <Icons.Settings size={20} />
                  Generating configuration
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review Configuration */}
          {step === 'review' && aiResponse && (
            <div className="ai-review">
              <div className="confidence-summary">
                <h3>
                  <Icons.Sparkles size={24} />
                  AI Configuration Extracted
                </h3>
                <div className={`badge badge-${getConfidenceColor(aiResponse.confidence.overall)}`}>
                  {aiResponse.confidence.overall.toUpperCase()} Confidence
                </div>
              </div>

              {aiResponse.confidence.overall !== 'high' && (
                <div className="alert alert-warning">
                  <Icons.AlertCircle size={20} />
                  Please review and verify the extracted values below
                </div>
              )}

              <div className="config-review-grid">
                {/* Basic Information */}
                <div className="config-section">
                  <h4>Basic Information</h4>
                  <div className="form-group">
                    <label className="form-label">Meter Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editedConfig.name || ''}
                      onChange={(e) => handleConfigChange('name', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Protocol</label>
                    <select
                      className="form-input"
                      value={editedConfig.protocol || 'modbus'}
                      onChange={(e) => handleConfigChange('protocol', e.target.value)}
                    >
                      <option value="modbus">Modbus TCP/RTU</option>
                      <option value="mqtt">MQTT</option>
                      <option value="http">HTTP</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Meter Type</label>
                    <select
                      className="form-input"
                      value={editedConfig.meterType || 'building'}
                      onChange={(e) => handleConfigChange('meterType', e.target.value)}
                    >
                      <option value="building">Building Consumption</option>
                      <option value="grid">Grid Connection</option>
                      <option value="solar">Solar Production</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Poll Interval (ms)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editedConfig.pollInterval || 5000}
                      onChange={(e) => handleConfigChange('pollInterval', parseInt(e.target.value))}
                      min="1000"
                      step="1000"
                    />
                  </div>
                </div>

                {/* Modbus Configuration */}
                {editedConfig.protocol === 'modbus' && editedConfig.communication && (
                  <div className="config-section">
                    <h4>Modbus Connection</h4>
                    <div className="form-group">
                      <label className="form-label">Host/IP Address</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editedConfig.communication.host || ''}
                        onChange={(e) => handleNestedConfigChange('communication', 'host', e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Port</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.port || 502}
                          onChange={(e) => handleNestedConfigChange('communication', 'port', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Unit ID</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.unitId || 1}
                          onChange={(e) => handleNestedConfigChange('communication', 'unitId', parseInt(e.target.value))}
                          min="1"
                          max="247"
                        />
                      </div>
                    </div>

                    <h5 style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600 }}>
                      Register Addresses
                    </h5>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Power (W)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.registers?.power || 0}
                          onChange={(e) => handleRegisterChange('power', e.target.value)}
                          min="0"
                        />
                        {aiResponse.confidence.fields?.power && (
                          <small className={`text-${getConfidenceColor(aiResponse.confidence.fields.power)}`}>
                            {aiResponse.confidence.fields.power} confidence
                          </small>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Voltage (V)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.registers?.voltage || 0}
                          onChange={(e) => handleRegisterChange('voltage', e.target.value)}
                          min="0"
                        />
                        {aiResponse.confidence.fields?.voltage && (
                          <small className={`text-${getConfidenceColor(aiResponse.confidence.fields.voltage)}`}>
                            {aiResponse.confidence.fields.voltage} confidence
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Current (A)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.registers?.current || 0}
                          onChange={(e) => handleRegisterChange('current', e.target.value)}
                          min="0"
                        />
                        {aiResponse.confidence.fields?.current && (
                          <small className={`text-${getConfidenceColor(aiResponse.confidence.fields.current)}`}>
                            {aiResponse.confidence.fields.current} confidence
                          </small>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Energy (Wh)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editedConfig.communication.registers?.totalEnergy || 0}
                          onChange={(e) => handleRegisterChange('totalEnergy', e.target.value)}
                          min="0"
                        />
                        {aiResponse.confidence.fields?.energy && (
                          <small className={`text-${getConfidenceColor(aiResponse.confidence.fields.energy)}`}>
                            {aiResponse.confidence.fields.energy} confidence
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Extracted Information Display */}
              {aiResponse.extracted && (
                <div className="extracted-info">
                  <h4>
                    <Icons.Eye size={20} />
                    Extracted Information
                  </h4>
                  <div className="info-grid">
                    {aiResponse.extracted.manufacturer && (
                      <div className="info-item">
                        <span className="info-label">Manufacturer:</span>
                        <span className="info-value">{aiResponse.extracted.manufacturer}</span>
                      </div>
                    )}
                    {aiResponse.extracted.model && (
                      <div className="info-item">
                        <span className="info-label">Model:</span>
                        <span className="info-value">{aiResponse.extracted.model}</span>
                      </div>
                    )}
                    {aiResponse.extracted.protocol && (
                      <div className="info-item">
                        <span className="info-label">Protocol:</span>
                        <span className="info-value">{aiResponse.extracted.protocol}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  <Icons.AlertCircle size={20} />
                  {error}
                </div>
              )}
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
                <Icons.Sparkles size={20} />
                Analyze with AI
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
              <button className="btn btn-secondary" onClick={() => setStep('upload')}>
                <Icons.Upload size={20} />
                Upload Different File
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={isUploading}
              >
                <Icons.CheckCircle size={20} />
                {isUploading ? 'Creating...' : 'Create Meter'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMeterUploadModal;
