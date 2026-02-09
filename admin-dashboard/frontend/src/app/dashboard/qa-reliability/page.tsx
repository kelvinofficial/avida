'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Refresh,
  PlayArrow,
  Search,
  Visibility,
  BugReport,
  Speed,
  Security,
  Storage,
  Notifications,
  Payment,
  LocalShipping,
  ToggleOn,
  Timeline,
  Assignment,
  Done,
  Close,
  History,
  Flag,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Service status colors
const STATUS_COLORS = {
  healthy: '#4caf50',
  degraded: '#ff9800',
  down: '#f44336',
};

// Severity colors
const SEVERITY_COLORS = {
  info: '#2196f3',
  warning: '#ff9800',
  critical: '#f44336',
};

export default function QAReliabilityPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [health, setHealth] = useState<any>(null);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [qaChecks, setQaChecks] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // New data states for enhanced features
  const [flowTests, setFlowTests] = useState<any>(null);
  const [flowTestHistory, setFlowTestHistory] = useState<any[]>([]);
  const [sessionReplays, setSessionReplays] = useState<any[]>([]);
  const [sessionReplaySummary, setSessionReplaySummary] = useState<any>(null);
  const [integrityResults, setIntegrityResults] = useState<any>(null);
  const [integrityHistory, setIntegrityHistory] = useState<any[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [monitoringThresholds, setMonitoringThresholds] = useState<any[]>([]);
  const [failsafeStatus, setFailsafeStatus] = useState<any>(null);
  const [retryConfig, setRetryConfig] = useState<any>(null);
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState<any[]>([]);

  // Filters
  const [errorSearch, setErrorSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Dialogs
  const [traceDialogOpen, setTraceDialogOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const [errorDetailDialogOpen, setErrorDetailDialogOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<any>(null);
  const [sessionDetailDialogOpen, setSessionDetailDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [newThreshold, setNewThreshold] = useState({ metric_name: '', threshold_type: 'above', threshold_value: 0, alert_severity: 'warning' });

  // Running states
  const [runningQaChecks, setRunningQaChecks] = useState(false);
  const [runningFlowTests, setRunningFlowTests] = useState(false);
  const [runningIntegrityCheck, setRunningIntegrityCheck] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, errorsRes, alertsRes, metricsRes, kpisRes, flagsRes, tracesRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/qa/health`),
        fetch(`${API_BASE}/qa/errors?limit=50`),
        fetch(`${API_BASE}/qa/alerts?limit=50&resolved=false`),
        fetch(`${API_BASE}/qa/metrics?period_hours=24`),
        fetch(`${API_BASE}/qa/metrics/kpis`),
        fetch(`${API_BASE}/qa/features`),
        fetch(`${API_BASE}/qa/traces?limit=50`),
        fetch(`${API_BASE}/qa/audit?limit=50`),
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (errorsRes.ok) {
        const data = await errorsRes.json();
        setErrorLogs(data.logs || []);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (kpisRes.ok) setKpis(await kpisRes.json());
      if (flagsRes.ok) setFeatureFlags(await flagsRes.json());
      if (tracesRes.ok) {
        const data = await tracesRes.json();
        setTraces(data.traces || []);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
      
      // Fetch new enhanced features data
      const [flowHistoryRes, sessionSummaryRes, integrityHistoryRes, currentMetricsRes, thresholdsRes, failsafeRes, retryRes, realtimeRes] = await Promise.all([
        fetch(`${API_BASE}/qa/flow-tests/history?limit=10`),
        fetch(`${API_BASE}/qa/sessions/summary`),
        fetch(`${API_BASE}/qa/integrity/history?limit=10`),
        fetch(`${API_BASE}/qa/monitoring/metrics`),
        fetch(`${API_BASE}/qa/monitoring/thresholds`),
        fetch(`${API_BASE}/qa/failsafe/status`),
        fetch(`${API_BASE}/qa/retry/config`),
        fetch(`${API_BASE}/qa/realtime/subscriptions`),
      ]);
      
      if (flowHistoryRes.ok) {
        const data = await flowHistoryRes.json();
        setFlowTestHistory(data.tests || []);
      }
      if (sessionSummaryRes.ok) setSessionReplaySummary(await sessionSummaryRes.json());
      if (integrityHistoryRes.ok) {
        const data = await integrityHistoryRes.json();
        setIntegrityHistory(data.checks || []);
      }
      if (currentMetricsRes.ok) setCurrentMetrics(await currentMetricsRes.json());
      if (thresholdsRes.ok) setMonitoringThresholds(await thresholdsRes.json());
      if (failsafeRes.ok) setFailsafeStatus(await failsafeRes.json());
      if (retryRes.ok) setRetryConfig(await retryRes.json());
      if (realtimeRes.ok) {
        const data = await realtimeRes.json();
        setRealtimeSubscriptions(data.subscriptions || []);
      }
    } catch (err) {
      setError('Failed to fetch QA data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Run QA checks
  const runQaChecks = async () => {
    setRunningQaChecks(true);
    try {
      const res = await fetch(`${API_BASE}/qa/checks/run`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setQaChecks(data);
      }
    } catch (err) {
      console.error('Failed to run QA checks:', err);
    } finally {
      setRunningQaChecks(false);
    }
  };

  // Run Flow Tests
  const runFlowTests = async () => {
    setRunningFlowTests(true);
    try {
      const res = await fetch(`${API_BASE}/qa/flow-tests/run`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFlowTests(data);
        fetchData(); // Refresh history
      }
    } catch (err) {
      console.error('Failed to run flow tests:', err);
    } finally {
      setRunningFlowTests(false);
    }
  };

  // Run Data Integrity Check
  const runIntegrityCheck = async () => {
    setRunningIntegrityCheck(true);
    try {
      const res = await fetch(`${API_BASE}/qa/integrity/run`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIntegrityResults(data);
        fetchData(); // Refresh history
      }
    } catch (err) {
      console.error('Failed to run integrity check:', err);
    } finally {
      setRunningIntegrityCheck(false);
    }
  };

  // Add monitoring threshold
  const addMonitoringThreshold = async () => {
    try {
      const res = await fetch(`${API_BASE}/qa/monitoring/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newThreshold, admin_id: 'admin' }),
      });
      if (res.ok) {
        setThresholdDialogOpen(false);
        setNewThreshold({ metric_name: '', threshold_type: 'above', threshold_value: 0, alert_severity: 'warning' });
        fetchData();
      }
    } catch (err) {
      console.error('Failed to add threshold:', err);
    }
  };

  // Delete monitoring threshold
  const deleteMonitoringThreshold = async (metricName: string) => {
    try {
      await fetch(`${API_BASE}/qa/monitoring/thresholds/${metricName}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete threshold:', err);
    }
  };

  // Trigger retry
  const triggerRetry = async (jobType: string) => {
    try {
      await fetch(`${API_BASE}/qa/retry/trigger/${jobType}`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to trigger retry:', err);
    }
  };

  // View session replay
  const viewSessionReplay = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/qa/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSession(data);
        setSessionDetailDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
    }
  };

  // Toggle feature flag
  const toggleFeatureFlag = async (key: string, enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/qa/features/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, admin_id: 'admin' }),
      });
      setFeatureFlags(featureFlags.map(f => f.key === key ? { ...f, enabled } : f));
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/qa/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: 'admin' }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/qa/alerts/${alertId}/resolve`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle sx={{ color: STATUS_COLORS.healthy }} />;
      case 'degraded':
        return <Warning sx={{ color: STATUS_COLORS.degraded }} />;
      case 'down':
        return <ErrorIcon sx={{ color: STATUS_COLORS.down }} />;
      default:
        return <Info color="disabled" />;
    }
  };

  // Get severity chip
  const getSeverityChip = (severity: string) => {
    const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.info;
    return (
      <Chip
        label={severity?.toUpperCase()}
        size="small"
        sx={{ bgcolor: color, color: 'white' }}
      />
    );
  };

  if (loading && !health) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            QA & Reliability Dashboard
          </Typography>
          <Typography color="text.secondary">
            Monitor system health, debug issues, and ensure reliability
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={runningQaChecks ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
            onClick={runQaChecks}
            disabled={runningQaChecks}
            data-testid="run-qa-checks-btn"
          >
            Run QA Checks
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Overall Status Banner */}
      {health && (
        <Alert
          severity={health.overall_status === 'healthy' ? 'success' : health.overall_status === 'degraded' ? 'warning' : 'error'}
          icon={getStatusIcon(health.overall_status)}
          sx={{ mb: 3 }}
          data-testid="system-status-banner"
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              System Status: {health.overall_status?.toUpperCase()}
            </Typography>
            <Chip label={`${health.errors?.last_hour || 0} errors (1h)`} size="small" />
            <Chip label={`${health.active_alerts || 0} active alerts`} size="small" color={health.active_alerts > 0 ? 'warning' : 'default'} />
          </Box>
        </Alert>
      )}

      {/* KPI Cards */}
      {kpis && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card data-testid="kpi-uptime">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Uptime</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {kpis.uptime?.current || 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Target: {kpis.uptime?.target}%
                    </Typography>
                  </Box>
                  <Chip
                    label={kpis.uptime?.status?.toUpperCase()}
                    color={kpis.uptime?.status === 'passing' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card data-testid="kpi-latency">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">API Latency</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {kpis.latency?.current_ms?.toFixed(0) || 0}ms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Target: &lt;{kpis.latency?.target_ms}ms
                    </Typography>
                  </Box>
                  <Chip
                    label={kpis.latency?.status?.toUpperCase()}
                    color={kpis.latency?.status === 'passing' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card data-testid="kpi-checkout">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Checkout Success</Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {kpis.checkout_success?.current || 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Target: {kpis.checkout_success?.target}%
                    </Typography>
                  </Box>
                  <Chip
                    label={kpis.checkout_success?.status?.toUpperCase()}
                    color={kpis.checkout_success?.status === 'passing' ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<Speed />} label="System Health" data-testid="tab-health" />
        <Tab icon={<BugReport />} label="Error Logs" data-testid="tab-errors" />
        <Tab icon={<Flag />} label="Alerts" data-testid="tab-alerts" />
        <Tab icon={<Assignment />} label="QA Checks" data-testid="tab-qa" />
        <Tab icon={<PlayArrow />} label="Flow Tests" data-testid="tab-flow-tests" />
        <Tab icon={<Visibility />} label="Session Replay" data-testid="tab-replay" />
        <Tab icon={<Storage />} label="Data Integrity" data-testid="tab-integrity" />
        <Tab icon={<TrendingUp />} label="Monitoring" data-testid="tab-monitoring" />
        <Tab icon={<Timeline />} label="Session Traces" data-testid="tab-traces" />
        <Tab icon={<ToggleOn />} label="Feature Flags" data-testid="tab-features" />
        <Tab icon={<History />} label="Audit Log" data-testid="tab-audit" />
      </Tabs>

      {/* Tab 0: System Health */}
      {activeTab === 0 && health && (
        <Grid container spacing={3}>
          {Object.entries(health.services || {}).map(([name, service]: [string, any]) => (
            <Grid item xs={12} sm={6} md={4} key={name}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{name}</Typography>
                    {getStatusIcon(service.status)}
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Latency</Typography>
                    <Typography variant="h6">{service.latency_ms?.toFixed(1)}ms</Typography>
                  </Box>
                  {service.details && Object.keys(service.details).length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(service.details).map(([key, value]) => (
                        <Typography key={key} variant="caption" display="block" color="text.secondary">
                          {key}: {String(value)}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {service.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <Typography variant="caption">{service.error}</Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 1: Error Logs */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search by reference ID or message..."
                value={errorSearch}
                onChange={(e) => setErrorSearch(e.target.value)}
                InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
                sx={{ flexGrow: 1 }}
                data-testid="error-search"
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={severityFilter}
                  label="Severity"
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer>
              <Table size="small" data-testid="error-logs-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Reference</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorLogs
                    .filter(e => !severityFilter || e.severity === severityFilter)
                    .filter(e => !errorSearch || e.reference_id?.includes(errorSearch) || e.message?.includes(errorSearch))
                    .map((err) => (
                      <TableRow key={err.id} hover>
                        <TableCell>
                          <Chip label={err.reference_id} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{getSeverityChip(err.severity)}</TableCell>
                        <TableCell>{err.category}</TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" noWrap>{err.message}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(err.timestamp).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedError(err); setErrorDetailDialogOpen(true); }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  {errorLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography color="text.secondary">No errors logged</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Alerts */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Active Alerts</Typography>
            {alerts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                <Typography color="text.secondary">No active alerts</Typography>
              </Box>
            ) : (
              <List>
                {alerts.map((alert) => (
                  <ListItem
                    key={alert.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: alert.severity === 'critical' ? 'error.50' : alert.severity === 'warning' ? 'warning.50' : 'background.paper',
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!alert.acknowledged && (
                          <Button size="small" onClick={() => acknowledgeAlert(alert.id)}>
                            Acknowledge
                          </Button>
                        )}
                        <Button size="small" color="success" onClick={() => resolveAlert(alert.id)}>
                          Resolve
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      {alert.severity === 'critical' ? <ErrorIcon color="error" /> : <Warning color="warning" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.title}
                      secondary={
                        <Box>
                          <Typography variant="body2">{alert.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(alert.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: QA Checks */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">QA Check Results</Typography>
              <Button
                variant="contained"
                startIcon={runningQaChecks ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={runQaChecks}
                disabled={runningQaChecks}
              >
                Run All Checks
              </Button>
            </Box>
            {qaChecks ? (
              <Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${qaChecks.passed} Passed`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${qaChecks.failed} Failed`}
                    color="error"
                    variant="outlined"
                  />
                  <Chip
                    label={`Total: ${qaChecks.total}`}
                    variant="outlined"
                  />
                </Box>
                <TableContainer>
                  <Table size="small" data-testid="qa-checks-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Check</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {qaChecks.results?.map((check: any) => (
                        <TableRow key={check.id} hover>
                          <TableCell>
                            {check.passed ? (
                              <CheckCircle color="success" />
                            ) : (
                              <ErrorIcon color="error" />
                            )}
                          </TableCell>
                          <TableCell>{check.name}</TableCell>
                          <TableCell>
                            <Chip label={check.check_type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{check.duration_ms?.toFixed(2)}ms</TableCell>
                          <TableCell>
                            {check.error ? (
                              <Typography variant="caption" color="error">{check.error}</Typography>
                            ) : (
                              <Typography variant="caption">
                                {JSON.stringify(check.details || {})}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assignment sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  Click "Run All Checks" to execute QA tests
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Flow Tests */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Critical User Flow Tests</Typography>
              <Button
                variant="contained"
                startIcon={runningFlowTests ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={runFlowTests}
                disabled={runningFlowTests}
                data-testid="run-flow-tests-btn"
              >
                Run Flow Tests
              </Button>
            </Box>
            
            {flowTests && (
              <Alert 
                severity={flowTests.failed === 0 ? 'success' : 'warning'} 
                sx={{ mb: 3 }}
              >
                Last Run: {flowTests.passed}/{flowTests.total_tests} passed ({flowTests.success_rate?.toFixed(1)}%)
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {flowTests?.results?.map((result: any) => (
                <Grid item xs={12} sm={6} md={4} key={result.flow}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {result.flow.replace('_', ' ').toUpperCase()}
                        </Typography>
                        {result.passed ? (
                          <CheckCircle color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Duration: {result.duration_ms?.toFixed(0)}ms
                      </Typography>
                      {result.steps && (
                        <Box sx={{ mt: 1 }}>
                          {result.steps.map((step: any, idx: number) => (
                            <Chip
                              key={idx}
                              label={step.step}
                              size="small"
                              color={step.passed ? 'success' : 'error'}
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5, fontSize: '0.65rem' }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Test History</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Run ID</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Tests</TableCell>
                    <TableCell>Passed</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>Success Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flowTestHistory.map((test: any) => (
                    <TableRow key={test.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {test.id?.substring(0, 8)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(test.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{test.total_tests}</TableCell>
                      <TableCell>
                        <Chip label={test.passed} color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={test.failed} color={test.failed > 0 ? 'error' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>{test.success_rate?.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Session Replay */}
      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Session Replay Summary</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {sessionReplaySummary && Object.entries(sessionReplaySummary).map(([flowType, data]: [string, any]) => (
                <Grid item xs={12} sm={6} md={4} key={flowType}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" textTransform="capitalize">
                        {flowType.replace('_', ' ')}
                      </Typography>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography variant="h6">{data.total_recordings}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                          <Typography variant="h6">{data.success_rate?.toFixed(1)}%</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Chip label={`${data.completed} completed`} size="small" color="success" variant="outlined" />
                        </Grid>
                        <Grid item xs={6}>
                          <Chip label={`${data.failed} failed`} size="small" color="error" variant="outlined" />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Session replays are automatically recorded for critical user flows. Click on a session to view the full replay.
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Data Integrity */}
      {activeTab === 6 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Data Integrity Checks</Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={runningIntegrityCheck ? <CircularProgress size={20} color="inherit" /> : <Storage />}
                onClick={runIntegrityCheck}
                disabled={runningIntegrityCheck}
                data-testid="run-integrity-btn"
              >
                Run Integrity Check
              </Button>
            </Box>

            {integrityResults && (
              <Alert 
                severity={integrityResults.issues_found === 0 ? 'success' : 'warning'} 
                sx={{ mb: 3 }}
              >
                Last Run: {integrityResults.passed}/{integrityResults.total_checks} passed, {integrityResults.issues_found} issues found
              </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {integrityResults?.results?.map((result: any) => (
                <Grid item xs={12} sm={6} key={result.check}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {result.check.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                        {result.passed ? (
                          <CheckCircle color="success" />
                        ) : (
                          <ErrorIcon color="error" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Issues: {result.issues_count}
                      </Typography>
                      {result.details && (
                        <Typography variant="caption" component="pre" sx={{ mt: 1, overflow: 'auto' }}>
                          {JSON.stringify(result.details, null, 2)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Check History</Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Check ID</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Passed</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>Issues</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrityHistory.map((check: any) => (
                    <TableRow key={check.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {check.id?.substring(0, 8)}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(check.started_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={check.passed} color="success" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={check.failed} color={check.failed > 0 ? 'error' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={check.issues_found} color={check.issues_found > 0 ? 'warning' : 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 7: Advanced Monitoring */}
      {activeTab === 7 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Real-Time Metrics</Typography>
            {currentMetrics && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Error Rate (hourly)</Typography>
                      <Typography variant="h5">{currentMetrics.error_rate_hourly}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">API Latency</Typography>
                      <Typography variant="h5">{currentMetrics.avg_api_latency_ms}ms</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Payment Success</Typography>
                      <Typography variant="h5">{currentMetrics.payment_success_rate}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Pending Escrows</Typography>
                      <Typography variant="h5">{currentMetrics.pending_escrows}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Notification Queue</Typography>
                      <Typography variant="h5">{currentMetrics.notification_queue_size}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Signup Rate (hourly)</Typography>
                      <Typography variant="h5">{currentMetrics.signup_rate_hourly}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={4} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Active Alerts</Typography>
                      <Typography variant="h5" color={currentMetrics.active_alerts > 0 ? 'error.main' : 'inherit'}>
                        {currentMetrics.active_alerts}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Alert Thresholds</Typography>
              <Button
                variant="outlined"
                onClick={() => setThresholdDialogOpen(true)}
                data-testid="add-threshold-btn"
              >
                Add Threshold
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell>Condition</TableCell>
                    <TableCell>Threshold</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monitoringThresholds.map((threshold: any) => (
                    <TableRow key={threshold.metric_name} hover>
                      <TableCell>{threshold.metric_name}</TableCell>
                      <TableCell>{threshold.threshold_type}</TableCell>
                      <TableCell>{threshold.threshold_value}</TableCell>
                      <TableCell>
                        <Chip 
                          label={threshold.alert_severity} 
                          size="small"
                          color={threshold.alert_severity === 'critical' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => deleteMonitoringThreshold(threshold.metric_name)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {monitoringThresholds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">No thresholds configured</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Fail-Safe Status</Typography>
            {failsafeStatus && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity={failsafeStatus.overall_status === 'operational' ? 'success' : 'warning'}>
                    Overall System: {failsafeStatus.overall_status?.toUpperCase()}
                  </Alert>
                </Grid>
                {failsafeStatus.operations && Object.entries(failsafeStatus.operations).map(([op, status]: [string, any]) => (
                  <Grid item xs={6} sm={4} key={op}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" textTransform="capitalize">
                            {op.replace('_', ' ')}
                          </Typography>
                          {status.allowed ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </Box>
                        {status.warnings?.length > 0 && (
                          <Typography variant="caption" color="warning.main">
                            {status.warnings[0]}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Retry Queue</Typography>
            {retryConfig && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Max Retries: {retryConfig.max_retries} | Base Delay: {retryConfig.base_delay_seconds}s | Max Delay: {retryConfig.max_delay_seconds}s
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={() => triggerRetry('notification')}>
                Retry Notifications
              </Button>
              <Button variant="outlined" size="small" onClick={() => triggerRetry('payment_webhook')}>
                Retry Payment Webhooks
              </Button>
              <Button variant="outlined" size="small" onClick={() => triggerRetry('escrow_release')}>
                Retry Escrow Releases
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Session Traces (moved from 4) */}
      {activeTab === 8 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Session Traces</Typography>
            <TableContainer>
              <Table size="small" data-testid="traces-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Flow</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Steps</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traces.map((trace) => (
                    <TableRow key={trace.id} hover>
                      <TableCell>
                        <Chip label={trace.flow_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{trace.user_id?.slice(0, 12)}...</TableCell>
                      <TableCell>
                        <Chip
                          label={trace.status}
                          size="small"
                          color={trace.status === 'completed' ? 'success' : trace.status === 'failed' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(trace.started_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{trace.steps?.length || 0}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => { setSelectedTrace(trace); setTraceDialogOpen(true); }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {traces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Timeline sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No session traces recorded</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 9: Feature Flags (moved from 5) */}
      {activeTab === 9 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Feature Flags</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Toggle features on/off without redeployment. Changes take effect immediately.
            </Typography>
            <TableContainer>
              <Table size="small" data-testid="feature-flags-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Toggle</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {featureFlags.map((flag) => (
                    <TableRow key={flag.key} hover>
                      <TableCell>
                        <Typography fontWeight="bold">{flag.key}</Typography>
                      </TableCell>
                      <TableCell>{flag.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={flag.enabled ? 'Enabled' : 'Disabled'}
                          color={flag.enabled ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.enabled}
                          onChange={(e) => toggleFeatureFlag(flag.key, e.target.checked)}
                          color="success"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 10: Audit Log (moved from 6) */}
      {activeTab === 10 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Audit Log</Typography>
            <TableContainer>
              <Table size="small" data-testid="audit-log-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{log.admin_id}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {JSON.stringify(log.details || {})}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <History sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No audit logs recorded</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Trace Detail Dialog */}
      <Dialog open={traceDialogOpen} onClose={() => setTraceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Session Trace: {selectedTrace?.flow_type}</DialogTitle>
        <DialogContent>
          {selectedTrace && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">User ID</Typography>
                  <Typography>{selectedTrace.user_id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip label={selectedTrace.status} color={selectedTrace.status === 'completed' ? 'success' : 'error'} size="small" />
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Steps</Typography>
              <List dense>
                {selectedTrace.steps?.map((step: any, idx: number) => (
                  <ListItem key={idx}>
                    <ListItemIcon>
                      <Chip label={idx + 1} size="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={step.name}
                      secondary={
                        <Box>
                          <Typography variant="caption">{step.timestamp}</Typography>
                          {step.duration_ms && <Typography variant="caption"> - {step.duration_ms}ms</Typography>}
                          {step.data && <Typography variant="caption" display="block">{JSON.stringify(step.data)}</Typography>}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              {selectedTrace.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2">{JSON.stringify(selectedTrace.error)}</Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTraceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Error Detail Dialog */}
      <Dialog open={errorDetailDialogOpen} onClose={() => setErrorDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Error Details: {selectedError?.reference_id}</DialogTitle>
        <DialogContent>
          {selectedError && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Severity</Typography>
                  {getSeverityChip(selectedError.severity)}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Category</Typography>
                  <Typography>{selectedError.category}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Message</Typography>
                  <Typography>{selectedError.message}</Typography>
                </Grid>
                {selectedError.stack_trace && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Stack Trace</Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedError.stack_trace}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {selectedError.endpoint && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Endpoint</Typography>
                    <Typography>{selectedError.endpoint}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
