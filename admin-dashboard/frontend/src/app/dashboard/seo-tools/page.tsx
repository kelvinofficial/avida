'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, Tabs, Tab, Chip, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Edit, Delete, Refresh, Search, Language, Code, Map,
} from '@mui/icons-material';
import { api } from '@/lib/api';

export default function SeoToolsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [metaTags, setMetaTags] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [sitemapConfig, setSitemapConfig] = useState<any>({});
  
  // Dialog states
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<any>(null);
  
  // Form state
  const [metaForm, setMetaForm] = useState({
    page_path: '',
    title: '',
    description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    robots: 'index, follow',
    canonical_url: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [metaRes, globalRes, sitemapRes] = await Promise.all([
        api.getSeoMeta(),
        api.getSeoGlobalSettings(),
        api.getSitemapConfig()
      ]);
      setMetaTags(metaRes.meta_tags || []);
      setGlobalSettings(globalRes);
      setSitemapConfig(sitemapRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveGlobalSettings = async () => {
    try {
      await api.updateSeoGlobalSettings(globalSettings);
      setSuccess('Global settings saved');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    }
  };

  const handleSaveSitemapConfig = async () => {
    try {
      await api.updateSitemapConfig(sitemapConfig);
      setSuccess('Sitemap config saved');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save sitemap config');
    }
  };

  const handleRegenerateSitemap = async () => {
    try {
      const result = await api.regenerateSitemap();
      setSuccess(`Sitemap regenerated: ${result.entries?.total || 0} entries`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to regenerate sitemap');
    }
  };

  const handleCreateMeta = async () => {
    try {
      const data = {
        ...metaForm,
        keywords: metaForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
      };
      if (selectedMeta) {
        await api.updateSeoMeta(selectedMeta.id, data);
        setSuccess('Meta tags updated');
      } else {
        await api.createSeoMeta(data);
        setSuccess('Meta tags created');
      }
      setMetaDialogOpen(false);
      resetMetaForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save meta tags');
    }
  };

  const handleDeleteMeta = async (metaId: string) => {
    if (!confirm('Delete these meta tags?')) return;
    try {
      await api.deleteSeoMeta(metaId);
      setSuccess('Meta tags deleted');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const openEditMeta = (meta: any) => {
    setSelectedMeta(meta);
    setMetaForm({
      page_path: meta.page_path || '',
      title: meta.title || '',
      description: meta.description || '',
      keywords: (meta.keywords || []).join(', '),
      og_title: meta.og_title || '',
      og_description: meta.og_description || '',
      og_image: meta.og_image || '',
      robots: meta.robots || 'index, follow',
      canonical_url: meta.canonical_url || '',
    });
    setMetaDialogOpen(true);
  };

  const resetMetaForm = () => {
    setSelectedMeta(null);
    setMetaForm({
      page_path: '', title: '', description: '', keywords: '',
      og_title: '', og_description: '', og_image: '', robots: 'index, follow', canonical_url: ''
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>SEO Tools</Typography>
          <Typography variant="body2" color="text.secondary">Manage meta tags, sitemap, and SEO settings</Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Meta Tags" icon={<Code />} iconPosition="start" />
        <Tab label="Global Settings" icon={<Language />} iconPosition="start" />
        <Tab label="Sitemap" icon={<Map />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Meta Tags Tab */}
          {currentTab === 0 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Page Meta Tags</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={() => { resetMetaForm(); setMetaDialogOpen(true); }}>
                    Add Meta Tags
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Page Path</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Robots</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metaTags.length === 0 ? (
                        <TableRow><TableCell colSpan={5} align="center">No meta tags configured</TableCell></TableRow>
                      ) : metaTags.map((meta) => (
                        <TableRow key={meta.id}>
                          <TableCell><Chip label={meta.page_path} size="small" /></TableCell>
                          <TableCell sx={{ maxWidth: 200 }}><Typography noWrap>{meta.title || '-'}</Typography></TableCell>
                          <TableCell sx={{ maxWidth: 250 }}><Typography noWrap variant="body2">{meta.description || '-'}</Typography></TableCell>
                          <TableCell><Chip label={meta.robots} size="small" variant="outlined" /></TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => openEditMeta(meta)}><Edit /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteMeta(meta.id)}><Delete /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Global Settings Tab */}
          {currentTab === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Global SEO Settings</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Site Name" value={globalSettings.site_name || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, site_name: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Twitter Handle" value={globalSettings.twitter_handle || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, twitter_handle: e.target.value})} placeholder="@yourhandle" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth multiline rows={2} label="Site Description" value={globalSettings.site_description || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, site_description: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Default OG Image URL" value={globalSettings.default_og_image || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, default_og_image: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Google Analytics ID" value={globalSettings.google_analytics_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, google_analytics_id: e.target.value})} placeholder="G-XXXXXXXXXX" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Google Tag Manager ID" value={globalSettings.google_tag_manager_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, google_tag_manager_id: e.target.value})} placeholder="GTM-XXXXXXX" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Facebook Pixel ID" value={globalSettings.facebook_pixel_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, facebook_pixel_id: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant="contained" onClick={handleSaveGlobalSettings}>Save Settings</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Sitemap Tab */}
          {currentTab === 2 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">Sitemap Configuration</Typography>
                  <Button variant="contained" color="primary" onClick={handleRegenerateSitemap}>
                    Regenerate Sitemap
                  </Button>
                </Box>
                {sitemapConfig.last_generated && (
                  <Alert severity="info" sx={{ mb: 3 }}>Last generated: {new Date(sitemapConfig.last_generated).toLocaleString()}</Alert>
                )}
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel control={<Switch checked={sitemapConfig.auto_generate || false} 
                      onChange={e => setSitemapConfig({...sitemapConfig, auto_generate: e.target.checked})} />} label="Auto-generate sitemap on content changes" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControlLabel control={<Switch checked={sitemapConfig.include_listings || false} 
                      onChange={e => setSitemapConfig({...sitemapConfig, include_listings: e.target.checked})} />} label="Include Listings" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControlLabel control={<Switch checked={sitemapConfig.include_categories || false} 
                      onChange={e => setSitemapConfig({...sitemapConfig, include_categories: e.target.checked})} />} label="Include Categories" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControlLabel control={<Switch checked={sitemapConfig.include_profiles || false} 
                      onChange={e => setSitemapConfig({...sitemapConfig, include_profiles: e.target.checked})} />} label="Include Business Profiles" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth select label="Change Frequency" value={sitemapConfig.change_frequency || 'weekly'}
                      onChange={e => setSitemapConfig({...sitemapConfig, change_frequency: e.target.value})}
                      SelectProps={{ native: true }}>
                      <option value="always">Always</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant="contained" onClick={handleSaveSitemapConfig}>Save Sitemap Config</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Meta Tags Dialog */}
      <Dialog open={metaDialogOpen} onClose={() => setMetaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedMeta ? 'Edit Meta Tags' : 'Add Meta Tags'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Page Path" value={metaForm.page_path} disabled={!!selectedMeta}
                onChange={e => setMetaForm({...metaForm, page_path: e.target.value})} placeholder="/about, /products, etc." required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Title" value={metaForm.title} onChange={e => setMetaForm({...metaForm, title: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Robots" value={metaForm.robots} onChange={e => setMetaForm({...metaForm, robots: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Description" value={metaForm.description} 
                onChange={e => setMetaForm({...metaForm, description: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Keywords (comma-separated)" value={metaForm.keywords} 
                onChange={e => setMetaForm({...metaForm, keywords: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="OG Title" value={metaForm.og_title} onChange={e => setMetaForm({...metaForm, og_title: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="OG Image URL" value={metaForm.og_image} onChange={e => setMetaForm({...metaForm, og_image: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="OG Description" value={metaForm.og_description} 
                onChange={e => setMetaForm({...metaForm, og_description: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Canonical URL" value={metaForm.canonical_url} 
                onChange={e => setMetaForm({...metaForm, canonical_url: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMeta} disabled={!metaForm.page_path}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
