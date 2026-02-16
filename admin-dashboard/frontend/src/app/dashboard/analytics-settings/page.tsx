'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Analytics,
  Code,
  CheckCircle,
  Warning,
  ContentCopy,
  Refresh,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export default function AnalyticsSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    ga4_measurement_id: '',
    ga4_enabled: false,
    gtm_container_id: '',
    gtm_enabled: false,
    track_page_views: true,
    track_user_engagement: true,
    track_blog_reads: true,
    track_listing_views: true,
    track_conversions: true,
    anonymize_ip: true,
    setup_complete: false,
  });
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [setupInstructions, setSetupInstructions] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/analytics-settings`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.setup_instructions) {
          setSetupInstructions(data.setup_instructions);
        }
      }
    } catch (err) {
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/analytics-settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSuccess('Settings saved successfully');
        fetchSettings();
        if (settings.ga4_measurement_id) {
          fetchTrackingCode();
        }
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackingCode = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/analytics-settings/tracking-code`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTrackingCode(data.ga4_tracking_code);
      }
    } catch (err) {
      console.error('Failed to fetch tracking code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/analytics-settings/test-connection`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message);
      }
    } catch (err) {
      setError('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }} data-testid="analytics-settings-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Google Analytics Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure Google Analytics 4 (GA4) tracking for your website
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Setup Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {settings.setup_complete ? (
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                ) : (
                  <Warning sx={{ fontSize: 48, color: 'warning.main' }} />
                )}
                <Box>
                  <Typography variant="h6">
                    {settings.setup_complete ? 'Setup Complete' : 'Setup Required'}
                  </Typography>
                  <Chip 
                    label={settings.ga4_enabled ? 'Tracking Active' : 'Tracking Disabled'} 
                    color={settings.ga4_enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
              {!settings.setup_complete && setupInstructions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Setup Instructions:</Typography>
                  {Object.entries(setupInstructions).map(([key, value]) => (
                    <Typography key={key} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {key.replace('step', '')}. {value as string}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* GA4 Configuration */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
                Google Analytics 4
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="GA4 Measurement ID"
                    value={settings.ga4_measurement_id || ''}
                    onChange={(e) => setSettings({ ...settings, ga4_measurement_id: e.target.value })}
                    fullWidth
                    placeholder="G-XXXXXXXXXX"
                    helperText="Found in GA4 Admin > Data Streams > Web"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.ga4_enabled}
                        onChange={(e) => setSettings({ ...settings, ga4_enabled: e.target.checked })}
                        disabled={!settings.ga4_measurement_id}
                      />
                    }
                    label="Enable GA4"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>Tracking Options</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={settings.track_page_views} onChange={(e) => setSettings({ ...settings, track_page_views: e.target.checked })} />}
                    label="Page Views"
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={settings.track_blog_reads} onChange={(e) => setSettings({ ...settings, track_blog_reads: e.target.checked })} />}
                    label="Blog Reads"
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={settings.track_listing_views} onChange={(e) => setSettings({ ...settings, track_listing_views: e.target.checked })} />}
                    label="Listing Views"
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={settings.track_conversions} onChange={(e) => setSettings({ ...settings, track_conversions: e.target.checked })} />}
                    label="Conversions"
                  />
                </Grid>
                <Grid item xs={6} md={4}>
                  <FormControlLabel
                    control={<Switch checked={settings.anonymize_ip} onChange={(e) => setSettings({ ...settings, anonymize_ip: e.target.checked })} />}
                    label="Anonymize IP"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={saveSettings}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  Save Settings
                </Button>
                {settings.ga4_measurement_id && (
                  <Button variant="outlined" onClick={testConnection} startIcon={<Refresh />}>
                    Test Connection
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tracking Code */}
        {settings.ga4_measurement_id && settings.ga4_enabled && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    <Code sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Tracking Code
                  </Typography>
                  <Button 
                    size="small" 
                    startIcon={<ContentCopy />}
                    onClick={() => fetchTrackingCode()}
                  >
                    Get Code
                  </Button>
                </Box>
                {trackingCode ? (
                  <Paper sx={{ p: 2, bgcolor: 'grey.900', position: 'relative' }}>
                    <Button
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => copyToClipboard(trackingCode)}
                    >
                      <ContentCopy fontSize="small" />
                    </Button>
                    <Typography
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: '#4CAF50',
                        whiteSpace: 'pre-wrap',
                        m: 0,
                      }}
                    >
                      {trackingCode}
                    </Typography>
                  </Paper>
                ) : (
                  <Typography color="text.secondary">
                    Click "Get Code" to generate your tracking code snippet
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Add this code to your website's &lt;head&gt; section to start tracking.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
