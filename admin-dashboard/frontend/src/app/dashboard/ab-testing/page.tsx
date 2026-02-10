'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, Chip, Select, MenuItem,
  FormControl, InputLabel, Tabs, Tab, LinearProgress, Slider, Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Delete, Refresh, PlayArrow, Pause, Stop, Science,
  Visibility, EmojiEvents, TrendingUp, People, TouchApp,
  RemoveCircle, AddCircle, CheckCircle, Cancel, Schedule, AccessTime,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface Variant {
  id?: string;
  name: string;
  description?: string;
  traffic_percent: number;
  config?: Record<string, any>;
  is_control?: boolean;
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  experiment_type: string;
  target_page?: string;
  goal_type: string;
  status: string;
  variants: Variant[];
  total_participants?: number;
  variant_stats?: any[];
  results?: any[];
  created_at: string;
  started_at?: string;
  ended_at?: string;
  winner_variant_id?: string;
}

interface SchedulerStatus {
  scheduler_running: boolean;
  check_interval_hours: number;
  last_check: any;
  next_check_approx: string | null;
}

export default function ABTestingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [overview, setOverview] = useState<any>({});
  const [statusFilter, setStatusFilter] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    experiment_type: 'feature',
    target_page: '',
    goal_type: 'conversion',
    goal_event: '',
    assignment_type: 'both',
    min_sample_size: 100,
    confidence_level: 95,
    smart_winner_enabled: false,
    smart_winner_strategy: 'notify',
    min_runtime_hours: 48,
    variants: [
      { name: 'Control', description: 'Original version', traffic_percent: 50, is_control: true, config: {} },
      { name: 'Variant A', description: 'Test version', traffic_percent: 50, is_control: false, config: {} }
    ] as Variant[]
  });

  // Winner notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, overviewRes, notifRes, schedulerRes] = await Promise.all([
        api.getExperiments(statusFilter || undefined),
        api.getExperimentsOverview(),
        api.getWinnerNotifications().catch(() => ({ notifications: [] })),
        api.getSchedulerStatus().catch(() => null)
      ]);
      setExperiments(expRes.experiments || []);
      setOverview(overviewRes);
      setNotifications(notifRes.notifications || []);
      setSchedulerStatus(schedulerRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const handleCreate = async () => {
    try {
      const totalTraffic = formData.variants.reduce((sum, v) => sum + v.traffic_percent, 0);
      if (Math.abs(totalTraffic - 100) > 0.01) {
        setError(`Traffic must total 100% (currently ${totalTraffic}%)`);
        return;
      }
      
      await api.createExperiment(formData);
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
      await api.startExperiment(experimentId);
      setSuccess('Experiment started');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start experiment');
    }
  };

  const handlePause = async (experimentId: string) => {
    try {
      await api.pauseExperiment(experimentId);
      setSuccess('Experiment paused');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to pause experiment');
    }
  };

  const handleStop = async (winnerVariantId?: string) => {
    if (!selectedExperiment) return;
    try {
      await api.stopExperiment(selectedExperiment.id, winnerVariantId);
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
      await api.deleteExperiment(experimentId);
      setSuccess('Experiment deleted');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete experiment');
    }
  };

  const handleViewDetails = async (experiment: Experiment) => {
    try {
      const details = await api.getExperiment(experiment.id);
      setSelectedExperiment(details);
      setViewDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load experiment details');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', hypothesis: '', experiment_type: 'feature',
      target_page: '', goal_type: 'conversion', goal_event: '',
      assignment_type: 'both', min_sample_size: 100, confidence_level: 95,
      smart_winner_enabled: false, smart_winner_strategy: 'notify', min_runtime_hours: 48,
      variants: [
        { name: 'Control', description: 'Original', traffic_percent: 50, is_control: true, config: {} },
        { name: 'Variant A', description: 'Test', traffic_percent: 50, is_control: false, config: {} }
      ]
    });
  };

  const handleCheckWinners = async () => {
    try {
      const result = await api.triggerWinnerCheck();
      if (result.winners_found > 0) {
        setSuccess(`Found ${result.winners_found} winner(s)! Check notifications.`);
      } else {
        setSuccess(`Checked ${result.checked} experiments. No winners yet.`);
      }
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check for winners');
    }
  };

  const addVariant = () => {
    const newVariant: Variant = {
      name: `Variant ${String.fromCharCode(65 + formData.variants.length - 1)}`,
      description: '',
      traffic_percent: 0,
      is_control: false,
      config: {}
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

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'conversion': return <TrendingUp fontSize="small" />;
      case 'click': return <TouchApp fontSize="small" />;
      case 'consent': return <CheckCircle fontSize="small" />;
      default: return <Science fontSize="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>A/B Testing</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage experiments</Typography>
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
      
      {/* Winner Notifications */}
      {notifications.filter(n => !n.is_read).length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<EmojiEvents />}>
          <strong>Winner Found!</strong> {notifications.filter(n => !n.is_read).map(n => n.message).join(' | ')}
        </Alert>
      )}

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
              <Typography variant="h4" fontWeight={700} color="success.main">{overview.running_experiments || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Running</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <CheckCircle color="info" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{overview.completed_experiments || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Completed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <People color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{(overview.total_participants || 0).toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">Total Participants</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <EmojiEvents color="warning" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{overview.experiments_with_winners || 0}</Typography>
              <Typography variant="body2" color="text.secondary">With Winners</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="paused">Paused</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
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
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Experiment</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Goal</TableCell>
                  <TableCell>Participants</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {experiments.map((exp) => (
                  <TableRow key={exp.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{exp.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {exp.variants?.length || 0} variants
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={exp.experiment_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip icon={getGoalIcon(exp.goal_type)} label={exp.goal_type} size="small" />
                    </TableCell>
                    <TableCell>{(exp.total_participants || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={exp.status} size="small" color={getStatusColor(exp.status)} />
                      {exp.winner_variant_id && <EmojiEvents fontSize="small" color="warning" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewDetails(exp)}><Visibility /></IconButton>
                      {exp.status === 'draft' && (
                        <IconButton size="small" color="success" onClick={() => handleStart(exp.id)}><PlayArrow /></IconButton>
                      )}
                      {exp.status === 'running' && (
                        <>
                          <IconButton size="small" color="warning" onClick={() => handlePause(exp.id)}><Pause /></IconButton>
                          <IconButton size="small" color="error" onClick={() => { setSelectedExperiment(exp); setStopDialogOpen(true); }}><Stop /></IconButton>
                        </>
                      )}
                      {exp.status === 'paused' && (
                        <>
                          <IconButton size="small" color="success" onClick={() => handleStart(exp.id)}><PlayArrow /></IconButton>
                          <IconButton size="small" color="error" onClick={() => { setSelectedExperiment(exp); setStopDialogOpen(true); }}><Stop /></IconButton>
                        </>
                      )}
                      {exp.status !== 'running' && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}><Delete /></IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Experiment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="Experiment Name" value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} required />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formData.experiment_type} label="Type" 
                  onChange={e => setFormData({...formData, experiment_type: e.target.value})}>
                  <MenuItem value="feature">Feature Flag</MenuItem>
                  <MenuItem value="cookie_banner">Cookie Banner</MenuItem>
                  <MenuItem value="poll">Poll/Survey</MenuItem>
                  <MenuItem value="cta">CTA Button</MenuItem>
                  <MenuItem value="ui">UI Element</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Description" value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Hypothesis" value={formData.hypothesis}
                onChange={e => setFormData({...formData, hypothesis: e.target.value})}
                placeholder="We believe that [change] will result in [outcome] because [reason]" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Goal Metric</InputLabel>
                <Select value={formData.goal_type} label="Goal Metric"
                  onChange={e => setFormData({...formData, goal_type: e.target.value})}>
                  <MenuItem value="conversion">Conversion Rate</MenuItem>
                  <MenuItem value="click">Click-through Rate</MenuItem>
                  <MenuItem value="consent">Consent Rate</MenuItem>
                  <MenuItem value="custom">Custom Event</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Assignment Method</InputLabel>
                <Select value={formData.assignment_type} label="Assignment Method"
                  onChange={e => setFormData({...formData, assignment_type: e.target.value})}>
                  <MenuItem value="both">Cookie + User (Recommended)</MenuItem>
                  <MenuItem value="cookie">Cookie Only (Anonymous)</MenuItem>
                  <MenuItem value="user">User Account Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="number" label="Min Sample Size" value={formData.min_sample_size}
                onChange={e => setFormData({...formData, min_sample_size: parseInt(e.target.value) || 100})} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Target Page (optional)" value={formData.target_page}
                onChange={e => setFormData({...formData, target_page: e.target.value})}
                placeholder="/checkout, /signup, etc." />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>Variants</Typography>
                <Box>
                  <Button size="small" onClick={distributeTrafficEvenly}>Even Split</Button>
                  <Button size="small" startIcon={<AddCircle />} onClick={addVariant}>Add Variant</Button>
                </Box>
              </Box>
              
              {formData.variants.map((variant, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField fullWidth size="small" label="Name" value={variant.name}
                        onChange={e => updateVariant(idx, 'name', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField fullWidth size="small" label="Description" value={variant.description || ''}
                        onChange={e => updateVariant(idx, 'description', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Box>
                        <Typography variant="caption">Traffic: {variant.traffic_percent}%</Typography>
                        <Slider value={variant.traffic_percent} onChange={(_, v) => updateVariant(idx, 'traffic_percent', v)}
                          min={0} max={100} valueLabelDisplay="auto" />
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {variant.is_control && <Chip label="Control" size="small" color="primary" />}
                        {formData.variants.length > 2 && (
                          <IconButton size="small" onClick={() => removeVariant(idx)}><RemoveCircle /></IconButton>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              
              <Typography variant="caption" color={Math.abs(formData.variants.reduce((s, v) => s + v.traffic_percent, 0) - 100) > 0.01 ? 'error' : 'text.secondary'}>
                Total: {formData.variants.reduce((s, v) => s + v.traffic_percent, 0)}% (must equal 100%)
              </Typography>
            </Grid>

            {/* Smart Winner Section */}
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <EmojiEvents color="warning" />
                  <Typography variant="subtitle1" fontWeight={600}>Smart Winner (Auto-Detection)</Typography>
                  <Switch 
                    checked={formData.smart_winner_enabled}
                    onChange={e => setFormData({...formData, smart_winner_enabled: e.target.checked})}
                  />
                </Box>
                
                {formData.smart_winner_enabled && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>When Winner Found</InputLabel>
                        <Select 
                          value={formData.smart_winner_strategy} 
                          label="When Winner Found"
                          onChange={e => setFormData({...formData, smart_winner_strategy: e.target.value})}
                        >
                          <MenuItem value="notify">Notify Only (Recommended)</MenuItem>
                          <MenuItem value="auto_rollout">Auto-Stop & Declare Winner</MenuItem>
                          <MenuItem value="gradual">Gradual Rollout</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField 
                        fullWidth 
                        size="small"
                        type="number" 
                        label="Min Runtime (hours)" 
                        value={formData.min_runtime_hours}
                        onChange={e => setFormData({...formData, min_runtime_hours: parseInt(e.target.value) || 48})}
                        helperText="Wait this long before declaring winners"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        {formData.smart_winner_strategy === 'notify' && 'You will receive a notification when a statistically significant winner is found. Manual action required.'}
                        {formData.smart_winner_strategy === 'auto_rollout' && 'Experiment will automatically stop and winner will be declared when significance is reached.'}
                        {formData.smart_winner_strategy === 'gradual' && 'Winner traffic will be gradually increased: 50% → 75% → 100%.'}
                      </Alert>
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} 
            disabled={!formData.name || Math.abs(formData.variants.reduce((s, v) => s + v.traffic_percent, 0) - 100) > 0.01}>
            Create Experiment
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedExperiment?.name}
          <Chip label={selectedExperiment?.status} size="small" color={getStatusColor(selectedExperiment?.status || '')} sx={{ ml: 2 }} />
        </DialogTitle>
        <DialogContent>
          {selectedExperiment && (
            <Box sx={{ mt: 2 }}>
              {selectedExperiment.hypothesis && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Hypothesis:</strong> {selectedExperiment.hypothesis}
                </Alert>
              )}
              
              <Typography variant="h6" gutterBottom>Results ({selectedExperiment.total_participants?.toLocaleString()} participants)</Typography>
              
              <Grid container spacing={2}>
                {selectedExperiment.results?.map((result: any) => (
                  <Grid key={result.variant_id} size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ 
                      bgcolor: result.is_control ? 'grey.50' : (selectedExperiment.winner_variant_id === result.variant_id ? 'success.light' : 'background.paper')
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">
                            {result.variant_name}
                            {selectedExperiment.winner_variant_id === result.variant_id && (
                              <EmojiEvents color="warning" sx={{ ml: 1 }} />
                            )}
                          </Typography>
                          <Chip label={`${result.traffic_percent}% traffic`} size="small" />
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="h4" fontWeight={700}>{result.participants.toLocaleString()}</Typography>
                            <Typography variant="caption" color="text.secondary">Participants</Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="h4" fontWeight={700} color="primary">{result.conversion_rate.toFixed(2)}%</Typography>
                            <Typography variant="caption" color="text.secondary">Conversion Rate</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography fontWeight={600}>{result.clicks}</Typography>
                            <Typography variant="caption">Clicks</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography fontWeight={600}>{result.conversions}</Typography>
                            <Typography variant="caption">Conversions</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography fontWeight={600}>{result.consents}</Typography>
                            <Typography variant="caption">Consents</Typography>
                          </Grid>
                        </Grid>
                        
                        {result.significant !== undefined && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                            <Chip 
                              icon={result.significant ? <CheckCircle /> : <Cancel />}
                              label={result.significant ? `Significant (z=${result.z_score})` : 'Not Significant'}
                              color={result.significant ? 'success' : 'default'}
                              size="small"
                            />
                            {result.improvement !== 0 && (
                              <Typography variant="caption" sx={{ ml: 1 }}>
                                {result.improvement > 0 ? '+' : ''}{result.improvement}% vs control
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
          {selectedExperiment?.variants?.map((v: any) => (
            <Button key={v.id} fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => handleStop(v.id)}>
              {v.name} {v.is_control && '(Control)'}
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
