'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
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
  Preview,
  Code,
  Palette,
  CalendarMonth,
  PlayArrow,
  Stop,
  ExpandMore,
  Visibility,
  ContentCopy,
  Smartphone,
  DesktopWindows,
  Science,
  EmojiEvents,
} from '@mui/icons-material';

// =============================================================================
// TYPES
// =============================================================================

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

interface EmailTemplate {
  id: string;
  name: string;
  trigger_type: string;
  subject: string;
  html_content: string;
  preview_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScheduledCampaign {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  title: string;
  body: string;
  channels: string[];
  target_segments: string[];
  scheduled_at: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  sent_count?: number;
  created_at: string;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  control_title: string;
  control_body: string;
  variant_a_title: string;
  variant_a_body: string;
  variant_b_title?: string;
  variant_b_body?: string;
  control_percentage: number;
  variant_a_percentage: number;
  variant_b_percentage: number;
  control_sent: number;
  control_opened: number;
  control_clicked: number;
  control_converted: number;
  variant_a_sent: number;
  variant_a_opened: number;
  variant_a_clicked: number;
  variant_a_converted: number;
  variant_b_sent: number;
  variant_b_opened: number;
  variant_b_clicked: number;
  variant_b_converted: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  winner?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const TRIGGER_TYPE_LABELS: Record<string, { label: string; icon: ReactElement; color: string }> = {
  new_listing_in_category: { label: 'New Listing Alert', icon: <NewReleases />, color: '#4CAF50' },
  price_drop_saved_item: { label: 'Price Drop Alert', icon: <PriceChange />, color: '#FF5722' },
  message_received: { label: 'New Message', icon: <Message />, color: '#2196F3' },
  offer_received: { label: 'Offer Received', icon: <LocalOffer />, color: '#9C27B0' },
  offer_accepted: { label: 'Offer Accepted', icon: <CheckCircle />, color: '#4CAF50' },
  seller_reply: { label: 'Seller Reply', icon: <Message />, color: '#00BCD4' },
  similar_listing_alert: { label: 'Similar Listing', icon: <Visibility />, color: '#FF9800' },
  weekly_digest: { label: 'Weekly Digest', icon: <Schedule />, color: '#607D8B' },
  promotional: { label: 'Promotional', icon: <Campaign />, color: '#FF9800' },
};

// Helper to build API URL (API_BASE already contains /api)
const apiUrl = (path: string) => `${API_BASE}${path}`;

const SAMPLE_VARIABLES = {
  user_name: 'John',
  listing_title: 'iPhone 15 Pro Max 256GB',
  price: '899',
  old_price: '999',
  currency: '€',
  drop_percent: '10',
  savings: '100',
  category_name: 'Electronics',
  location: 'Dublin',
  sender_name: 'Sarah',
  message_preview: 'Hi, is this still available?',
  listing_image: 'https://via.placeholder.com/300x200?text=Product+Image',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SmartNotificationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [triggers, setTriggers] = useState<NotificationTrigger[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<NotificationTrigger | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ title: string; body: string; type: string }>({ title: '', body: '', type: 'push' });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ScheduledCampaign | null>(null);
  const [abTestDialogOpen, setAbTestDialogOpen] = useState(false);
  const [editingAbTest, setEditingAbTest] = useState<ABTest | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, triggersRes, analyticsRes, templatesRes, campaignsRes, abTestsRes] = await Promise.all([
        fetch(`${API_BASE}/smart-notifications/admin/config`),
        fetch(`${API_BASE}/smart-notifications/admin/triggers`),
        fetch(`${API_BASE}/smart-notifications/admin/analytics`),
        fetch(`${API_BASE}/smart-notifications/admin/templates`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/smart-notifications/admin/campaigns`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/smart-notifications/admin/ab-tests`),
      ]);
      
      if (configRes.ok) setConfig(await configRes.json());
      if (triggersRes.ok) setTriggers(await triggersRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if ((templatesRes as Response).ok) setTemplates(await (templatesRes as Response).json());
      if ((campaignsRes as Response).ok) setCampaigns(await (campaignsRes as Response).json());
      if (abTestsRes.ok) setAbTests(await abTestsRes.json());
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
      const res = await fetch(`${API_BASE}/smart-notifications/admin/triggers/${triggerId}`, {
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
      const res = await fetch(`${API_BASE}/smart-notifications/admin/process`, {
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

  // Preview helpers
  const renderTemplate = (template: string, variables: Record<string, string> = SAMPLE_VARIABLES): string => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  };

  const openPreview = (title: string, body: string, type: 'push' | 'email' = 'push') => {
    setPreviewData({ 
      title: renderTemplate(title), 
      body: renderTemplate(body),
      type 
    });
    setPreviewDialogOpen(true);
  };

  // Template operations
  const saveTemplate = async (templateData: Partial<EmailTemplate>) => {
    setSaving(true);
    try {
      const url = editingTemplate
        ? `${API_BASE}/smart-notifications/admin/templates/${editingTemplate.id}`
        : `${API_BASE}/smart-notifications/admin/templates`;
      
      const res = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData),
      });
      
      if (res.ok) {
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        fetchData();
        setSuccess('Template saved!');
      }
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Campaign operations
  const saveCampaign = async (campaignData: Partial<ScheduledCampaign>) => {
    setSaving(true);
    try {
      const url = editingCampaign
        ? `${API_BASE}/smart-notifications/admin/campaigns/${editingCampaign.id}`
        : `${API_BASE}/smart-notifications/admin/campaigns`;
      
      const res = await fetch(url, {
        method: editingCampaign ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      
      if (res.ok) {
        setCampaignDialogOpen(false);
        setEditingCampaign(null);
        fetchData();
        setSuccess('Campaign saved!');
      }
    } catch (err) {
      setError('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const cancelCampaign = async (campaignId: string) => {
    if (!confirm('Cancel this scheduled campaign?')) return;
    try {
      await fetch(`${API_BASE}/smart-notifications/admin/campaigns/${campaignId}/cancel`, { method: 'POST' });
      fetchData();
      setSuccess('Campaign cancelled');
    } catch (err) {
      setError('Failed to cancel campaign');
    }
  };

  // A/B Test operations
  const saveAbTest = async (testData: Partial<ABTest>) => {
    setSaving(true);
    try {
      const url = editingAbTest
        ? `${API_BASE}/smart-notifications/admin/ab-tests/${editingAbTest.id}`
        : `${API_BASE}/smart-notifications/admin/ab-tests`;
      
      const res = await fetch(url, {
        method: editingAbTest ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      });
      
      if (res.ok) {
        setAbTestDialogOpen(false);
        setEditingAbTest(null);
        fetchData();
        setSuccess('A/B Test saved!');
      }
    } catch (err) {
      setError('Failed to save A/B test');
    } finally {
      setSaving(false);
    }
  };

  const endAbTest = async (testId: string) => {
    if (!confirm('End this A/B test and determine winner?')) return;
    try {
      const res = await fetch(`${API_BASE}/smart-notifications/admin/ab-tests/${testId}/end`, { method: 'POST' });
      if (res.ok) {
        fetchData();
        setSuccess('A/B Test ended!');
      }
    } catch (err) {
      setError('Failed to end A/B test');
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActive sx={{ color: '#2E7D32' }} />
            Smart Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalized notifications, templates, campaigns & A/B testing
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Send />} onClick={processNotifications} color="primary">
            Process Queue
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#E8F5E9' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#2E7D32" fontWeight="bold">{analytics?.totals.sent || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Total Sent</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#1976D2" fontWeight="bold">{analytics?.totals.delivery_rate?.toFixed(0) || 0}%</Typography>
              <Typography variant="caption" color="text.secondary">Delivery Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#FFF3E0' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#E65100" fontWeight="bold">{analytics?.totals.open_rate?.toFixed(0) || 0}%</Typography>
              <Typography variant="caption" color="text.secondary">Open Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#F3E5F5' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#7B1FA2" fontWeight="bold">{analytics?.totals.click_rate?.toFixed(0) || 0}%</Typography>
              <Typography variant="caption" color="text.secondary">Click Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#ECEFF1' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#455A64" fontWeight="bold">{abTests.filter(t => t.is_active).length}</Typography>
              <Typography variant="caption" color="text.secondary">Active Tests</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <Card sx={{ bgcolor: '#FBE9E7' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="h5" color="#BF360C" fontWeight="bold">{campaigns.filter(c => c.status === 'scheduled').length}</Typography>
              <Typography variant="caption" color="text.secondary">Scheduled</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<Settings />} label="Settings" iconPosition="start" />
          <Tab icon={<Campaign />} label="Triggers" iconPosition="start" />
          <Tab icon={<Analytics />} label="Analytics" iconPosition="start" />
          <Tab icon={<Preview />} label="Preview" iconPosition="start" />
          <Tab icon={<Palette />} label="Templates" iconPosition="start" />
          <Tab icon={<CalendarMonth />} label="Campaigns" iconPosition="start" />
          <Tab icon={<Science />} label="A/B Tests" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Settings */}
      {tabValue === 0 && config && <SettingsTab config={config} updateConfig={updateConfig} saving={saving} />}
      
      {/* Tab 1: Triggers */}
      {tabValue === 1 && (
        <TriggersTab
          triggers={triggers}
          onAdd={() => { setEditingTrigger(null); setTriggerDialogOpen(true); }}
          onEdit={(t) => { setEditingTrigger(t); setTriggerDialogOpen(true); }}
          onDelete={deleteTrigger}
          onPreview={(t) => openPreview(t.title_template, t.body_template)}
        />
      )}
      
      {/* Tab 2: Analytics */}
      {tabValue === 2 && analytics && <AnalyticsTab analytics={analytics} />}
      
      {/* Tab 3: Preview */}
      {tabValue === 3 && <PreviewTab onPreview={openPreview} />}
      
      {/* Tab 4: Templates */}
      {tabValue === 4 && (
        <TemplatesTab
          templates={templates}
          onAdd={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}
          onEdit={(t) => { setEditingTemplate(t); setTemplateDialogOpen(true); }}
          onPreview={(t) => setPreviewDialogOpen(true)}
        />
      )}
      
      {/* Tab 5: Campaigns */}
      {tabValue === 5 && (
        <CampaignsTab
          campaigns={campaigns}
          onAdd={() => { setEditingCampaign(null); setCampaignDialogOpen(true); }}
          onEdit={(c) => { setEditingCampaign(c); setCampaignDialogOpen(true); }}
          onCancel={cancelCampaign}
          onPreview={(c) => openPreview(c.title, c.body)}
        />
      )}
      
      {/* Tab 6: A/B Tests */}
      {tabValue === 6 && (
        <ABTestsTab
          tests={abTests}
          onAdd={() => { setEditingAbTest(null); setAbTestDialogOpen(true); }}
          onEdit={(t) => { setEditingAbTest(t); setAbTestDialogOpen(true); }}
          onEnd={endAbTest}
          onPreview={(variant) => openPreview(variant.title, variant.body)}
        />
      )}

      {/* Dialogs */}
      <TriggerDialog
        open={triggerDialogOpen}
        onClose={() => { setTriggerDialogOpen(false); setEditingTrigger(null); }}
        trigger={editingTrigger}
        onSave={saveTrigger}
        saving={saving}
        onPreview={openPreview}
      />

      <NotificationPreviewDialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        title={previewData.title}
        body={previewData.body}
        type={previewData.type as 'push' | 'email'}
      />

      <TemplateEditorDialog
        open={templateDialogOpen}
        onClose={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}
        template={editingTemplate}
        onSave={saveTemplate}
        saving={saving}
      />

      <CampaignDialog
        open={campaignDialogOpen}
        onClose={() => { setCampaignDialogOpen(false); setEditingCampaign(null); }}
        campaign={editingCampaign}
        onSave={saveCampaign}
        saving={saving}
        onPreview={openPreview}
      />

      <ABTestDialog
        open={abTestDialogOpen}
        onClose={() => { setAbTestDialogOpen(false); setEditingAbTest(null); }}
        test={editingAbTest}
        onSave={saveAbTest}
        saving={saving}
        onPreview={openPreview}
      />
    </Box>
  );
}

// =============================================================================
// TAB COMPONENTS
// =============================================================================

function SettingsTab({ config, updateConfig, saving }: { config: AdminConfig; updateConfig: (u: Partial<AdminConfig>) => void; saving: boolean }) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">System Status</Typography>
                <Typography variant="body2" color="text.secondary">Enable or disable the entire smart notification system</Typography>
              </Box>
              <FormControlLabel
                control={<Switch checked={config.system_enabled} onChange={(e) => updateConfig({ system_enabled: e.target.checked })} color="success" />}
                label={config.system_enabled ? 'Enabled' : 'Disabled'}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Email sx={{ color: '#F44336' }} />
              <Typography variant="h6">Email Settings</Typography>
              <Switch checked={config.email_enabled} onChange={(e) => updateConfig({ email_enabled: e.target.checked })} size="small" />
            </Box>
            <TextField fullWidth label="From Name" value={config.email_from_name} sx={{ mb: 2 }} disabled={!config.email_enabled} />
            <TextField fullWidth label="From Email" value={config.email_from_address} disabled={!config.email_enabled} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PhoneAndroid sx={{ color: '#4CAF50' }} />
              <Typography variant="h6">Push Settings</Typography>
              <Switch checked={config.push_enabled} onChange={(e) => updateConfig({ push_enabled: e.target.checked })} size="small" />
            </Box>
            <FormControlLabel control={<Switch checked={config.push_sound} onChange={(e) => updateConfig({ push_sound: e.target.checked })} disabled={!config.push_enabled} />} label="Play sound" />
            <FormControlLabel control={<Switch checked={config.push_badge} onChange={(e) => updateConfig({ push_badge: e.target.checked })} disabled={!config.push_enabled} />} label="Show badge" />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Speed sx={{ color: '#FF9800' }} />
              <Typography variant="h6">Throttling</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>Max per user/day: {config.global_max_per_user_per_day}</Typography>
            <Slider value={config.global_max_per_user_per_day} onChange={(_, v) => updateConfig({ global_max_per_user_per_day: v as number })} min={5} max={100} />
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>Min interval: {config.global_min_interval_minutes}min</Typography>
            <Slider value={config.global_min_interval_minutes} onChange={(_, v) => updateConfig({ global_min_interval_minutes: v as number })} min={1} max={60} />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DoNotDisturb sx={{ color: '#607D8B' }} />
              <Typography variant="h6">Quiet Hours</Typography>
              <Switch checked={config.default_quiet_hours_enabled} onChange={(e) => updateConfig({ default_quiet_hours_enabled: e.target.checked })} size="small" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Start" type="time" value={config.default_quiet_hours_start} onChange={(e) => updateConfig({ default_quiet_hours_start: e.target.value })} disabled={!config.default_quiet_hours_enabled} InputLabelProps={{ shrink: true }} />
              <TextField label="End" type="time" value={config.default_quiet_hours_end} onChange={(e) => updateConfig({ default_quiet_hours_end: e.target.value })} disabled={!config.default_quiet_hours_enabled} InputLabelProps={{ shrink: true }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function TriggersTab({ triggers, onAdd, onEdit, onDelete, onPreview }: { triggers: NotificationTrigger[]; onAdd: () => void; onEdit: (t: NotificationTrigger) => void; onDelete: (id: string) => void; onPreview: (t: NotificationTrigger) => void }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Notification Triggers</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAdd}>Create Trigger</Button>
        </Box>
        {triggers.length === 0 ? (
          <Alert severity="info">No custom triggers. System uses defaults.</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Channels</TableCell>
                  <TableCell>Limits</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {triggers.map((t) => {
                  const info = TRIGGER_TYPE_LABELS[t.trigger_type] || { label: t.trigger_type, icon: <Notifications />, color: '#666' };
                  return (
                    <TableRow key={t.id}>
                      <TableCell><Typography fontWeight="bold">{t.name}</Typography></TableCell>
                      <TableCell><Chip icon={info.icon} label={info.label} size="small" sx={{ bgcolor: `${info.color}20`, color: info.color }} /></TableCell>
                      <TableCell>{t.channels.map(c => <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
                      <TableCell><Typography variant="body2">{t.max_per_day}/day</Typography></TableCell>
                      <TableCell><Chip label={t.is_active ? 'Active' : 'Off'} color={t.is_active ? 'success' : 'default'} size="small" /></TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => onPreview(t)}><Preview /></IconButton>
                        <IconButton size="small" onClick={() => onEdit(t)}><Edit /></IconButton>
                        <IconButton size="small" color="error" onClick={() => onDelete(t.id)}><Delete /></IconButton>
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
  );
}

function AnalyticsTab({ analytics }: { analytics: AnalyticsData }) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Performance Overview</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Sent', value: analytics.totals.sent, color: 'primary' },
                { label: 'Delivered', value: analytics.totals.delivered, color: 'success.main' },
                { label: 'Opened', value: analytics.totals.opened, color: 'info.main' },
                { label: 'Clicked', value: analytics.totals.clicked, color: 'warning.main' },
                { label: 'Failed', value: analytics.totals.failed, color: 'error.main' },
              ].map((stat) => (
                <Grid size={{ xs: 6, md: 2 }} key={stat.label}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color={stat.color}>{stat.value}</Typography>
                    <Typography variant="body2">{stat.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      {analytics.daily.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Daily Breakdown</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Trigger</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell align="right">Sent</TableCell>
                      <TableCell align="right">Delivered</TableCell>
                      <TableCell align="right">Opened</TableCell>
                      <TableCell align="right">Clicked</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.daily.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell><Chip label={TRIGGER_TYPE_LABELS[row.trigger_type]?.label || row.trigger_type} size="small" /></TableCell>
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
    </Grid>
  );
}

function PreviewTab({ onPreview }: { onPreview: (title: string, body: string, type?: 'push' | 'email') => void }) {
  const [title, setTitle] = useState('New listing in {{category_name}}!');
  const [body, setBody] = useState('{{listing_title}} - {{currency}}{{price}}');
  const [variables, setVariables] = useState(SAMPLE_VARIABLES);

  const renderTemplate = (template: string) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  };

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Notification Editor</Typography>
            <TextField
              fullWidth
              label="Title Template"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Use {{variable}} for dynamic content"
            />
            <TextField
              fullWidth
              label="Body Template"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Sample Variables</Typography>
            <Grid container spacing={1}>
              {Object.entries(variables).slice(0, 8).map(([key, value]) => (
                <Grid size={{ xs: 6 }} key={key}>
                  <TextField
                    size="small"
                    fullWidth
                    label={key}
                    value={value}
                    onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Smartphone sx={{ color: '#4CAF50' }} />
              <Typography variant="h6">Push Notification Preview</Typography>
            </Box>
            {/* Mobile Push Preview */}
            <Box sx={{ 
              bgcolor: '#1a1a1a', 
              borderRadius: 3, 
              p: 2, 
              maxWidth: 350,
              mx: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2, 
                  bgcolor: '#2E7D32',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <NotificationsActive sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
                      Marketplace
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>now</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 500, mb: 0.5 }}>
                    {renderTemplate(title)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#aaa' }}>
                    {renderTemplate(body)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="outlined" startIcon={<Preview />} onClick={() => onPreview(title, body, 'push')}>
                Full Preview
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Email sx={{ color: '#F44336' }} />
              <Typography variant="h6">Email Preview</Typography>
            </Box>
            {/* Email Preview */}
            <Box sx={{ 
              bgcolor: 'white', 
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <Box sx={{ bgcolor: '#2E7D32', p: 2 }}>
                <Typography variant="h6" sx={{ color: 'white' }}>{renderTemplate(title)}</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography variant="body1">Hi {variables.user_name},</Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                  {renderTemplate(body)}
                </Typography>
                <Button variant="contained" size="small" sx={{ mt: 2, bgcolor: '#2E7D32' }}>
                  View Details
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function TemplatesTab({ templates, onAdd, onEdit, onPreview }: { templates: EmailTemplate[]; onAdd: () => void; onEdit: (t: EmailTemplate) => void; onPreview: (t: EmailTemplate) => void }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Email Templates</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAdd}>Create Template</Button>
        </Box>
        {templates.length === 0 ? (
          <Alert severity="info">No custom templates. System uses built-in templates.</Alert>
        ) : (
          <Grid container spacing={2}>
            {templates.map((t) => (
              <Grid size={{ xs: 12, md: 4 }} key={t.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{t.name}</Typography>
                    <Chip label={TRIGGER_TYPE_LABELS[t.trigger_type]?.label || t.trigger_type} size="small" sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary" noWrap>{t.subject}</Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button size="small" startIcon={<Preview />} onClick={() => onPreview(t)}>Preview</Button>
                      <Button size="small" startIcon={<Edit />} onClick={() => onEdit(t)}>Edit</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}

function CampaignsTab({ campaigns, onAdd, onEdit, onCancel, onPreview }: { campaigns: ScheduledCampaign[]; onAdd: () => void; onEdit: (c: ScheduledCampaign) => void; onCancel: (id: string) => void; onPreview: (c: ScheduledCampaign) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'warning';
      case 'sent': return 'success';
      case 'cancelled': return 'default';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Scheduled Campaigns</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAdd}>Schedule Campaign</Button>
        </Box>
        {campaigns.length === 0 ? (
          <Alert severity="info">No scheduled campaigns.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Trigger Type</TableCell>
                  <TableCell>Channels</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Sent</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Typography fontWeight="bold">{c.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{c.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={TRIGGER_TYPE_LABELS[c.trigger_type]?.label || c.trigger_type} size="small" />
                    </TableCell>
                    <TableCell>{c.channels.map(ch => <Chip key={ch} label={ch} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
                    <TableCell>{new Date(c.scheduled_at).toLocaleString()}</TableCell>
                    <TableCell><Chip label={c.status} color={getStatusColor(c.status)} size="small" /></TableCell>
                    <TableCell>{c.sent_count || '-'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => onPreview(c)}><Preview /></IconButton>
                      {c.status === 'scheduled' && (
                        <>
                          <IconButton size="small" onClick={() => onEdit(c)}><Edit /></IconButton>
                          <IconButton size="small" color="error" onClick={() => onCancel(c.id)}><Stop /></IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ABTestsTab({ tests, onAdd, onEdit, onEnd, onPreview }: { tests: ABTest[]; onAdd: () => void; onEdit: (t: ABTest) => void; onEnd: (id: string) => void; onPreview: (v: { title: string; body: string }) => void }) {
  const calcRate = (sent: number, converted: number) => sent > 0 ? ((converted / sent) * 100).toFixed(1) : '0.0';

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">A/B Tests</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={onAdd}>Create A/B Test</Button>
        </Box>
        {tests.length === 0 ? (
          <Alert severity="info">No A/B tests created yet.</Alert>
        ) : (
          tests.map((test) => (
            <Accordion key={test.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Science sx={{ color: test.is_active ? '#4CAF50' : '#9E9E9E' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">{test.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{test.description}</Typography>
                  </Box>
                  <Chip label={test.is_active ? 'Running' : 'Ended'} color={test.is_active ? 'success' : 'default'} size="small" />
                  {test.winner && <Chip icon={<EmojiEvents />} label={`Winner: ${test.winner}`} color="warning" size="small" />}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {['control', 'variant_a', 'variant_b'].map((variant) => {
                    const title = test[`${variant}_title` as keyof ABTest] as string;
                    const body = test[`${variant}_body` as keyof ABTest] as string;
                    const sent = test[`${variant}_sent` as keyof ABTest] as number;
                    const converted = test[`${variant}_converted` as keyof ABTest] as number;
                    if (!title) return null;
                    
                    const isWinner = test.winner === variant;
                    return (
                      <Grid size={{ xs: 12, md: 4 }} key={variant}>
                        <Card variant="outlined" sx={{ bgcolor: isWinner ? '#E8F5E9' : 'white', border: isWinner ? '2px solid #4CAF50' : undefined }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" textTransform="capitalize">
                                {variant.replace('_', ' ')}
                              </Typography>
                              {isWinner && <EmojiEvents sx={{ color: '#FFD700' }} />}
                            </Box>
                            <Typography variant="body2" fontWeight="bold">{title}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{body}</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Grid container spacing={1}>
                              <Grid size={{ xs: 6 }}><Typography variant="caption">Sent: {sent}</Typography></Grid>
                              <Grid size={{ xs: 6 }}><Typography variant="caption">Conv: {converted}</Typography></Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  Rate: {calcRate(sent, converted)}%
                                </Typography>
                              </Grid>
                            </Grid>
                            <Button size="small" startIcon={<Preview />} onClick={() => onPreview({ title, body })} sx={{ mt: 1 }}>
                              Preview
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  {test.is_active && (
                    <>
                      <Button size="small" startIcon={<Edit />} onClick={() => onEdit(test)}>Edit</Button>
                      <Button size="small" color="warning" startIcon={<Stop />} onClick={() => onEnd(test.id)}>End Test</Button>
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DIALOG COMPONENTS
// =============================================================================

function TriggerDialog({ open, onClose, trigger, onSave, saving, onPreview }: { open: boolean; onClose: () => void; trigger: NotificationTrigger | null; onSave: (data: Partial<NotificationTrigger>) => void; saving: boolean; onPreview: (title: string, body: string) => void }) {
  const [formData, setFormData] = useState<Partial<NotificationTrigger>>({
    name: '', trigger_type: 'new_listing_in_category', description: '', title_template: '', body_template: '',
    channels: ['push', 'in_app'], priority: 5, min_interval_minutes: 60, max_per_day: 10, is_active: true,
  });

  useEffect(() => {
    if (trigger) setFormData(trigger);
    else setFormData({ name: '', trigger_type: 'new_listing_in_category', description: '', title_template: '', body_template: '', channels: ['push', 'in_app'], priority: 5, min_interval_minutes: 60, max_per_day: 10, is_active: true });
  }, [trigger, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{trigger ? 'Edit Trigger' : 'Create Trigger'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select value={formData.trigger_type} onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })} label="Trigger Type">
                {Object.entries(TRIGGER_TYPE_LABELS).map(([key, val]) => (
                  <MenuItem key={key} value={key}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{val.icon}{val.label}</Box></MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Title Template" value={formData.title_template} onChange={(e) => setFormData({ ...formData, title_template: e.target.value })} helperText="Use {{variable}}" /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Body Template" value={formData.body_template} onChange={(e) => setFormData({ ...formData, body_template: e.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>Channels</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['push', 'email', 'in_app'].map((ch) => (
                <Chip key={ch} label={ch} onClick={() => setFormData({ ...formData, channels: formData.channels?.includes(ch) ? formData.channels.filter(c => c !== ch) : [...(formData.channels || []), ch] })}
                  color={formData.channels?.includes(ch) ? 'primary' : 'default'} variant={formData.channels?.includes(ch) ? 'filled' : 'outlined'} />
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Priority (1-10)" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} inputProps={{ min: 1, max: 10 }} /></Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Min Interval (min)" value={formData.min_interval_minutes} onChange={(e) => setFormData({ ...formData, min_interval_minutes: parseInt(e.target.value) })} /></Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Max Per Day" value={formData.max_per_day} onChange={(e) => setFormData({ ...formData, max_per_day: parseInt(e.target.value) })} /></Grid>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />} label="Active" />
            <Button startIcon={<Preview />} onClick={() => onPreview(formData.title_template || '', formData.body_template || '')} sx={{ ml: 2 }}>Preview</Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(formData)} disabled={saving || !formData.name}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function NotificationPreviewDialog({ open, onClose, title, body, type }: { open: boolean; onClose: () => void; title: string; body: string; type: 'push' | 'email' }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {type === 'push' ? <Smartphone /> : <DesktopWindows />}
        {type === 'push' ? 'Push Notification Preview' : 'Email Preview'}
      </DialogTitle>
      <DialogContent>
        {type === 'push' ? (
          <Box sx={{ bgcolor: '#1a1a1a', borderRadius: 3, p: 3, maxWidth: 400, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotificationsActive sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>Marketplace</Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>now</Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'white', fontWeight: 500, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: '#aaa' }}>{body}</Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#2E7D32', p: 3 }}>
              <Typography variant="h5" sx={{ color: 'white' }}>{title}</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>Hi there,</Typography>
              <Typography variant="body1" sx={{ color: '#333' }}>{body}</Typography>
              <Button variant="contained" sx={{ mt: 3, bgcolor: '#2E7D32' }}>View Now</Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

function TemplateEditorDialog({ open, onClose, template, onSave, saving }: { open: boolean; onClose: () => void; template: EmailTemplate | null; onSave: (data: Partial<EmailTemplate>) => void; saving: boolean }) {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: '', trigger_type: 'new_listing_in_category', subject: '', html_content: '', is_active: true,
  });

  useEffect(() => {
    if (template) setFormData(template);
    else setFormData({ name: '', trigger_type: 'new_listing_in_category', subject: '', html_content: '', is_active: true });
  }, [template, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{template ? 'Edit Template' : 'Create Template'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Template Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select value={formData.trigger_type} onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })} label="Trigger Type">
                {Object.entries(TRIGGER_TYPE_LABELS).map(([key, val]) => <MenuItem key={key} value={key}>{val.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Subject Line" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="HTML Content" value={formData.html_content} onChange={(e) => setFormData({ ...formData, html_content: e.target.value })} multiline rows={12}
              helperText="Use {{variable}} for dynamic content. Available: user_name, listing_title, price, currency, category_name, etc." />
          </Grid>
          <Grid size={{ xs: 12 }}><FormControlLabel control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />} label="Active" /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(formData)} disabled={saving || !formData.name}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function CampaignDialog({ open, onClose, campaign, onSave, saving, onPreview }: { open: boolean; onClose: () => void; campaign: ScheduledCampaign | null; onSave: (data: Partial<ScheduledCampaign>) => void; saving: boolean; onPreview: (title: string, body: string) => void }) {
  const [formData, setFormData] = useState<Partial<ScheduledCampaign>>({
    name: '', description: '', trigger_type: 'promotional', title: '', body: '', channels: ['push', 'email'], target_segments: ['all_users'], scheduled_at: '',
  });

  useEffect(() => {
    if (campaign) setFormData(campaign);
    else setFormData({ name: '', description: '', trigger_type: 'promotional', title: '', body: '', channels: ['push', 'email'], target_segments: ['all_users'], scheduled_at: new Date(Date.now() + 3600000).toISOString().slice(0, 16) });
  }, [campaign, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{campaign ? 'Edit Campaign' : 'Schedule Campaign'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Campaign Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Scheduled Time" type="datetime-local" value={formData.scheduled_at?.slice(0, 16)} onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Notification Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Notification Body" value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} /></Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>Channels</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['push', 'email', 'in_app'].map((ch) => (
                <Chip key={ch} label={ch} onClick={() => setFormData({ ...formData, channels: formData.channels?.includes(ch) ? formData.channels.filter(c => c !== ch) : [...(formData.channels || []), ch] })}
                  color={formData.channels?.includes(ch) ? 'primary' : 'default'} variant={formData.channels?.includes(ch) ? 'filled' : 'outlined'} />
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" gutterBottom>Target Segments</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {['all_users', 'active_buyers', 'active_sellers', 'inactive_users'].map((seg) => (
                <Chip key={seg} label={seg.replace('_', ' ')} onClick={() => setFormData({ ...formData, target_segments: formData.target_segments?.includes(seg) ? formData.target_segments.filter(s => s !== seg) : [...(formData.target_segments || []), seg] })}
                  color={formData.target_segments?.includes(seg) ? 'secondary' : 'default'} variant={formData.target_segments?.includes(seg) ? 'filled' : 'outlined'} />
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}><Button startIcon={<Preview />} onClick={() => onPreview(formData.title || '', formData.body || '')}>Preview Notification</Button></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(formData)} disabled={saving || !formData.name}>{saving ? <CircularProgress size={20} /> : 'Schedule'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ABTestDialog({ open, onClose, test, onSave, saving, onPreview }: { open: boolean; onClose: () => void; test: ABTest | null; onSave: (data: Partial<ABTest>) => void; saving: boolean; onPreview: (title: string, body: string) => void }) {
  const [formData, setFormData] = useState<Partial<ABTest>>({
    name: '', description: '', trigger_type: 'new_listing_in_category', control_title: '', control_body: '', variant_a_title: '', variant_a_body: '', variant_b_title: '', variant_b_body: '',
    control_percentage: 34, variant_a_percentage: 33, variant_b_percentage: 33,
  });

  useEffect(() => {
    if (test) setFormData(test);
    else setFormData({ name: '', description: '', trigger_type: 'new_listing_in_category', control_title: '', control_body: '', variant_a_title: '', variant_a_body: '', variant_b_title: '', variant_b_body: '', control_percentage: 34, variant_a_percentage: 33, variant_b_percentage: 33 });
  }, [test, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{test ? 'Edit A/B Test' : 'Create A/B Test'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Test Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select value={formData.trigger_type} onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })} label="Trigger Type">
                {Object.entries(TRIGGER_TYPE_LABELS).map(([key, val]) => <MenuItem key={key} value={key}>{val.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></Grid>
          
          {/* Control */}
          <Grid size={{ xs: 12 }}><Typography variant="subtitle1" fontWeight="bold">Control (Original)</Typography></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Control Title" value={formData.control_title} onChange={(e) => setFormData({ ...formData, control_title: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Control Body" value={formData.control_body} onChange={(e) => setFormData({ ...formData, control_body: e.target.value })} /></Grid>
          
          {/* Variant A */}
          <Grid size={{ xs: 12 }}><Typography variant="subtitle1" fontWeight="bold">Variant A</Typography></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Variant A Title" value={formData.variant_a_title} onChange={(e) => setFormData({ ...formData, variant_a_title: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Variant A Body" value={formData.variant_a_body} onChange={(e) => setFormData({ ...formData, variant_a_body: e.target.value })} /></Grid>
          
          {/* Variant B */}
          <Grid size={{ xs: 12 }}><Typography variant="subtitle1" fontWeight="bold">Variant B (Optional)</Typography></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Variant B Title" value={formData.variant_b_title} onChange={(e) => setFormData({ ...formData, variant_b_title: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Variant B Body" value={formData.variant_b_body} onChange={(e) => setFormData({ ...formData, variant_b_body: e.target.value })} /></Grid>
          
          {/* Traffic Split */}
          <Grid size={{ xs: 12 }}><Typography variant="subtitle1" fontWeight="bold">Traffic Split (%)</Typography></Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Control %" value={formData.control_percentage} onChange={(e) => setFormData({ ...formData, control_percentage: parseInt(e.target.value) })} /></Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Variant A %" value={formData.variant_a_percentage} onChange={(e) => setFormData({ ...formData, variant_a_percentage: parseInt(e.target.value) })} /></Grid>
          <Grid size={{ xs: 4 }}><TextField fullWidth type="number" label="Variant B %" value={formData.variant_b_percentage} onChange={(e) => setFormData({ ...formData, variant_b_percentage: parseInt(e.target.value) })} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(formData)} disabled={saving || !formData.name}>{saving ? <CircularProgress size={20} /> : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
