'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Paper,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  Slider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Notifications,
  Email,
  PhoneAndroid,
  Campaign,
  Settings,
  Analytics,
  Add,
  Edit,
  Delete,
  Refresh,
  Send,
  TrendingUp,
  Schedule,
  People,
  LocalOffer,
  NewReleases,
  PriceChange,
  Message,
  NotificationsActive,
  DoNotDisturb,
  Speed,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface AdminConfig {
  id: string;
  system_enabled: boolean;
  global_max_per_user_per_day: number;
  global_min_interval_minutes: number;
  email_enabled: boolean;
  email_from_name: string;
  email_from_address: string;
  push_enabled: boolean;
  push_sound: boolean;
  push_badge: boolean;
  default_quiet_hours_enabled: boolean;
  default_quiet_hours_start: string;
  default_quiet_hours_end: string;
  analytics_retention_days: number;
  batch_size: number;
  process_interval_seconds: number;
}

interface NotificationTrigger {
  id: string;
  name: string;
  trigger_type: string;
  description: string;
  title_template: string;
  body_template: string;
  channels: string[];
  priority: number;
  min_interval_minutes: number;
  max_per_day: number;
  is_active: boolean;
  created_at: string;
}

interface AnalyticsData {
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    delivery_rate?: number;
    open_rate?: number;
    click_rate?: number;
  };
  daily: Array<{
    date: string;
    trigger_type: string;
    channel: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const TRIGGER_TYPE_LABELS: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  new_listing_in_category: { label: 'New Listing Alert', icon: <NewReleases />, color: '#4CAF50' },
  price_drop_saved_item: { label: 'Price Drop Alert', icon: <PriceChange />, color: '#FF5722' },
  message_received: { label: 'New Message', icon: <Message />, color: '#2196F3' },
  offer_received: { label: 'Offer Received', icon: <LocalOffer />, color: '#9C27B0' },
  offer_accepted: { label: 'Offer Accepted', icon: <CheckCircle />, color: '#4CAF50' },
  weekly_digest: { label: 'Weekly Digest', icon: <Schedule />, color: '#607D8B' },
  promotional: { label: 'Promotional', icon: <Campaign />, color: '#FF9800' },
};

export default function SmartNotificationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, triggersRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/smart-notifications/admin/config`),
        fetch(`${API_BASE}/smart-notifications/admin/triggers`),
        fetch(`${API_BASE}/smart-notifications/admin/analytics`),
      ]);
      
      if (configRes.ok) setConfig(await configRes.json());
      if (triggersRes.ok) setTriggers(await triggersRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AdminConfig>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/smart-notifications/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveTrigger = async (triggerData: Partial<NotificationTrigger>) => {
    setSaving(true);
    try {
      const url = editingTrigger
        ? `${API_BASE}/smart-notifications/admin/triggers/${editingTrigger.id}`
        : `${API_BASE}/smart-notifications/admin/triggers`;
      
      const res = await fetch(url, {
        method: editingTrigger ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggerData),
      });
      
      if (res.ok) {
        setTriggerDialogOpen(false);
        setEditingTrigger(null);
        fetchData();
        setSuccess('Trigger saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save trigger');
    } finally {
      setSaving(false);
    }
  };

  const deleteTrigger = async (triggerId: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/smart-notifications/admin/triggers/${triggerId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setTriggers(triggers.filter(t => t.id !== triggerId));
        setSuccess('Trigger deleted');
      }
    } catch (err) {
      setError('Failed to delete trigger');
    }
  };

  const processNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/smart-notifications/admin/process`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const result = await res.json();
        setSuccess(`Processed ${result.processed || 0} notifications`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to process notifications');
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActive sx={{ color: '#2E7D32' }} />
            Smart Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalized notifications based on user behavior and interests
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
            startIcon={<Send />}
            onClick={processNotifications}
            color="primary"
          >
            Process Queue
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E8F5E9' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="#2E7D32" fontWeight="bold">
                    {analytics?.totals.sent || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Sent</Typography>
                </Box>
                <Send sx={{ fontSize: 40, color: '#2E7D32', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="#1976D2" fontWeight="bold">
                    {analytics?.totals.delivery_rate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Delivery Rate</Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: '#1976D2', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#FFF3E0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="#E65100" fontWeight="bold">
                    {analytics?.totals.open_rate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Open Rate</Typography>
                </Box>
                <Notifications sx={{ fontSize: 40, color: '#E65100', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#F3E5F5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" color="#7B1FA2" fontWeight="bold">
                    {analytics?.totals.click_rate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Click Rate</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: '#7B1FA2', opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<Settings />} label="System Settings" />
          <Tab icon={<Campaign />} label="Triggers" />
          <Tab icon={<Analytics />} label="Analytics" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabValue === 0 && config && (
        <Grid container spacing={3}>
          {/* System Toggle */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">System Status</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enable or disable the entire smart notification system
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.system_enabled}
                        onChange={(e) => updateConfig({ system_enabled: e.target.checked })}
                        color="success"
                        size="medium"
                      />
                    }
                    label={config.system_enabled ? 'Enabled' : 'Disabled'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Email Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Email sx={{ color: '#F44336' }} />
                  <Typography variant="h6">Email Settings</Typography>
                  <Switch
                    checked={config.email_enabled}
                    onChange={(e) => updateConfig({ email_enabled: e.target.checked })}
                    size="small"
                  />
                </Box>
                <TextField
                  fullWidth
                  label="From Name"
                  value={config.email_from_name}
                  onChange={(e) => setConfig({ ...config, email_from_name: e.target.value })}
                  sx={{ mb: 2 }}
                  disabled={!config.email_enabled}
                />
                <TextField
                  fullWidth
                  label="From Email"
                  value={config.email_from_address}
                  onChange={(e) => setConfig({ ...config, email_from_address: e.target.value })}
                  disabled={!config.email_enabled}
                />
                <Button 
                  variant="outlined" 
                  sx={{ mt: 2 }}
                  onClick={() => updateConfig({ 
                    email_from_name: config.email_from_name,
                    email_from_address: config.email_from_address 
                  })}
                  disabled={saving}
                >
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Push Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhoneAndroid sx={{ color: '#4CAF50' }} />
                  <Typography variant="h6">Push Settings</Typography>
                  <Switch
                    checked={config.push_enabled}
                    onChange={(e) => updateConfig({ push_enabled: e.target.checked })}
                    size="small"
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.push_sound}
                      onChange={(e) => updateConfig({ push_sound: e.target.checked })}
                      disabled={!config.push_enabled}
                    />
                  }
                  label="Play sound"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.push_badge}
                      onChange={(e) => updateConfig({ push_badge: e.target.checked })}
                      disabled={!config.push_enabled}
                    />
                  }
                  label="Show badge"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Throttling */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Speed sx={{ color: '#FF9800' }} />
                  <Typography variant="h6">Throttling</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Max notifications per user per day: {config.global_max_per_user_per_day}
                </Typography>
                <Slider
                  value={config.global_max_per_user_per_day}
                  onChange={(_, v) => setConfig({ ...config, global_max_per_user_per_day: v as number })}
                  onChangeCommitted={(_, v) => updateConfig({ global_max_per_user_per_day: v as number })}
                  min={5}
                  max={100}
                  marks={[
                    { value: 5, label: '5' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                  ]}
                />
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Minimum interval between notifications: {config.global_min_interval_minutes} min
                </Typography>
                <Slider
                  value={config.global_min_interval_minutes}
                  onChange={(_, v) => setConfig({ ...config, global_min_interval_minutes: v as number })}
                  onChangeCommitted={(_, v) => updateConfig({ global_min_interval_minutes: v as number })}
                  min={1}
                  max={60}
                  marks={[
                    { value: 1, label: '1m' },
                    { value: 30, label: '30m' },
                    { value: 60, label: '60m' },
                  ]}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Quiet Hours */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DoNotDisturb sx={{ color: '#607D8B' }} />
                  <Typography variant="h6">Default Quiet Hours</Typography>
                  <Switch
                    checked={config.default_quiet_hours_enabled}
                    onChange={(e) => updateConfig({ default_quiet_hours_enabled: e.target.checked })}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Start Time"
                    type="time"
                    value={config.default_quiet_hours_start}
                    onChange={(e) => updateConfig({ default_quiet_hours_start: e.target.value })}
                    disabled={!config.default_quiet_hours_enabled}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End Time"
                    type="time"
                    value={config.default_quiet_hours_end}
                    onChange={(e) => updateConfig({ default_quiet_hours_end: e.target.value })}
                    disabled={!config.default_quiet_hours_enabled}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Notification Triggers</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setEditingTrigger(null);
                  setTriggerDialogOpen(true);
                }}
              >
                Create Trigger
              </Button>
            </Box>
            
            {triggers.length === 0 ? (
              <Alert severity="info">
                No custom triggers configured. The system uses default triggers for new listings, price drops, and messages.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Channels</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Limits</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {triggers.map((trigger) => {
                      const typeInfo = TRIGGER_TYPE_LABELS[trigger.trigger_type] || { label: trigger.trigger_type, icon: <Notifications />, color: '#666' };
                      return (
                        <TableRow key={trigger.id}>
                          <TableCell>
                            <Typography fontWeight="bold">{trigger.name}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                              {trigger.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={typeInfo.icon}
                              label={typeInfo.label}
                              size="small"
                              sx={{ bgcolor: `${typeInfo.color}20`, color: typeInfo.color }}
                            />
                          </TableCell>
                          <TableCell>
                            {trigger.channels.map((ch) => (
                              <Chip
                                key={ch}
                                label={ch}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </TableCell>
                          <TableCell>{trigger.priority}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {trigger.max_per_day}/day
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {trigger.min_interval_minutes}min interval
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={trigger.is_active ? 'Active' : 'Inactive'}
                              color={trigger.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingTrigger(trigger);
                                setTriggerDialogOpen(true);
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteTrigger(trigger.id)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && analytics && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance Overview</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{analytics.totals.sent}</Typography>
                      <Typography variant="body2">Sent</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">{analytics.totals.delivered}</Typography>
                      <Typography variant="body2">Delivered</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">{analytics.totals.opened}</Typography>
                      <Typography variant="body2">Opened</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">{analytics.totals.clicked}</Typography>
                      <Typography variant="body2">Clicked</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">{analytics.totals.failed}</Typography>
                      <Typography variant="body2">Failed</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {analytics.daily.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Daily Breakdown</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Trigger Type</TableCell>
                          <TableCell>Channel</TableCell>
                          <TableCell align="right">Sent</TableCell>
                          <TableCell align="right">Delivered</TableCell>
                          <TableCell align="right">Opened</TableCell>
                          <TableCell align="right">Clicked</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analytics.daily.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>
                              <Chip
                                label={TRIGGER_TYPE_LABELS[row.trigger_type]?.label || row.trigger_type}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{row.channel}</TableCell>
                            <TableCell align="right">{row.sent}</TableCell>
                            <TableCell align="right">{row.delivered}</TableCell>
                            <TableCell align="right">{row.opened}</TableCell>
                            <TableCell align="right">{row.clicked}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {analytics.daily.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                No analytics data yet. Analytics will appear once notifications start being sent.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* Trigger Dialog */}
      <TriggerDialog
        open={triggerDialogOpen}
        onClose={() => {
          setTriggerDialogOpen(false);
          setEditingTrigger(null);
        }}
        trigger={editingTrigger}
        onSave={saveTrigger}
        saving={saving}
      />
    </Box>
  );
}

// Trigger Dialog Component
function TriggerDialog({
  open,
  onClose,
  trigger,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  trigger: NotificationTrigger | null;
  onSave: (data: Partial<NotificationTrigger>) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<NotificationTrigger>>({
    name: '',
    trigger_type: 'new_listing_in_category',
    description: '',
    title_template: '',
    body_template: '',
    channels: ['push', 'in_app'],
    priority: 5,
    min_interval_minutes: 60,
    max_per_day: 10,
    is_active: true,
  });

  useEffect(() => {
    if (trigger) {
      setFormData(trigger);
    } else {
      setFormData({
        name: '',
        trigger_type: 'new_listing_in_category',
        description: '',
        title_template: '',
        body_template: '',
        channels: ['push', 'in_app'],
        priority: 5,
        min_interval_minutes: 60,
        max_per_day: 10,
        is_active: true,
      });
    }
  }, [trigger, open]);

  const handleChannelChange = (channel: string) => {
    const channels = formData.channels || [];
    if (channels.includes(channel)) {
      setFormData({ ...formData, channels: channels.filter(c => c !== channel) });
    } else {
      setFormData({ ...formData, channels: [...channels, channel] });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {trigger ? 'Edit Trigger' : 'Create Trigger'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                label="Trigger Type"
              >
                {Object.entries(TRIGGER_TYPE_LABELS).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {val.icon}
                      {val.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Title Template"
              value={formData.title_template}
              onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
              helperText="Use {{variable}} for dynamic content"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Body Template"
              value={formData.body_template}
              onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
              helperText="Use {{variable}} for dynamic content"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>Channels</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['push', 'email', 'in_app'].map((ch) => (
                <Chip
                  key={ch}
                  label={ch}
                  onClick={() => handleChannelChange(ch)}
                  color={formData.channels?.includes(ch) ? 'primary' : 'default'}
                  variant={formData.channels?.includes(ch) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Priority (1-10)"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Min Interval (minutes)"
              value={formData.min_interval_minutes}
              onChange={(e) => setFormData({ ...formData, min_interval_minutes: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Max Per Day"
              value={formData.max_per_day}
              onChange={(e) => setFormData({ ...formData, max_per_day: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(formData)}
          disabled={saving || !formData.name}
        >
          {saving ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
