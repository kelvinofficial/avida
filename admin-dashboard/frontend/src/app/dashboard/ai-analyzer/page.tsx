'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
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
  Tooltip,
  Snackbar,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  AutoAwesome,
  Settings,
  Analytics,
  Refresh,
  Save,
  Cached,
  DeleteSweep,
  TrendingUp,
  ImageSearch,
  CheckCircle,
  Edit,
  Cancel,
  Speed,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface AISettings {
  id: string;
  enabled: boolean;
  enabled_categories: string[];
  disabled_categories: string[];
  enabled_countries: string[];
  disabled_countries: string[];
  max_uses_per_day_free: number;
  max_uses_per_day_verified: number;
  max_uses_per_day_premium: number;
  max_images_per_analysis: number;
  require_verified_email: boolean;
  require_verified_phone: boolean;
  allow_free_users: boolean;
  enable_price_suggestions: boolean;
  enable_category_suggestions: boolean;
  vision_system_prompt: string;
  text_system_prompt: string;
  profanity_filter_enabled: boolean;
  policy_compliance_filter: boolean;
  blocked_terms: string[];
  updated_at: string;
  updated_by?: string;
}

interface AIAnalytics {
  period_days: number;
  total_calls: number;
  total_images_analyzed: number;
  acceptance_rate: number;
  edit_rate: number;
  rejection_rate: number;
  pending_rate: number;
  daily_breakdown: { date: string; calls: number; images: number }[];
  cache_entries: number;
}

export default function AIAnalyzerPage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [saving, setSaving] = useState(false);

  const [editPromptDialogOpen, setEditPromptDialogOpen] = useState(false);
  const [editingPromptType, setEditingPromptType] = useState<'vision' | 'text'>('vision');
  const [editingPrompt, setEditingPrompt] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.get('/ai-analyzer/admin/settings');
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
      setSnackbar({ open: true, message: 'Failed to load AI settings', severity: 'error' });
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.get('/ai-analyzer/admin/analytics?days=30');
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch AI analytics:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchAnalytics()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSettings, fetchAnalytics]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put('/ai-analyzer/admin/settings', settings as Record<string, unknown>);
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const result = await api.post('/ai-analyzer/admin/clear-cache');
      setSnackbar({ open: true, message: `Cache cleared: ${result.deleted} entries removed`, severity: 'success' });
      fetchAnalytics();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to clear cache', severity: 'error' });
    }
  };

  const handleOpenPromptEditor = (type: 'vision' | 'text') => {
    setEditingPromptType(type);
    setEditingPrompt(type === 'vision' ? settings?.vision_system_prompt || '' : settings?.text_system_prompt || '');
    setEditPromptDialogOpen(true);
  };

  const handleSavePrompt = () => {
    if (!settings) return;
    if (editingPromptType === 'vision') {
      setSettings({ ...settings, vision_system_prompt: editingPrompt });
    } else {
      setSettings({ ...settings, text_system_prompt: editingPrompt });
    }
    setEditPromptDialogOpen(false);
  };

  const updateSetting = (key: keyof AISettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <AutoAwesome sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4" fontWeight="bold">
          AI Listing Analyzer
        </Typography>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Settings" icon={<Settings />} iconPosition="start" />
        <Tab label="Analytics" icon={<Analytics />} iconPosition="start" />
        <Tab label="System Prompts" icon={<Edit />} iconPosition="start" />
      </Tabs>

      {/* Settings Tab */}
      {tabValue === 0 && settings && (
        <Grid container spacing={3}>
          {/* Global Toggle */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">AI Analysis</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Enable or disable AI photo analysis for all users
                    </Typography>
                  </Box>
                  <Switch
                    checked={settings.enabled}
                    onChange={(e) => updateSetting('enabled', e.target.checked)}
                    color="primary"
                    size="medium"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Usage Limits */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Usage Limits
                </Typography>
                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    Free Users: {settings.max_uses_per_day_free} analyses/day
                  </Typography>
                  <Slider
                    value={settings.max_uses_per_day_free}
                    onChange={(_, v) => updateSetting('max_uses_per_day_free', v as number)}
                    min={0}
                    max={20}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box mt={3}>
                  <Typography variant="body2" gutterBottom>
                    Verified Users: {settings.max_uses_per_day_verified} analyses/day
                  </Typography>
                  <Slider
                    value={settings.max_uses_per_day_verified}
                    onChange={(_, v) => updateSetting('max_uses_per_day_verified', v as number)}
                    min={0}
                    max={50}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box mt={3}>
                  <Typography variant="body2" gutterBottom>
                    Premium Users: {settings.max_uses_per_day_premium} analyses/day
                  </Typography>
                  <Slider
                    value={settings.max_uses_per_day_premium}
                    onChange={(_, v) => updateSetting('max_uses_per_day_premium', v as number)}
                    min={0}
                    max={100}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box mt={3}>
                  <Typography variant="body2" gutterBottom>
                    Max Images Per Analysis: {settings.max_images_per_analysis}
                  </Typography>
                  <Slider
                    value={settings.max_images_per_analysis}
                    onChange={(_, v) => updateSetting('max_images_per_analysis', v as number)}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Access Control */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Access Control
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allow_free_users}
                      onChange={(e) => updateSetting('allow_free_users', e.target.checked)}
                    />
                  }
                  label="Allow Free Users"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.require_verified_email}
                      onChange={(e) => updateSetting('require_verified_email', e.target.checked)}
                    />
                  }
                  label="Require Verified Email"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.require_verified_phone}
                      onChange={(e) => updateSetting('require_verified_phone', e.target.checked)}
                    />
                  }
                  label="Require Verified Phone"
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Content Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enable_category_suggestions}
                      onChange={(e) => updateSetting('enable_category_suggestions', e.target.checked)}
                    />
                  }
                  label="Enable Category Suggestions"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enable_price_suggestions}
                      onChange={(e) => updateSetting('enable_price_suggestions', e.target.checked)}
                    />
                  }
                  label="Enable Price Suggestions"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Safety Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Safety & Moderation
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.profanity_filter_enabled}
                          onChange={(e) => updateSetting('profanity_filter_enabled', e.target.checked)}
                        />
                      }
                      label="Profanity Filter"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.policy_compliance_filter}
                          onChange={(e) => updateSetting('policy_compliance_filter', e.target.checked)}
                        />
                      }
                      label="Policy Compliance Filter"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Blocked Terms (comma-separated)"
                      value={settings.blocked_terms.join(', ')}
                      onChange={(e) =>
                        updateSetting(
                          'blocked_terms',
                          e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                        )
                      }
                      multiline
                      rows={3}
                      size="small"
                      helperText="AI will avoid using these terms in generated content"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button variant="outlined" onClick={fetchSettings} startIcon={<Refresh />}>
                Reset
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveSettings}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                disabled={saving}
              >
                Save Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Analytics Tab */}
      {tabValue === 1 && analytics && (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <ImageSearch sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.total_calls}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total AI Calls
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.acceptance_rate}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Acceptance Rate
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Edit sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.edit_rate}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Edit Rate
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Cached sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {analytics.cache_entries}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Cached Results
              </Typography>
            </Paper>
          </Grid>

          {/* Daily Breakdown */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Daily Usage (Last 30 Days)</Typography>
                  <Box>
                    <IconButton onClick={fetchAnalytics} size="small">
                      <Refresh />
                    </IconButton>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteSweep />}
                      onClick={handleClearCache}
                      sx={{ ml: 1 }}
                    >
                      Clear Cache
                    </Button>
                  </Box>
                </Box>
                {analytics.daily_breakdown.length > 0 ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box display="flex" gap={1} minWidth={analytics.daily_breakdown.length * 40}>
                      {analytics.daily_breakdown.map((day) => (
                        <Tooltip key={day.date} title={`${day.calls} calls, ${day.images} images`}>
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 36,
                              height: Math.max(20, day.calls * 10),
                              maxHeight: 150,
                              bgcolor: 'primary.main',
                              borderRadius: 1,
                              transition: 'all 0.2s',
                              '&:hover': { opacity: 0.8 },
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Typography variant="caption" color="textSecondary">
                        {analytics.daily_breakdown[0]?.date}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {analytics.daily_breakdown[analytics.daily_breakdown.length - 1]?.date}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="textSecondary" textAlign="center" py={4}>
                    No AI usage data yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Stats */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Usage Breakdown
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Total Images Analyzed" secondary={analytics.total_images_analyzed} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Rejection Rate" secondary={`${analytics.rejection_rate}%`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Pending (No Action)" secondary={`${analytics.pending_rate}%`} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* System Prompts Tab */}
      {tabValue === 2 && settings && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Vision Analysis Prompt</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenPromptEditor('vision')}
                  >
                    Edit
                  </Button>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                  {settings.vision_system_prompt.slice(0, 500)}
                  {settings.vision_system_prompt.length > 500 && '...'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Text Generation Prompt</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleOpenPromptEditor('text')}
                  >
                    Edit
                  </Button>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                  {settings.text_system_prompt.slice(0, 500)}
                  {settings.text_system_prompt.length > 500 && '...'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info">
              The Vision Prompt instructs GPT-4o how to analyze images. The Text Prompt instructs Claude Sonnet 4.5 how to
              generate titles and descriptions from the analysis.
            </Alert>
          </Grid>
        </Grid>
      )}

      {/* Prompt Editor Dialog */}
      <Dialog open={editPromptDialogOpen} onClose={() => setEditPromptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit {editingPromptType === 'vision' ? 'Vision Analysis' : 'Text Generation'} Prompt</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editingPrompt}
            onChange={(e) => setEditingPrompt(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Enter system prompt..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPromptDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePrompt}>
            Save Prompt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
