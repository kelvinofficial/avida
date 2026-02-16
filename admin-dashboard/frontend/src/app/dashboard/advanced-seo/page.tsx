'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  LinearProgress,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Link as LinkIcon,
  Share,
  TrendingUp,
  Refresh,
  ContentCopy,
  OpenInNew,
  Twitter,
  LinkedIn,
  Facebook,
  Instagram,
  Language,
  Warning,
  CheckCircle,
  Schedule,
  Search,
  AutoAwesome,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const REGIONS = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

const CATEGORIES = ['vehicles', 'electronics', 'properties', 'jobs', 'services', 'general'];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter />,
  linkedin: <LinkedIn />,
  facebook: <Facebook />,
  instagram: <Instagram />,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  facebook: '#4267B2',
  instagram: '#E4405F',
};

export default function AdvancedSeoPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Internal Linking State
  const [linkSuggestions, setLinkSuggestions] = useState<any[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set());
  const [contentType, setContentType] = useState('blog');

  // Social Distribution State
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin', 'facebook']);
  const [generatedSocialPosts, setGeneratedSocialPosts] = useState<any[]>([]);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);

  // Predictive SEO State
  const [trendingKeywords, setTrendingKeywords] = useState<any[]>([]);
  const [contentGaps, setContentGaps] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Backlink State
  const [backlinkOpportunities, setBacklinkOpportunities] = useState<any[]>([]);
  const [backlinkRegion, setBacklinkRegion] = useState('');

  // Multi-Language State
  const [multiLangStatus, setMultiLangStatus] = useState<any>(null);

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      fetchLinkSuggestions();
    } else if (tabValue === 1) {
      fetchSocialPosts();
    } else if (tabValue === 2) {
      fetchTrendingKeywords();
    } else if (tabValue === 3) {
      fetchBacklinkOpportunities();
    } else if (tabValue === 4) {
      fetchMultiLangStatus();
    }
  }, [tabValue, selectedRegion, selectedCategory, backlinkRegion]);

  const fetchBlogPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/posts?limit=50`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBlogPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch blog posts:', err);
    }
  };

  const fetchLinkSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/advanced-seo/internal-links/analyze?content_type=${contentType}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLinkSuggestions(data.suggestions || []);
      } else {
        setError('Failed to analyze internal links');
      }
    } catch (err) {
      setError('Failed to analyze internal links');
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/advanced-seo/social/posts?limit=20`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSocialPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch social posts:', err);
    }
  };

  const generateSocialPosts = async () => {
    if (!selectedBlogId) {
      setError('Please select a blog post');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/advanced-seo/social/generate-posts?content_id=${selectedBlogId}&content_type=blog&platforms=${selectedPlatforms.join(',')}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedSocialPosts(data.posts || []);
        setSocialDialogOpen(true);
        setSuccess(`Generated ${data.posts_generated} social media posts!`);
        fetchSocialPosts();
      } else {
        setError('Failed to generate social posts');
      }
    } catch (err) {
      setError('Failed to generate social posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingKeywords = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/growth/advanced-seo/trending/keywords?limit=20`;
      if (selectedRegion) url += `&region=${selectedRegion}`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTrendingKeywords(data.keywords || []);
      }
    } catch (err) {
      console.error('Failed to fetch trending keywords:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeContentGaps = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/advanced-seo/trending/analyze-content-gaps?region=${selectedRegion || 'TZ'}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setContentGaps(data);
        setSuccess('Content gap analysis complete!');
      }
    } catch (err) {
      setError('Failed to analyze content gaps');
    } finally {
      setLoading(false);
    }
  };

  const fetchBacklinkOpportunities = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/growth/advanced-seo/authority/backlink-opportunities?limit=20`;
      if (backlinkRegion) url += `&region=${backlinkRegion}`;
      
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setBacklinkOpportunities(data.opportunities || []);
      }
    } catch (err) {
      console.error('Failed to fetch backlink opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiLangStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/advanced-seo/multilang/status`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMultiLangStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch multi-language status:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const toggleLinkSelection = (index: number) => {
    const newSelected = new Set(selectedLinks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLinks(newSelected);
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <Box sx={{ p: 3 }} data-testid="advanced-seo-page">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Advanced SEO Engine
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Internal linking, social distribution, predictive SEO, and authority building
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
        <Tab label="Internal Linking" icon={<LinkIcon />} iconPosition="start" data-testid="tab-internal-linking" />
        <Tab label="Social Distribution" icon={<Share />} iconPosition="start" data-testid="tab-social-distribution" />
        <Tab label="Trending Keywords" icon={<TrendingUp />} iconPosition="start" data-testid="tab-trending-keywords" />
        <Tab label="Backlink Opportunities" icon={<OpenInNew />} iconPosition="start" data-testid="tab-backlinks" />
        <Tab label="Multi-Language" icon={<Language />} iconPosition="start" data-testid="tab-multilang" />
      </Tabs>

      {/* Internal Linking Tab */}
      {tabValue === 0 && (
        <Box data-testid="internal-linking-section">
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={contentType}
                    label="Content Type"
                    onChange={(e) => setContentType(e.target.value)}
                  >
                    <MenuItem value="blog">Blog Posts</MenuItem>
                    <MenuItem value="listing">Listings</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                  onClick={fetchLinkSuggestions}
                  disabled={loading}
                  data-testid="analyze-links-btn"
                >
                  Analyze Links
                </Button>
                {selectedLinks.size > 0 && (
                  <Chip 
                    label={`${selectedLinks.size} selected`} 
                    color="primary" 
                    onDelete={() => setSelectedLinks(new Set())}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {linkSuggestions.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Source</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Anchor Text</TableCell>
                    <TableCell>Relevance</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linkSuggestions.map((link, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedLinks.has(idx)}
                          onChange={() => toggleLinkSelection(idx)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 200 }}>
                          {link.source_title}
                        </Typography>
                        <Chip label={link.source_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {link.url}
                        </Typography>
                        <Chip label={link.target_type} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{link.anchor_text}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={link.relevance_score * 100} 
                            sx={{ width: 60, height: 8, borderRadius: 4 }}
                            color={link.relevance_score >= 0.7 ? 'success' : link.relevance_score >= 0.5 ? 'warning' : 'error'}
                          />
                          <Typography variant="body2">{Math.round(link.relevance_score * 100)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Copy link">
                          <IconButton size="small" onClick={() => copyToClipboard(link.url)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open">
                          <IconButton size="small" onClick={() => window.open(link.url, '_blank')}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No link suggestions yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click "Analyze Links" to find internal linking opportunities
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Social Distribution Tab */}
      {tabValue === 1 && (
        <Box data-testid="social-distribution-section">
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Generate Social Media Posts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create optimized posts for multiple platforms from your blog content
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Blog Post</InputLabel>
                    <Select
                      value={selectedBlogId}
                      label="Select Blog Post"
                      onChange={(e) => setSelectedBlogId(e.target.value)}
                      data-testid="select-blog-post"
                    >
                      {blogPosts.map((post) => (
                        <MenuItem key={post.id} value={post.id}>
                          {post.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Platforms</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                    {Object.entries(PLATFORM_ICONS).map(([platform, icon]) => (
                      <Chip
                        key={platform}
                        icon={icon as React.ReactElement}
                        label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                        onClick={() => togglePlatform(platform)}
                        color={selectedPlatforms.includes(platform) ? 'primary' : 'default'}
                        variant={selectedPlatforms.includes(platform) ? 'filled' : 'outlined'}
                        sx={{ 
                          bgcolor: selectedPlatforms.includes(platform) ? PLATFORM_COLORS[platform] : 'transparent',
                          '&:hover': { opacity: 0.8 }
                        }}
                      />
                    ))}
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                    onClick={generateSocialPosts}
                    disabled={loading || !selectedBlogId}
                    data-testid="generate-social-btn"
                  >
                    Generate Posts
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Recent Social Posts
                  </Typography>
                  {socialPosts.length > 0 ? (
                    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {socialPosts.map((post, idx) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            p: 2, 
                            mb: 2, 
                            borderRadius: 2, 
                            bgcolor: 'grey.50',
                            border: `2px solid ${PLATFORM_COLORS[post.platform] || '#ccc'}`
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {PLATFORM_ICONS[post.platform]}
                            <Typography variant="subtitle2" sx={{ color: PLATFORM_COLORS[post.platform] }}>
                              {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                            </Typography>
                            <Chip 
                              label={post.status} 
                              size="small" 
                              color={post.status === 'published' ? 'success' : 'warning'}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                            {post.content.substring(0, 200)}...
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {post.hashtags?.map((tag: string, i: number) => (
                              <Chip key={i} label={`#${tag}`} size="small" variant="outlined" />
                            ))}
                          </Box>
                          <IconButton size="small" onClick={() => copyToClipboard(post.content)} sx={{ mt: 1 }}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Share sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography color="text.secondary">No social posts generated yet</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Trending Keywords Tab */}
      {tabValue === 2 && (
        <Box data-testid="trending-keywords-section">
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={selectedRegion}
                    label="Region"
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    data-testid="select-region"
                  >
                    <MenuItem value="">All Regions</MenuItem>
                    {REGIONS.map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.flag} {r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 150 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    data-testid="select-category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={fetchTrendingKeywords}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={analyzeContentGaps}
                  disabled={loading}
                  data-testid="analyze-gaps-btn"
                >
                  Analyze Content Gaps
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={contentGaps ? 7 : 12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Keyword</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Trend Score</TableCell>
                      <TableCell>Volume</TableCell>
                      <TableCell>Competition</TableCell>
                      <TableCell>Growth</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trendingKeywords.map((kw, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{kw.keyword}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {kw.suggested_content}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={REGIONS.find(r => r.code === kw.region)?.flag + ' ' + kw.region} 
                            size="small" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={kw.trend_score * 100} 
                              sx={{ width: 50, height: 8, borderRadius: 4 }}
                              color="primary"
                            />
                            <Typography variant="body2">{Math.round(kw.trend_score * 100)}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{kw.search_volume.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={kw.competition} 
                            size="small"
                            color={kw.competition === 'low' ? 'success' : kw.competition === 'medium' ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={kw.growth_rate?.startsWith('+') ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                            label={kw.growth_rate} 
                            size="small"
                            color={kw.growth_rate?.startsWith('+') ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {contentGaps && (
              <Grid item xs={12} md={5}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Content Gap Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Region: {contentGaps.region} | Existing content: {contentGaps.existing_content}
                    </Typography>
                    
                    {contentGaps.content_gaps?.map((gap: any, idx: number) => (
                      <Box 
                        key={idx} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 2, 
                          bgcolor: gap.priority === 'high' ? 'error.50' : 'warning.50',
                          border: `1px solid ${gap.priority === 'high' ? 'error.main' : 'warning.main'}`
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">{gap.keyword}</Typography>
                          <Chip 
                            label={gap.priority} 
                            size="small" 
                            color={gap.priority === 'high' ? 'error' : 'warning'}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {gap.suggested_title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Coverage: {Math.round(gap.coverage * 100)}%
                        </Typography>
                      </Box>
                    ))}

                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Recommendations</Typography>
                    {contentGaps.recommendations?.map((rec: string, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                        <CheckCircle fontSize="small" color="primary" />
                        <Typography variant="body2">{rec}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Backlink Opportunities Tab */}
      {tabValue === 3 && (
        <Box data-testid="backlinks-section">
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={backlinkRegion}
                    label="Region"
                    onChange={(e) => setBacklinkRegion(e.target.value)}
                  >
                    <MenuItem value="">All Regions</MenuItem>
                    {[...REGIONS, { code: 'global', name: 'Global', flag: '🌍' }].map((r) => (
                      <MenuItem key={r.code} value={r.code}>{r.flag} {r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={fetchBacklinkOpportunities}
                  disabled={loading}
                >
                  Refresh Opportunities
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            {backlinkOpportunities.map((opp, idx) => (
              <Grid item xs={12} md={6} lg={4} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">{opp.domain}</Typography>
                        <Chip 
                          label={`DA: ${opp.domain_authority}`} 
                          size="small" 
                          color={opp.domain_authority >= 70 ? 'success' : opp.domain_authority >= 50 ? 'warning' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Chip 
                        label={opp.difficulty} 
                        size="small"
                        color={opp.difficulty === 'high' ? 'error' : opp.difficulty === 'medium' ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Chip label={opp.type} size="small" sx={{ mr: 0.5 }} />
                      <Chip 
                        label={REGIONS.find(r => r.code === opp.region)?.flag + ' ' + opp.region} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {opp.suggested_outreach}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Contact: {opp.contact_method}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Multi-Language Tab */}
      {tabValue === 4 && (
        <Box data-testid="multilang-section">
          {multiLangStatus && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Language Coverage Status
                    </Typography>
                    <Grid container spacing={3}>
                      {Object.entries(multiLangStatus.languages || {}).map(([code, lang]: [string, any]) => (
                        <Grid item xs={12} sm={4} key={code}>
                          <Box 
                            sx={{ 
                              p: 3, 
                              borderRadius: 2, 
                              bgcolor: lang.status === 'active' ? 'success.50' : 'grey.100',
                              border: `1px solid ${lang.status === 'active' ? 'success.main' : 'grey.300'}`
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">{lang.name}</Typography>
                              <Chip 
                                label={lang.status} 
                                size="small" 
                                color={lang.status === 'active' ? 'success' : 'default'}
                              />
                            </Box>
                            <Typography variant="h3" fontWeight="bold" color="primary">
                              {lang.content_count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">articles</Typography>
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="text.secondary">Coverage</Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={lang.coverage} 
                                sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                                color={lang.coverage >= 50 ? 'success' : 'warning'}
                              />
                              <Typography variant="caption">{lang.coverage}%</Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Recommendations
                    </Typography>
                    {multiLangStatus.recommendations?.map((rec: string, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
                        <Warning color="warning" fontSize="small" />
                        <Typography variant="body2">{rec}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Technical SEO Status
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {multiLangStatus.hreflang_implemented ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Warning color="warning" />
                        )}
                        <Typography variant="body2">
                          hreflang tags {multiLangStatus.hreflang_implemented ? 'implemented' : 'not implemented'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {multiLangStatus.language_selector_ui ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Warning color="warning" />
                        )}
                        <Typography variant="body2">
                          Language selector UI {multiLangStatus.language_selector_ui ? 'available' : 'not available'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Social Posts Dialog */}
      <Dialog open={socialDialogOpen} onClose={() => setSocialDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generated Social Media Posts</DialogTitle>
        <DialogContent>
          {generatedSocialPosts.map((post, idx) => (
            <Box 
              key={idx} 
              sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 2, 
                bgcolor: 'grey.50',
                border: `2px solid ${PLATFORM_COLORS[post.platform] || '#ccc'}`
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {PLATFORM_ICONS[post.platform]}
                <Typography variant="subtitle2" sx={{ color: PLATFORM_COLORS[post.platform] }}>
                  {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                {post.content}
              </Typography>
              <Button
                size="small"
                startIcon={<ContentCopy />}
                onClick={() => copyToClipboard(post.content)}
              >
                Copy
              </Button>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSocialDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
