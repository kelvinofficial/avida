'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Switch, FormControlLabel,
  Alert, Chip, Divider, CircularProgress, Paper, Tab, Tabs, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Analytics, Code, CheckCircle, Warning, ContentCopy, Refresh, TrendingUp,
  Language, Public, SmartToy, Speed, PeopleAlt, Pageview, AccessTime,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

interface TrafficData {
  summary: {
    total_users: number;
    total_sessions: number;
    total_pageviews: number;
    avg_bounce_rate: number;
    avg_session_duration: number;
    pages_per_session: number;
    new_users_percentage: number;
  };
  daily: Array<{ date: string; users: number; sessions: number; pageviews: number }>;
  is_demo_data: boolean;
}

interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  bounce_rate: number;
  conversion_rate: number;
}

interface GeoData {
  country: string;
  country_code: string;
  flag: string;
  users: number;
  sessions: number;
}

interface AICitation {
  source: string;
  icon: string;
  referrals: number;
  conversion_rate: number;
}

export default function AnalyticsSettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Settings state
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
  
  // Dashboard data state
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [aiCitations, setAiCitations] = useState<any>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
    fetchDashboardData();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/analytics-settings`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.setup_instructions) setSetupInstructions(data.setup_instructions);
      }
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [trafficRes, sourcesRes, geoRes, aiRes, realtimeRes] = await Promise.all([
        fetch(`${API_BASE}/growth/analytics-settings/traffic-overview?days=30`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/growth/analytics-settings/traffic-sources`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/growth/analytics-settings/geo-data`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/growth/analytics-settings/ai-citations`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/growth/analytics-settings/realtime`, { headers: getAuthHeaders() }),
      ]);
      
      if (trafficRes.ok) setTrafficData(await trafficRes.json());
      if (sourcesRes.ok) {
        const srcData = await sourcesRes.json();
        setTrafficSources(srcData.sources || []);
      }
      if (geoRes.ok) {
        const gData = await geoRes.json();
        setGeoData(gData.countries || []);
      }
      if (aiRes.ok) setAiCitations(await aiRes.json());
      if (realtimeRes.ok) setRealtimeData(await realtimeRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data');
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
        if (settings.ga4_measurement_id) fetchTrackingCode();
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <Box sx={{ p: 3 }} data-testid="analytics-settings-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Analytics & Reporting</Typography>
        <Typography variant="body1" color="text.secondary">
          Configure Google Analytics 4 and view traffic insights
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Dashboard" icon={<TrendingUp />} iconPosition="start" />
        <Tab label="Traffic Sources" icon={<Language />} iconPosition="start" />
        <Tab label="Geographic" icon={<Public />} iconPosition="start" />
        <Tab label="AI Citations (AEO)" icon={<SmartToy />} iconPosition="start" />
        <Tab label="Settings" icon={<Analytics />} iconPosition="start" />
      </Tabs>

      {/* Dashboard Tab */}
      {tabValue === 0 && (
        <Box>
          {/* Demo Data Banner */}
          {trafficData?.is_demo_data && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Showing demo data preview. Configure your GA4 Measurement ID in Settings to see real analytics.
            </Alert>
          )}

          {/* Realtime Stats */}
          {realtimeData && (
            <Card sx={{ mb: 3, bgcolor: 'primary.dark', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ color: '#4CAF50' }} />
                    <Typography variant="h4" fontWeight="bold">{realtimeData.active_users}</Typography>
                    <Typography>active users right now</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  <Typography variant="body2">{realtimeData.pageviews_last_30_min} pageviews in last 30 min</Typography>
                  <Button size="small" sx={{ ml: 'auto', color: 'white' }} onClick={fetchDashboardData} startIcon={<Refresh />}>
                    Refresh
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          {trafficData && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <PeopleAlt color="primary" />
                    <Typography variant="h5" fontWeight="bold">{formatNumber(trafficData.summary.total_users)}</Typography>
                    <Typography variant="caption" color="text.secondary">Users</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Pageview color="info" />
                    <Typography variant="h5" fontWeight="bold">{formatNumber(trafficData.summary.total_pageviews)}</Typography>
                    <Typography variant="caption" color="text.secondary">Pageviews</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{trafficData.summary.pages_per_session}</Typography>
                    <Typography variant="caption" color="text.secondary">Pages/Session</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <AccessTime color="warning" />
                    <Typography variant="h5" fontWeight="bold">{formatDuration(trafficData.summary.avg_session_duration)}</Typography>
                    <Typography variant="caption" color="text.secondary">Avg Duration</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h5" fontWeight="bold" color="error.main">{trafficData.summary.avg_bounce_rate}%</Typography>
                    <Typography variant="caption" color="text.secondary">Bounce Rate</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h5" fontWeight="bold" color="info.main">{trafficData.summary.new_users_percentage}%</Typography>
                    <Typography variant="caption" color="text.secondary">New Users</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Traffic Chart (Simplified) */}
          {trafficData && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Daily Traffic (Last 30 Days)</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, height: 120, alignItems: 'flex-end' }}>
                  {trafficData.daily.slice(-30).map((day, idx) => {
                    const maxUsers = Math.max(...trafficData.daily.map(d => d.users));
                    const height = (day.users / maxUsers) * 100;
                    return (
                      <Tooltip key={idx} title={`${day.date}: ${day.users} users`}>
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: 'primary.main',
                            height: `${height}%`,
                            borderRadius: '2px 2px 0 0',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'primary.dark' }
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">30 days ago</Typography>
                  <Typography variant="caption" color="text.secondary">Today</Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Traffic Sources Tab */}
      {tabValue === 1 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Traffic Sources</Typography>
                  {trafficSources.map((source, idx) => {
                    const maxSessions = Math.max(...trafficSources.map(s => s.sessions));
                    const percentage = (source.sessions / maxSessions) * 100;
                    return (
                      <Box key={idx} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography fontWeight="bold">
                            {source.source} / {source.medium}
                          </Typography>
                          <Typography>{source.sessions.toLocaleString()} sessions</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={percentage} sx={{ height: 8, borderRadius: 1 }} />
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{source.users} users</Typography>
                          <Typography variant="caption" color="text.secondary">{source.bounce_rate}% bounce</Typography>
                          <Typography variant="caption" color="success.main">{source.conversion_rate}% conv.</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Source Breakdown</Typography>
                  {['organic', 'direct', 'social', 'referral', 'email'].map((medium) => {
                    const total = trafficSources.filter(s => s.medium.includes(medium) || (medium === 'direct' && s.medium === '(none)')).reduce((acc, s) => acc + s.sessions, 0);
                    const allTotal = trafficSources.reduce((acc, s) => acc + s.sessions, 0);
                    const percentage = allTotal > 0 ? (total / allTotal) * 100 : 0;
                    return (
                      <Box key={medium} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" textTransform="capitalize">{medium}</Typography>
                        </Box>
                        <Box sx={{ width: 100, mr: 2 }}>
                          <LinearProgress variant="determinate" value={percentage} sx={{ height: 6, borderRadius: 1 }} />
                        </Box>
                        <Typography variant="body2" fontWeight="bold">{percentage.toFixed(1)}%</Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Geographic Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Users by Country (Target Markets)</Typography>
            <Grid container spacing={2}>
              {geoData.map((geo, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4">{geo.flag}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight="bold">{geo.country}</Typography>
                      <Typography variant="body2" color="text.secondary">{geo.users.toLocaleString()} users</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{geo.sessions.toLocaleString()}</Typography>
                      <Typography variant="caption" color="text.secondary">sessions</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* AI Citations Tab */}
      {tabValue === 3 && aiCitations && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            AI Citation Tracking (AEO) measures how often your content is cited by AI assistants like ChatGPT and Gemini.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'success.dark', color: 'white' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SmartToy sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h3" fontWeight="bold">{aiCitations.total_ai_traffic}</Typography>
                  <Typography>AI-Referred Visits</Typography>
                  <Chip label={`+${aiCitations.ai_traffic_growth}% growth`} size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="bold" color="primary">{aiCitations.aeo_score}</Typography>
                  <Typography color="text.secondary">AEO Score</Typography>
                  <Typography variant="caption">Answer Engine Optimization</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Top Cited Content</Typography>
                  {aiCitations.top_cited_content?.map((content: any, idx: number) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      <Typography variant="body2" noWrap>{content.title}</Typography>
                      <Chip label={`${content.citations} citations`} size="small" color="success" />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Citations by AI Source</Typography>
              <Grid container spacing={2}>
                {aiCitations.citations_by_source?.map((source: AICitation, idx: number) => (
                  <Grid item xs={12} sm={6} md={4} key={idx}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h4">{source.icon}</Typography>
                        <Box>
                          <Typography fontWeight="bold">{source.source}</Typography>
                          <Typography variant="body2" color="text.secondary">{source.referrals} referrals</Typography>
                        </Box>
                      </Box>
                      <Chip label={`${source.conversion_rate}% conversion`} size="small" color="success" variant="outlined" />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Settings Tab */}
      {tabValue === 4 && (
        <Grid container spacing={3}>
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
                    <Typography variant="h6">{settings.setup_complete ? 'Setup Complete' : 'Setup Required'}</Typography>
                    <Chip label={settings.ga4_enabled ? 'Tracking Active' : 'Tracking Disabled'} color={settings.ga4_enabled ? 'success' : 'default'} size="small" />
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

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom><Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />Google Analytics 4</Typography>
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
                      control={<Switch checked={settings.ga4_enabled} onChange={(e) => setSettings({ ...settings, ga4_enabled: e.target.checked })} disabled={!settings.ga4_measurement_id} />}
                      label="Enable GA4"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" gutterBottom>Tracking Options</Typography>
                <Grid container spacing={1}>
                  {[
                    { key: 'track_page_views', label: 'Page Views' },
                    { key: 'track_blog_reads', label: 'Blog Reads' },
                    { key: 'track_listing_views', label: 'Listing Views' },
                    { key: 'track_conversions', label: 'Conversions' },
                    { key: 'anonymize_ip', label: 'Anonymize IP' },
                  ].map((opt) => (
                    <Grid item xs={6} md={4} key={opt.key}>
                      <FormControlLabel
                        control={<Switch checked={(settings as any)[opt.key]} onChange={(e) => setSettings({ ...settings, [opt.key]: e.target.checked })} />}
                        label={opt.label}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained" onClick={saveSettings} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
                    Save Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {settings.ga4_measurement_id && settings.ga4_enabled && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6"><Code sx={{ mr: 1, verticalAlign: 'middle' }} />Tracking Code</Typography>
                    <Button size="small" startIcon={<ContentCopy />} onClick={fetchTrackingCode}>Get Code</Button>
                  </Box>
                  {trackingCode ? (
                    <Paper sx={{ p: 2, bgcolor: 'grey.900', position: 'relative' }}>
                      <Button size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }} onClick={() => copyToClipboard(trackingCode)}>
                        <ContentCopy fontSize="small" />
                      </Button>
                      <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#4CAF50', whiteSpace: 'pre-wrap', m: 0 }}>
                        {trackingCode}
                      </Typography>
                    </Paper>
                  ) : (
                    <Typography color="text.secondary">Click "Get Code" to generate your tracking code snippet</Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
