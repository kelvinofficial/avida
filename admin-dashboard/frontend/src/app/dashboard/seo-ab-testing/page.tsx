'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, Chip, Select, MenuItem, FormControl,
  InputLabel, LinearProgress, Slider, Paper, Tabs, Tab, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Delete, Refresh, PlayArrow, Pause, Stop, Science,
  Visibility, EmojiEvents, TrendingUp, RemoveCircle, AddCircle,
  CheckCircle, Cancel, ContentCopy, Share,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface Variant {
  id?: string;
  name: string;
  meta_title: string;
  meta_description: string;
  traffic_percent: number;
  is_control: boolean;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  statistics?: {
    significant: boolean;
    z_score: number;
    p_value: number;
    confidence: number;
    control_ctr: number;
    variant_ctr: number;
    improvement: number;
  };
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  listing_id?: string;
  category_id?: string;
  page_type: string;
  variants: Variant[];
  min_impressions: number;
  confidence_level: number;
  status: string;
  winner_variant_id?: string;
  results?: any[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export default function SEOABTestingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [overview, setOverview] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [pageTypeFilter, setPageTypeFilter] = useState('');

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    listing_id: '',
    category_id: '',
    page_type: 'listing',
    min_impressions: 100,
    confidence_level: 0.95,
    variants: [
      { name: 'Control', meta_title: '', meta_description: '', traffic_percent: 50, is_control: true },
      { name: 'Variant A', meta_title: '', meta_description: '', traffic_percent: 50, is_control: false }
    ] as Variant[]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, overviewRes] = await Promise.all([
        api.getSEOABExperiments(statusFilter || undefined, pageTypeFilter || undefined),
        api.getSEOABOverview()
      ]);
      setExperiments(expRes.experiments || []);
      setOverview(overviewRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter, pageTypeFilter]);

  const handleCreate = async () => {
    try {
      const totalTraffic = formData.variants.reduce((sum, v) => sum + v.traffic_percent, 0);
      if (Math.abs(totalTraffic - 100) > 0.01) {
        setError(`Traffic must total 100% (currently ${totalTraffic}%)`);
        return;
      }

      await api.createSEOABExperiment({
        name: formData.name,
        description: formData.description || undefined,
        listing_id: formData.listing_id || undefined,
        category_id: formData.category_id || undefined,
        page_type: formData.page_type,
        min_impressions: formData.min_impressions,
        confidence_level: formData.confidence_level,
        variants: formData.variants
      });
      setSuccess('Experiment created');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create experiment');
    }
  };

  const handleStart = async (experimentId: string) => {
    try {
      await api.startSEOABExperiment(experimentId);
      setSuccess('Experiment started');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start experiment');
    }
  };

  const handlePause = async (experimentId: string) => {
    try {
      await api.pauseSEOABExperiment(experimentId);
      setSuccess('Experiment paused');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to pause experiment');
    }
  };

  const handleStop = async (winnerVariantId?: string) => {
    if (!selectedExperiment) return;
    try {
      await api.stopSEOABExperiment(selectedExperiment.id, winnerVariantId);
      setSuccess('Experiment stopped');
      setStopDialogOpen(false);
      setSelectedExperiment(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to stop experiment');
    }
  };

  const handleDelete = async (experimentId: string) => {
    if (!confirm('Delete this experiment and all its data?')) return;
    try {
      await api.deleteSEOABExperiment(experimentId);
      setSuccess('Experiment deleted');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete experiment');
    }
  };

  const handleViewDetails = async (experiment: Experiment) => {
    try {
      const details = await api.getSEOABExperiment(experiment.id);
      setSelectedExperiment(details);
      setViewDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load experiment details');
    }
  };

  const handleCheckWinners = async () => {
    try {
      const result = await api.checkSEOABWinners();
      const winnersFound = result.results?.filter((r: any) => r.status === 'winner_found').length || 0;
      if (winnersFound > 0) {
        setSuccess(`Found ${winnersFound} winner(s)!`);
      } else {
        setSuccess(`Checked ${result.checked} experiments. No winners yet.`);
      }
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check for winners');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', listing_id: '', category_id: '',
      page_type: 'listing', min_impressions: 100, confidence_level: 0.95,
      variants: [
        { name: 'Control', meta_title: '', meta_description: '', traffic_percent: 50, is_control: true },
        { name: 'Variant A', meta_title: '', meta_description: '', traffic_percent: 50, is_control: false }
      ]
    });
  };

  const addVariant = () => {
    const variantNum = formData.variants.length;
    const newVariant: Variant = {
      name: `Variant ${String.fromCharCode(64 + variantNum)}`,
      meta_title: '',
      meta_description: '',
      traffic_percent: 0,
      is_control: false
    };
    setFormData({ ...formData, variants: [...formData.variants, newVariant] });
  };

  const removeVariant = (idx: number) => {
    if (formData.variants.length <= 2) return;
    setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== idx) });
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    const newVariants = [...formData.variants];
    (newVariants[idx] as any)[field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const distributeTrafficEvenly = () => {
    const count = formData.variants.length;
    const even = Math.floor(100 / count);
    const remainder = 100 - (even * count);
    const newVariants = formData.variants.map((v, i) => ({
      ...v,
      traffic_percent: i === 0 ? even + remainder : even
    }));
    setFormData({ ...formData, variants: newVariants });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>SEO A/B Testing</Typography>
          <Typography variant="body2" color="text.secondary">Test meta descriptions and titles to optimize CTR</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="outlined" color="warning" startIcon={<EmojiEvents />} onClick={handleCheckWinners}>
            Check Winners
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            New Experiment
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Science color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{overview.total_experiments || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Total Experiments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <PlayArrow color="success" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700} color="success.main">{overview.running || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Running</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <CheckCircle color="info" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{overview.completed || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Visibility color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{(overview.total_impressions || 0).toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">Total Impressions</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <TrendingUp color="warning" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{overview.overall_ctr || 0}%</Typography>
              <Typography variant="body2" color="text.secondary">Overall CTR</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Page Type</InputLabel>
            <Select value={pageTypeFilter} label="Page Type" onChange={e => setPageTypeFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="listing">Listing</MenuItem>
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="search">Search</MenuItem>
              <MenuItem value="home">Home</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Experiments Table */}
      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : experiments.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No experiments found</Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => setCreateDialogOpen(true)}>
                Create First Experiment
              </Button>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Experiment</TableCell>
                  <TableCell>Page Type</TableCell>
                  <TableCell>Variants</TableCell>
                  <TableCell>Impressions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {experiments.map((exp) => {
                  const totalImpressions = exp.variants?.reduce((sum, v) => sum + (v.impressions || 0), 0) || 0;
                  return (
                    <TableRow key={exp.id} hover data-testid={`experiment-row-${exp.id}`}>
                      <TableCell>
                        <Typography fontWeight={600}>{exp.name}</Typography>
                        {exp.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {exp.description.slice(0, 50)}...
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={exp.page_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{exp.variants?.length || 0} variants</TableCell>
                      <TableCell>{totalImpressions.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={exp.status} size="small" color={getStatusColor(exp.status)} />
                        {exp.winner_variant_id && <EmojiEvents fontSize="small" color="warning" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(exp)} data-testid={`view-experiment-${exp.id}`}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {exp.status === 'draft' && (
                          <Tooltip title="Start Experiment">
                            <IconButton size="small" color="success" onClick={() => handleStart(exp.id)}>
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        {exp.status === 'running' && (
                          <>
                            <Tooltip title="Pause">
                              <IconButton size="small" color="warning" onClick={() => handlePause(exp.id)}>
                                <Pause />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Stop & Declare Winner">
                              <IconButton size="small" color="error" onClick={() => { setSelectedExperiment(exp); setStopDialogOpen(true); }}>
                                <Stop />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {exp.status === 'paused' && (
                          <>
                            <Tooltip title="Resume">
                              <IconButton size="small" color="success" onClick={() => handleStart(exp.id)}>
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Stop">
                              <IconButton size="small" color="error" onClick={() => { setSelectedExperiment(exp); setStopDialogOpen(true); }}>
                                <Stop />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {exp.status !== 'running' && (
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}>
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create SEO A/B Experiment</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="Basic Info" />
              <Tab label="Variants" />
              <Tab label="Settings" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField 
                  fullWidth 
                  label="Experiment Name" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                  data-testid="experiment-name-input"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Page Type</InputLabel>
                  <Select 
                    value={formData.page_type} 
                    label="Page Type"
                    onChange={e => setFormData({...formData, page_type: e.target.value})}
                    data-testid="page-type-select"
                  >
                    <MenuItem value="listing">Listing Page</MenuItem>
                    <MenuItem value="category">Category Page</MenuItem>
                    <MenuItem value="search">Search Results</MenuItem>
                    <MenuItem value="home">Homepage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth 
                  multiline 
                  rows={2} 
                  label="Description" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  helperText="Describe the goal of this experiment"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Listing ID (optional)" 
                  value={formData.listing_id}
                  onChange={e => setFormData({...formData, listing_id: e.target.value})}
                  helperText="Leave empty for global listing experiments"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  label="Category ID (optional)" 
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                  helperText="Leave empty for all categories"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Variants</Typography>
                <Box>
                  <Button size="small" onClick={distributeTrafficEvenly}>Even Split</Button>
                  <Button size="small" startIcon={<AddCircle />} onClick={addVariant}>Add Variant</Button>
                </Box>
              </Box>

              {formData.variants.map((variant, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TextField 
                          size="small" 
                          label="Variant Name" 
                          value={variant.name}
                          onChange={e => updateVariant(idx, 'name', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        {variant.is_control && <Chip label="Control" size="small" color="primary" />}
                        {formData.variants.length > 2 && !variant.is_control && (
                          <IconButton size="small" onClick={() => removeVariant(idx)}><RemoveCircle color="error" /></IconButton>
                        )}
                      </Box>
                      <Box sx={{ px: 1 }}>
                        <Typography variant="caption">Traffic: {variant.traffic_percent}%</Typography>
                        <Slider 
                          value={variant.traffic_percent} 
                          onChange={(_, v) => updateVariant(idx, 'traffic_percent', v)}
                          min={0} 
                          max={100} 
                          valueLabelDisplay="auto" 
                        />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField 
                        fullWidth 
                        size="small" 
                        label="Meta Title" 
                        value={variant.meta_title}
                        onChange={e => updateVariant(idx, 'meta_title', e.target.value)}
                        sx={{ mb: 1 }}
                        helperText={`${variant.meta_title.length}/60 chars`}
                        data-testid={`variant-${idx}-title`}
                      />
                      <TextField 
                        fullWidth 
                        size="small" 
                        multiline 
                        rows={2}
                        label="Meta Description" 
                        value={variant.meta_description}
                        onChange={e => updateVariant(idx, 'meta_description', e.target.value)}
                        helperText={`${variant.meta_description.length}/160 chars`}
                        data-testid={`variant-${idx}-description`}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Typography 
                variant="caption" 
                color={Math.abs(formData.variants.reduce((s, v) => s + v.traffic_percent, 0) - 100) > 0.01 ? 'error' : 'text.secondary'}
              >
                Total Traffic: {formData.variants.reduce((s, v) => s + v.traffic_percent, 0)}% (must equal 100%)
              </Typography>
            </Box>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  fullWidth 
                  type="number" 
                  label="Minimum Impressions" 
                  value={formData.min_impressions}
                  onChange={e => setFormData({...formData, min_impressions: parseInt(e.target.value) || 100})}
                  helperText="Minimum impressions before declaring a winner"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Confidence Level</InputLabel>
                  <Select 
                    value={formData.confidence_level} 
                    label="Confidence Level"
                    onChange={e => setFormData({...formData, confidence_level: e.target.value as number})}
                  >
                    <MenuItem value={0.90}>90%</MenuItem>
                    <MenuItem value={0.95}>95% (Recommended)</MenuItem>
                    <MenuItem value={0.99}>99%</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  The experiment will track impressions and clicks on search engine results pages. 
                  A winner will be declared when one variant shows statistically significant improvement in CTR.
                </Alert>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreate}
            disabled={!formData.name || Math.abs(formData.variants.reduce((s, v) => s + v.traffic_percent, 0) - 100) > 0.01}
            data-testid="create-experiment-btn"
          >
            Create Experiment
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedExperiment?.name}
            <Chip label={selectedExperiment?.status} size="small" color={getStatusColor(selectedExperiment?.status || '')} />
            {selectedExperiment?.winner_variant_id && <EmojiEvents color="warning" />}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedExperiment && (
            <Box sx={{ mt: 2 }}>
              {selectedExperiment.description && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {selectedExperiment.description}
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Results ({selectedExperiment.variants?.reduce((sum, v) => sum + (v.impressions || 0), 0).toLocaleString()} impressions)
              </Typography>

              <Grid container spacing={2}>
                {selectedExperiment.variants?.map((variant) => (
                  <Grid key={variant.id} size={{ xs: 12, md: 6 }}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        bgcolor: variant.is_control ? 'grey.50' : 
                          (selectedExperiment.winner_variant_id === variant.id ? 'success.light' : 'background.paper')
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">
                            {variant.name}
                            {selectedExperiment.winner_variant_id === variant.id && (
                              <EmojiEvents color="warning" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Chip label={`${variant.traffic_percent}% traffic`} size="small" />
                        </Box>

                        <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">Meta Title</Typography>
                          <Typography variant="body2" fontWeight={500}>{variant.meta_title || '(empty)'}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Meta Description</Typography>
                          <Typography variant="body2">{variant.meta_description || '(empty)'}</Typography>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="h5" fontWeight={700}>{(variant.impressions || 0).toLocaleString()}</Typography>
                            <Typography variant="caption" color="text.secondary">Impressions</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="h5" fontWeight={700}>{variant.clicks || 0}</Typography>
                            <Typography variant="caption" color="text.secondary">Clicks</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="h5" fontWeight={700} color="primary">{variant.ctr || 0}%</Typography>
                            <Typography variant="caption" color="text.secondary">CTR</Typography>
                          </Grid>
                        </Grid>

                        {variant.statistics && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <Chip 
                              icon={variant.statistics.significant ? <CheckCircle /> : <Cancel />}
                              label={variant.statistics.significant ? `Significant (z=${variant.statistics.z_score})` : 'Not Significant'}
                              color={variant.statistics.significant ? 'success' : 'default'}
                              size="small"
                            />
                            {variant.statistics.improvement !== 0 && (
                              <Typography variant="caption" sx={{ ml: 1 }}>
                                {variant.statistics.improvement > 0 ? '+' : ''}{variant.statistics.improvement}% vs control
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Stop Dialog */}
      <Dialog open={stopDialogOpen} onClose={() => setStopDialogOpen(false)}>
        <DialogTitle>Stop Experiment</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Do you want to declare a winner for "{selectedExperiment?.name}"?
          </Typography>
          {selectedExperiment?.variants?.map((v) => (
            <Button 
              key={v.id} 
              fullWidth 
              variant="outlined" 
              sx={{ mt: 1 }} 
              onClick={() => handleStop(v.id)}
              data-testid={`select-winner-${v.id}`}
            >
              {v.name} {v.is_control && '(Control)'} - CTR: {v.ctr || 0}%
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopDialogOpen(false)}>Cancel</Button>
          <Button color="warning" onClick={() => handleStop()}>Stop Without Winner</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
