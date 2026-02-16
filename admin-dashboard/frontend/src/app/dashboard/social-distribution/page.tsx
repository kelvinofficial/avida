'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox,
  FormControlLabel, FormGroup,
} from '@mui/material';
import {
  Schedule, Send, Add, Edit, Delete, ContentCopy,
  CalendarMonth, Analytics, Close,
} from '@mui/icons-material';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import QueueIcon from '@mui/icons-material/Queue';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'twitter': return <TwitterIcon />;
    case 'linkedin': return <LinkedInIcon />;
    case 'facebook': return <FacebookIcon />;
    case 'instagram': return <InstagramIcon />;
    default: return null;
  }
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  facebook: '#1877F2',
  instagram: '#E4405F',
};

const CONTENT_TYPES = [
  { value: 'blog_promotion', label: 'Blog Promotion' },
  { value: 'listing', label: 'Listing Highlight' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'tip', label: 'Tip of the Day' },
  { value: 'engagement', label: 'Engagement Post' },
];

interface Platform {
  name: string;
  icon: string;
  max_chars: number;
  supports_images: boolean;
  supports_links: boolean;
  best_times: string[];
  color: string;
}

interface SocialPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  status: string;
  scheduled_time?: string;
  content_type: string;
  hashtags: string[];
  created_at: string;
  published_at?: string;
}

export default function SocialDistributionPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [platforms, setPlatforms] = useState<Record<string, Platform>>({});
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [templates, setTemplates] = useState<any>(null);
  const [queue, setQueue] = useState<SocialPost[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    platforms: [] as string[],
    content_type: 'blog_promotion',
    scheduled_time: '',
    link_url: '',
    hashtags: '',
  });

  useEffect(() => {
    fetchPlatforms();
    fetchPosts();
    fetchAnalytics();
    fetchTemplates();
    fetchQueue();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/social/platforms`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlatforms(data.platforms || {});
      }
    } catch (err) {
      console.error('Failed to fetch platforms');
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/social/posts`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/social/analytics`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics');
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/social/templates`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates');
    }
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/social/queue`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error('Failed to fetch queue');
    }
  };

  const createPost = async () => {
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        platforms: formData.platforms,
        content_type: formData.content_type,
        scheduled_time: formData.scheduled_time || null,
        link_url: formData.link_url || null,
        hashtags: formData.hashtags.split(',').map(h => h.trim()).filter(h => h),
        status: formData.scheduled_time ? 'scheduled' : 'draft',
      };
      
      const res = await fetch(`${API_BASE}/growth/social/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setSuccess('Post created successfully');
        setDialogOpen(false);
        resetForm();
        fetchPosts();
        fetchQueue();
      } else {
        setError('Failed to create post');
      }
    } catch (err) {
      setError('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const updatePost = async () => {
    if (!editingPost) return;
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        platforms: formData.platforms,
        content_type: formData.content_type,
        scheduled_time: formData.scheduled_time || null,
        hashtags: formData.hashtags.split(',').map(h => h.trim()).filter(h => h),
        status: formData.scheduled_time ? 'scheduled' : 'draft',
      };
      
      const res = await fetch(`${API_BASE}/growth/social/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setSuccess('Post updated');
        setDialogOpen(false);
        setEditingPost(null);
        resetForm();
        fetchPosts();
        fetchQueue();
      } else {
        setError('Failed to update post');
      }
    } catch (err) {
      setError('Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await fetch(`${API_BASE}/growth/social/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSuccess('Post deleted');
        fetchPosts();
        fetchQueue();
      }
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  const publishPost = async (postId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/social/posts/${postId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message);
        fetchPosts();
        fetchAnalytics();
      } else {
        setError('Failed to publish post');
      }
    } catch (err) {
      setError('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      platforms: [],
      content_type: 'blog_promotion',
      scheduled_time: '',
      link_url: '',
      hashtags: '',
    });
  };

  const openEditDialog = (post: SocialPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      platforms: post.platforms,
      content_type: post.content_type,
      scheduled_time: post.scheduled_time || '',
      link_url: '',
      hashtags: post.hashtags?.join(', ') || '',
    });
    setDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  return (
    <Box sx={{ p: 3 }} data-testid="social-distribution-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Social Distribution</Typography>
        <Typography variant="body1" color="text.secondary">
          Schedule and manage social media posts across Twitter, LinkedIn, Facebook, and Instagram
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Analytics Summary */}
      {analytics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" fontWeight="bold">{analytics.summary?.total_posts || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Total Posts</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">{analytics.summary?.published || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Published</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">{analytics.summary?.scheduled || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Scheduled</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">{analytics.summary?.drafts || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Drafts</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All Posts" icon={<QueueIcon />} iconPosition="start" />
        <Tab label="Queue" icon={<Schedule />} iconPosition="start" />
        <Tab label="Templates" icon={<ContentCopy />} iconPosition="start" />
        <Tab label="Platforms" icon={<Analytics />} iconPosition="start" />
      </Tabs>

      {/* All Posts Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => { setEditingPost(null); resetForm(); setDialogOpen(true); }}
            >
              New Post
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Platforms</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Scheduled</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {posts.map(post => (
                  <TableRow key={post.id} hover>
                    <TableCell>
                      <Typography fontWeight="bold">{post.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.content}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {post.platforms.map(p => (
                          <Chip
                            key={p}
                            icon={getPlatformIcon(p) as any}
                            label={p}
                            size="small"
                            sx={{ bgcolor: PLATFORM_COLORS[p], color: 'white', '& .MuiChip-icon': { color: 'white' } }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={post.content_type} size="small" /></TableCell>
                    <TableCell>
                      <Chip 
                        label={post.status} 
                        size="small"
                        color={post.status === 'published' ? 'success' : post.status === 'scheduled' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {post.scheduled_time ? new Date(post.scheduled_time).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEditDialog(post)}><Edit fontSize="small" /></IconButton>
                      {post.status === 'draft' && (
                        <IconButton size="small" color="success" onClick={() => publishPost(post.id)} title="Publish now">
                          <Send fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" color="error" onClick={() => deletePost(post.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {posts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No posts yet. Create your first post!</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Queue Tab */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Upcoming Posts (Next 7 Days)</Typography>
          {queue.length > 0 ? (
            <Grid container spacing={2}>
              {queue.map(post => (
                <Grid item xs={12} md={6} key={post.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{post.title}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {post.platforms.map(p => (
                            <Box key={p} sx={{ color: PLATFORM_COLORS[p] }}>{getPlatformIcon(p)}</Box>
                          ))}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {post.content.substring(0, 100)}...
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="warning" />
                        <Typography variant="body2">
                          {post.scheduled_time ? new Date(post.scheduled_time).toLocaleString() : 'Not scheduled'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CalendarMonth sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No posts scheduled for the next 7 days</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Templates Tab */}
      {tabValue === 2 && templates && (
        <Grid container spacing={2}>
          {Object.entries(templates).map(([type, platformTemplates]: [string, any]) => (
            <Grid item xs={12} key={type}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                    {type.replace(/_/g, ' ')}
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(platformTemplates).map(([platform, template]: [string, any]) => (
                      <Grid item xs={12} md={4} key={platform}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{ color: PLATFORM_COLORS[platform] }}>{getPlatformIcon(platform)}</Box>
                            <Typography fontWeight="bold" sx={{ textTransform: 'capitalize' }}>{platform}</Typography>
                            <IconButton size="small" onClick={() => copyToClipboard(template)} sx={{ ml: 'auto' }}>
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                            {template}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Platforms Tab */}
      {tabValue === 3 && analytics && (
        <Grid container spacing={2}>
          {Object.entries(platforms).map(([key, platform]) => (
            <Grid item xs={12} md={6} lg={3} key={key}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ color: platform.color, fontSize: 40 }}>{getPlatformIcon(key)}</Box>
                    <Box>
                      <Typography variant="h6">{platform.name}</Typography>
                      <Chip label={`Max ${platform.max_chars} chars`} size="small" />
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Posts Published</Typography>
                    <Typography variant="h4">{analytics.by_platform?.[key]?.posts_published || 0}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Best Posting Times</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {platform.best_times?.map((time, idx) => (
                        <Chip key={idx} label={time} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {platform.supports_images && <Chip label="Images" size="small" color="success" />}
                    {platform.supports_links && <Chip label="Links" size="small" color="info" />}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Post Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPost ? 'Edit Post' : 'Create New Post'}
          <IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              placeholder="Post title for your reference"
            />
            
            <TextField
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="Your post content..."
              helperText={`${formData.content.length} characters`}
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Platforms</Typography>
              <FormGroup row>
                {Object.entries(platforms).map(([key, platform]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={formData.platforms.includes(key)}
                        onChange={() => handlePlatformToggle(key)}
                        sx={{ color: platform.color, '&.Mui-checked': { color: platform.color } }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ color: platform.color }}>{getPlatformIcon(key)}</Box>
                        {platform.name}
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Content Type</InputLabel>
                  <Select
                    value={formData.content_type}
                    label="Content Type"
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                  >
                    {CONTENT_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Schedule Time"
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <TextField
              label="Link URL (optional)"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              fullWidth
              placeholder="https://avida.com/blog/your-article"
            />
            
            <TextField
              label="Hashtags (comma separated)"
              value={formData.hashtags}
              onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
              fullWidth
              placeholder="#Avida, #Marketplace, #OnlineSelling"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingPost ? updatePost : createPost}
            disabled={loading || !formData.title || !formData.content || formData.platforms.length === 0}
          >
            {loading ? <CircularProgress size={24} /> : (editingPost ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
