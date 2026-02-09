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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import {
  GroupWork,
  TrendingUp,
  TrendingDown,
  People,
  Refresh,
  AutoAwesome,
  Download,
  FilterList,
  Info,
  Warning,
  Error as ErrorIcon,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  NotificationsActive,
  Settings,
  Add,
  Email,
  Schedule,
  PlayArrow,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

interface EngagementMetrics {
  total_users: number;
  active_users_30d: number;
  dau: number;
  wau: number;
  mau: number;
  dau_mau_ratio: number;
  total_listings: number;
  new_listings_30d: number;
  total_transactions: number;
  computed_at: string;
}

interface HeatmapData {
  period: string;
  user_count: number;
  D1?: number;
  D3?: number;
  D7?: number;
  W2?: number;
  W4?: number;
  M2?: number;
  M3?: number;
  M6?: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  drop_off?: number;
  conversion_from_prev?: number;
}

interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  action?: string;
  generated_at: string;
}

interface Alert {
  id: string;
  name: string;
  alert_type: string;
  threshold: number;
  is_enabled: boolean;
  last_triggered?: string;
}

export default function CohortAnalyticsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [engagement, setEngagement] = useState<EngagementMetrics | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [revenue, setRevenue] = useState<any>(null);
  
  // Filters
  const [dimension, setDimension] = useState('signup_date');
  const [granularity, setGranularity] = useState('monthly');
  const [monthsBack, setMonthsBack] = useState(12);
  
  // Dialogs
  const [insightDialogOpen, setInsightDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [drilldownDialogOpen, setDrilldownDialogOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [cohortUsers, setCohortUsers] = useState<any[]>([]);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  // Alert form
  const [newAlert, setNewAlert] = useState({
    name: '',
    alert_type: 'retention_drop',
    threshold: 50,
  });

  // Weekly Reports states
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [reportSchedule, setReportSchedule] = useState<any>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [triggeredAlerts, setTriggeredAlerts] = useState<any[]>([]);
  const [reportRecipients, setReportRecipients] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [engagementRes, heatmapRes, funnelRes, insightsRes, alertsRes, revenueRes] = await Promise.all([
        fetch(`${API_BASE}/cohort-analytics/engagement`),
        fetch(`${API_BASE}/cohort-analytics/retention/heatmap?dimension=${dimension}&granularity=${granularity}&months_back=${monthsBack}`),
        fetch(`${API_BASE}/cohort-analytics/funnel`),
        fetch(`${API_BASE}/cohort-analytics/insights`),
        fetch(`${API_BASE}/cohort-analytics/alerts`),
        fetch(`${API_BASE}/cohort-analytics/revenue?months_back=${monthsBack}`),
      ]);

      if (engagementRes.ok) {
        setEngagement(await engagementRes.json());
      }
      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setHeatmapData(data.data || []);
      }
      if (funnelRes.ok) {
        const data = await funnelRes.json();
        setFunnel(data.funnel || []);
      }
      if (insightsRes.ok) {
        setInsights(await insightsRes.json());
      }
      if (alertsRes.ok) {
        setAlerts(await alertsRes.json());
      }
      if (revenueRes.ok) {
        setRevenue(await revenueRes.json());
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dimension, granularity, monthsBack]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Generate AI insights
  const generateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/insights/generate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setInsightDialogOpen(true);
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setGeneratingInsights(false);
    }
  };

  // Create alert
  const createAlert = async () => {
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert),
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts([...alerts, data]);
        setAlertDialogOpen(false);
        setNewAlert({ name: '', alert_type: 'retention_drop', threshold: 50 });
      }
    } catch (err) {
      console.error('Failed to create alert:', err);
    }
  };

  // Check alerts and trigger notifications
  const checkAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/alerts/check-and-notify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTriggeredAlerts(data.triggered_alerts || []);
        // Refresh alerts to get updated last_triggered
        const alertsRes = await fetch(`${API_BASE}/cohort-analytics/alerts`);
        if (alertsRes.ok) {
          setAlerts(await alertsRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to check alerts:', err);
    } finally {
      setCheckingAlerts(false);
    }
  };

  // Generate weekly report
  const generateWeeklyReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/reports/weekly`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyReport(data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Send weekly report via email
  const sendWeeklyReport = async () => {
    if (!reportRecipients.trim()) return;
    setSendingReport(true);
    try {
      const recipients = reportRecipients.split(',').map(e => e.trim()).filter(e => e);
      const res = await fetch(`${API_BASE}/cohort-analytics/reports/weekly/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipients),
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyReport(data.report);
        alert(`Report sent to ${recipients.length} recipient(s)`);
      }
    } catch (err) {
      console.error('Failed to send report:', err);
    } finally {
      setSendingReport(false);
    }
  };

  // Fetch report history
  const fetchReportHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/reports/history?limit=10`);
      if (res.ok) {
        setReportHistory(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch report history:', err);
    }
  };

  // Fetch report schedule
  const fetchReportSchedule = async () => {
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/reports/schedule`);
      if (res.ok) {
        setReportSchedule(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  };

  // Drill down into cohort
  const drilldownCohort = async (cohortKey: string) => {
    setSelectedCohort(cohortKey);
    setDrilldownDialogOpen(true);
    try {
      const res = await fetch(`${API_BASE}/cohort-analytics/cohort/${encodeURIComponent(cohortKey)}/users?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setCohortUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch cohort users:', err);
    }
  };

  // Get color for retention value
  const getRetentionColor = (value: number | undefined) => {
    if (value === undefined) return '#f5f5f5';
    if (value >= 70) return '#4caf50';
    if (value >= 50) return '#8bc34a';
    if (value >= 30) return '#ffeb3b';
    if (value >= 15) return '#ff9800';
    return '#f44336';
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <Warning color="warning" />;
      default: return <Info color="info" />;
    }
  };

  if (loading) {
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
            Cohort & Retention Analytics
          </Typography>
          <Typography color="text.secondary">
            Analyze user behavior, engagement, and long-term platform health
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboard}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={generatingInsights ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
            onClick={generateInsights}
            disabled={generatingInsights}
          >
            Generate AI Insights
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card data-testid="metric-total-users">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Users</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {engagement?.total_users?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card data-testid="metric-mau">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Monthly Active (MAU)</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {engagement?.mau?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card data-testid="metric-dau-mau">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">DAU/MAU Ratio</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {engagement?.dau_mau_ratio || 0}%
                  </Typography>
                </Box>
                <GroupWork color="warning" sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card data-testid="metric-transactions">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">Total Transactions</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {engagement?.total_transactions?.toLocaleString() || 0}
                  </Typography>
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Retention Heatmap" data-testid="tab-heatmap" />
        <Tab label="Conversion Funnel" data-testid="tab-funnel" />
        <Tab label="Revenue & LTV" data-testid="tab-revenue" />
        <Tab label="AI Insights" data-testid="tab-insights" />
        <Tab label="Alerts & Automation" data-testid="tab-alerts" />
        <Tab label="Weekly Reports" data-testid="tab-reports" />
      </Tabs>

      {/* Tab 0: Retention Heatmap */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Dimension</InputLabel>
                <Select
                  value={dimension}
                  label="Dimension"
                  onChange={(e) => setDimension(e.target.value)}
                  data-testid="filter-dimension"
                >
                  <MenuItem value="signup_date">Signup Date</MenuItem>
                  <MenuItem value="user_type">User Type</MenuItem>
                  <MenuItem value="country">Country</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Granularity</InputLabel>
                <Select
                  value={granularity}
                  label="Granularity"
                  onChange={(e) => setGranularity(e.target.value)}
                  data-testid="filter-granularity"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={monthsBack}
                  label="Time Range"
                  onChange={(e) => setMonthsBack(Number(e.target.value))}
                  data-testid="filter-months"
                >
                  <MenuItem value={3}>3 Months</MenuItem>
                  <MenuItem value={6}>6 Months</MenuItem>
                  <MenuItem value={12}>12 Months</MenuItem>
                  <MenuItem value={24}>24 Months</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Heatmap Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" data-testid="retention-heatmap">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Cohort</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Users</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>D1</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>D3</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>D7</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>W2</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>W4</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>M2</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>M3</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>M6</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {heatmapData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No cohort data available</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    heatmapData.map((row) => (
                      <TableRow key={row.period} hover>
                        <TableCell>
                          <Chip label={row.period} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">{row.user_count}</TableCell>
                        {['D1', 'D3', 'D7', 'W2', 'W4', 'M2', 'M3', 'M6'].map((interval) => {
                          const value = row[interval as keyof HeatmapData] as number | undefined;
                          return (
                            <TableCell
                              key={interval}
                              align="center"
                              sx={{
                                bgcolor: getRetentionColor(value),
                                color: value !== undefined && value >= 50 ? 'white' : 'inherit',
                                fontWeight: value !== undefined ? 'bold' : 'normal',
                              }}
                            >
                              {value !== undefined ? `${value}%` : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => drilldownCohort(`${dimension}:${row.period}`)}
                            data-testid={`drilldown-${row.period}`}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
              {[
                { label: '70%+', color: '#4caf50' },
                { label: '50-70%', color: '#8bc34a' },
                { label: '30-50%', color: '#ffeb3b' },
                { label: '15-30%', color: '#ff9800' },
                { label: '<15%', color: '#f44336' },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: item.color, borderRadius: 0.5 }} />
                  <Typography variant="caption">{item.label}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Conversion Funnel */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Conversion Funnel</Typography>
                <Box sx={{ mt: 3 }}>
                  {funnel.map((stage, index) => (
                    <Box key={stage.stage} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="bold">{stage.stage}</Typography>
                        <Typography variant="body2">{stage.count} users ({stage.rate}%)</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={stage.rate}
                        sx={{
                          height: 24,
                          borderRadius: 1,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: index === 0 ? 'primary.main' : index === funnel.length - 1 ? 'success.main' : 'info.main',
                          },
                        }}
                      />
                      {stage.drop_off !== undefined && stage.drop_off > 0 && (
                        <Typography variant="caption" color="error">
                          ↓ {stage.drop_off}% drop-off
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Funnel Chart</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="stage" width={120} />
                    <RechartsTooltip />
                    <Bar dataKey="rate" fill="#2196f3" name="Conversion Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Revenue & LTV */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total Revenue</Typography>
                <Typography variant="h4" fontWeight="bold">
                  €{revenue?.total_revenue?.toLocaleString() || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Average LTV</Typography>
                <Typography variant="h4" fontWeight="bold">
                  €{revenue?.avg_ltv?.toFixed(2) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Cohorts Analyzed</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {revenue?.data?.length || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Revenue by Cohort</Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenue?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_revenue" stroke="#2196f3" name="Revenue" />
                    <Line type="monotone" dataKey="ltv" stroke="#4caf50" name="LTV" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: AI Insights */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">AI-Generated Insights</Typography>
              <Button
                variant="contained"
                startIcon={generatingInsights ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                onClick={generateInsights}
                disabled={generatingInsights}
                data-testid="generate-insights-btn"
              >
                Generate New Insights
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {insights.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AutoAwesome sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                  No insights available. Click "Generate New Insights" to analyze your data.
                </Typography>
              </Box>
            ) : (
              <List>
                {insights.map((insight) => (
                  <ListItem
                    key={insight.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: insight.severity === 'critical' ? 'error.50' : insight.severity === 'warning' ? 'warning.50' : 'background.paper',
                    }}
                    data-testid={`insight-${insight.id}`}
                  >
                    <Box sx={{ mr: 2 }}>{getSeverityIcon(insight.severity)}</Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography fontWeight="bold">{insight.title}</Typography>
                          <Chip
                            label={insight.insight_type}
                            size="small"
                            variant="outlined"
                            color={insight.severity === 'critical' ? 'error' : insight.severity === 'warning' ? 'warning' : 'default'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {insight.description}
                          </Typography>
                          {insight.action && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                              <strong>Recommended Action:</strong> {insight.action}
                            </Alert>
                          )}
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

      {/* Tab 4: Alerts & Automation */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Retention Alerts & Automation</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={checkingAlerts ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={checkAlerts}
                  disabled={checkingAlerts}
                  data-testid="check-alerts-btn"
                >
                  Check Alerts Now
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAlertDialogOpen(true)}
                  data-testid="create-alert-btn"
                >
                  Create Alert
                </Button>
              </Box>
            </Box>
            
            {/* Triggered Alerts Section */}
            {triggeredAlerts.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>{triggeredAlerts.length} alert(s) triggered!</strong>
                <List dense>
                  {triggeredAlerts.map((ta, idx) => (
                    <ListItem key={idx}>
                      <ListItemText 
                        primary={ta.alert_name}
                        secondary={`Current value: ${ta.current_value}%, Threshold: ${ta.threshold}%`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
            
            <TableContainer component={Paper} variant="outlined">
              <Table data-testid="alerts-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Threshold</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Triggered</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No alerts configured</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.name}</TableCell>
                        <TableCell>
                          <Chip label={alert.alert_type.replace('_', ' ')} size="small" />
                        </TableCell>
                        <TableCell>{alert.threshold}%</TableCell>
                        <TableCell>
                          <Chip
                            label={alert.is_enabled ? 'Active' : 'Disabled'}
                            color={alert.is_enabled ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {alert.last_triggered
                            ? new Date(alert.last_triggered).toLocaleString()
                            : 'Never'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Weekly Reports */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generate Weekly Report</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Create a comprehensive cohort health report with AI insights and recommendations.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={generatingReport ? <CircularProgress size={20} color="inherit" /> : <Schedule />}
                  onClick={generateWeeklyReport}
                  disabled={generatingReport}
                  fullWidth
                  sx={{ mb: 2 }}
                  data-testid="generate-report-btn"
                >
                  Generate Report
                </Button>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>Send Report via Email</Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Recipients (comma-separated)"
                  placeholder="admin@example.com, manager@example.com"
                  value={reportRecipients}
                  onChange={(e) => setReportRecipients(e.target.value)}
                  sx={{ mb: 1 }}
                  data-testid="report-recipients-input"
                />
                <Button
                  variant="outlined"
                  startIcon={sendingReport ? <CircularProgress size={20} /> : <Email />}
                  onClick={sendWeeklyReport}
                  disabled={sendingReport || !reportRecipients.trim()}
                  fullWidth
                  data-testid="send-report-btn"
                >
                  Send Report
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Latest Report Summary</Typography>
                {weeklyReport ? (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Total Users</Typography>
                        <Typography variant="h6">{weeklyReport.metrics_summary?.total_users?.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">MAU</Typography>
                        <Typography variant="h6">{weeklyReport.metrics_summary?.mau?.toLocaleString()}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Avg D7 Retention</Typography>
                        <Typography variant="h6">{weeklyReport.retention_highlights?.avg_d7_retention}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Conversion Rate</Typography>
                        <Typography variant="h6">{weeklyReport.funnel_summary?.overall_conversion}%</Typography>
                      </Grid>
                    </Grid>
                    
                    {weeklyReport.recommendations?.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Recommendations</Typography>
                        {weeklyReport.recommendations.map((rec: string, idx: number) => (
                          <Alert key={idx} severity="info" sx={{ mb: 1 }}>
                            {rec}
                          </Alert>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      No report generated yet. Click "Generate Report" to create one.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Drilldown Dialog */}
      <Dialog
        open={drilldownDialogOpen}
        onClose={() => setDrilldownDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Cohort Users: {selectedCohort}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cohortUsers.map((user) => (
                  <TableRow key={user.id || user.user_id}>
                    <TableCell>{user.id || user.user_id}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {cohortUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrilldownDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Alert Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Alert Name"
              fullWidth
              value={newAlert.name}
              onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
              data-testid="alert-name-input"
            />
            <FormControl fullWidth>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={newAlert.alert_type}
                label="Alert Type"
                onChange={(e) => setNewAlert({ ...newAlert, alert_type: e.target.value })}
                data-testid="alert-type-select"
              >
                <MenuItem value="retention_drop">Retention Drop</MenuItem>
                <MenuItem value="high_churn">High Churn</MenuItem>
                <MenuItem value="high_value_cohort">High Value Cohort</MenuItem>
                <MenuItem value="engagement_spike">Engagement Spike</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography gutterBottom>Threshold: {newAlert.threshold}%</Typography>
              <Slider
                value={newAlert.threshold}
                onChange={(_, v) => setNewAlert({ ...newAlert, threshold: v as number })}
                min={0}
                max={100}
                data-testid="alert-threshold-slider"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createAlert}
            disabled={!newAlert.name}
            data-testid="create-alert-submit"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Insights Dialog */}
      <Dialog
        open={insightDialogOpen}
        onClose={() => setInsightDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            AI Insights Generated
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            {insights.length} insights generated based on your analytics data
          </Alert>
          <List>
            {insights.slice(0, 5).map((insight) => (
              <ListItem key={insight.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                <Box sx={{ mr: 2 }}>{getSeverityIcon(insight.severity)}</Box>
                <ListItemText
                  primary={insight.title}
                  secondary={insight.description}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { setInsightDialogOpen(false); setActiveTab(3); }}>
            View All Insights
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
