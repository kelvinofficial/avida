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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Android,
  Apple,
  AutoAwesome,
  Refresh,
  ContentCopy,
  TrendingUp,
  Language,
  CheckCircle,
  Analytics,
  Compare,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Helper to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const REGIONS = [
  { code: 'DE', name: 'Germany' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
];

export default function ASOEnginePage() {
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Generate form
  const [region, setRegion] = useState('TZ');
  const [language, setLanguage] = useState('en');
  const [keywords, setKeywords] = useState('');
  
  // Results
  const [googlePlayResult, setGooglePlayResult] = useState<any>(null);
  const [appStoreResult, setAppStoreResult] = useState<any>(null);
  const [regionKeywords, setRegionKeywords] = useState<any>(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<any>(null);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchMetadata();
    fetchAnalytics();
  }, []);

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/aso/metadata`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMetadata(data.metadata || []);
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/aso/analytics/summary`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchKeywords = async (regionCode: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/aso/keywords/${regionCode}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setRegionKeywords(data);
      }
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    }
  };

  const fetchCompetitorAnalysis = async (regionCode: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/aso/competitor-analysis/${regionCode}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCompetitorAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to fetch competitor analysis:', err);
    }
  };

  const generateGooglePlay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/aso/google-play/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          platform: 'google_play',
          region,
          language,
          focus_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          competitor_analysis: true,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setGooglePlayResult(data.metadata);
        setSuccess('Google Play listing generated!');
        fetchMetadata();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to generate');
      }
    } catch (err) {
      setError('Failed to generate Google Play listing');
    } finally {
      setLoading(false);
    }
  };

  const generateAppStore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/aso/app-store/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          platform: 'app_store',
          region,
          language,
          focus_keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          competitor_analysis: true,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setAppStoreResult(data.metadata);
        setSuccess('App Store listing generated!');
        fetchMetadata();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to generate');
      }
    } catch (err) {
      setError('Failed to generate App Store listing');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          ASO Engine
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Optimize App Store and Google Play listings for maximum visibility
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Impressions</Typography>
              <Typography variant="h4" fontWeight="bold">
                {analytics?.total_impressions?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Installs</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {analytics?.total_installs?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Average CTR</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {analytics?.average_ctr || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Metadata Versions</Typography>
              <Typography variant="h4" fontWeight="bold">
                {metadata.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Google Play" icon={<Android />} iconPosition="start" />
        <Tab label="App Store" icon={<Apple />} iconPosition="start" />
        <Tab label="Keywords" icon={<TrendingUp />} iconPosition="start" />
        <Tab label="Competitors" icon={<Compare />} iconPosition="start" />
        <Tab label="History" icon={<Analytics />} iconPosition="start" />
      </Tabs>

      {/* Google Play Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Generate Google Play Listing
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Target Region</InputLabel>
                  <Select
                    value={region}
                    label="Target Region"
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    {REGIONS.map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    label="Language"
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="sw">Swahili</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Focus Keywords (comma-separated)"
                  placeholder="marketplace, buy sell, safe"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  sx={{ mb: 2 }}
                  multiline
                  rows={2}
                />
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Android />}
                  onClick={generateGooglePlay}
                  disabled={loading}
                  size="large"
                >
                  Generate Google Play Listing
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {googlePlayResult && (
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      Generated Google Play Metadata
                    </Typography>
                    <IconButton onClick={() => copyToClipboard(JSON.stringify(googlePlayResult, null, 2))}>
                      <ContentCopy />
                    </IconButton>
                  </Box>

                  <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="success.contrastText">App Title (max 30 chars)</Typography>
                    <Typography variant="h6" color="success.contrastText" fontWeight="bold">
                      {googlePlayResult.app_title}
                    </Typography>
                    <Chip label={`${googlePlayResult.app_title?.length || 0}/30 chars`} size="small" sx={{ mt: 1 }} />
                  </Box>

                  <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2">Short Description (max 80 chars)</Typography>
                    <Typography variant="body1">{googlePlayResult.short_description}</Typography>
                    <Chip label={`${googlePlayResult.short_description?.length || 0}/80 chars`} size="small" sx={{ mt: 1 }} />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Long Description</Typography>
                    <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {googlePlayResult.long_description}
                      </Typography>
                    </Paper>
                    <Chip label={`${googlePlayResult.long_description?.length || 0}/4000 chars`} size="small" sx={{ mt: 1 }} />
                  </Box>

                  {googlePlayResult.feature_bullets?.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>Feature Bullets</Typography>
                      <List dense>
                        {googlePlayResult.feature_bullets.map((bullet: string, idx: number) => (
                          <ListItem key={idx}>
                            <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                            <ListItemText primary={bullet} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {googlePlayResult.update_notes && (
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="info.contrastText">Update Notes</Typography>
                      <Typography variant="body2" color="info.contrastText">
                        {googlePlayResult.update_notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* App Store Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Generate App Store Listing
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Target Region</InputLabel>
                  <Select
                    value={region}
                    label="Target Region"
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    {REGIONS.map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    label="Language"
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="sw">Swahili</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Focus Keywords (comma-separated)"
                  placeholder="marketplace, buy sell, safe"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  sx={{ mb: 2 }}
                  multiline
                  rows={2}
                />
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Apple />}
                  onClick={generateAppStore}
                  disabled={loading}
                  size="large"
                >
                  Generate App Store Listing
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {appStoreResult && (
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      Generated App Store Metadata
                    </Typography>
                    <IconButton onClick={() => copyToClipboard(JSON.stringify(appStoreResult, null, 2))}>
                      <ContentCopy />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="primary.contrastText">App Name (max 30 chars)</Typography>
                        <Typography variant="h6" color="primary.contrastText" fontWeight="bold">
                          {appStoreResult.app_name}
                        </Typography>
                        <Chip label={`${appStoreResult.app_name?.length || 0}/30 chars`} size="small" sx={{ mt: 1 }} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ p: 2, bgcolor: 'grey.200', borderRadius: 1 }}>
                        <Typography variant="subtitle2">Subtitle (max 30 chars)</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {appStoreResult.subtitle}
                        </Typography>
                        <Chip label={`${appStoreResult.subtitle?.length || 0}/30 chars`} size="small" sx={{ mt: 1 }} />
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="warning.contrastText">
                      Keyword Field (max 100 chars, comma-separated, no spaces)
                    </Typography>
                    <Typography variant="body1" color="warning.contrastText" fontFamily="monospace">
                      {appStoreResult.keywords}
                    </Typography>
                    <Chip label={`${appStoreResult.keywords?.length || 0}/100 chars`} size="small" sx={{ mt: 1 }} />
                  </Box>

                  <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="info.contrastText">Promotional Text (max 170 chars)</Typography>
                    <Typography variant="body1" color="info.contrastText">
                      {appStoreResult.promotional_text}
                    </Typography>
                    <Chip label={`${appStoreResult.promotional_text?.length || 0}/170 chars`} size="small" sx={{ mt: 1 }} />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Description</Typography>
                    <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {appStoreResult.description}
                      </Typography>
                    </Paper>
                  </Box>

                  {appStoreResult.screenshot_captions?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Screenshot Captions</Typography>
                      <List dense>
                        {appStoreResult.screenshot_captions.map((caption: string, idx: number) => (
                          <ListItem key={idx}>
                            <ListItemText
                              primary={`Screenshot ${idx + 1}`}
                              secondary={caption}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Keywords Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Keyword Research
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={region}
                    label="Region"
                    onChange={(e) => {
                      setRegion(e.target.value);
                      fetchKeywords(e.target.value);
                    }}
                  >
                    {REGIONS.map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<TrendingUp />}
                  onClick={() => fetchKeywords(region)}
                >
                  Get Keywords
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {regionKeywords && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Keywords for {regionKeywords.region}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="error.main" gutterBottom>
                      High Volume Keywords
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {regionKeywords.keywords?.high_volume?.map((kw: string, idx: number) => (
                        <Chip key={idx} label={kw} color="error" />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                      Medium Volume Keywords
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {regionKeywords.keywords?.medium_volume?.map((kw: string, idx: number) => (
                        <Chip key={idx} label={kw} color="warning" />
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                      Low Competition (High Opportunity)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {regionKeywords.keywords?.low_competition?.map((kw: string, idx: number) => (
                        <Chip key={idx} label={kw} color="success" />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Competitors Tab */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Competitor Analysis
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={region}
                    label="Region"
                    onChange={(e) => {
                      setRegion(e.target.value);
                      fetchCompetitorAnalysis(e.target.value);
                    }}
                  >
                    {REGIONS.map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Compare />}
                  onClick={() => fetchCompetitorAnalysis(region)}
                >
                  Analyze Competitors
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            {competitorAnalysis && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Competitor Analysis: {competitorAnalysis.region}
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Competitors in This Region
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {competitorAnalysis.competitors?.map((c: any, idx: number) => (
                        <Chip key={idx} label={c.name} variant="outlined" />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Strategic Insights
                    </Typography>
                    <List>
                      {competitorAnalysis.insights?.map((insight: string, idx: number) => (
                        <ListItem key={idx}>
                          <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                          <ListItemText primary={insight} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                      Keyword Gaps (Opportunities)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {competitorAnalysis.keyword_gaps?.map((kw: string, idx: number) => (
                        <Chip key={idx} label={kw} color="success" />
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* History Tab */}
      {tabValue === 4 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Platform</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Language</TableCell>
                <TableCell>Title/Name</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metadata.length > 0 ? (
                metadata.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Chip
                        icon={item.platform === 'google_play' ? <Android /> : <Apple />}
                        label={item.platform === 'google_play' ? 'Google Play' : 'App Store'}
                        size="small"
                        color={item.platform === 'google_play' ? 'success' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>{item.region}</TableCell>
                    <TableCell>{item.language}</TableCell>
                    <TableCell>{item.app_title || item.app_name}</TableCell>
                    <TableCell>
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(JSON.stringify(item, null, 2))}
                      >
                        <ContentCopy />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No metadata generated yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
