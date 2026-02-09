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
  LinearProgress,
  Badge,
  InputAdornment,
  TablePagination,
} from '@mui/material';
import {
  Security,
  Assignment,
  Delete,
  Download,
  Refresh,
  Check,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Schedule,
  Person,
  Policy,
  Storage,
  NotificationImportant,
  History,
  Business,
  Visibility,
  VisibilityOff,
  Search,
  FilterList,
  Add,
  PlayArrow,
  DataUsage,
  PrivacyTip,
  GppGood,
  GppBad,
  AssignmentTurnedIn,
  Description,
  Science,
  Edit,
  Publish,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Types
interface DSARRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  request_type: string;
  status: string;
  regulation: string;
  data_categories: string[];
  reason?: string;
  submitted_at: string;
  deadline: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  days_until_deadline?: number;
  is_urgent?: boolean;
  is_overdue?: boolean;
}

interface ConsentRecord {
  category: string;
  granted: boolean;
  timestamp?: string;
  policy_version?: string;
}

interface RetentionPolicy {
  id: string;
  data_category: string;
  retention_days: number;
  country_code?: string;
  auto_purge: boolean;
  soft_delete: boolean;
  description?: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  affected_users: number;
  affected_data: string[];
  discovered_at: string;
  status: string;
  actions_taken: any[];
  notifications_sent: boolean;
  reported_to_authority: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  actor_role: string;
  target_user_id?: string;
  data_categories: string[];
  details: Record<string, any>;
  timestamp: string;
}

interface ThirdPartyProcessor {
  id: string;
  name: string;
  type: string;
  data_shared: string[];
  purpose: string;
  country: string;
  gdpr_compliant: boolean;
  dpa_signed: boolean;
}

interface Dashboard {
  dsar_summary: {
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
    total: number;
  };
  upcoming_deadlines: DSARRequest[];
  incidents: {
    open: number;
    critical: number;
  };
  recent_audit_activity: AuditLog[];
  risk_indicators: {
    overdue_requests: boolean;
    critical_incidents: boolean;
    high_pending_count: boolean;
  };
}

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  pending: 'warning',
  in_progress: 'info',
  approved: 'info',
  completed: 'success',
  rejected: 'error',
  expired: 'default',
};

const SEVERITY_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  low: 'info',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

const INCIDENT_STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  open: 'error',
  investigating: 'warning',
  mitigated: 'info',
  resolved: 'success',
  closed: 'default',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Data Access',
  export: 'Data Export',
  deletion: 'Data Deletion',
  rectification: 'Data Correction',
  restriction: 'Processing Restriction',
};

const DATA_CATEGORY_LABELS: Record<string, string> = {
  profile: 'Profile Data',
  listings: 'Listings',
  chats: 'Chat Messages',
  orders: 'Orders',
  payments: 'Payment Data',
  location: 'Location Data',
  device: 'Device Info',
  analytics: 'Analytics',
  notifications: 'Notifications',
  audit_logs: 'Audit Logs',
};

const CONSENT_CATEGORIES = [
  { id: 'marketing', label: 'Marketing Communications', description: 'Promotional emails and offers' },
  { id: 'analytics', label: 'Analytics & Insights', description: 'Usage tracking for improvements' },
  { id: 'notifications', label: 'Service Notifications', description: 'Transaction and system alerts' },
  { id: 'personalized_ads', label: 'Personalized Advertising', description: 'Targeted ads based on activity' },
  { id: 'third_party_sharing', label: 'Third-Party Data Sharing', description: 'Sharing with partner services' },
  { id: 'location_tracking', label: 'Location Tracking', description: 'Location-based features' },
];

const DEFAULT_RETENTION_POLICIES = [
  { data_category: 'profile', retention_days: 730, description: 'User profile data', auto_purge: false, soft_delete: true },
  { data_category: 'orders', retention_days: 1825, description: 'Order and transaction records (5 years for legal)', auto_purge: false, soft_delete: true },
  { data_category: 'payments', retention_days: 1825, description: 'Financial records (5 years for legal)', auto_purge: false, soft_delete: true },
  { data_category: 'chats', retention_days: 365, description: 'Chat messages', auto_purge: true, soft_delete: true },
  { data_category: 'analytics', retention_days: 365, description: 'Usage analytics data', auto_purge: true, soft_delete: false },
  { data_category: 'notifications', retention_days: 90, description: 'Notification history', auto_purge: true, soft_delete: false },
];

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  
  // Data states
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dsarRequests, setDsarRequests] = useState<DSARRequest[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [thirdPartyProcessors, setThirdPartyProcessors] = useState<ThirdPartyProcessor[]>([]);
  
  // Filter states
  const [dsarStatusFilter, setDsarStatusFilter] = useState<string>('');
  const [dsarTypeFilter, setDsarTypeFilter] = useState<string>('');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<string>('');
  
  // Dialog states
  const [dsarDetailOpen, setDsarDetailOpen] = useState(false);
  const [selectedDsar, setSelectedDsar] = useState<DSARRequest | null>(null);
  const [retentionDialogOpen, setRetentionDialogOpen] = useState(false);
  const [selectedRetention, setSelectedRetention] = useState<RetentionPolicy | null>(null);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentUserId, setConsentUserId] = useState('');
  const [userConsents, setUserConsents] = useState<Record<string, ConsentRecord>>({});
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Action states
  const [processing, setProcessing] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/compliance/dashboard`);
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, []);

  // Fetch DSAR requests
  const fetchDsarRequests = useCallback(async () => {
    try {
      let url = `${API_BASE}/compliance/dsar?limit=100`;
      if (dsarStatusFilter) url += `&status=${dsarStatusFilter}`;
      if (dsarTypeFilter) url += `&request_type=${dsarTypeFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setDsarRequests(data);
    } catch (error) {
      console.error('Failed to fetch DSAR requests:', error);
    }
  }, [dsarStatusFilter, dsarTypeFilter]);

  // Fetch retention policies
  const fetchRetentionPolicies = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/compliance/retention`);
      const data = await response.json();
      setRetentionPolicies(data);
    } catch (error) {
      console.error('Failed to fetch retention policies:', error);
    }
  }, []);

  // Fetch incidents
  const fetchIncidents = useCallback(async () => {
    try {
      let url = `${API_BASE}/compliance/incidents?limit=100`;
      if (incidentStatusFilter) url += `&status=${incidentStatusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  }, [incidentStatusFilter]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/compliance/audit?limit=100`);
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  }, []);

  // Fetch third-party processors
  const fetchThirdPartyProcessors = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/compliance/third-party`);
      const data = await response.json();
      setThirdPartyProcessors(data);
    } catch (error) {
      console.error('Failed to fetch third-party processors:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchDsarRequests(),
        fetchRetentionPolicies(),
        fetchIncidents(),
        fetchAuditLogs(),
        fetchThirdPartyProcessors(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchDsarRequests, fetchRetentionPolicies, fetchIncidents, fetchAuditLogs, fetchThirdPartyProcessors]);

  // Reload DSAR when filters change
  useEffect(() => {
    fetchDsarRequests();
  }, [fetchDsarRequests]);

  // Reload incidents when filter changes
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Update DSAR status
  const handleUpdateDsarStatus = async (requestId: string, status: string, notes?: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/dsar/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, processed_by: 'admin', notes }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: 'DSAR status updated', severity: 'success' });
        fetchDsarRequests();
        fetchDashboard();
        setDsarDetailOpen(false);
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
    setProcessing(false);
  };

  // Export user data
  const handleExportUserData = async (userId: string, format: 'json' | 'csv') => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/export/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_categories: ['profile', 'listings', 'chats', 'orders', 'notifications'],
          format,
          actor_id: 'admin',
        }),
      });
      const data = await response.json();
      
      // Download the data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_data_${userId}_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: 'Data exported successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to export data', severity: 'error' });
    }
    setProcessing(false);
  };

  // Delete/anonymize user data
  const handleDeleteUserData = async (userId: string, anonymize: boolean) => {
    if (!confirm(`Are you sure you want to ${anonymize ? 'anonymize' : 'delete'} data for user ${userId}? This action cannot be undone.`)) {
      return;
    }
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/delete/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymize, deleted_by: 'admin', reason: 'DSAR request' }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: `User data ${anonymize ? 'anonymized' : 'deleted'}`, severity: 'success' });
        fetchDashboard();
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to process deletion', severity: 'error' });
    }
    setProcessing(false);
  };

  // Save retention policy
  const handleSaveRetentionPolicy = async () => {
    if (!selectedRetention) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_category: selectedRetention.data_category,
          retention_days: selectedRetention.retention_days,
          country_code: selectedRetention.country_code || null,
          auto_purge: selectedRetention.auto_purge,
          soft_delete: selectedRetention.soft_delete,
          description: selectedRetention.description,
          set_by: 'admin',
        }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: 'Retention policy saved', severity: 'success' });
        fetchRetentionPolicies();
        setRetentionDialogOpen(false);
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save policy', severity: 'error' });
    }
    setProcessing(false);
  };

  // Run retention purge
  const handleRunRetentionPurge = async (dryRun: boolean) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/retention/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun }),
      });
      const data = await response.json();
      
      if (dryRun) {
        const totalAffected = data.results?.reduce((sum: number, r: any) => sum + r.affected_count, 0) || 0;
        setSnackbar({ open: true, message: `Dry run complete: ${totalAffected} records would be affected`, severity: 'info' });
      } else {
        setSnackbar({ open: true, message: 'Retention purge completed', severity: 'success' });
      }
      setPurgeDialogOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to run purge', severity: 'error' });
    }
    setProcessing(false);
  };

  // Fetch user consents
  const handleViewUserConsents = async () => {
    if (!consentUserId) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/consent/${consentUserId}`);
      const data = await response.json();
      setUserConsents(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to fetch consents', severity: 'error' });
    }
    setProcessing(false);
  };

  // Update incident
  const handleUpdateIncident = async (incidentId: string, updates: any) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, updated_by: 'admin' }),
      });
      if (response.ok) {
        setSnackbar({ open: true, message: 'Incident updated', severity: 'success' });
        fetchIncidents();
        fetchDashboard();
        setIncidentDialogOpen(false);
      } else {
        throw new Error('Failed');
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update incident', severity: 'error' });
    }
    setProcessing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box data-testid="compliance-page">
      {/* Header with stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Data Privacy & Compliance Center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage GDPR, African data protection laws, DSARs, consent, retention, and incidents
        </Typography>
      </Box>

      {/* Risk indicators */}
      {dashboard?.risk_indicators && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {dashboard.risk_indicators.overdue_requests && (
            <Alert severity="error" icon={<Warning />}>
              {dashboard.dsar_summary.overdue} overdue DSAR request(s) - action required
            </Alert>
          )}
          {dashboard.risk_indicators.critical_incidents && (
            <Alert severity="error" icon={<NotificationImportant />}>
              {dashboard.incidents.critical} critical incident(s) open
            </Alert>
          )}
          {dashboard.risk_indicators.high_pending_count && (
            <Alert severity="warning" icon={<Schedule />}>
              High volume of pending requests ({dashboard.dsar_summary.pending})
            </Alert>
          )}
          {!dashboard.risk_indicators.overdue_requests && !dashboard.risk_indicators.critical_incidents && (
            <Alert severity="success" icon={<GppGood />}>
              All compliance indicators healthy
            </Alert>
          )}
        </Box>
      )}

      {/* Dashboard Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {dashboard?.dsar_summary.pending || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pending DSARs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="info.main">
                {dashboard?.dsar_summary.in_progress || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">In Progress</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {dashboard?.dsar_summary.completed || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {dashboard?.dsar_summary.overdue || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Overdue</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {dashboard?.incidents.open || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Open Incidents</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight={700}>
                {thirdPartyProcessors.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">3rd Parties</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Assignment />} label="DSAR Requests" data-testid="tab-dsar" />
          <Tab icon={<Policy />} label="Consent Management" data-testid="tab-consent" />
          <Tab icon={<Storage />} label="Data Retention" data-testid="tab-retention" />
          <Tab icon={<NotificationImportant />} label="Incidents" data-testid="tab-incidents" />
          <Tab icon={<Business />} label="Third Parties" data-testid="tab-third-parties" />
          <Tab icon={<History />} label="Audit Logs" data-testid="tab-audit" />
        </Tabs>
      </Paper>

      {/* Tab 0: DSAR Requests */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data Subject Access Requests</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={dsarStatusFilter}
                    label="Status"
                    onChange={(e) => setDsarStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={dsarTypeFilter}
                    label="Type"
                    onChange={(e) => setDsarTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="access">Access</MenuItem>
                    <MenuItem value="export">Export</MenuItem>
                    <MenuItem value="deletion">Deletion</MenuItem>
                    <MenuItem value="rectification">Rectification</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={fetchDsarRequests}>
                  <Refresh />
                </IconButton>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Regulation</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Deadline</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dsarRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((request) => {
                    const daysLeft = getDaysUntilDeadline(request.deadline);
                    return (
                      <TableRow key={request.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {request.id.slice(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{request.user_name || 'N/A'}</Typography>
                            <Typography variant="caption" color="text.secondary">{request.user_email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={request.status.replace('_', ' ')}
                            size="small"
                            color={STATUS_COLORS[request.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{request.regulation.toUpperCase()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(request.submitted_at)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {daysLeft < 0 ? (
                              <Chip label={`${Math.abs(daysLeft)}d overdue`} size="small" color="error" />
                            ) : daysLeft <= 7 ? (
                              <Chip label={`${daysLeft}d left`} size="small" color="warning" />
                            ) : (
                              <Typography variant="body2">{daysLeft}d</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedDsar(request);
                                  setDsarDetailOpen(true);
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            {request.request_type === 'export' && (
                              <Tooltip title="Export Data">
                                <IconButton
                                  size="small"
                                  onClick={() => handleExportUserData(request.user_id, 'json')}
                                  disabled={processing}
                                >
                                  <Download />
                                </IconButton>
                              </Tooltip>
                            )}
                            {request.request_type === 'deletion' && request.status === 'approved' && (
                              <Tooltip title="Execute Deletion">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteUserData(request.user_id, true)}
                                  disabled={processing}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dsarRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">No DSAR requests found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={dsarRequests.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Consent Management */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Consent Management</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View and manage user consent preferences for data processing
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="User ID or Email"
                    value={consentUserId}
                    onChange={(e) => setConsentUserId(e.target.value)}
                    placeholder="Enter user ID to view consents"
                    size="small"
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    onClick={handleViewUserConsents}
                    disabled={!consentUserId || processing}
                    startIcon={<Search />}
                  >
                    Look Up
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {Object.keys(userConsents).length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Consent Status for: {consentUserId}
                </Typography>
                <List>
                  {CONSENT_CATEGORIES.map((cat) => {
                    const consent = userConsents[cat.id];
                    return (
                      <ListItem key={cat.id} divider>
                        <ListItemIcon>
                          {consent?.granted ? <CheckCircle color="success" /> : <Close color="disabled" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={cat.label}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">{cat.description}</Typography>
                              {consent?.timestamp && (
                                <Typography variant="caption" color="text.secondary">
                                  Last updated: {formatDate(consent.timestamp)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={consent?.granted ? 'Granted' : 'Not Granted'}
                          size="small"
                          color={consent?.granted ? 'success' : 'default'}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Consent Categories
            </Typography>
            <Grid container spacing={2}>
              {CONSENT_CATEGORIES.map((cat) => (
                <Grid item xs={12} sm={6} md={4} key={cat.id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2">{cat.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cat.description}
                    </Typography>
                    <Chip label={cat.id} size="small" sx={{ mt: 1 }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Data Retention */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">Data Retention Policies</Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure how long data is retained before automatic purging
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setPurgeDialogOpen(true)}
                >
                  Run Purge
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setSelectedRetention({
                      id: '',
                      data_category: '',
                      retention_days: 365,
                      auto_purge: true,
                      soft_delete: true,
                      description: '',
                    });
                    setRetentionDialogOpen(true);
                  }}
                >
                  Add Policy
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data Category</TableCell>
                    <TableCell>Retention Period</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Auto Purge</TableCell>
                    <TableCell>Soft Delete</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {retentionPolicies.map((policy) => (
                    <TableRow key={policy.id} hover>
                      <TableCell>
                        <Chip
                          label={DATA_CATEGORY_LABELS[policy.data_category] || policy.data_category}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {policy.retention_days} days ({Math.round(policy.retention_days / 365 * 10) / 10} years)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{policy.country_code || 'Global'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.auto_purge ? 'Yes' : 'No'}
                          size="small"
                          color={policy.auto_purge ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={policy.soft_delete ? 'Yes' : 'No'}
                          size="small"
                          color={policy.soft_delete ? 'info' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {policy.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRetention(policy);
                            setRetentionDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {retentionPolicies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">No retention policies configured</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Incidents */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Data Incidents & Breaches</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={incidentStatusFilter}
                    label="Status"
                    onChange={(e) => setIncidentStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="investigating">Investigating</MenuItem>
                    <MenuItem value="mitigated">Mitigated</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={fetchIncidents}>
                  <Refresh />
                </IconButton>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Affected Users</TableCell>
                    <TableCell>Data Types</TableCell>
                    <TableCell>Discovered</TableCell>
                    <TableCell>Notified</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {incident.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.severity.toUpperCase()}
                          size="small"
                          color={SEVERITY_COLORS[incident.severity]}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={incident.status}
                          size="small"
                          color={INCIDENT_STATUS_COLORS[incident.status]}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{incident.affected_users.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {incident.affected_data.slice(0, 2).map((d) => (
                            <Chip key={d} label={d} size="small" variant="outlined" />
                          ))}
                          {incident.affected_data.length > 2 && (
                            <Chip label={`+${incident.affected_data.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(incident.discovered_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={incident.notifications_sent ? 'Users notified' : 'Not yet notified'}>
                            <Chip
                              icon={incident.notifications_sent ? <Check /> : <Close />}
                              label="Users"
                              size="small"
                              color={incident.notifications_sent ? 'success' : 'default'}
                            />
                          </Tooltip>
                          <Tooltip title={incident.reported_to_authority ? 'Reported to DPA' : 'Not reported'}>
                            <Chip
                              icon={incident.reported_to_authority ? <Check /> : <Close />}
                              label="DPA"
                              size="small"
                              color={incident.reported_to_authority ? 'success' : 'default'}
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedIncident(incident);
                            setIncidentDialogOpen(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {incidents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary">No incidents recorded</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Third Parties */}
      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Third-Party Data Processors</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              List of external services that process user data on our behalf
            </Typography>

            <Grid container spacing={2}>
              {thirdPartyProcessors.map((processor) => (
                <Grid item xs={12} sm={6} md={4} key={processor.id}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {processor.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {processor.gdpr_compliant && (
                          <Tooltip title="GDPR Compliant">
                            <Chip icon={<GppGood />} label="GDPR" size="small" color="success" />
                          </Tooltip>
                        )}
                        {processor.dpa_signed && (
                          <Tooltip title="DPA Signed">
                            <Chip icon={<AssignmentTurnedIn />} label="DPA" size="small" color="info" />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    <Chip label={processor.type} size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {processor.purpose}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Country: {processor.country}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Data shared: {processor.data_shared.join(', ')}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Audit Logs */}
      {tabValue === 5 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Compliance Audit Logs</Typography>
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
                    <TableCell>Actor</TableCell>
                    <TableCell>Target User</TableCell>
                    <TableCell>Data Categories</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="body2">{formatDate(log.timestamp)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{log.actor_id}</Typography>
                          <Typography variant="caption" color="text.secondary">{log.actor_role}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.target_user_id || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {log.data_categories.slice(0, 2).map((c) => (
                            <Chip key={c} label={c} size="small" variant="outlined" />
                          ))}
                          {log.data_categories.length > 2 && (
                            <Chip label={`+${log.data_categories.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {JSON.stringify(log.details).slice(0, 50)}...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">No audit logs found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* DSAR Detail Dialog */}
      <Dialog open={dsarDetailOpen} onClose={() => setDsarDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>DSAR Request Details</DialogTitle>
        <DialogContent>
          {selectedDsar && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Request ID</Typography>
                  <Typography variant="body2" fontFamily="monospace">{selectedDsar.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Typography variant="body2">
                    {REQUEST_TYPE_LABELS[selectedDsar.request_type]}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">User</Typography>
                  <Typography variant="body2">{selectedDsar.user_name || selectedDsar.user_email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography variant="body2" fontFamily="monospace">{selectedDsar.user_id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Regulation</Typography>
                  <Typography variant="body2">{selectedDsar.regulation.toUpperCase()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={selectedDsar.status.replace('_', ' ')}
                    size="small"
                    color={STATUS_COLORS[selectedDsar.status]}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Submitted</Typography>
                  <Typography variant="body2">{formatDate(selectedDsar.submitted_at)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Deadline</Typography>
                  <Typography variant="body2">{formatDate(selectedDsar.deadline)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Data Categories</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedDsar.data_categories.map((c) => (
                      <Chip key={c} label={DATA_CATEGORY_LABELS[c] || c} size="small" />
                    ))}
                  </Box>
                </Grid>
                {selectedDsar.reason && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                    <Typography variant="body2">{selectedDsar.reason}</Typography>
                  </Grid>
                )}
                {selectedDsar.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{selectedDsar.notes}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>Quick Actions</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedDsar.status === 'pending' && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="info"
                      onClick={() => handleUpdateDsarStatus(selectedDsar.id, 'in_progress')}
                      disabled={processing}
                    >
                      Start Processing
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleUpdateDsarStatus(selectedDsar.id, 'rejected', 'Request rejected by admin')}
                      disabled={processing}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {selectedDsar.status === 'in_progress' && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleUpdateDsarStatus(selectedDsar.id, 'completed')}
                      disabled={processing}
                    >
                      Mark Complete
                    </Button>
                  </>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExportUserData(selectedDsar.user_id, 'json')}
                  disabled={processing}
                >
                  Export Data (JSON)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => handleExportUserData(selectedDsar.user_id, 'csv')}
                  disabled={processing}
                >
                  Export Data (CSV)
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDsarDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Retention Policy Dialog */}
      <Dialog open={retentionDialogOpen} onClose={() => setRetentionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedRetention?.id ? 'Edit' : 'New'} Retention Policy</DialogTitle>
        <DialogContent>
          {selectedRetention && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Data Category</InputLabel>
                    <Select
                      value={selectedRetention.data_category}
                      label="Data Category"
                      onChange={(e) => setSelectedRetention({ ...selectedRetention, data_category: e.target.value })}
                    >
                      {Object.entries(DATA_CATEGORY_LABELS).map(([key, label]) => (
                        <MenuItem key={key} value={key}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Retention Days"
                    value={selectedRetention.retention_days}
                    onChange={(e) => setSelectedRetention({ ...selectedRetention, retention_days: parseInt(e.target.value) || 0 })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Country Code (Optional)"
                    value={selectedRetention.country_code || ''}
                    onChange={(e) => setSelectedRetention({ ...selectedRetention, country_code: e.target.value || undefined })}
                    placeholder="e.g., DE, KE, NG"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    value={selectedRetention.description || ''}
                    onChange={(e) => setSelectedRetention({ ...selectedRetention, description: e.target.value })}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedRetention.auto_purge}
                        onChange={(e) => setSelectedRetention({ ...selectedRetention, auto_purge: e.target.checked })}
                      />
                    }
                    label="Auto Purge"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedRetention.soft_delete}
                        onChange={(e) => setSelectedRetention({ ...selectedRetention, soft_delete: e.target.checked })}
                      />
                    }
                    label="Soft Delete"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetentionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveRetentionPolicy}
            disabled={processing || !selectedRetention?.data_category}
          >
            {processing ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Incident Detail Dialog */}
      <Dialog open={incidentDialogOpen} onClose={() => setIncidentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Incident Details</DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6">{selectedIncident.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
                <Chip
                  label={selectedIncident.severity.toUpperCase()}
                  size="small"
                  color={SEVERITY_COLORS[selectedIncident.severity]}
                />
                <Chip
                  label={selectedIncident.status}
                  size="small"
                  color={INCIDENT_STATUS_COLORS[selectedIncident.status]}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedIncident.description}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Affected Users</Typography>
                  <Typography variant="body2">{selectedIncident.affected_users.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Discovered</Typography>
                  <Typography variant="body2">{formatDate(selectedIncident.discovered_at)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Affected Data Types</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedIncident.affected_data.map((d) => (
                      <Chip key={d} label={DATA_CATEGORY_LABELS[d] || d} size="small" />
                    ))}
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>Update Status</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['investigating', 'mitigated', 'resolved', 'closed'].map((status) => (
                  <Button
                    key={status}
                    size="small"
                    variant={selectedIncident.status === status ? 'contained' : 'outlined'}
                    onClick={() => handleUpdateIncident(selectedIncident.id, { status })}
                    disabled={processing}
                  >
                    {status}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleUpdateIncident(selectedIncident.id, { notifications_sent: true })}
                  disabled={processing || selectedIncident.notifications_sent}
                >
                  {selectedIncident.notifications_sent ? 'Users Notified' : 'Mark Users Notified'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleUpdateIncident(selectedIncident.id, { reported_to_authority: true })}
                  disabled={processing || selectedIncident.reported_to_authority}
                >
                  {selectedIncident.reported_to_authority ? 'Reported to DPA' : 'Mark Reported to DPA'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Purge Confirmation Dialog */}
      <Dialog open={purgeDialogOpen} onClose={() => setPurgeDialogOpen(false)}>
        <DialogTitle>Run Data Retention Purge</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will delete or archive data according to configured retention policies.
          </Alert>
          <Typography variant="body2">
            You can run a dry run first to see what would be affected without making changes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => handleRunRetentionPurge(true)}
            disabled={processing}
          >
            Dry Run
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleRunRetentionPurge(false)}
            disabled={processing}
          >
            {processing ? <CircularProgress size={20} /> : 'Execute Purge'}
          </Button>
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
