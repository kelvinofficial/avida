'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  Message,
  ShoppingCart,
  Star,
  PlayArrow,
  Refresh,
  Settings,
  Schedule,
  CheckCircle,
  Warning,
  Speed,
  EmojiEvents,
  Email,
  Sms,
  People,
  Analytics,
  LocalOffer,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`seller-analytics-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface AnalyticsControl {
  seller_analytics_enabled: boolean;
  public_leaderboard_enabled: boolean;
  badge_system_enabled: boolean;
  max_analytics_retention_days: number;
}

interface TopPerformer {
  listing_id: string;
  title: string;
  views: number;
  unique_viewers: number;
  category: string;
  seller_id?: string;
  seller_name?: string;
}

interface CronJob {
  schedule: string;
  last_run: string;
  status: string;
  [key: string]: any;
}

interface CronStatus {
  spike_detection: CronJob;
  badge_evaluation: CronJob;
  weekly_digest: CronJob;
  sms_alerts: CronJob;
}

export default function SellerAnalyticsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data states
  const [controls, setControls] = useState<AnalyticsControl | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  
  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editedControls, setEditedControls] = useState<AnalyticsControl | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [controlsRes, performersRes, cronRes] = await Promise.all([
        api.get('/seller-analytics/control'),
        api.get('/analytics/top-performers?limit=10&period=7d'),
        api.get('/analytics/cron/status'),
      ]);
      
      setControls(controlsRes);
      setTopPerformers(performersRes.top_listings || []);
      setCronStatus(cronRes);
    } catch (err: any) {
      console.error('Failed to fetch seller analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load seller analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRunCronJob = async (jobType: string) => {
    setRunningJob(jobType);
    setError(null);
    setSuccess(null);
    
    try {
      let endpoint = '';
      switch (jobType) {
        case 'spike_detection':
          endpoint = '/analytics/cron/run-spike-detection';
          break;
        case 'badge_evaluation':
          endpoint = '/analytics/cron/run-badge-evaluation';
          break;
        case 'weekly_digest':
          endpoint = '/analytics/cron/run-weekly-digest';
          break;
        case 'sms_alerts':
          endpoint = '/analytics/cron/run-sms-alerts';
          break;
      }
      
      const result = await api.post(endpoint);
      setSuccess(`${jobType.replace('_', ' ')} completed successfully`);
      
      // Refresh cron status
      const cronRes = await api.get('/analytics/cron/status');
      setCronStatus(cronRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to run ${jobType}`);
    } finally {
      setRunningJob(null);
    }
  };

  const handleSaveControls = async () => {
    if (!editedControls) return;
    
    setError(null);
    try {
      await api.put('/seller-analytics/control', editedControls);
      setControls(editedControls);
      setSettingsOpen(false);
      setSuccess('Analytics settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Seller Product Performance & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor seller performance, manage analytics features, and run background jobs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => {
              setEditedControls(controls);
              setSettingsOpen(true);
            }}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Analytics color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Analytics Status
                </Typography>
              </Box>
              <Chip
                label={controls?.seller_analytics_enabled ? 'Enabled' : 'Disabled'}
                color={controls?.seller_analytics_enabled ? 'success' : 'error'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmojiEvents color="warning" />
                <Typography variant="subtitle2" color="text.secondary">
                  Badge System
                </Typography>
              </Box>
              <Chip
                label={controls?.badge_system_enabled ? 'Active' : 'Inactive'}
                color={controls?.badge_system_enabled ? 'success' : 'default'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <People color="info" />
                <Typography variant="subtitle2" color="text.secondary">
                  Leaderboard
                </Typography>
              </Box>
              <Chip
                label={controls?.public_leaderboard_enabled ? 'Public' : 'Private'}
                color={controls?.public_leaderboard_enabled ? 'primary' : 'default'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Data Retention
                </Typography>
              </Box>
              <Typography variant="h6">
                {controls?.max_analytics_retention_days || 90} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Top Performers" icon={<TrendingUp />} iconPosition="start" />
          <Tab label="Cron Jobs" icon={<Schedule />} iconPosition="start" />
          <Tab label="Notifications" icon={<Email />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Listing</TableCell>
                  <TableCell align="right">Views</TableCell>
                  <TableCell align="right">Unique Viewers</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Performance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topPerformers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">No data available</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  topPerformers.map((performer, index) => (
                    <TableRow key={performer.listing_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {index < 3 && (
                            <EmojiEvents 
                              sx={{ 
                                color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                              }} 
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {performer.title || 'Untitled'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {performer.listing_id.slice(0, 8)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Visibility fontSize="small" color="action" />
                          {performer.views.toLocaleString()}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{performer.unique_viewers.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={performer.category || 'Uncategorized'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((performer.views / (topPerformers[0]?.views || 1)) * 100, 100)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {cronStatus && Object.entries(cronStatus).map(([key, job]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {job.schedule}
                      </Typography>
                    </Box>
                    <Chip
                      icon={job.status === 'running' ? <CheckCircle /> : <Warning />}
                      label={job.status}
                      color={job.status === 'running' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Schedule fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Last Run"
                        secondary={formatDate(job.last_run)}
                      />
                    </ListItem>
                    {job.spikes_last_24h !== undefined && (
                      <ListItem>
                        <ListItemIcon>
                          <TrendingUp fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Spikes Detected (24h)"
                          secondary={job.spikes_last_24h}
                        />
                      </ListItem>
                    )}
                    {job.badges_today !== undefined && (
                      <ListItem>
                        <ListItemIcon>
                          <EmojiEvents fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Badges Awarded Today"
                          secondary={job.badges_today}
                        />
                      </ListItem>
                    )}
                    {job.digests_this_week !== undefined && (
                      <ListItem>
                        <ListItemIcon>
                          <Email fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Digests This Week"
                          secondary={job.digests_this_week}
                        />
                      </ListItem>
                    )}
                    {job.alerts_last_24h !== undefined && (
                      <ListItem>
                        <ListItemIcon>
                          <Sms fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary="SMS Alerts (24h)"
                          secondary={job.alerts_last_24h}
                        />
                      </ListItem>
                    )}
                  </List>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Button
                    variant="outlined"
                    startIcon={runningJob === key ? <CircularProgress size={16} /> : <PlayArrow />}
                    onClick={() => handleRunCronJob(key)}
                    disabled={!!runningJob}
                    fullWidth
                  >
                    {runningJob === key ? 'Running...' : 'Run Now'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Email Notifications
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Sellers receive email notifications for:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="View spike alerts" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Weekly performance digest" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Badge earned notifications" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Sms sx={{ mr: 1, verticalAlign: 'middle' }} />
                  SMS Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Premium sellers can opt-in to SMS alerts for:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><LocalOffer color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="High-value view spikes" 
                      secondary="Minimum 50 views, 100% increase"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Warning color="error" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="Urgent alerts only" 
                      secondary="To minimize SMS costs"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Analytics Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editedControls?.seller_analytics_enabled || false}
                  onChange={(e) => setEditedControls(prev => prev ? {...prev, seller_analytics_enabled: e.target.checked} : null)}
                />
              }
              label="Enable Seller Analytics"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Allow sellers to view their listing performance metrics
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={editedControls?.badge_system_enabled || false}
                  onChange={(e) => setEditedControls(prev => prev ? {...prev, badge_system_enabled: e.target.checked} : null)}
                />
              }
              label="Enable Badge System"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Award badges based on seller performance
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={editedControls?.public_leaderboard_enabled || false}
                  onChange={(e) => setEditedControls(prev => prev ? {...prev, public_leaderboard_enabled: e.target.checked} : null)}
                />
              }
              label="Public Leaderboard"
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Show top sellers on the public leaderboard
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="Data Retention (days)"
              value={editedControls?.max_analytics_retention_days || 90}
              onChange={(e) => setEditedControls(prev => prev ? {...prev, max_analytics_retention_days: parseInt(e.target.value) || 90} : null)}
              sx={{ mt: 2 }}
              helperText="How long to keep analytics data"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveControls}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
