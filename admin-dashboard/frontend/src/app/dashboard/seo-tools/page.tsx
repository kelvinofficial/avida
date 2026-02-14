'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, Tabs, Tab, Chip, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, Paper, InputAdornment,
  LinearProgress, Divider, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Edit, Delete, Refresh, Search, Language, Code, Map,
  Category, Preview, ExpandMore, Save, ContentCopy, AutoAwesome,
  CheckCircle, Psychology, TrendingUp, Lightbulb, ContentPaste,
} from '@mui/icons-material';
import { api } from '@/lib/api';

// Category list for SEO management
const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: '🚗' },
  { id: 'properties', name: 'Properties', icon: '🏠' },
  { id: 'electronics', name: 'Electronics', icon: '💻' },
  { id: 'phones_tablets', name: 'Phones & Tablets', icon: '📱' },
  { id: 'home_furniture', name: 'Home & Furniture', icon: '🛋️' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: '👗' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: '💼' },
  { id: 'kids_babies', name: 'Kids & Babies', icon: '👶' },
  { id: 'sports_leisure', name: 'Sports & Leisure', icon: '⚽' },
  { id: 'pets', name: 'Pets', icon: '🐕' },
  { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
  { id: 'commercial_equipment', name: 'Commercial Equipment', icon: '🏭' },
  { id: 'repair_construction', name: 'Repair & Construction', icon: '🔧' },
  { id: 'friendship_dating', name: 'Friendship & Dating', icon: '💕' },
];

export default function SeoToolsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [metaTags, setMetaTags] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [sitemapConfig, setSitemapConfig] = useState<any>({});
  const [categorySeo, setCategorySeo] = useState<Record<string, any>>({});
  const [seoPreview, setSeoPreview] = useState<any>(null);
  
  // AI SEO states
  const [aiSeoStats, setAiSeoStats] = useState<any>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [aiTestForm, setAiTestForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'EUR',
    category: '',
    condition: '',
    location: '',
  });
  
  // Dialog states
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [aiApplyDialogOpen, setAiApplyDialogOpen] = useState(false);
  
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
      const [metaRes, globalRes, sitemapRes, seoSettingsRes] = await Promise.all([
        api.getSeoMeta().catch(() => ({ meta_tags: [] })),
        api.getSeoGlobalSettings().catch(() => ({})),
        api.getSitemapConfig().catch(() => ({})),
        api.getSeoSettingsGlobal().catch(() => ({})),
      ]);
      setMetaTags(metaRes.meta_tags || []);
      setGlobalSettings({ ...globalRes, ...seoSettingsRes });
      setSitemapConfig(sitemapRes);
      
      // Load category SEO settings
      const categoryOverrides = await api.getAllCategorySeo().catch(() => []);
      const categoryMap: Record<string, any> = {};
      categoryOverrides.forEach((override: any) => {
        if (override.page_id) {
          categoryMap[override.page_id] = override;
        }
      });
      setCategorySeo(categoryMap);
      
      // Load AI SEO stats
      const aiStats = await api.getAISeoStats().catch(() => null);
      setAiSeoStats(aiStats);
      
      // Load recent listings for AI SEO generation
      const listingsRes = await api.get('/listings?limit=50&sort=newest').catch(() => ({ listings: [] }));
      setListings(listingsRes.listings || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load SEO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveGlobalSettings = async () => {
    try {
      await Promise.all([
        api.updateSeoGlobalSettings(globalSettings),
        api.updateSeoSettingsGlobal(globalSettings),
      ]);
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

  // Category SEO handlers
  const handleCategorySeoChange = (categoryId: string, field: string, value: any) => {
    setCategorySeo(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value,
      }
    }));
  };

  const handleSaveCategorySeo = async (categoryId: string) => {
    try {
      const data = categorySeo[categoryId] || {};
      await api.updateCategorySeo(categoryId, {
        category_id: categoryId,
        title: data.title_template || data.title || null,
        description: data.description_template || data.description || null,
        og_image: data.og_image || null,
        keywords: data.keywords || [],
      });
      setSuccess(`SEO settings saved for ${CATEGORIES.find(c => c.id === categoryId)?.name}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save category SEO');
    }
  };

  const handlePreviewSeo = async (pageType: string, pageId: string) => {
    try {
      const preview = await api.previewSeoTags(pageType, pageId);
      setSeoPreview(preview);
      setPreviewDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate preview');
    }
  };

  const handleBulkSaveAllCategories = async () => {
    try {
      const updates = CATEGORIES.map(cat => {
        const data = categorySeo[cat.id] || {};
        return {
          category_id: cat.id,
          title: data.title_template || data.title || null,
          description: data.description_template || data.description || null,
          og_image: data.og_image || null,
          keywords: data.keywords || [],
        };
      }).filter(u => u.title || u.description);
      
      if (updates.length === 0) {
        setError('No category SEO changes to save');
        return;
      }
      
      await api.bulkUpdateCategorySeo(updates);
      setSuccess(`Saved SEO settings for ${updates.length} categories`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to bulk save');
    }
  };

  // AI SEO Handlers
  const handleGenerateAISeo = async () => {
    if (!aiTestForm.title || !aiTestForm.price) {
      setError('Title and price are required');
      return;
    }
    
    setAiGenerating(true);
    setAiSuggestions(null);
    try {
      const result = await api.generateAISeo({
        title: aiTestForm.title,
        description: aiTestForm.description,
        price: parseFloat(aiTestForm.price),
        currency: aiTestForm.currency,
        category: aiTestForm.category,
        condition: aiTestForm.condition,
        location: aiTestForm.location,
      });
      setAiSuggestions(result.seo_suggestions);
      setSuccess('AI SEO suggestions generated successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate AI SEO');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerateAISeoForListing = async (listing: any) => {
    setAiGenerating(true);
    setSelectedListing(listing);
    setAiSuggestions(null);
    try {
      const result = await api.generateAISeoForListing(listing.id);
      setAiSuggestions(result.ai_suggestions);
      setAiApplyDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate AI SEO for listing');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAISeo = async () => {
    if (!selectedListing || !aiSuggestions) return;
    
    try {
      await api.applyAISeo(selectedListing.id, {
        listing_id: selectedListing.id,
        meta_title: aiSuggestions.meta_title,
        meta_description: aiSuggestions.meta_description,
        og_title: aiSuggestions.og_title,
        og_description: aiSuggestions.og_description,
        keywords: aiSuggestions.keywords,
      });
      setSuccess(`AI SEO applied to listing "${selectedListing.title}"`);
      setAiApplyDialogOpen(false);
      setSelectedListing(null);
      setAiSuggestions(null);
      loadData(); // Refresh stats
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply AI SEO');
    }
  };

  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${field} copied to clipboard`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>SEO Tools</Typography>
          <Typography variant="body2" color="text.secondary">Manage meta tags, sitemap, category SEO, and global settings</Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="AI SEO" icon={<AutoAwesome />} iconPosition="start" />
        <Tab label="Meta Tags" icon={<Code />} iconPosition="start" />
        <Tab label="Global Settings" icon={<Language />} iconPosition="start" />
        <Tab label="Category SEO" icon={<Category />} iconPosition="start" />
        <Tab label="Sitemap" icon={<Map />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* AI SEO Tab */}
          {currentTab === 0 && (
            <Box>
              {/* AI SEO Stats Cards */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AutoAwesome color="primary" />
                        <Typography variant="subtitle2" color="text.secondary">Total Generations</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700}>{aiSeoStats?.total_generations || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="subtitle2" color="text.secondary">Applied</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700}>{aiSeoStats?.total_applied || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TrendingUp color="info" />
                        <Typography variant="subtitle2" color="text.secondary">Last 24h</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700}>{aiSeoStats?.last_24h_generations || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Psychology color="secondary" />
                        <Typography variant="subtitle2" color="text.secondary">AI-Enhanced Listings</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700}>{aiSeoStats?.listings_with_ai_seo || 0}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                {/* AI Test Generator */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Psychology color="primary" /> AI SEO Generator
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Test AI-powered SEO generation with custom listing data
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Listing Title"
                            value={aiTestForm.title}
                            onChange={e => setAiTestForm({...aiTestForm, title: e.target.value})}
                            placeholder="e.g., iPhone 15 Pro Max 256GB"
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Description"
                            value={aiTestForm.description}
                            onChange={e => setAiTestForm({...aiTestForm, description: e.target.value})}
                            placeholder="Brief description of the item..."
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            label="Price"
                            type="number"
                            value={aiTestForm.price}
                            onChange={e => setAiTestForm({...aiTestForm, price: e.target.value})}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                              value={aiTestForm.currency}
                              label="Currency"
                              onChange={e => setAiTestForm({...aiTestForm, currency: e.target.value})}
                            >
                              <MenuItem value="EUR">EUR (€)</MenuItem>
                              <MenuItem value="USD">USD ($)</MenuItem>
                              <MenuItem value="GBP">GBP (£)</MenuItem>
                              <MenuItem value="KES">KES (KSh)</MenuItem>
                              <MenuItem value="NGN">NGN (₦)</MenuItem>
                              <MenuItem value="TZS">TZS (TSh)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={aiTestForm.category}
                              label="Category"
                              onChange={e => setAiTestForm({...aiTestForm, category: e.target.value})}
                            >
                              <MenuItem value="">None</MenuItem>
                              {CATEGORIES.map(cat => (
                                <MenuItem key={cat.id} value={cat.name}>{cat.icon} {cat.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Condition</InputLabel>
                            <Select
                              value={aiTestForm.condition}
                              label="Condition"
                              onChange={e => setAiTestForm({...aiTestForm, condition: e.target.value})}
                            >
                              <MenuItem value="">Not specified</MenuItem>
                              <MenuItem value="new">New</MenuItem>
                              <MenuItem value="like_new">Like New</MenuItem>
                              <MenuItem value="used">Used</MenuItem>
                              <MenuItem value="refurbished">Refurbished</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Location"
                            value={aiTestForm.location}
                            onChange={e => setAiTestForm({...aiTestForm, location: e.target.value})}
                            placeholder="e.g., Dar es Salaam, Tanzania"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            startIcon={aiGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
                            onClick={handleGenerateAISeo}
                            disabled={aiGenerating || !aiTestForm.title || !aiTestForm.price}
                          >
                            {aiGenerating ? 'Generating...' : 'Generate AI SEO'}
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* AI Suggestions Result */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Lightbulb color="warning" /> AI Suggestions
                      </Typography>
                      
                      {!aiSuggestions ? (
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          minHeight: 300,
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          p: 4
                        }}>
                          <AutoAwesome sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                          <Typography color="text.secondary">
                            Enter listing details and click &quot;Generate AI SEO&quot; to see suggestions
                          </Typography>
                        </Box>
                      ) : (
                        <Box>
                          {aiSuggestions.error ? (
                            <Alert severity="error">{aiSuggestions.error}</Alert>
                          ) : (
                            <>
                              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={600}>Meta Title</Typography>
                                  <Tooltip title="Copy">
                                    <IconButton size="small" onClick={() => handleCopyToClipboard(aiSuggestions.meta_title, 'Meta Title')}>
                                      <ContentCopy fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Typography variant="body2">{aiSuggestions.meta_title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {aiSuggestions.meta_title?.length || 0} characters
                                </Typography>
                              </Paper>

                              <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.50' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={600}>Meta Description</Typography>
                                  <Tooltip title="Copy">
                                    <IconButton size="small" onClick={() => handleCopyToClipboard(aiSuggestions.meta_description, 'Meta Description')}>
                                      <ContentCopy fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                                <Typography variant="body2">{aiSuggestions.meta_description}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {aiSuggestions.meta_description?.length || 0} characters
                                </Typography>
                              </Paper>

                              <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Keywords</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(aiSuggestions.keywords || []).map((keyword: string, i: number) => (
                                    <Chip key={i} label={keyword} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              </Paper>

                              {aiSuggestions.improvements && aiSuggestions.improvements.length > 0 && (
                                <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    Improvement Suggestions
                                  </Typography>
                                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {aiSuggestions.improvements.map((tip: string, i: number) => (
                                      <li key={i}><Typography variant="body2">{tip}</Typography></li>
                                    ))}
                                  </ul>
                                </Paper>
                              )}
                            </>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Listings for AI SEO */}
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Generate AI SEO for Listings</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a listing to generate and apply AI-optimized SEO
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Has AI SEO</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {listings.slice(0, 10).map((listing: any) => (
                          <TableRow key={listing.id}>
                            <TableCell>
                              <Typography noWrap sx={{ maxWidth: 250 }}>{listing.title}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={listing.category_id} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {listing.currency} {listing.price?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {listing.seo_data?.ai_generated ? (
                                <Chip label="Yes" size="small" color="success" />
                              ) : (
                                <Chip label="No" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AutoAwesome />}
                                onClick={() => handleGenerateAISeoForListing(listing)}
                                disabled={aiGenerating}
                              >
                                Generate
                              </Button>
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

          {/* Meta Tags Tab */}
          {currentTab === 1 && (
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
          {currentTab === 2 && (
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
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Default Keywords (comma-separated)" 
                      value={(globalSettings.default_keywords || []).join(', ')} 
                      onChange={e => setGlobalSettings({...globalSettings, default_keywords: e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean)})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField fullWidth label="Facebook App ID" value={globalSettings.facebook_app_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, facebook_app_id: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Google Site Verification" value={globalSettings.google_site_verification || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, google_site_verification: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Google Analytics ID" value={globalSettings.google_analytics_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, google_analytics_id: e.target.value})} placeholder="G-XXXXXXXXXX" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField fullWidth label="Google Tag Manager ID" value={globalSettings.google_tag_manager_id || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, google_tag_manager_id: e.target.value})} placeholder="GTM-XXXXXXX" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel 
                      control={<Switch checked={globalSettings.enable_sitemap || false} onChange={e => setGlobalSettings({...globalSettings, enable_sitemap: e.target.checked})} />} 
                      label="Enable Sitemap Generation" 
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControlLabel 
                      control={<Switch checked={globalSettings.enable_structured_data || false} onChange={e => setGlobalSettings({...globalSettings, enable_structured_data: e.target.checked})} />} 
                      label="Enable Structured Data (JSON-LD)" 
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant="contained" onClick={handleSaveGlobalSettings}>Save Settings</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Category SEO Tab */}
          {currentTab === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Category SEO Settings</Typography>
                <Button variant="contained" startIcon={<Save />} onClick={handleBulkSaveAllCategories}>
                  Save All Changes
                </Button>
              </Box>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                Customize SEO meta tags for each category page. Leave fields empty to use auto-generated defaults.
              </Alert>
              
              {CATEGORIES.map((category) => {
                const seo = categorySeo[category.id] || {};
                return (
                  <Accordion key={category.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography fontSize={24}>{category.icon}</Typography>
                        <Box>
                          <Typography fontWeight={600}>{category.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            /category/{category.id}
                          </Typography>
                        </Box>
                        {(seo.title_template || seo.description_template) && (
                          <Chip label="Customized" size="small" color="primary" sx={{ ml: 2 }} />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            label="Title"
                            value={seo.title_template || seo.title || ''}
                            onChange={e => handleCategorySeoChange(category.id, 'title_template', e.target.value)}
                            placeholder={`${category.name} for Sale | Avida Marketplace`}
                            helperText="Leave empty for auto-generated title"
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Meta Description"
                            value={seo.description_template || seo.description || ''}
                            onChange={e => handleCategorySeoChange(category.id, 'description_template', e.target.value)}
                            placeholder={`Browse ${category.name.toLowerCase()} listings on Avida. Find great deals near you.`}
                            helperText="Leave empty for auto-generated description (max 160 characters)"
                            inputProps={{ maxLength: 160 }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="OG Image URL"
                            value={seo.og_image || ''}
                            onChange={e => handleCategorySeoChange(category.id, 'og_image', e.target.value)}
                            placeholder="https://example.com/category-image.jpg"
                            helperText="Custom image for social sharing"
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="Keywords (comma-separated)"
                            value={(seo.keywords || []).join(', ')}
                            onChange={e => handleCategorySeoChange(category.id, 'keywords', e.target.value.split(',').map((k: string) => k.trim()).filter(Boolean))}
                            placeholder={`${category.name.toLowerCase()}, buy, sell, local`}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                              variant="outlined" 
                              startIcon={<Preview />}
                              onClick={() => handlePreviewSeo('category', category.id)}
                            >
                              Preview
                            </Button>
                            <Button 
                              variant="contained" 
                              startIcon={<Save />}
                              onClick={() => handleSaveCategorySeo(category.id)}
                            >
                              Save
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}

          {/* Sitemap Tab */}
          {currentTab === 4 && (
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

      {/* SEO Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>SEO Preview</DialogTitle>
        <DialogContent>
          {seoPreview && (
            <Box>
              {/* Google Search Preview */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Google Search Result Preview</Typography>
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
                <Typography 
                  sx={{ 
                    color: '#1a0dab', 
                    fontSize: '18px', 
                    fontFamily: 'Arial', 
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {seoPreview.title}
                </Typography>
                <Typography sx={{ color: '#006621', fontSize: '14px', fontFamily: 'Arial' }}>
                  {window.location.origin}{seoPreview.canonical_url}
                </Typography>
                <Typography sx={{ color: '#545454', fontSize: '13px', fontFamily: 'Arial' }}>
                  {seoPreview.description?.slice(0, 160)}
                </Typography>
              </Paper>

              {/* Meta Tags */}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Generated Meta Tags</Typography>
              <Paper sx={{ p: 2, bgcolor: '#1e1e1e', borderRadius: 1 }}>
                <Typography component="pre" sx={{ 
                  color: '#d4d4d4', 
                  fontSize: '12px', 
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  m: 0
                }}>
{`<title>${seoPreview.title}</title>
<meta name="description" content="${seoPreview.description}" />
<meta name="keywords" content="${(seoPreview.keywords || []).join(', ')}" />
<link rel="canonical" href="${window.location.origin}${seoPreview.canonical_url}" />

<!-- Open Graph -->
<meta property="og:title" content="${seoPreview.og_title}" />
<meta property="og:description" content="${seoPreview.og_description}" />
<meta property="og:image" content="${seoPreview.og_image || ''}" />
<meta property="og:url" content="${window.location.origin}${seoPreview.canonical_url}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${seoPreview.og_title}" />
<meta name="twitter:description" content="${seoPreview.og_description}" />`}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
