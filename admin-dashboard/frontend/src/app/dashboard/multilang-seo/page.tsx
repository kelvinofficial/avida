'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, LinearProgress,
} from '@mui/material';
import {
  Language, Translate, Flag, Add, ContentCopy, Code, CheckCircle, Schedule,
  Close, TrendingUp, Search,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  sw: '🇹🇿',
};

interface LanguageInfo {
  name: string;
  native_name: string;
  flag: string;
  regions: string[];
  status: string;
  blog_posts?: number;
  localizations?: number;
  pending_translations?: number;
  coverage_score?: number;
}

interface TranslationTask {
  id: string;
  source_language: string;
  target_language: string;
  content_type: string;
  content_id?: string;
  text?: string;
  status: string;
  created_at: string;
}

export default function MultilangSeoPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [languageStats, setLanguageStats] = useState<Record<string, LanguageInfo>>({});
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [translationTasks, setTranslationTasks] = useState<TranslationTask[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<Record<string, string>>({});
  const [regionalKeywords, setRegionalKeywords] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'translation' | 'hreflang'>('translation');
  const [formData, setFormData] = useState({
    content_type: 'blog',
    content_id: '',
    target_language: 'de',
    text: '',
  });
  const [hreflangOutput, setHreflangOutput] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
    fetchTranslationTasks();
    fetchRegionalKeywords();
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      fetchSeoKeywords(selectedLanguage);
    }
  }, [selectedLanguage]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/status`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLanguageStats(data.languages || {});
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranslationTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/translation-tasks`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTranslationTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks');
    }
  };

  const fetchSeoKeywords = async (lang: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/seo-keywords/${lang}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSeoKeywords(data.keywords || {});
      }
    } catch (err) {
      console.error('Failed to fetch keywords');
    }
  };

  const fetchRegionalKeywords = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/regional-keywords`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRegionalKeywords(data.regional_keywords);
      }
    } catch (err) {
      console.error('Failed to fetch regional keywords');
    }
  };

  const createTranslationTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/translation-tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          source_language: 'en',
          target_language: formData.target_language,
          content_type: formData.content_type,
          content_id: formData.content_id || null,
          text: formData.text || null,
        }),
      });
      if (res.ok) {
        setSuccess('Translation task created');
        setDialogOpen(false);
        setFormData({ content_type: 'blog', content_id: '', target_language: 'de', text: '' });
        fetchTranslationTasks();
        fetchStatus();
      } else {
        setError('Failed to create task');
      }
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const generateHreflangTags = async () => {
    if (!formData.content_id) {
      setError('Content ID is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/multilang/hreflang-tags/${formData.content_type}/${formData.content_id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setHreflangOutput(data);
        setDialogType('hreflang');
        setDialogOpen(true);
      }
    } catch (err) {
      setError('Failed to generate hreflang tags');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const getTotalContent = () => {
    return Object.values(languageStats).reduce((sum, lang) => sum + (lang.blog_posts || 0) + (lang.localizations || 0), 0);
  };

  return (
    <Box sx={{ p: 3 }} data-testid="multilang-seo-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Multi-Language SEO</Typography>
        <Typography variant="body1" color="text.secondary">
          Manage content in English, German, and Swahili for different markets
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Language Coverage Overview */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(languageStats).map(([code, lang]) => (
          <Grid item xs={12} md={4} key={code}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="h3">{lang.flag}</Typography>
                  <Box>
                    <Typography variant="h6">{lang.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{lang.native_name}</Typography>
                  </Box>
                  <Chip 
                    label={lang.status} 
                    size="small" 
                    color={lang.status === 'active' ? 'success' : 'default'} 
                    sx={{ ml: 'auto' }} 
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Coverage</Typography>
                    <Typography variant="body2" fontWeight="bold">{lang.coverage_score || 0}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={lang.coverage_score || 0} 
                    sx={{ height: 8, borderRadius: 1 }}
                    color={lang.coverage_score && lang.coverage_score >= 50 ? 'success' : 'warning'}
                  />
                </Box>
                
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="h5" color="primary" textAlign="center">{lang.blog_posts || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Blog Posts</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h5" color="info.main" textAlign="center">{lang.localizations || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Localizations</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h5" color="warning.main" textAlign="center">{lang.pending_translations || 0}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center">Pending</Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Regions: {lang.regions?.join(', ')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'info.dark', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recommendations</Typography>
            {recommendations.map((rec, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <TrendingUp fontSize="small" />
                <Typography variant="body2">{rec}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Translation Tasks" icon={<Translate />} iconPosition="start" />
        <Tab label="SEO Keywords" icon={<Search />} iconPosition="start" />
        <Tab label="Regional Keywords" icon={<Flag />} iconPosition="start" />
        <Tab label="Hreflang Generator" icon={<Code />} iconPosition="start" />
      </Tabs>

      {/* Translation Tasks Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => { setDialogType('translation'); setDialogOpen(true); }}
            >
              New Translation Task
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Content Type</TableCell>
                  <TableCell>Source → Target</TableCell>
                  <TableCell>Content ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {translationTasks.map(task => (
                  <TableRow key={task.id} hover>
                    <TableCell><Chip label={task.content_type} size="small" /></TableCell>
                    <TableCell>
                      {LANGUAGE_FLAGS[task.source_language]} → {LANGUAGE_FLAGS[task.target_language]}
                    </TableCell>
                    <TableCell>{task.content_id || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={task.status} 
                        size="small"
                        color={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{new Date(task.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {translationTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No translation tasks yet</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* SEO Keywords Tab */}
      {tabValue === 1 && (
        <Box>
          <FormControl sx={{ minWidth: 200, mb: 3 }}>
            <InputLabel>Language</InputLabel>
            <Select 
              value={selectedLanguage} 
              label="Language"
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {Object.entries(languageStats).map(([code, lang]) => (
                <MenuItem key={code} value={code}>{lang.flag} {lang.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>SEO Keywords in {languageStats[selectedLanguage]?.name || selectedLanguage}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>English Term</TableCell>
                      <TableCell>Translation</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(seoKeywords).map(([key, value]) => (
                      <TableRow key={key} hover>
                        <TableCell>{key.replace(/_/g, ' ')}</TableCell>
                        <TableCell><strong>{value}</strong></TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => copyToClipboard(value)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Regional Keywords Tab */}
      {tabValue === 2 && regionalKeywords && (
        <Grid container spacing={3}>
          {Object.entries(regionalKeywords).map(([region, data]: [string, any]) => (
            <Grid item xs={12} md={4} key={region}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Flag />
                    <Typography variant="h6">{region}</Typography>
                    <Chip label={data.primary_language} size="small" sx={{ ml: 'auto' }} />
                  </Box>
                  
                  {Object.entries(data.keywords).map(([category, keywords]: [string, any]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>{category}</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {keywords.map((kw: string, idx: number) => (
                          <Chip 
                            key={idx} 
                            label={kw} 
                            size="small" 
                            variant="outlined"
                            onClick={() => copyToClipboard(kw)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Hreflang Generator Tab */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Generate Hreflang Tags</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate hreflang tags for your content to help search engines serve the right language version
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={formData.content_type}
                    label="Content Type"
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                  >
                    <MenuItem value="blog">Blog Post</MenuItem>
                    <MenuItem value="listing">Listing</MenuItem>
                    <MenuItem value="category">Category</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Content ID"
                  value={formData.content_id}
                  onChange={(e) => setFormData({ ...formData, content_id: e.target.value })}
                  fullWidth
                  placeholder="e.g., how-to-sell-car-online"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  variant="contained" 
                  onClick={generateHreflangTags}
                  disabled={loading || !formData.content_id}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  Generate
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'translation' ? 'Create Translation Task' : 'Hreflang Tags'}
          <IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {dialogType === 'translation' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={formData.content_type}
                  label="Content Type"
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                >
                  <MenuItem value="blog">Blog Post</MenuItem>
                  <MenuItem value="listing_template">Listing Template</MenuItem>
                  <MenuItem value="meta_tag">Meta Tag</MenuItem>
                  <MenuItem value="ui_string">UI String</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Content ID (optional)"
                value={formData.content_id}
                onChange={(e) => setFormData({ ...formData, content_id: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Target Language</InputLabel>
                <Select
                  value={formData.target_language}
                  label="Target Language"
                  onChange={(e) => setFormData({ ...formData, target_language: e.target.value })}
                >
                  <MenuItem value="de">🇩🇪 German</MenuItem>
                  <MenuItem value="sw">🇹🇿 Swahili</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Text to Translate (optional)"
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          )}
          
          {dialogType === 'hreflang' && hreflangOutput && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Available Languages</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {hreflangOutput.available_languages?.map((lang: string) => (
                  <Chip key={lang} label={`${LANGUAGE_FLAGS[lang] || ''} ${lang}`} />
                ))}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>HTML Tags</Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.900', position: 'relative' }}>
                <IconButton 
                  size="small" 
                  sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
                  onClick={() => copyToClipboard(hreflangOutput.html)}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
                <Typography 
                  component="pre" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.75rem', 
                    color: '#4CAF50', 
                    whiteSpace: 'pre-wrap',
                    m: 0 
                  }}
                >
                  {hreflangOutput.html}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          {dialogType === 'translation' && (
            <Button variant="contained" onClick={createTranslationTask} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Create Task'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
