'use client';

import { useState, useRef } from 'react';
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
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  InsertDriveFile,
  Download,
} from '@mui/icons-material';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{ imported: number; errors: string[]; total_errors: number }>;
  title: string;
  description: string;
  sampleHeaders: string[];
  entityName: string;
}

export default function CSVImportDialog({
  open,
  onClose,
  onImport,
  title,
  description,
  sampleHeaders,
  entityName,
}: CSVImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; total_errors: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const res = await onImport(selectedFile);
      setResult(res);
    } catch (err) {
      setResult({ imported: 0, errors: ['Import failed. Please try again.'], total_errors: 1 });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setResult(null);
    onClose();
  };

  const downloadSampleCSV = () => {
    const csvContent = sampleHeaders.join(',') + '\n' + 
      sampleHeaders.map((h, i) => `sample_${h}_${i + 1}`).join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entityName}_import_template.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        {/* Sample CSV Download */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={downloadSampleCSV}
          >
            Download Sample CSV Template
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Required columns: {sampleHeaders.join(', ')}
          </Typography>
        </Box>

        {/* File Drop Zone */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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

        {/* Import Progress */}
        {importing && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Importing {entityName}...
            </Typography>
          </Box>
        )}

        {/* Import Results */}
        {result && (
          <Box sx={{ mt: 3 }}>
            <Alert 
              severity={result.total_errors === 0 ? 'success' : result.imported > 0 ? 'warning' : 'error'}
              sx={{ mb: 2 }}
            >
              {result.imported > 0 
                ? `Successfully imported ${result.imported} ${entityName}${result.imported !== 1 ? 's' : ''}.`
                : `Import failed.`
              }
              {result.total_errors > 0 && ` ${result.total_errors} error(s) found.`}
            </Alert>

            {result.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Errors (showing first 10):
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                  {result.errors.slice(0, 10).map((error, i) => (
                    <ListItem key={i}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ErrorIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={error}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={!selectedFile || importing}
            startIcon={importing ? <CircularProgress size={16} /> : <CloudUpload />}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
