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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Article,
  AutoAwesome,
  Refresh,
  Add,
  Edit,
  Delete,
  Publish,
  ExpandMore,
  ContentCopy,
  OpenInNew,
  Search,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Helper to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const COUNTRIES = [
  { code: 'DE', name: 'Germany' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
];

const CATEGORIES = [
  'vehicles',
  'properties',
  'electronics',
  'fashion',
  'furniture',
  'jobs',
  'services',
  'general',
];

const TEMPLATE_TYPES = [
  { value: 'buying_guide', label: 'Buying Guide' },
  { value: 'selling_guide', label: 'Selling Guide' },
  { value: 'safety', label: 'Safety Tips' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'market_report', label: 'Market Report' },
];

export default function ContentEnginePage() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Generate form state
  const [generateForm, setGenerateForm] = useState({
    topic: '',
    template_type: 'buying_guide',
    target_country: 'TZ',
    target_category: 'vehicles',
    keywords: '',
    word_count: 1500,
    include_faq: true,
    include_statistics: true,
    language: 'en',
  });
  
  // AEO Content state
  const [aeoTopic, setAeoTopic] = useState('');
  const [aeoContent, setAeoContent] = useState<any>(null);
  const [aeoQuestions, setAeoQuestions] = useState<any[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    fetchPosts();
    fetchSuggestions();
    fetchAnalytics();
    fetchAeoQuestions();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/posts?limit=50`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/suggestions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/analytics`, {
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

  const fetchAeoQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/aeo-questions`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAeoQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to fetch AEO questions:', err);
    }
  };

  const generatePost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/content/generate-post`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...generateForm,
          keywords: generateForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccess('Blog post generated successfully!');
        fetchPosts();
        setSelectedPost(data.post);
        setDialogOpen(true);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to generate post');
      }
    } catch (err) {
      setError('Failed to generate post');
    } finally {
      setLoading(false);
    }
  };

  const generateAeoContent = async (topic: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/content/generate-aeo-content?topic=${encodeURIComponent(topic)}`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const data = await res.json();
        setAeoContent(data);
        setSuccess('AEO content generated!');
      } else {
        setError('Failed to generate AEO content');
      }
    } catch (err) {
      setError('Failed to generate AEO content');
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async (postId: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/content/posts/${postId}/publish`, {
        method: 'POST',
      });
      if (res.ok) {
        setSuccess('Post published!');
        fetchPosts();
      }
    } catch (err) {
      setError('Failed to publish post');
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/growth/content/posts/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Post deleted!');
        fetchPosts();
      }
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          AI Content Engine
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate SEO-optimized blog posts and AI-search optimized content
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Posts</Typography>
              <Typography variant="h4" fontWeight="bold">{analytics?.total_posts || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Published</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {analytics?.published_posts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Drafts</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {analytics?.draft_posts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">This Week</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {posts.filter(p => {
                  const created = new Date(p.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return created > weekAgo;
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Generate Content" icon={<AutoAwesome />} iconPosition="start" />
        <Tab label="Blog Posts" icon={<Article />} iconPosition="start" />
        <Tab label="AI Search (AEO)" icon={<Search />} iconPosition="start" />
        <Tab label="Suggestions" icon={<Add />} iconPosition="start" />
      </Tabs>

      {/* Generate Content Tab */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Generate AI Blog Post
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Topic"
                  placeholder="e.g., Best Used Cars Under €5000 in Germany"
                  value={generateForm.topic}
                  onChange={(e) => setGenerateForm({ ...generateForm, topic: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Template Type</InputLabel>
                  <Select
                    value={generateForm.template_type}
                    label="Template Type"
                    onChange={(e) => setGenerateForm({ ...generateForm, template_type: e.target.value })}
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Target Country</InputLabel>
                  <Select
                    value={generateForm.target_country}
                    label="Target Country"
                    onChange={(e) => setGenerateForm({ ...generateForm, target_country: e.target.value })}
                  >
                    {COUNTRIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={generateForm.target_category}
                    label="Category"
                    onChange={(e) => setGenerateForm({ ...generateForm, target_category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={generateForm.language}
                    label="Language"
                    onChange={(e) => setGenerateForm({ ...generateForm, language: e.target.value })}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="sw">Swahili</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Keywords (comma-separated)"
                  placeholder="used cars, safe buying, escrow, marketplace"
                  value={generateForm.keywords}
                  onChange={(e) => setGenerateForm({ ...generateForm, keywords: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Word Count"
                  value={generateForm.word_count}
                  onChange={(e) => setGenerateForm({ ...generateForm, word_count: parseInt(e.target.value) })}
                  inputProps={{ min: 500, max: 3000 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generateForm.include_faq}
                      onChange={(e) => setGenerateForm({ ...generateForm, include_faq: e.target.checked })}
                    />
                  }
                  label="Include FAQ Section"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generateForm.include_statistics}
                      onChange={(e) => setGenerateForm({ ...generateForm, include_statistics: e.target.checked })}
                    />
                  }
                  label="Include Statistics"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                  onClick={generatePost}
                  disabled={loading || !generateForm.topic}
                >
                  {loading ? 'Generating...' : 'Generate Blog Post'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Blog Posts Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Words</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 300 }}>
                        {post.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={post.category} size="small" />
                    </TableCell>
                    <TableCell>{post.target_country}</TableCell>
                    <TableCell>
                      <Chip
                        label={post.status}
                        size="small"
                        color={post.status === 'published' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{post.word_count}</TableCell>
                    <TableCell>
                      {new Date(post.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPost(post);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      {post.status !== 'published' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => publishPost(post.id)}
                        >
                          <Publish />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deletePost(post.id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No blog posts yet. Generate your first post!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* AEO Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Generate AI-Search Optimized Content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create content designed to be cited by ChatGPT, Gemini, Claude, and Perplexity
                </Typography>
                <TextField
                  fullWidth
                  label="Topic"
                  placeholder="e.g., What is Avida marketplace?"
                  value={aeoTopic}
                  onChange={(e) => setAeoTopic(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                  onClick={() => generateAeoContent(aeoTopic)}
                  disabled={loading || !aeoTopic}
                >
                  Generate AEO Content
                </Button>
              </CardContent>
            </Card>

            {/* Predefined Questions */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Generate - Common Questions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {aeoQuestions.map((q, idx) => (
                    <Chip
                      key={idx}
                      label={q.question}
                      onClick={() => generateAeoContent(q.question)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            {aeoContent && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Generated AEO Content
                  </Typography>
                  
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary.contrastText">Question</Typography>
                    <Typography variant="body1" color="primary.contrastText" fontWeight="bold">
                      {aeoContent.question}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="success.contrastText">Answer (Citation-Ready)</Typography>
                    <Typography variant="body1" color="success.contrastText">
                      {aeoContent.answer}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2">Entity Definition</Typography>
                    <Typography variant="body1">{aeoContent.entity_definition}</Typography>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>Structured Facts</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {aeoContent.structured_facts?.map((fact: string, idx: number) => (
                      <li key={idx}>
                        <Typography variant="body2">{fact}</Typography>
                      </li>
                    ))}
                  </Box>

                  <Button
                    startIcon={<ContentCopy />}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(aeoContent, null, 2));
                      setSuccess('Copied to clipboard!');
                    }}
                    sx={{ mt: 2 }}
                  >
                    Copy JSON
                  </Button>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Suggestions Tab */}
      {tabValue === 3 && (
        <Grid container spacing={2}>
          {suggestions.map((suggestion, idx) => (
            <Grid item xs={12} md={6} lg={4} key={idx}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Chip
                      label={suggestion.priority}
                      size="small"
                      color={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'default'}
                    />
                    <Chip label={suggestion.target_country} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {suggestion.title}
                  </Typography>
                  <Chip label={suggestion.type} size="small" sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {suggestion.keywords?.map((kw: string, i: number) => (
                      <Chip key={i} label={kw} size="small" variant="outlined" />
                    ))}
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AutoAwesome />}
                    onClick={() => {
                      setGenerateForm({
                        ...generateForm,
                        topic: suggestion.title,
                        template_type: suggestion.type,
                        target_country: suggestion.target_country === 'all' ? 'TZ' : suggestion.target_country,
                        keywords: suggestion.keywords?.join(', ') || '',
                      });
                      setTabValue(0);
                    }}
                    sx={{ mt: 2 }}
                  >
                    Generate This
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Post Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPost?.title}
        </DialogTitle>
        <DialogContent>
          {selectedPost && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Chip label={selectedPost.status} sx={{ mr: 1 }} />
                <Chip label={selectedPost.category} variant="outlined" sx={{ mr: 1 }} />
                <Chip label={selectedPost.target_country} variant="outlined" />
              </Box>
              
              <Typography variant="subtitle2" color="text.secondary">Meta Description</Typography>
              <Typography variant="body2" sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                {selectedPost.meta_description}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary">Content Preview</Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedPost.content?.substring(0, 2000)}...
                </Typography>
              </Box>

              {selectedPost.faq_section?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>FAQ Section</Typography>
                  {selectedPost.faq_section.map((faq: any, idx: number) => (
                    <Accordion key={idx}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography fontWeight="bold">{faq.question}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography>{faq.answer}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedPost?.status !== 'published' && (
            <Button
              variant="contained"
              startIcon={<Publish />}
              onClick={() => {
                publishPost(selectedPost.id);
                setDialogOpen(false);
              }}
            >
              Publish
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
