'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import {
  Settings,
  Add,
  Edit,
  Delete,
  Refresh,
  Check,
  Close,
  Visibility,
  VisibilityOff,
  Send,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  HelpOutline,
  ExpandMore,
  ContentCopy,
  PlayArrow,
  Message,
  Mail,
  CreditCard,
  BarChart,
  Memory,
  Notifications,
  LocalShipping,
  Link as LinkIcon,
  Security,
  History,
  Speed,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Types
interface Integration {
  provider_id: string;
  name: string;
  category: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
  supports_test: boolean;
  icon: string;
  enabled: boolean;
  status: string;
  configured: boolean;
  last_checked?: string;
  last_error?: string;
  credentials_masked?: Record<string, string>;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  direction: string;
  url: string;
  method: string;
  status: string;
  response_status?: number;
  error_message?: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  provider_id?: string;
  environment: string;
  changes: Record<string, any>;
  performed_by: string;
  performed_at: string;
}

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  connected: 'success',
  error: 'error',
  disabled: 'warning',
  not_configured: 'default',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  connected: <CheckCircle color="success" />,
  error: <ErrorIcon color="error" />,
  disabled: <Warning color="warning" />,
  not_configured: <HelpOutline color="disabled" />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  messaging: <Message />,
  email: <Mail />,
  payments: <CreditCard />,
  analytics: <BarChart />,
  ai_services: <Memory />,
  push_notifications: <Notifications />,
  other: <LocalShipping />,
};

const CATEGORY_NAMES: Record<string, string> = {
  messaging: 'Messaging & Notifications',
  email: 'Email & Marketing',
  payments: 'Payments',
  analytics: 'Analytics',
  ai_services: 'AI Services',
  push_notifications: 'Push Notifications',
  other: 'Other APIs',
};

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [environment, setEnvironment] = useState<'production' | 'sandbox' | 'staging'>('production');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  // Form state
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, any>>({});

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/integrations/list/${environment}`);
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      setSnackbar({ open: true, message: 'Failed to load integrations', severity: 'error' });
    }
  }, [environment]);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/integrations/health/${environment}`);
      const data = await response.json();
      setHealthData(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  }, [environment]);

  const fetchWebhookLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/integrations/webhooks/logs?environment=${environment}&limit=50`);
      const data = await response.json();
      setWebhookLogs(data);
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    }
  }, [environment]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/integrations/audit?environment=${environment}&limit=50`);
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  }, [environment]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchIntegrations(), fetchHealth(), fetchWebhookLogs(), fetchAuditLogs()]);
      setLoading(false);
    };
    loadData();
  }, [fetchIntegrations, fetchHealth, fetchWebhookLogs, fetchAuditLogs]);

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setCredentials({});
    setSettings({});
    setConfigDialogOpen(true);
  };

  const handleSaveConfiguration = async () => {
    if (!selectedIntegration) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/config/${environment}/${selectedIntegration.provider_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials,
          settings,
          enabled: true,
          configured_by: 'admin',
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save');
      }
      
      setSnackbar({ open: true, message: 'Integration configured successfully', severity: 'success' });
      setConfigDialogOpen(false);
      await fetchIntegrations();
      await fetchHealth();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to configure integration', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntegration = async (integration: Integration) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/config/${environment}/${integration.provider_id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !integration.enabled,
          toggled_by: 'admin',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to toggle');
      
      setSnackbar({
        open: true,
        message: `${integration.name} ${!integration.enabled ? 'enabled' : 'disabled'}`,
        severity: 'success',
      });
      await fetchIntegrations();
      await fetchHealth();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to toggle integration', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/config/${environment}/${integration.provider_id}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        setSnackbar({ open: true, message: `Connection successful: ${result.message}`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `Connection failed: ${result.message}`, severity: 'error' });
      }
      
      await fetchIntegrations();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to test connection', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntegration = async (integration: Integration) => {
    if (!confirm(`Are you sure you want to delete ${integration.name} configuration?`)) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/integrations/config/${environment}/${integration.provider_id}?deleted_by=admin`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      setSnackbar({ open: true, message: 'Integration deleted', severity: 'success' });
      await fetchIntegrations();
      await fetchHealth();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete integration', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Group integrations by category
  const groupedIntegrations = integrations.reduce((acc, integration) => {
    const category = integration.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinkIcon color="primary" />
            API Integrations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage third-party API connections with encrypted credentials
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={environment}
            exclusive
            onChange={(_, value) => value && setEnvironment(value)}
            size="small"
          >
            <ToggleButton value="production">
              <Chip label="Production" size="small" color={environment === 'production' ? 'success' : 'default'} />
            </ToggleButton>
            <ToggleButton value="sandbox">
              <Chip label="Sandbox" size="small" color={environment === 'sandbox' ? 'warning' : 'default'} />
            </ToggleButton>
            <ToggleButton value="staging">
              <Chip label="Staging" size="small" color={environment === 'staging' ? 'info' : 'default'} />
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={() => { fetchIntegrations(); fetchHealth(); }}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Health Summary */}
      {healthData && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="h4" fontWeight={700}>{healthData.connected}</Typography>
              <Typography variant="body2">Connected</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
              <Typography variant="h4" fontWeight={700}>{healthData.error}</Typography>
              <Typography variant="body2">Error</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <Typography variant="h4" fontWeight={700}>{healthData.disabled}</Typography>
              <Typography variant="body2">Disabled</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.200' }}>
              <Typography variant="h4" fontWeight={700}>{healthData.not_configured}</Typography>
              <Typography variant="body2">Not Configured</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<LinkIcon />} label="Integrations" />
        <Tab icon={<Speed />} label="Webhooks" />
        <Tab icon={<History />} label="Audit Log" />
      </Tabs>

      {/* Integrations Tab */}
      {tabValue === 0 && (
        <Box>
          {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
            <Accordion key={category} defaultExpanded={category === 'messaging' || category === 'email'}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {CATEGORY_ICONS[category]}
                  <Typography variant="h6">{CATEGORY_NAMES[category] || category}</Typography>
                  <Chip
                    label={`${categoryIntegrations.filter(i => i.status === 'connected').length}/${categoryIntegrations.length}`}
                    size="small"
                    color={categoryIntegrations.some(i => i.status === 'connected') ? 'success' : 'default'}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {categoryIntegrations.map((integration) => (
                    <Grid item xs={12} sm={6} md={4} key={integration.provider_id}>
                      <Card
                        sx={{
                          height: '100%',
                          borderLeft: `4px solid ${
                            integration.status === 'connected' ? '#4caf50' :
                            integration.status === 'error' ? '#f44336' :
                            integration.status === 'disabled' ? '#ff9800' : '#e0e0e0'
                          }`,
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {integration.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {integration.description}
                              </Typography>
                            </Box>
                            <Tooltip title={integration.status.replace('_', ' ')}>
                              {STATUS_ICONS[integration.status] || <HelpOutline />}
                            </Tooltip>
                          </Box>
                          
                          <Divider sx={{ my: 1.5 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Chip
                              label={integration.status.replace('_', ' ')}
                              size="small"
                              color={STATUS_COLORS[integration.status]}
                              variant="outlined"
                            />
                            {integration.configured && (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={integration.enabled}
                                    onChange={() => handleToggleIntegration(integration)}
                                    size="small"
                                  />
                                }
                                label=""
                              />
                            )}
                          </Box>
                          
                          {integration.last_error && (
                            <Alert severity="error" sx={{ mb: 1, py: 0 }}>
                              <Typography variant="caption">{integration.last_error}</Typography>
                            </Alert>
                          )}
                          
                          {integration.credentials_masked && Object.keys(integration.credentials_masked).length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              {Object.entries(integration.credentials_masked).slice(0, 2).map(([key, value]) => (
                                <Typography key={key} variant="caption" display="block" color="text.secondary">
                                  {key}: {value}
                                </Typography>
                              ))}
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                              size="small"
                              variant={integration.configured ? 'outlined' : 'contained'}
                              startIcon={integration.configured ? <Edit /> : <Add />}
                              onClick={() => handleConfigureIntegration(integration)}
                            >
                              {integration.configured ? 'Edit' : 'Configure'}
                            </Button>
                            {integration.configured && integration.supports_test && (
                              <Tooltip title="Test Connection">
                                <IconButton
                                  size="small"
                                  onClick={() => handleTestConnection(integration)}
                                  disabled={saving}
                                >
                                  <PlayArrow fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {integration.configured && (
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteIntegration(integration)}
                                  disabled={saving}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Webhooks Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Webhook Logs</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Direction</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhookLogs.length > 0 ? webhookLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={log.direction} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.url}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          size="small"
                          color={log.status === 'success' ? 'success' : log.status === 'failed' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>{log.response_status || '-'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No webhook logs yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Audit Log Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Audit Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Changed By</TableCell>
                    <TableCell>Changes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.length > 0 ? auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.performed_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={log.action.replace('_', ' ')} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{log.provider_id || '-'}</TableCell>
                      <TableCell>{log.performed_by}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="caption" noWrap>
                          {JSON.stringify(log.changes).slice(0, 50)}...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No audit logs yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configure {selectedIntegration?.name}
          <Typography variant="body2" color="text.secondary">
            {selectedIntegration?.description}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Credentials are encrypted with AES-256 before storage. Only Super Admin can view/edit.
            </Typography>
          </Alert>
          
          {selectedIntegration?.required_fields.map((field) => (
            <TextField
              key={field}
              fullWidth
              label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              type={showSecrets[field] ? 'text' : 'password'}
              value={credentials[field] || ''}
              onChange={(e) => setCredentials({ ...credentials, [field]: e.target.value })}
              sx={{ mb: 2 }}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowSecrets({ ...showSecrets, [field]: !showSecrets[field] })}
                      edge="end"
                    >
                      {showSecrets[field] ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          ))}
          
          {selectedIntegration?.optional_fields && selectedIntegration.optional_fields.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Optional Fields
              </Typography>
              {selectedIntegration.optional_fields.map((field) => (
                <TextField
                  key={field}
                  fullWidth
                  label={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  type={showSecrets[field] ? 'text' : 'password'}
                  value={credentials[field] || ''}
                  onChange={(e) => setCredentials({ ...credentials, [field]: e.target.value })}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowSecrets({ ...showSecrets, [field]: !showSecrets[field] })}
                          edge="end"
                        >
                          {showSecrets[field] ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveConfiguration}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <Check />}
          >
            Save & Test Connection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
