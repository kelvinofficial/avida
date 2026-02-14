'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  People,
  ShoppingCart,
  AccountBalance,
  Shield,
  LocalShipping,
  Speed,
  Lightbulb,
  Warning,
  CheckCircle,
  Info,
  Download,
  Settings,
  Schedule,
  AutoAwesome,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface MetricChange {
  current: number;
  previous: number;
  change_percent: number;
  change_direction: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact_level: string;
  urgency: string;
  category: string;
  action_label?: string;
  action_route?: string;
}

interface ExecutiveSummary {
  id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  generated_at: string;
  executive_brief?: string;
  key_highlights: string[];
  what_changed: string[];
  what_to_do_next: string[];
  platform_overview?: {
    total_users: MetricChange;
    active_users: MetricChange;
    new_listings: MetricChange;
    completed_transactions: MetricChange;
    escrow_volume: MetricChange;
    ai_summary?: string;
  };
  revenue_monetization?: {
    total_revenue: MetricChange;
    commission_earned: MetricChange;
    boost_revenue: MetricChange;
    banner_revenue: MetricChange;
    transport_fees: MetricChange;
    average_order_value: MetricChange;
    ai_highlights: string[];
  };
  growth_retention?: {
    new_user_signups: MetricChange;
    user_retention_rate: MetricChange;
    seller_conversion_rate: MetricChange;
    top_growth_categories: any[];
    top_growth_locations: any[];
    ai_insights: string[];
  };
  trust_safety?: {
    disputes_opened: number;
    disputes_resolved: number;
    fraud_flags: number;
    moderation_incidents: number;
    escrow_delays: number;
    risk_rating: string;
    ai_explanation?: string;
  };
  operations_logistics?: {
    transport_success_rate: number;
    average_delivery_days: number;
    delivery_delays: number;
    partner_performance: any[];
    ai_suggestions: string[];
  };
  system_health?: {
    api_error_rate: number;
    payment_failure_rate: number;
    notification_delivery_rate: number;
    feature_outages: string[];
    ai_analysis?: string;
  };
  recommendations: Recommendation[];
  ai_model_used?: string;
  generation_time_seconds?: number;
}

interface QuickStats {
  total_users: number;
  new_users_week: number;
  active_listings: number;
  pending_disputes: number;
  revenue_week: number;
  generated_at: string;
}

interface SummaryConfig {
  enabled: boolean;
  frequency: string;
  audience: string[];
  tone: string;
  sections_included: string[];
  email_digest_enabled: boolean;
  email_recipients: string[];
  last_generated?: string;
}

const RISK_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

const IMPACT_COLORS: Record<string, 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

const MetricCard = ({ 
  title, 
  metric, 
  icon, 
  format = 'number',
  prefix = '',
  suffix = ''
}: { 
  title: string; 
  metric: MetricChange; 
  icon: React.ReactNode;
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
}) => {
  const formatValue = (value: number) => {
    if (format === 'currency') return `$${value.toLocaleString()}`;
    if (format === 'percent') return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {prefix}{formatValue(metric.current)}{suffix}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
          {metric.change_direction === 'up' && <ArrowUpward fontSize="small" color="success" />}
          {metric.change_direction === 'down' && <ArrowDownward fontSize="small" color="error" />}
          {metric.change_direction === 'flat' && <TrendingFlat fontSize="small" color="action" />}
          <Typography 
            variant="body2" 
            color={metric.change_direction === 'up' ? 'success.main' : metric.change_direction === 'down' ? 'error.main' : 'text.secondary'}
          >
            {metric.change_percent > 0 ? '+' : ''}{metric.change_percent}% vs prev period
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default function ExecutiveSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [config, setConfig] = useState<SummaryConfig | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use main backend API for executive summary (not /admin/)
      const baseUrl = process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://shimmer-perf.preview.emergentagent.com/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      // Load quick stats first (always available)
      try {
        const statsRes = await fetch(`${baseUrl}/executive-summary/quick-stats`, { headers });
        if (statsRes.ok) setQuickStats(await statsRes.json());
      } catch (e) {
        console.warn('Quick stats not available:', e);
      }

      // Load config
      try {
        const configRes = await fetch(`${baseUrl}/executive-summary/config`, { headers });
        if (configRes.ok) setConfig(await configRes.json());
      } catch (e) {
        console.warn('Config not available:', e);
      }

      // Try to load latest summary
      try {
        const summaryRes = await fetch(`${baseUrl}/executive-summary/latest?period=${selectedPeriod}`, { headers });
        if (summaryRes.ok) setSummary(await summaryRes.json());
      } catch (e) {
        console.warn('Summary not available:', e);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (force = false) => {
    setGenerating(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://shimmer-perf.preview.emergentagent.com/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`${baseUrl}/executive-summary/generate?period=${selectedPeriod}&force=${force}`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setSummary(await res.json());
        setSuccess('Executive summary generated successfully!');
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError('Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const updateConfig = async (updates: Partial<SummaryConfig>) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://shimmer-perf.preview.emergentagent.com/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`${baseUrl}/executive-summary/config`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...config, ...updates })
      });
      if (res.ok) {
        setConfig({ ...config!, ...updates });
        setSuccess('Settings updated');
      }
    } catch (err) {
      setError('Failed to update settings');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            Executive Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            AI-powered platform performance overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            onClick={() => generateSummary(true)}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate New'}
          </Button>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Quick Stats Fallback (always shown) */}
          {quickStats && !summary && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Showing quick KPI dashboard. Click "Generate New" to create an AI-powered executive summary.
            </Alert>
          )}

          {/* Quick Stats Cards */}
          {quickStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <People color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">{quickStats.total_users.toLocaleString()}</Typography>
                    <Typography variant="body2" color="textSecondary">Total Users</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUp color="success" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">{quickStats.new_users_week.toLocaleString()}</Typography>
                    <Typography variant="body2" color="textSecondary">New This Week</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <ShoppingCart color="info" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">{quickStats.active_listings.toLocaleString()}</Typography>
                    <Typography variant="body2" color="textSecondary">Active Listings</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Warning color={quickStats.pending_disputes > 0 ? 'error' : 'success'} sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">{quickStats.pending_disputes}</Typography>
                    <Typography variant="body2" color="textSecondary">Pending Disputes</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AccountBalance color="secondary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight="bold">${quickStats.revenue_week.toLocaleString()}</Typography>
                    <Typography variant="body2" color="textSecondary">Revenue (Week)</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* AI Generated Summary */}
          {summary && (
            <>
              {/* Executive Brief */}
              {summary.executive_brief && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesome /> Executive Brief
                  </Typography>
                  <Typography variant="body1">{summary.executive_brief}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.8 }}>
                    Generated {formatDate(summary.generated_at)} • {summary.period_type} report • 
                    {summary.ai_model_used && ` AI: ${summary.ai_model_used}`}
                    {summary.generation_time_seconds && ` • ${summary.generation_time_seconds.toFixed(1)}s`}
                  </Typography>
                </Paper>
              )}

              {/* Key Highlights & What Changed */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" /> Key Highlights
                      </Typography>
                      <List dense>
                        {summary.key_highlights.map((highlight, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <TrendingUp fontSize="small" color="success" />
                            </ListItemIcon>
                            <ListItemText primary={highlight} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Info color="info" /> What Changed
                      </Typography>
                      <List dense>
                        {summary.what_changed.map((change, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <TrendingFlat fontSize="small" color="info" />
                            </ListItemIcon>
                            <ListItemText primary={change} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Lightbulb color="warning" /> What To Do Next
                      </Typography>
                      <List dense>
                        {summary.what_to_do_next.map((action, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <Lightbulb fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText primary={action} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Platform Overview */}
              {summary.platform_overview && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People /> Platform Overview
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <MetricCard 
                        title="Total Users" 
                        metric={summary.platform_overview.total_users} 
                        icon={<People color="primary" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <MetricCard 
                        title="Active Users" 
                        metric={summary.platform_overview.active_users} 
                        icon={<People color="success" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <MetricCard 
                        title="New Listings" 
                        metric={summary.platform_overview.new_listings} 
                        icon={<ShoppingCart color="info" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <MetricCard 
                        title="Transactions" 
                        metric={summary.platform_overview.completed_transactions} 
                        icon={<CheckCircle color="success" />}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <MetricCard 
                        title="Escrow Volume" 
                        metric={summary.platform_overview.escrow_volume} 
                        icon={<AccountBalance color="secondary" />}
                        format="currency"
                      />
                    </Grid>
                  </Grid>
                  {summary.platform_overview.ai_summary && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <strong>AI Insight:</strong> {summary.platform_overview.ai_summary}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Trust & Safety */}
              {summary.trust_safety && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield /> Trust & Safety
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">Overall Risk Rating</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip 
                              label={summary.trust_safety.risk_rating.toUpperCase()} 
                              color={RISK_COLORS[summary.trust_safety.risk_rating]}
                              size="small"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold">{summary.trust_safety.disputes_opened}</Typography>
                          <Typography variant="body2" color="textSecondary">Disputes Opened</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="success.main">{summary.trust_safety.disputes_resolved}</Typography>
                          <Typography variant="body2" color="textSecondary">Resolved</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="error.main">{summary.trust_safety.fraud_flags}</Typography>
                          <Typography variant="body2" color="textSecondary">Fraud Flags</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold">{summary.trust_safety.moderation_incidents}</Typography>
                          <Typography variant="body2" color="textSecondary">Moderation Actions</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  {summary.trust_safety.ai_explanation && (
                    <Alert severity={RISK_COLORS[summary.trust_safety.risk_rating] === 'success' ? 'success' : 'warning'} sx={{ mt: 2 }}>
                      <strong>AI Analysis:</strong> {summary.trust_safety.ai_explanation}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Recommendations */}
              {summary.recommendations.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Lightbulb /> AI Recommendations
                  </Typography>
                  <Grid container spacing={2}>
                    {summary.recommendations.map((rec) => (
                      <Grid size={{ xs: 12, md: 6 }} key={rec.id}>
                        <Card sx={{ 
                          borderLeft: 4, 
                          borderColor: rec.urgency === 'immediate' ? 'error.main' : 
                                       rec.urgency === 'high' ? 'warning.main' : 'info.main' 
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold">{rec.title}</Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Chip 
                                  label={rec.impact_level} 
                                  size="small" 
                                  color={IMPACT_COLORS[rec.impact_level]}
                                />
                                <Chip 
                                  label={rec.urgency} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                            <Typography variant="body2" color="textSecondary">{rec.description}</Typography>
                            <Chip label={rec.category} size="small" sx={{ mt: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Executive Summary Settings</DialogTitle>
        <DialogContent>
          {config && (
            <Box sx={{ pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={config.enabled} 
                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                  />
                }
                label="Enable Executive Summary"
              />
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Default Frequency</InputLabel>
                <Select
                  value={config.frequency}
                  label="Default Frequency"
                  onChange={(e) => updateConfig({ frequency: e.target.value })}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Tone</InputLabel>
                <Select
                  value={config.tone}
                  label="Tone"
                  onChange={(e) => updateConfig({ tone: e.target.value })}
                >
                  <MenuItem value="formal">Formal</MenuItem>
                  <MenuItem value="concise">Concise</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={config.email_digest_enabled} 
                    onChange={(e) => updateConfig({ email_digest_enabled: e.target.checked })}
                  />
                }
                label="Email Digest"
                sx={{ mt: 2 }}
              />
              
              {config.last_generated && (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
                  Last generated: {formatDate(config.last_generated)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
