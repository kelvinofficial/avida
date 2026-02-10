'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Chip, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Delete, Refresh, Link, ContentCopy, Visibility, BarChart,
} from '@mui/icons-material';
import { api } from '@/lib/api';

export default function UrlShortenerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [urls, setUrls] = useState<any[]>([]);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    target_url: '',
    custom_code: '',
    title: '',
    expires_at: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getShortUrls();
      setUrls(res.urls || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    try {
      await api.createShortUrl({
        target_url: formData.target_url,
        custom_code: formData.custom_code || undefined,
        title: formData.title || undefined,
        expires_at: formData.expires_at || undefined,
      });
      setSuccess('Short URL created');
      setCreateDialogOpen(false);
      setFormData({ target_url: '', custom_code: '', title: '', expires_at: '' });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create URL');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm('Delete this short URL?')) return;
    try {
      await api.deleteShortUrl(code);
      setSuccess('URL deleted');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleViewStats = async (code: string) => {
    try {
      const stats = await api.getShortUrlStats(code);
      setSelectedUrl(stats);
      setStatsDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load stats');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>URL Shortener</Typography>
          <Typography variant="body2" color="text.secondary">Create and track short URLs</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Short URL
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight={700}>{urls.length}</Typography>
              <Typography variant="body2" color="text.secondary">Total URLs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {urls.filter(u => u.is_active).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">Active URLs</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {urls.reduce((sum, u) => sum + (u.clicks || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Total Clicks</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : urls.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No short URLs created yet</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Short URL</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Clicks</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {urls.map((url) => (
                  <TableRow key={url.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link color="primary" />
                        <Box>
                          <Typography fontWeight={600} fontFamily="monospace">/s/{url.code}</Typography>
                          {url.title && <Typography variant="caption" color="text.secondary">{url.title}</Typography>}
                        </Box>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => copyToClipboard(`${baseUrl}/s/${url.code}`)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>{url.target_url}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={url.clicks || 0} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={url.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={url.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{new Date(url.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Stats">
                        <IconButton size="small" onClick={() => handleViewStats(url.code)}>
                          <BarChart />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(url.code)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Short URL</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Target URL"
                value={formData.target_url}
                onChange={e => setFormData({...formData, target_url: e.target.value})}
                placeholder="https://example.com/long-url"
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Title (optional)"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Campaign name or description"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Custom Code (optional)"
                value={formData.custom_code}
                onChange={e => setFormData({...formData, custom_code: e.target.value})}
                placeholder="my-campaign"
                helperText="Leave empty for auto-generated"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Expires At (optional)"
                InputLabelProps={{ shrink: true }}
                value={formData.expires_at}
                onChange={e => setFormData({...formData, expires_at: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.target_url}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>URL Statistics: {selectedUrl?.code}</DialogTitle>
        <DialogContent>
          {selectedUrl && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="h4" fontWeight={700}>{selectedUrl.clicks || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Clicks</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="body2" fontWeight={600}>Target URL</Typography>
                  <Typography variant="body2" noWrap>{selectedUrl.target_url}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="body2" fontWeight={600}>Created</Typography>
                  <Typography variant="body2">{new Date(selectedUrl.created_at).toLocaleString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="body2" fontWeight={600}>Status</Typography>
                  <Chip label={selectedUrl.is_active ? 'Active' : 'Inactive'} size="small" color={selectedUrl.is_active ? 'success' : 'default'} />
                </Grid>
              </Grid>

              {selectedUrl.click_history?.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Recent Clicks</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell>
                          <TableCell>IP</TableCell>
                          <TableCell>User Agent</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedUrl.click_history.slice(0, 10).map((click: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{new Date(click.clicked_at).toLocaleString()}</TableCell>
                            <TableCell>{click.ip_address || '-'}</TableCell>
                            <TableCell sx={{ maxWidth: 200 }}><Typography noWrap variant="caption">{click.user_agent || '-'}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
