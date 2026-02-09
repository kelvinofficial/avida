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
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import {
  Settings,
  Flag,
  Public,
  VpnKey,
  History,
  ExpandMore,
  Refresh,
  Save,
  Check,
  Close,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Visibility,
  VisibilityOff,
  Download,
  Undo,
  PlayArrow,
  Add,
  Edit,
  Search,
  HealthAndSafety,
  Approval,
  DangerousOutlined,
  Schedule,
  Cancel,
  Restore,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Types
type Environment = 'production' | 'staging' | 'sandbox' | 'development';

interface GlobalSettings {
  id?: string;
  platform_name: string;
  platform_tagline: string;
  default_currency: string;
  default_vat_percentage: number;
  commission_percentage: number;
  escrow_duration_days: number;
  max_listing_images: number;
  max_listing_price: number;
  default_listing_expiry_days: number;
  support_email: string;
  support_phone?: string;
  rate_limits: {
    api_requests_per_minute: number;
    api_requests_per_hour: number;
    listing_creates_per_day: number;
    message_sends_per_minute: number;
    login_attempts_per_hour: number;
  };
  notification_defaults: {
    push_enabled: boolean;
    email_enabled: boolean;
    sms_enabled: boolean;
    whatsapp_enabled: boolean;
  };
  version?: number;
  updated_at?: string;
}

interface FeatureFlag {
  id: string;
  feature_id: string;
  environment: string;
  enabled: boolean;
  scope: string;
  scope_value?: string;
  rollout_percentage: number;
  description?: string;
}

interface CountryConfig {
  id: string;
  country_code: string;
  country_name: string;
  enabled: boolean;
  currency_code: string;
  vat_rate: number;
  payment_methods: string[];
  mobile_money_providers: string[];
  transport_partners: string[];
  notification_channels: string[];
  timezone: string;
  phone_prefix: string;
}

interface APIKey {
  key_id: string;
  service_name: string;
  key_type: string;
  masked_value: string;
  environment: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
}

interface ConfigApproval {
  id: string;
  config_category: string;
  config_key: string;
  old_value: any;
  new_value: any;
  environment: string;
  requested_by: string;
  requested_at: string;
  status: string;
  change_notes: string;
  expires_at: string;
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  environment: string;
  checks: Record<string, boolean>;
  warnings: string[];
  last_check: string;
}

interface ScheduledDeployment {
  id: string;
  name: string;
  description?: string;
  environment: string;
  config_type: string;
  config_changes: Record<string, any>;
  scheduled_at: string;
  duration_hours?: number;
  status: string;
  enable_auto_rollback: boolean;
  rollback_on_error_rate: number;
  rollback_on_metric_drop: number;
  metric_to_monitor?: string;
  monitoring_period_minutes: number;
  original_values?: Record<string, any>;
  deployed_at?: string;
  rolled_back_at?: string;
  rollback_reason?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
}

const ENVIRONMENTS: Environment[] = ['production', 'staging', 'sandbox', 'development'];

const ENV_COLORS: Record<Environment, 'error' | 'warning' | 'info' | 'success'> = {
  production: 'error',
  staging: 'warning',
  sandbox: 'info',
  development: 'success',
};

const DEPLOYMENT_STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  pending: 'warning',
  active: 'success',
  completed: 'success',
  rolled_back: 'error',
  cancelled: 'default',
  failed: 'error',
};

export default function ConfigManagerPage() {
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState<Environment>('production');
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  const [processing, setProcessing] = useState(false);

  // Data states
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [countryConfigs, setCountryConfigs] = useState<CountryConfig[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ConfigApproval[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [scheduledDeployments, setScheduledDeployments] = useState<ScheduledDeployment[]>([]);

  // Dialog states
  const [editGlobalOpen, setEditGlobalOpen] = useState(false);
  const [editFeatureOpen, setEditFeatureOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureFlag | null>(null);
  const [editCountryOpen, setEditCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [showKeyValue, setShowKeyValue] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateResult, setSimulateResult] = useState<any>(null);

  // Temp edit states
  const [editedGlobal, setEditedGlobal] = useState<GlobalSettings | null>(null);
  const [newKeyData, setNewKeyData] = useState({ service_name: '', key_type: '', key_value: '' });

  // Fetch functions
  const fetchGlobalSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/global/${environment}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch global settings:', error);
    }
  }, [environment]);

  const fetchFeatureFlags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/features/${environment}`);
      if (response.ok) {
        const data = await response.json();
        setFeatureFlags(data);
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    }
  }, [environment]);

  const fetchCountryConfigs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/countries/${environment}`);
      if (response.ok) {
        const data = await response.json();
        setCountryConfigs(data);
      }
    } catch (error) {
      console.error('Failed to fetch country configs:', error);
    }
  }, [environment]);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/api-keys/${environment}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  }, [environment]);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/approvals/pending?environment=${environment}`);
      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    }
  }, [environment]);

  const fetchHealthCheck = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/health/${environment}`);
      if (response.ok) {
        const data = await response.json();
        setHealthCheck(data);
      }
    } catch (error) {
      console.error('Failed to fetch health check:', error);
    }
  }, [environment]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/audit-logs?environment=${environment}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  }, [environment]);

  // Initial load and environment change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchGlobalSettings(),
        fetchFeatureFlags(),
        fetchCountryConfigs(),
        fetchApiKeys(),
        fetchPendingApprovals(),
        fetchHealthCheck(),
        fetchAuditLogs(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchGlobalSettings, fetchFeatureFlags, fetchCountryConfigs, fetchApiKeys, fetchPendingApprovals, fetchHealthCheck, fetchAuditLogs]);

  // Save global settings
  const handleSaveGlobal = async () => {
    if (!editedGlobal) return;
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/config-manager/global/${environment}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: editedGlobal,
          updated_by: 'admin',
          change_notes: 'Updated from admin dashboard',
        }),
      });
      const data = await response.json();
      
      if (data.status === 'pending_approval') {
        setSnackbar({ open: true, message: `Critical change requires approval: ${data.message}`, severity: 'warning' });
        fetchPendingApprovals();
      } else {
        setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
        fetchGlobalSettings();
      }
      setEditGlobalOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    }
    setProcessing(false);
  };

  // Toggle feature flag
  const handleToggleFeature = async (feature: FeatureFlag) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/config-manager/features/${environment}/${feature.feature_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !feature.enabled,
          scope: feature.scope,
          scope_value: feature.scope_value,
          rollout_percentage: feature.rollout_percentage,
          updated_by: 'admin',
        }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: `${feature.feature_id} ${!feature.enabled ? 'enabled' : 'disabled'}`, severity: 'success' });
        fetchFeatureFlags();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to toggle feature', severity: 'error' });
    }
    setProcessing(false);
  };

  // Add API key
  const handleAddApiKey = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/config-manager/api-keys/${environment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: newKeyData.service_name,
          key_type: newKeyData.key_type,
          key_value: newKeyData.key_value,
          set_by: 'admin',
        }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: 'API key added successfully', severity: 'success' });
        fetchApiKeys();
        setAddKeyOpen(false);
        setNewKeyData({ service_name: '', key_type: '', key_value: '' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add API key', severity: 'error' });
    }
    setProcessing(false);
  };

  // Approve/reject config change
  const handleApproval = async (approvalId: string, approve: boolean, reason?: string) => {
    setProcessing(true);
    try {
      const url = approve
        ? `${API_BASE}/config-manager/approvals/${approvalId}/approve`
        : `${API_BASE}/config-manager/approvals/${approvalId}/reject`;
      
      const body = approve
        ? { approved_by: 'admin' }
        : { rejected_by: 'admin', reason: reason || 'Rejected by admin' };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: `Request ${approve ? 'approved' : 'rejected'}`, severity: 'success' });
        fetchPendingApprovals();
        fetchGlobalSettings();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.detail || 'Failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to process approval', severity: 'error' });
    }
    setProcessing(false);
  };

  // Export config
  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/config-manager/export/${environment}`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config_${environment}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'Config exported', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to export', severity: 'error' });
    }
  };

  // Simulate user experience
  const handleSimulate = async (countryCode: string, userRole: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/config-manager/simulate/${environment}?country_code=${countryCode}&user_role=${userRole}`);
      if (response.ok) {
        const data = await response.json();
        setSimulateResult(data);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to simulate', severity: 'error' });
    }
    setProcessing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box data-testid="config-manager-page">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Config & Environment Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage platform settings, feature flags, and configurations across environments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Environment</InputLabel>
            <Select
              value={environment}
              label="Environment"
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              {ENVIRONMENTS.map((env) => (
                <MenuItem key={env} value={env}>
                  <Chip label={env.toUpperCase()} size="small" color={ENV_COLORS[env]} sx={{ fontWeight: 600 }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Export
          </Button>
          <Button variant="outlined" startIcon={<PlayArrow />} onClick={() => setSimulateOpen(true)}>
            Simulate
          </Button>
        </Box>
      </Box>

      {/* Health Status & Pending Approvals */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          {healthCheck && (
            <Alert
              severity={healthCheck.status === 'healthy' ? 'success' : healthCheck.status === 'degraded' ? 'warning' : 'error'}
              icon={<HealthAndSafety />}
            >
              <Typography variant="body2" fontWeight={600}>
                Config Health: {healthCheck.status.toUpperCase()}
              </Typography>
              {healthCheck.warnings.length > 0 && (
                <Typography variant="caption" display="block">
                  Warnings: {healthCheck.warnings.join(', ')}
                </Typography>
              )}
            </Alert>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {pendingApprovals.length > 0 && (
            <Alert severity="warning" icon={<Approval />}>
              <Typography variant="body2" fontWeight={600}>
                {pendingApprovals.length} pending approval(s)
              </Typography>
              <Typography variant="caption">Click Approvals tab to review</Typography>
            </Alert>
          )}
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<Settings />} label="Global Settings" data-testid="tab-global" />
          <Tab icon={<Flag />} label="Feature Flags" data-testid="tab-features" />
          <Tab icon={<Public />} label="Countries" data-testid="tab-countries" />
          <Tab icon={<VpnKey />} label="API Keys" data-testid="tab-keys" />
          <Tab 
            icon={<Approval />} 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Approvals
                {pendingApprovals.length > 0 && (
                  <Chip label={pendingApprovals.length} size="small" color="warning" />
                )}
              </Box>
            } 
            data-testid="tab-approvals" 
          />
          <Tab icon={<History />} label="Audit Logs" data-testid="tab-audit" />
        </Tabs>
      </Paper>

      {/* Tab 0: Global Settings */}
      {tabValue === 0 && globalSettings && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Platform Settings</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={`v${globalSettings.version || 1}`} size="small" />
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => {
                    setEditedGlobal({ ...globalSettings });
                    setEditGlobalOpen(true);
                  }}
                >
                  Edit Settings
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>Basic Info</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Platform Name</Typography>
                      <Typography variant="body1">{globalSettings.platform_name}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Default Currency</Typography>
                      <Typography variant="body1">{globalSettings.default_currency}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Support Email</Typography>
                      <Typography variant="body1">{globalSettings.support_email}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Support Phone</Typography>
                      <Typography variant="body1">{globalSettings.support_phone || 'Not set'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Business Rules */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main' }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    <DangerousOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                    Critical Business Rules
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Commission %</Typography>
                      <Typography variant="h6">{globalSettings.commission_percentage}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Default VAT %</Typography>
                      <Typography variant="h6">{globalSettings.default_vat_percentage}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Escrow Duration</Typography>
                      <Typography variant="h6">{globalSettings.escrow_duration_days} days</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Listing Expiry</Typography>
                      <Typography variant="h6">{globalSettings.default_listing_expiry_days} days</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Rate Limits */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>Rate Limits</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption">API/min: {globalSettings.rate_limits?.api_requests_per_minute}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">API/hour: {globalSettings.rate_limits?.api_requests_per_hour}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Listings/day: {globalSettings.rate_limits?.listing_creates_per_day}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Messages/min: {globalSettings.rate_limits?.message_sends_per_minute}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Notification Defaults */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>Notification Defaults</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label="Push" 
                      size="small" 
                      color={globalSettings.notification_defaults?.push_enabled ? 'success' : 'default'} 
                    />
                    <Chip 
                      label="Email" 
                      size="small" 
                      color={globalSettings.notification_defaults?.email_enabled ? 'success' : 'default'} 
                    />
                    <Chip 
                      label="SMS" 
                      size="small" 
                      color={globalSettings.notification_defaults?.sms_enabled ? 'success' : 'default'} 
                    />
                    <Chip 
                      label="WhatsApp" 
                      size="small" 
                      color={globalSettings.notification_defaults?.whatsapp_enabled ? 'success' : 'default'} 
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {globalSettings.updated_at && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Last updated: {formatDate(globalSettings.updated_at)}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Feature Flags */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Feature Flags ({featureFlags.length})</Typography>
              <IconButton onClick={fetchFeatureFlags}>
                <Refresh />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              {featureFlags.map((flag) => (
                <Grid item xs={12} sm={6} md={4} key={flag.id}>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      borderColor: flag.enabled ? 'success.main' : 'grey.300',
                      opacity: flag.enabled ? 1 : 0.7
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {flag.feature_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {flag.description || flag.feature_id}
                        </Typography>
                        {flag.rollout_percentage < 100 && (
                          <Chip label={`${flag.rollout_percentage}% rollout`} size="small" sx={{ mt: 0.5 }} />
                        )}
                      </Box>
                      <Switch
                        checked={flag.enabled}
                        onChange={() => handleToggleFeature(flag)}
                        disabled={processing}
                        color="success"
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Countries */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Country Configurations ({countryConfigs.length})</Typography>
              <Button variant="contained" startIcon={<Add />}>
                Add Country
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Country</TableCell>
                    <TableCell>Currency</TableCell>
                    <TableCell>VAT %</TableCell>
                    <TableCell>Payment Methods</TableCell>
                    <TableCell>Mobile Money</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {countryConfigs.map((country) => (
                    <TableRow key={country.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{country.country_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{country.country_code}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{country.currency_code}</TableCell>
                      <TableCell>{country.vat_rate}%</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {country.payment_methods.slice(0, 2).map((m) => (
                            <Chip key={m} label={m} size="small" variant="outlined" />
                          ))}
                          {country.payment_methods.length > 2 && (
                            <Chip label={`+${country.payment_methods.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {country.mobile_money_providers.slice(0, 2).map((m) => (
                            <Chip key={m} label={m} size="small" variant="outlined" />
                          ))}
                          {country.mobile_money_providers.length > 2 && (
                            <Chip label={`+${country.mobile_money_providers.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={country.enabled ? 'Active' : 'Disabled'}
                          size="small"
                          color={country.enabled ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: API Keys */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">API Keys</Typography>
                <Typography variant="caption" color="text.secondary">
                  Securely manage payment, SMS, and AI service credentials
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<Add />} onClick={() => setAddKeyOpen(true)}>
                Add Key
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mb: 2 }}>
              API keys are sensitive. Only Super Admins can view or modify credentials.
            </Alert>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Key Type</TableCell>
                    <TableCell>Value (Masked)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.key_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{key.service_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={key.key_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {key.masked_value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={key.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={key.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(key.created_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error">
                            <Close />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">No API keys configured</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Approvals */}
      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pending Approvals</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Critical config changes require approval from another admin
            </Typography>

            {pendingApprovals.length === 0 ? (
              <Alert severity="success">No pending approvals</Alert>
            ) : (
              <List>
                {pendingApprovals.map((approval) => (
                  <Paper key={approval.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {approval.config_category} / {approval.config_key}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Requested by: {approval.requested_by} on {formatDate(approval.requested_at)}
                        </Typography>
                        <Typography variant="caption" color="warning.main">
                          Expires: {formatDate(approval.expires_at)}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">Change:</Typography>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 12 }}>
                            {JSON.stringify(approval.old_value)} → {JSON.stringify(approval.new_value)}
                          </Typography>
                        </Box>
                        {approval.change_notes && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Notes: {approval.change_notes}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<Check />}
                          onClick={() => handleApproval(approval.id, true)}
                          disabled={processing}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Close />}
                          onClick={() => handleApproval(approval.id, false, 'Rejected by admin')}
                          disabled={processing}
                        >
                          Reject
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Audit Logs */}
      {tabValue === 5 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Audit Logs</Typography>
              <IconButton onClick={fetchAuditLogs}>
                <Refresh />
              </IconButton>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Config Key</TableCell>
                    <TableCell>Performed By</TableCell>
                    <TableCell>Changes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="caption">{formatDate(log.timestamp)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{log.category}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 12 }}>
                          {log.config_key}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.performed_by}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: 10 }}>
                          {JSON.stringify(log.old_value)?.slice(0, 30)} → {JSON.stringify(log.new_value)?.slice(0, 30)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Edit Global Settings Dialog */}
      <Dialog open={editGlobalOpen} onClose={() => setEditGlobalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Global Settings</DialogTitle>
        <DialogContent>
          {editedGlobal && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Platform Name"
                  value={editedGlobal.platform_name}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, platform_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Currency"
                  value={editedGlobal.default_currency}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, default_currency: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Changes to these fields require approval from another admin
                </Alert>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Commission %"
                  type="number"
                  value={editedGlobal.commission_percentage}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, commission_percentage: parseFloat(e.target.value) })}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Default VAT %"
                  type="number"
                  value={editedGlobal.default_vat_percentage}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, default_vat_percentage: parseFloat(e.target.value) })}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Escrow Duration"
                  type="number"
                  value={editedGlobal.escrow_duration_days}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, escrow_duration_days: parseInt(e.target.value) })}
                  InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Support Email"
                  value={editedGlobal.support_email}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, support_email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Support Phone"
                  value={editedGlobal.support_phone || ''}
                  onChange={(e) => setEditedGlobal({ ...editedGlobal, support_phone: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditGlobalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveGlobal} disabled={processing}>
            {processing ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add API Key Dialog */}
      <Dialog open={addKeyOpen} onClose={() => setAddKeyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add API Key</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Service</InputLabel>
                <Select
                  value={newKeyData.service_name}
                  label="Service"
                  onChange={(e) => setNewKeyData({ ...newKeyData, service_name: e.target.value })}
                >
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                  <MenuItem value="mpesa">M-Pesa</MenuItem>
                  <MenuItem value="twilio">Twilio</MenuItem>
                  <MenuItem value="sendgrid">SendGrid</MenuItem>
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="firebase">Firebase</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Key Type</InputLabel>
                <Select
                  value={newKeyData.key_type}
                  label="Key Type"
                  onChange={(e) => setNewKeyData({ ...newKeyData, key_type: e.target.value })}
                >
                  <MenuItem value="api_key">API Key</MenuItem>
                  <MenuItem value="secret_key">Secret Key</MenuItem>
                  <MenuItem value="webhook_secret">Webhook Secret</MenuItem>
                  <MenuItem value="access_token">Access Token</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Key Value"
                type={showKeyValue ? 'text' : 'password'}
                value={newKeyData.key_value}
                onChange={(e) => setNewKeyData({ ...newKeyData, key_value: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowKeyValue(!showKeyValue)}>
                        {showKeyValue ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddKeyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddApiKey}
            disabled={processing || !newKeyData.service_name || !newKeyData.key_type || !newKeyData.key_value}
          >
            {processing ? <CircularProgress size={20} /> : 'Add Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Simulate Dialog */}
      <Dialog open={simulateOpen} onClose={() => setSimulateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Simulate User Experience</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Country</InputLabel>
                <Select label="Country" defaultValue="KE">
                  {countryConfigs.map((c) => (
                    <MenuItem key={c.country_code} value={c.country_code}>
                      {c.country_name} ({c.country_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>User Role</InputLabel>
                <Select label="User Role" defaultValue="user">
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="seller">Seller</MenuItem>
                  <MenuItem value="verified_seller">Verified Seller</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={() => handleSimulate('KE', 'seller')}>
                Run Simulation
              </Button>
            </Grid>
            {simulateResult && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Simulation Result</Typography>
                  <pre style={{ fontSize: 11, overflow: 'auto' }}>
                    {JSON.stringify(simulateResult, null, 2)}
                  </pre>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulateOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
