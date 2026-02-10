'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Download,
  Warning,
  PlayArrow,
  Description,
  PersonAdd,
} from '@mui/icons-material';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface JobResult {
  total_rows: number;
  valid_rows: number;
  imported: number;
  skipped: number;
  errors: ValidationError[];
  password_report_id?: string;
}

interface UserCSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  adminId: string;
}

const STEPS = ['Upload CSV', 'Validate', 'Import', 'Complete'];

export default function UserCSVImportDialog({
  open,
  onClose,
  onComplete,
  adminId,
}: UserCSVImportDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    validation_id: string;
    headers: string[];
    total_rows: number;
    preview: any[];
    truncated: boolean;
  } | null>(null);
  
  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    total_rows: number;
    error_count: number;
    errors: ValidationError[];
  } | null>(null);
  
  // Import state
  const [importing, setImporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<{
    status: string;
    progress: number;
    result?: JobResult;
    error?: string;
    password_report_id?: string;
  } | null>(null);
  
  const [error, setError] = useState('');

  // Poll job status
  useEffect(() => {
    if (jobId && importing) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/api/csv-import/job/${jobId}`);
          const data = await response.json();
          setJobStatus(data);
          
          if (data.status === 'completed' || data.status === 'failed') {
            setImporting(false);
            setActiveStep(3);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Failed to poll job status:', err);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [jobId, importing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch(
        `${API_URL}/api/csv-import/upload?admin_id=${adminId}`,
        { method: 'POST', body: formData }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Upload failed');
      }
      
      const data = await response.json();
      setUploadResult(data);
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!uploadResult?.validation_id) return;
    
    setValidating(true);
    setError('');
    
    try {
      const response = await fetch(
        `${API_URL}/api/csv-import/validate/${uploadResult.validation_id}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      setValidationResult(data);
      
      if (data.valid) {
        setActiveStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!uploadResult?.validation_id) return;
    
    setImporting(true);
    setError('');
    
    try {
      const response = await fetch(
        `${API_URL}/api/csv-import/import/${uploadResult.validation_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_id: adminId })
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail?.message || data.detail || 'Import failed');
      }
      
      const data = await response.json();
      setJobId(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setImporting(false);
    }
  };

  const handleDownloadPasswordReport = async () => {
    if (!jobStatus?.password_report_id && !jobStatus?.result?.password_report_id) return;
    
    const reportId = jobStatus.password_report_id || jobStatus.result?.password_report_id;
    window.open(
      `${API_URL}/api/csv-import/password-report/${reportId}/download?admin_id=${adminId}`,
      '_blank'
    );
  };

  const handleDownloadTemplate = () => {
    window.open(`${API_URL}/api/csv-import/template`, '_blank');
  };

  const handleClose = () => {
    // Reset all state
    setActiveStep(0);
    setSelectedFile(null);
    setUploadResult(null);
    setValidationResult(null);
    setJobId(null);
    setJobStatus(null);
    setError('');
    onClose();
    
    if (jobStatus?.status === 'completed' && (jobStatus?.result?.imported ?? 0) > 0) {
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a CSV file with user data. Required columns: <strong>email, first_name, last_name</strong>. 
              Optional: <strong>role</strong> (user/seller/admin).
            </Typography>

            {/* Template Download */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download />}
                onClick={handleDownloadTemplate}
              >
                Download CSV Template
              </Button>
            </Box>

            {/* File Drop Zone */}
            <Box
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" fontWeight={500}>
                {selectedFile ? selectedFile.name : 'Drop CSV file here or click to browse'}
              </Typography>
              {selectedFile && (
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Typography>
              )}
            </Box>

            {/* Important Notes */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Passwords will be auto-generated for each user. 
                You will receive a downloadable report with all passwords after import.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Preview and validate the uploaded data. All rows must pass validation before import can proceed.
            </Typography>

            {/* Upload Summary */}
            {uploadResult && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Found <strong>{uploadResult.total_rows}</strong> rows to import.
                {uploadResult.truncated && ' (File was truncated to 1000 rows maximum)'}
              </Alert>
            )}

            {/* Preview Table */}
            {uploadResult?.preview && uploadResult.preview.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Preview (first 5 rows):</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>First Name</TableCell>
                        <TableCell>Last Name</TableCell>
                        <TableCell>Role</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadResult.preview.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row._row_number || i + 2}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.first_name}</TableCell>
                          <TableCell>{row.last_name}</TableCell>
                          <TableCell>{row.role || 'user'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Validation Result */}
            {validationResult && (
              <Box sx={{ mb: 2 }}>
                {validationResult.valid ? (
                  <Alert severity="success" icon={<CheckCircle />}>
                    All {validationResult.total_rows} rows passed validation. Ready to import!
                  </Alert>
                ) : (
                  <Box>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Validation failed! Found {validationResult.error_count} error(s). 
                      Please fix the CSV file and upload again.
                    </Alert>
                    
                    <Typography variant="subtitle2" gutterBottom>Errors:</Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Field</TableCell>
                            <TableCell>Value</TableCell>
                            <TableCell>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validationResult.errors.slice(0, 20).map((err, i) => (
                            <TableRow key={i}>
                              <TableCell>{err.row}</TableCell>
                              <TableCell><Chip label={err.field} size="small" /></TableCell>
                              <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {err.value || '(empty)'}
                              </TableCell>
                              <TableCell sx={{ color: 'error.main' }}>{err.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {validationResult.errors.length > 20 && (
                      <Typography variant="caption" color="text.secondary">
                        Showing first 20 of {validationResult.errors.length} errors
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Validation Progress */}
            {validating && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <CircularProgress size={24} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Validating all rows...
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Validation passed! Click "Start Import" to create the users. 
              This will run in the background - you'll receive a notification when complete.
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
              <Typography variant="body2">
                <strong>Before proceeding:</strong> This will create {uploadResult?.total_rows || 0} new user accounts. 
                This action cannot be undone.
              </Typography>
            </Alert>

            {/* Import Progress */}
            {importing && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress 
                  variant={jobStatus?.progress ? 'determinate' : 'indeterminate'}
                  value={jobStatus?.progress || 0}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  {jobStatus?.progress ? `Importing... ${jobStatus.progress}%` : 'Starting import...'}
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            {jobStatus?.status === 'completed' && jobStatus.result ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircle />}>
                  <Typography variant="body1" fontWeight={500}>
                    Import Complete!
                  </Typography>
                  <Typography variant="body2">
                    Successfully created {jobStatus.result.imported} new user accounts.
                  </Typography>
                </Alert>

                {/* Password Report Download */}
                <Box sx={{ 
                  p: 3, 
                  bgcolor: 'primary.50', 
                  borderRadius: 2, 
                  border: '1px solid',
                  borderColor: 'primary.200',
                  textAlign: 'center',
                  mb: 2
                }}>
                  <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Password Report Ready
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Download the CSV file containing the auto-generated passwords for all new users.
                    This report expires in 24 hours.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={handleDownloadPasswordReport}
                    size="large"
                  >
                    Download Password Report
                  </Button>
                </Box>

                <Alert severity="info">
                  <Typography variant="body2">
                    Users will be required to change their password on first login.
                  </Typography>
                </Alert>
              </Box>
            ) : jobStatus?.status === 'failed' ? (
              <Alert severity="error">
                <Typography variant="body1" fontWeight={500}>Import Failed</Typography>
                <Typography variant="body2">
                  {jobStatus.error || 'An error occurred during import. Please try again.'}
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Processing...
                </Typography>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const getNextButtonProps = () => {
    switch (activeStep) {
      case 0:
        return {
          label: uploading ? 'Uploading...' : 'Upload & Preview',
          disabled: !selectedFile || uploading,
          onClick: handleUpload,
          loading: uploading,
        };
      case 1:
        if (validationResult?.valid) {
          return {
            label: 'Continue to Import',
            disabled: false,
            onClick: () => setActiveStep(2),
            loading: false,
          };
        }
        return {
          label: validating ? 'Validating...' : 'Validate Data',
          disabled: validating,
          onClick: handleValidate,
          loading: validating,
        };
      case 2:
        return {
          label: importing ? 'Importing...' : 'Start Import',
          disabled: importing,
          onClick: handleImport,
          loading: importing,
          icon: <PlayArrow />,
        };
      case 3:
        return {
          label: 'Done',
          disabled: false,
          onClick: handleClose,
          loading: false,
        };
      default:
        return { label: 'Next', disabled: true, onClick: () => {}, loading: false };
    }
  };

  const buttonProps = getNextButtonProps();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAdd color="primary" />
          Import Users from CSV
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        {activeStep < 3 && (
          <Button onClick={handleClose} disabled={uploading || validating || importing}>
            Cancel
          </Button>
        )}
        
        {/* Back button for validation step with errors */}
        {activeStep === 1 && validationResult && !validationResult.valid && (
          <Button onClick={() => {
            setActiveStep(0);
            setSelectedFile(null);
            setUploadResult(null);
            setValidationResult(null);
          }}>
            Upload New File
          </Button>
        )}
        
        <Button
          onClick={buttonProps.onClick}
          variant="contained"
          disabled={buttonProps.disabled}
          startIcon={buttonProps.loading ? <CircularProgress size={16} /> : buttonProps.icon}
        >
          {buttonProps.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
