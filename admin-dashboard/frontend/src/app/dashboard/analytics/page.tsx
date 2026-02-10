'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Snackbar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Inventory,
  Visibility,
  ShoppingCart,
  Settings,
  Notifications,
  Analytics,
  Save,
  Refresh,
  Edit,
  Check,
  Close,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { AnalyticsOverview } from '@/types';

const COLORS = ['#2E7D32', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

interface AnalyticsSettings {
  is_enabled: boolean;
  availability: string;
  lock_type: string;
  visible_metrics: {
    views: boolean;
    unique_views: boolean;
    saves: boolean;
    chats: boolean;
    offers: boolean;
    conversion_rate: boolean;
    location_views: boolean;
    boost_impact: boolean;
    ai_insights: boolean;
  };
  ai_insights_enabled: boolean;
}

interface EngagementConfig {
  enabled: boolean;
  views_threshold_multiplier: number;
  saves_threshold_multiplier: number;
  chats_threshold_multiplier: number;
  minimum_views_for_notification: number;
  notification_cooldown_hours: number;
  check_interval_minutes: number;
}

interface PlatformAnalytics {
  total_events: number;
  top_listings: any[];
  top_categories: { category: string; views: number }[];
  top_sellers: any[];
  analytics_usage: any[];
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change && change > 0;
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                {isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={isPositive ? 'success.main' : 'error.main'}
                  fontWeight={500}
                >
                  {isPositive ? '+' : ''}{change}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [categoryData, setCategoryData] = useState<{ category_name: string; count: number }[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [timeRange, setTimeRange] = useState(30);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');
  const [tabValue, setTabValue] = useState(0);
  
  // Seller Analytics Settings
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings | null>(null);
  const [engagementConfig, setEngagementConfig] = useState<EngagementConfig | null>(null);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [overviewData, categories, growth] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getListingsByCategory(),
          api.getUsersGrowth(timeRange),
        ]);
        setOverview(overviewData);
        setCategoryData(categories.slice(0, 8));
        setUserGrowth(growth);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timeRange]);

  // Load seller analytics settings when tab changes
  useEffect(() => {
    if (tabValue === 1 || tabValue === 2) {
      loadSellerAnalyticsSettings();
    }
  }, [tabValue]);

  const loadSellerAnalyticsSettings = async () => {
    setSettingsLoading(true);
    try {
      const [settings, engagement, platform] = await Promise.all([
        api.get('/analytics/admin/settings'),
        api.get('/analytics/admin/engagement-notification-config'),
        api.get('/analytics/admin/platform-analytics'),
      ]);
      setAnalyticsSettings(settings);
      setEngagementConfig(engagement);
      setPlatformAnalytics(platform);
    } catch (error) {
      console.error('Failed to load seller analytics settings:', error);
      setSnackbar({ open: true, message: 'Failed to load settings', severity: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveAnalyticsSettings = async () => {
    if (!analyticsSettings) return;
    setSavingSettings(true);
    try {
      await api.put('/analytics/admin/settings', analyticsSettings as unknown as Record<string, unknown> as unknown as Record<string, unknown>);
      setSnackbar({ open: true, message: 'Analytics settings saved!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const saveEngagementConfig = async () => {
    if (!engagementConfig) return;
    setSavingSettings(true);
    try {
      await api.put('/analytics/admin/engagement-notification-config', engagementConfig as unknown as Record<string, unknown>);
      setSnackbar({ open: true, message: 'Notification settings saved!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save notification settings', severity: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const triggerEngagementCheck = async () => {
    try {
      await api.post('/analytics/admin/trigger-engagement-check');
      setSnackbar({ open: true, message: 'Engagement check triggered!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to trigger check', severity: 'error' });
    }
  };

  // Generate mock data for demo purposes
  const generateListingsGrowth = () => {
    return userGrowth.map((item, index) => ({
      ...item,
      listings: Math.floor(Math.random() * 20 + 5),
      views: Math.floor(Math.random() * 500 + 100),
    }));
  };

  const listingsGrowth = generateListingsGrowth();

  // Calculate conversion rate data
  const conversionData = [
    { name: 'Views', value: overview?.listings.total ? overview.listings.total * 150 : 0 },
    { name: 'Inquiries', value: overview?.listings.total ? Math.floor(overview.listings.total * 30) : 0 },
    { name: 'Responses', value: overview?.listings.total ? Math.floor(overview.listings.total * 15) : 0 },
    { name: 'Deals', value: overview?.listings.total ? Math.floor(overview.listings.total * 5) : 0 },
  ];

  // Status distribution
  const statusData = overview ? [
    { name: 'Active', value: overview.listings.active, color: '#4CAF50' },
    { name: 'Pending', value: overview.listings.pending, color: '#FF9800' },
    { name: 'Other', value: Math.max(0, overview.listings.total - overview.listings.active - overview.listings.pending), color: '#9E9E9E' },
  ] : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Marketplace performance insights and seller analytics management
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Analytics />} label="Platform Analytics" iconPosition="start" />
        <Tab icon={<Settings />} label="Seller Analytics Settings" iconPosition="start" />
        <Tab icon={<Notifications />} label="Engagement Notifications" iconPosition="start" />
      </Tabs>

      {/* Tab 0: Platform Analytics (existing content) */}
      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value as number)}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
                <MenuItem value={365}>Last year</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Users"
                value={overview?.users.total.toLocaleString() || 0}
                change={overview?.users.new_30d ? Math.round((overview.users.new_30d / overview.users.total) * 100) : 0}
                icon={<People />}
                color="#2196F3"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Active Listings"
                value={overview?.listings.active.toLocaleString() || 0}
                change={overview?.listings.new_7d ? Math.round((overview.listings.new_7d / overview.listings.active) * 100) : 0}
                icon={<Inventory />}
                color="#4CAF50"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Views"
                value={((overview?.listings.total || 0) * 150).toLocaleString()}
                change={12}
                icon={<Visibility />}
                color="#9C27B0"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Conversion Rate"
                value="3.2%"
                change={0.5}
                icon={<ShoppingCart />}
                color="#FF9800"
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      User Growth
                    </Typography>
                    <ToggleButtonGroup
                      value={chartType}
                      exclusive
                      onChange={(_, v) => v && setChartType(v)}
                      size="small"
                    >
                      <ToggleButton value="line">Line</ToggleButton>
                      <ToggleButton value="area">Area</ToggleButton>
                      <ToggleButton value="bar">Bar</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Box sx={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Area type="monotone" dataKey="count" name="New Users" stroke="#2E7D32" fill="#4CAF50" fillOpacity={0.3} />
                        </AreaChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" name="New Users" stroke="#2E7D32" strokeWidth={2} />
                        </LineChart>
                      ) : (
                        <BarChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="New Users" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Listing Status Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Platform Analytics from Seller System */}
          {platformAnalytics && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Top Performing Listings
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Listing</TableCell>
                          <TableCell align="right">Views</TableCell>
                          <TableCell align="right">Conversion</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {platformAnalytics.top_listings.slice(0, 5).map((listing, index) => (
                          <TableRow key={index}>
                            <TableCell>{listing.title?.slice(0, 30) || 'N/A'}...</TableCell>
                            <TableCell align="right">{listing.views}</TableCell>
                            <TableCell align="right">{listing.conversion_rate?.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Top Categories by Views
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={platformAnalytics.top_categories.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="views" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* Tab 1: Seller Analytics Settings */}
      {tabValue === 1 && (
        <Box>
          {settingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : analyticsSettings ? (
            <Grid container spacing={3}>
              {/* Main Toggle */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          Seller Analytics
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Enable or disable analytics features for sellers
                        </Typography>
                      </Box>
                      <Switch
                        checked={analyticsSettings.is_enabled}
                        onChange={(e) => setAnalyticsSettings({ ...analyticsSettings, is_enabled: e.target.checked })}
                        color="success"
                        size="medium"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Availability Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Availability
                    </Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Who can access analytics?</InputLabel>
                      <Select
                        value={analyticsSettings.availability}
                        label="Who can access analytics?"
                        onChange={(e) => setAnalyticsSettings({ ...analyticsSettings, availability: e.target.value })}
                      >
                        <MenuItem value="all">All Sellers</MenuItem>
                        <MenuItem value="verified">Verified Sellers Only</MenuItem>
                        <MenuItem value="premium">Premium Sellers Only</MenuItem>
                        <MenuItem value="manual">Manual Override (Per-Seller)</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Lock Type</InputLabel>
                      <Select
                        value={analyticsSettings.lock_type}
                        label="Lock Type"
                        onChange={(e) => setAnalyticsSettings({ ...analyticsSettings, lock_type: e.target.value })}
                      >
                        <MenuItem value="none">No Lock (Free Access)</MenuItem>
                        <MenuItem value="subscription">Subscription Required</MenuItem>
                        <MenuItem value="credits">Credits Required</MenuItem>
                        <MenuItem value="listing_age">Minimum Listing Age</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>
                </Card>
              </Grid>

              {/* Visible Metrics */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Visible Metrics
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Choose which metrics sellers can see
                    </Typography>
                    
                    <Grid container spacing={1}>
                      {Object.entries(analyticsSettings.visible_metrics).map(([key, value]) => (
                        <Grid size={{ xs: 6 }} key={key}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={value}
                                onChange={(e) => setAnalyticsSettings({
                                  ...analyticsSettings,
                                  visible_metrics: {
                                    ...analyticsSettings.visible_metrics,
                                    [key]: e.target.checked
                                  }
                                })}
                                size="small"
                              />
                            }
                            label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            sx={{ '& .MuiTypography-root': { fontSize: '0.875rem' } }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* AI Insights Toggle */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          AI-Powered Insights
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Generate intelligent suggestions using GPT-5.2
                        </Typography>
                      </Box>
                      <Switch
                        checked={analyticsSettings.ai_insights_enabled}
                        onChange={(e) => setAnalyticsSettings({ ...analyticsSettings, ai_insights_enabled: e.target.checked })}
                        color="success"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Save Button */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={loadSellerAnalyticsSettings}
                    startIcon={<Refresh />}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={saveAnalyticsSettings}
                    disabled={savingSettings}
                    startIcon={savingSettings ? <CircularProgress size={16} /> : <Save />}
                  >
                    Save Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="warning">Unable to load settings. Please try again.</Alert>
          )}
        </Box>
      )}

      {/* Tab 2: Engagement Notifications */}
      {tabValue === 2 && (
        <Box>
          {settingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : engagementConfig ? (
            <Grid container spacing={3}>
              {/* Main Toggle */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          Engagement Boost Notifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Automatically notify sellers when their listings get significant engagement
                        </Typography>
                      </Box>
                      <Switch
                        checked={engagementConfig.enabled}
                        onChange={(e) => setEngagementConfig({ ...engagementConfig, enabled: e.target.checked })}
                        color="success"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Threshold Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Notification Thresholds
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Trigger notifications when metrics exceed these multipliers of the seller's average
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" gutterBottom>
                        Views Spike: {engagementConfig.views_threshold_multiplier}x average
                      </Typography>
                      <Slider
                        value={engagementConfig.views_threshold_multiplier}
                        onChange={(_, v) => setEngagementConfig({ ...engagementConfig, views_threshold_multiplier: v as number })}
                        min={1.5}
                        max={5}
                        step={0.5}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" gutterBottom>
                        Saves Spike: {engagementConfig.saves_threshold_multiplier}x average
                      </Typography>
                      <Slider
                        value={engagementConfig.saves_threshold_multiplier}
                        onChange={(_, v) => setEngagementConfig({ ...engagementConfig, saves_threshold_multiplier: v as number })}
                        min={1.5}
                        max={5}
                        step={0.5}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Chats Spike: {engagementConfig.chats_threshold_multiplier}x average
                      </Typography>
                      <Slider
                        value={engagementConfig.chats_threshold_multiplier}
                        onChange={(_, v) => setEngagementConfig({ ...engagementConfig, chats_threshold_multiplier: v as number })}
                        min={1.5}
                        max={5}
                        step={0.5}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Timing Settings */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Timing & Limits
                    </Typography>

                    <TextField
                      fullWidth
                      type="number"
                      label="Minimum Views Before Notification"
                      value={engagementConfig.minimum_views_for_notification}
                      onChange={(e) => setEngagementConfig({ ...engagementConfig, minimum_views_for_notification: parseInt(e.target.value) || 0 })}
                      sx={{ mb: 2 }}
                      helperText="Listings must have at least this many views today"
                    />

                    <TextField
                      fullWidth
                      type="number"
                      label="Cooldown Period (hours)"
                      value={engagementConfig.notification_cooldown_hours}
                      onChange={(e) => setEngagementConfig({ ...engagementConfig, notification_cooldown_hours: parseInt(e.target.value) || 0 })}
                      sx={{ mb: 2 }}
                      helperText="Hours between notifications for same listing"
                    />

                    <TextField
                      fullWidth
                      type="number"
                      label="Check Interval (minutes)"
                      value={engagementConfig.check_interval_minutes}
                      onChange={(e) => setEngagementConfig({ ...engagementConfig, check_interval_minutes: parseInt(e.target.value) || 0 })}
                      helperText="How often to scan for engagement spikes"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Actions */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={triggerEngagementCheck}
                    startIcon={<Refresh />}
                  >
                    Trigger Manual Check
                  </Button>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={loadSellerAnalyticsSettings}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={saveEngagementConfig}
                      disabled={savingSettings}
                      startIcon={savingSettings ? <CircularProgress size={16} /> : <Save />}
                    >
                      Save Settings
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Sample Notification Preview */}
              <Grid size={{ xs: 12 }}>
                <Card sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Notification Preview
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Card sx={{ flex: 1, minWidth: 250 }}>
                        <CardContent>
                          <Chip label="Views Spike" color="success" size="small" sx={{ mb: 1 }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            Your listing is trending!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            "iPhone 15 Pro Max..." got 50 views today - 3x your average!
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card sx={{ flex: 1, minWidth: 250 }}>
                        <CardContent>
                          <Chip label="Saves Spike" color="primary" size="small" sx={{ mb: 1 }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            People are saving your listing!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            "MacBook Pro 16..." was saved 8 times today - buyers are interested!
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="warning">Unable to load notification settings. Please try again.</Alert>
          )}
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
