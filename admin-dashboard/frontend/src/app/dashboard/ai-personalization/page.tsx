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
  Slider,
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
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  AutoAwesome,
  Settings,
  Analytics,
  Refresh,
  Save,
  Send,
  Visibility,
  ContentCopy,
  Style,
  Psychology,
  TrendingUp,
  Notifications,
  Speed,
  Cached,
  Smartphone,
  Email,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

interface AIPersonalizationConfig {
  id: string;
  enabled: boolean;
  model_provider: string;
  model_name: string;
  default_style: string;
  max_title_length: number;
  max_body_length: number;
  include_interests: boolean;
  include_recent_activity: boolean;
  include_purchase_history: boolean;
  include_search_history: boolean;
  max_requests_per_minute: number;
  cache_duration_hours: number;
  fallback_on_error: boolean;
  updated_at: string;
  ai_available: boolean;
}

interface PersonalizationStyle {
  id: string;
  name: string;
}

interface PersonalizationAnalytics {
  total_personalizations: number;
  by_trigger_type: { trigger_type: string; count: number }[];
  ai_enabled: boolean;
  period_days: number;
}

interface PreviewResult {
  original: { title: string; body: string };
  personalized: { title: string; body: string; cta_text?: string };
  user_id: string;
  trigger_type: string;
}

interface NotificationVariant {
  title: string;
  body: string;
  cta_text?: string;
  style: string;
  variant_id: string;
}

const TRIGGER_TYPES = [
  { id: 'new_listing_in_category', label: 'New Listing in Category' },
  { id: 'price_drop_saved_item', label: 'Price Drop on Saved Item' },
  { id: 'message_received', label: 'Message Received' },
  { id: 'seller_reply', label: 'Seller Reply' },
  { id: 'similar_listing_alert', label: 'Similar Listing Alert' },
  { id: 'weekly_digest', label: 'Weekly Digest' },
  { id: 'promotional', label: 'Promotional Campaign' },
];

const STYLE_COLORS: Record<string, string> = {
  friendly: '#4CAF50',
  professional: '#2196F3',
  urgent: '#F44336',
  casual: '#FF9800',
  enthusiastic: '#9C27B0',
  concise: '#607D8B',
};

export default function AIPersonalizationPage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [config, setConfig] = useState<AIPersonalizationConfig | null>(null);
  const [styles, setStyles] = useState<PersonalizationStyle[]>([]);
  const [analytics, setAnalytics] = useState<PersonalizationAnalytics | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewUserId, setPreviewUserId] = useState('test_user_123');
  const [previewTriggerType, setPreviewTriggerType] = useState('new_listing_in_category');
  const [previewStyle, setPreviewStyle] = useState('friendly');
  const [previewContext, setPreviewContext] = useState({
    listing_title: 'iPhone 15 Pro Max 256GB',
    category: 'Electronics',
    price: '999',
    currency: '€',
    old_price: '',
    sender_name: '',
  });
  
  // Variants state
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variants, setVariants] = useState<NotificationVariant[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/smart-notifications/admin/ai-personalization/config`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setSnackbar({ open: true, message: 'Failed to load configuration', severity: 'error' });
    }
  }, []);

  const fetchStyles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/smart-notifications/admin/ai-personalization/styles`);
      const data = await response.json();
      setStyles(data.styles || []);
    } catch (error) {
      console.error('Failed to fetch styles:', error);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/smart-notifications/admin/ai-personalization/analytics?days=30`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchStyles(), fetchAnalytics()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchStyles, fetchAnalytics]);

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/smart-notifications/admin/ai-personalization/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to save');
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
      await fetchConfig();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPersonalization = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/smart-notifications/admin/ai-personalization/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: previewUserId,
          trigger_type: previewTriggerType,
          context: previewContext,
          style: previewStyle,
        }),
      });
      const data = await response.json();
      setPreviewResult(data);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to generate preview', severity: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    setVariantsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/smart-notifications/admin/ai-personalization/generate-variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_type: previewTriggerType,
          context: previewContext,
          count: 3,
        }),
      });
      const data = await response.json();
      setVariants(data.variants || []);
      setVariantsDialogOpen(true);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to generate variants', severity: 'error' });
    } finally {
      setVariantsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            AI Personalization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure AI-powered notification content personalization
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            icon={<Psychology />}
            label={config?.ai_available ? 'AI Available' : 'AI Unavailable'}
            color={config?.ai_available ? 'success' : 'error'}
            variant="outlined"
          />
          <IconButton onClick={() => { fetchConfig(); fetchAnalytics(); }}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {!config?.ai_available && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          AI personalization is not available. Make sure EMERGENT_LLM_KEY is configured in the backend.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<Settings />} label="Settings" />
        <Tab icon={<Visibility />} label="Preview & Test" />
        <Tab icon={<Style />} label="Styles" />
        <Tab icon={<Analytics />} label="Analytics" />
      </Tabs>

      {/* Settings Tab */}
      {tabValue === 0 && config && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Settings fontSize="small" />
                  General Settings
                </Typography>
                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Enable AI Personalization</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically personalize notification content using AI
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 3, display: 'flex', alignItems: 'flex-start' }}
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Default Style</InputLabel>
                  <Select
                    value={config.default_style}
                    label="Default Style"
                    onChange={(e) => setConfig({ ...config, default_style: e.target.value })}
                  >
                    {styles.map((style) => (
                      <MenuItem key={style.id} value={style.id}>
                        <Chip
                          size="small"
                          label={style.name}
                          sx={{ bgcolor: STYLE_COLORS[style.id], color: 'white', mr: 1 }}
                        />
                        {style.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.fallback_on_error}
                      onChange={(e) => setConfig({ ...config, fallback_on_error: e.target.checked })}
                    />
                  }
                  label="Fallback to template on error"
                  sx={{ mb: 2, display: 'block' }}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Model: {config.model_provider} / {config.model_name}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed fontSize="small" />
                  Rate Limiting & Caching
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography gutterBottom>
                  Max Requests per Minute: {config.max_requests_per_minute}
                </Typography>
                <Slider
                  value={config.max_requests_per_minute}
                  onChange={(_, value) => setConfig({ ...config, max_requests_per_minute: value as number })}
                  min={10}
                  max={200}
                  step={10}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 100, label: '100' },
                    { value: 200, label: '200' },
                  ]}
                  sx={{ mb: 3 }}
                />

                <Typography gutterBottom>
                  Cache Duration (Hours): {config.cache_duration_hours}
                </Typography>
                <Slider
                  value={config.cache_duration_hours}
                  onChange={(_, value) => setConfig({ ...config, cache_duration_hours: value as number })}
                  min={1}
                  max={72}
                  step={1}
                  marks={[
                    { value: 1, label: '1h' },
                    { value: 24, label: '24h' },
                    { value: 72, label: '72h' },
                  ]}
                  sx={{ mb: 3 }}
                />
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Psychology fontSize="small" />
                  Content Limits
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography gutterBottom>
                  Max Title Length: {config.max_title_length} chars
                </Typography>
                <Slider
                  value={config.max_title_length}
                  onChange={(_, value) => setConfig({ ...config, max_title_length: value as number })}
                  min={30}
                  max={100}
                  step={5}
                  sx={{ mb: 3 }}
                />

                <Typography gutterBottom>
                  Max Body Length: {config.max_body_length} chars
                </Typography>
                <Slider
                  value={config.max_body_length}
                  onChange={(_, value) => setConfig({ ...config, max_body_length: value as number })}
                  min={50}
                  max={300}
                  step={10}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>User Context Settings</Typography>
                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_interests}
                      onChange={(e) => setConfig({ ...config, include_interests: e.target.checked })}
                    />
                  }
                  label="Include user interests"
                  sx={{ display: 'block', mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_recent_activity}
                      onChange={(e) => setConfig({ ...config, include_recent_activity: e.target.checked })}
                    />
                  }
                  label="Include recent activity"
                  sx={{ display: 'block', mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_purchase_history}
                      onChange={(e) => setConfig({ ...config, include_purchase_history: e.target.checked })}
                    />
                  }
                  label="Include purchase history"
                  sx={{ display: 'block', mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_search_history}
                      onChange={(e) => setConfig({ ...config, include_search_history: e.target.checked })}
                    />
                  }
                  label="Include search history"
                  sx={{ display: 'block' }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSaveConfig}
                disabled={saving}
                size="large"
              >
                Save Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Preview & Test Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test Configuration
                </Typography>
                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="User ID"
                  value={previewUserId}
                  onChange={(e) => setPreviewUserId(e.target.value)}
                  sx={{ mb: 2 }}
                  helperText="Enter a user ID to test personalization"
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Trigger Type</InputLabel>
                  <Select
                    value={previewTriggerType}
                    label="Trigger Type"
                    onChange={(e) => setPreviewTriggerType(e.target.value)}
                  >
                    {TRIGGER_TYPES.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={previewStyle}
                    label="Style"
                    onChange={(e) => setPreviewStyle(e.target.value)}
                  >
                    {styles.map((style) => (
                      <MenuItem key={style.id} value={style.id}>
                        <Chip
                          size="small"
                          label={style.name}
                          sx={{ bgcolor: STYLE_COLORS[style.id], color: 'white', mr: 1 }}
                        />
                        {style.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Context Variables</Typography>

                <TextField
                  fullWidth
                  label="Listing Title"
                  value={previewContext.listing_title}
                  onChange={(e) => setPreviewContext({ ...previewContext, listing_title: e.target.value })}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Category"
                  value={previewContext.category}
                  onChange={(e) => setPreviewContext({ ...previewContext, category: e.target.value })}
                  sx={{ mb: 2 }}
                  size="small"
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Currency"
                      value={previewContext.currency}
                      onChange={(e) => setPreviewContext({ ...previewContext, currency: e.target.value })}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Price"
                      value={previewContext.price}
                      onChange={(e) => setPreviewContext({ ...previewContext, price: e.target.value })}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Old Price"
                      value={previewContext.old_price}
                      onChange={(e) => setPreviewContext({ ...previewContext, old_price: e.target.value })}
                      size="small"
                      placeholder="For price drops"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={previewLoading ? <CircularProgress size={20} /> : <Send />}
                    onClick={handleTestPersonalization}
                    disabled={previewLoading || !config?.ai_available}
                    fullWidth
                  >
                    Generate Preview
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={variantsLoading ? <CircularProgress size={20} /> : <Style />}
                    onClick={handleGenerateVariants}
                    disabled={variantsLoading || !config?.ai_available}
                  >
                    Variants
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            {previewResult ? (
              <Grid container spacing={2}>
                {/* Original */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Original (Template)
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {previewResult.original.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {previewResult.original.body}
                          </Typography>
                        </Box>
                        <Tooltip title="Copy">
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(`${previewResult.original.title}\n${previewResult.original.body}`)}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Personalized - Push Preview */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: '#1a1a1a', color: 'white' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Smartphone fontSize="small" />
                        <Typography variant="subtitle2">Push Notification Preview</Typography>
                      </Box>
                      <Paper
                        sx={{
                          p: 2,
                          bgcolor: '#2d2d2d',
                          borderRadius: 2,
                          border: '1px solid #444',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: '#4CAF50',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Notifications sx={{ color: 'white' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: 'white' }}>
                              {previewResult.personalized.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#aaa' }}>
                              {previewResult.personalized.body}
                            </Typography>
                          </Box>
                        </Box>
                        {previewResult.personalized.cta_text && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            sx={{ mt: 2, textTransform: 'none' }}
                          >
                            {previewResult.personalized.cta_text}
                          </Button>
                        )}
                      </Paper>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Personalized - Email Preview */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Email fontSize="small" />
                        <Typography variant="subtitle2">Email Preview</Typography>
                      </Box>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {previewResult.personalized.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {previewResult.personalized.body}
                        </Typography>
                        {previewResult.personalized.cta_text && (
                          <Button variant="contained" color="primary" size="small">
                            {previewResult.personalized.cta_text}
                          </Button>
                        )}
                      </Paper>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Character counts */}
                <Grid item xs={12}>
                  <Alert severity="info" icon={<Speed />}>
                    Title: {previewResult.personalized.title.length}/{config?.max_title_length} chars |
                    Body: {previewResult.personalized.body.length}/{config?.max_body_length} chars
                  </Alert>
                </Grid>
              </Grid>
            ) : (
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AutoAwesome sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Configure and click "Generate Preview"
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    See how AI personalizes notifications for users
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Styles Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          {styles.map((style) => (
            <Grid item xs={12} sm={6} md={4} key={style.id}>
              <Card
                sx={{
                  borderTop: `4px solid ${STYLE_COLORS[style.id] || '#888'}`,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: STYLE_COLORS[style.id] || '#888',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Style sx={{ color: 'white' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {style.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {style.id}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {getStyleDescription(style.id)}
                  </Typography>
                  {config?.default_style === style.id && (
                    <Chip
                      label="Default"
                      color="primary"
                      size="small"
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Analytics Tab */}
      {tabValue === 3 && analytics && (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
              <CardContent>
                <Typography variant="overline">Total Personalizations</Typography>
                <Typography variant="h3" fontWeight={700}>
                  {analytics.total_personalizations}
                </Typography>
                <Typography variant="body2">Last {analytics.period_days} days</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">AI Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Psychology color={analytics.ai_enabled ? 'success' : 'error'} sx={{ fontSize: 40 }} />
                  <Typography variant="h5" fontWeight={600}>
                    {analytics.ai_enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Trigger Types Used</Typography>
                <Typography variant="h3" fontWeight={700}>
                  {analytics.by_trigger_type.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personalizations by Trigger Type
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.by_trigger_type} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="trigger_type"
                      type="category"
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Pie Chart */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.by_trigger_type}
                      dataKey="count"
                      nameKey="trigger_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ trigger_type }) => trigger_type.replace(/_/g, ' ').slice(0, 10)}
                    >
                      {analytics.by_trigger_type.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(STYLE_COLORS)[index % Object.values(STYLE_COLORS).length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Breakdown
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Trigger Type</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.by_trigger_type.map((row) => (
                        <TableRow key={row.trigger_type}>
                          <TableCell>
                            <Chip
                              label={row.trigger_type.replace(/_/g, ' ')}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell align="right">
                            {((row.count / analytics.total_personalizations) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Variants Dialog */}
      <Dialog
        open={variantsDialogOpen}
        onClose={() => setVariantsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Style />
            Generated Variants for A/B Testing
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {variants.map((variant, index) => (
              <Grid item xs={12} md={4} key={variant.variant_id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderTop: `4px solid ${STYLE_COLORS[variant.style] || '#888'}`,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip
                        label={`Variant ${index + 1}`}
                        size="small"
                        color="primary"
                      />
                      <Chip
                        label={variant.style}
                        size="small"
                        sx={{ bgcolor: STYLE_COLORS[variant.style], color: 'white' }}
                      />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {variant.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {variant.body}
                    </Typography>
                    {variant.cta_text && (
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ mt: 2, textTransform: 'none' }}
                      >
                        {variant.cta_text}
                      </Button>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={() => copyToClipboard(`${variant.title}\n${variant.body}`)}
                    >
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariantsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function getStyleDescription(styleId: string): string {
  const descriptions: Record<string, string> = {
    friendly: 'Warm and approachable tone. Great for building relationships with users.',
    professional: 'Formal and business-like. Ideal for transactional notifications.',
    urgent: 'Creates sense of urgency. Use for time-sensitive offers and alerts.',
    casual: 'Relaxed and conversational. Perfect for engaging younger audiences.',
    enthusiastic: 'Excited and energetic. Great for promotions and celebrations.',
    concise: 'Brief and to-the-point. Respects user attention and time.',
  };
  return descriptions[styleId] || 'Custom notification style';
}
