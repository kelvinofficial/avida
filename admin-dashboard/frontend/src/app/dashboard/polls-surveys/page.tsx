'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, Chip, Select, MenuItem,
  FormControl, InputLabel, Tabs, Tab, LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add, Edit, Delete, Refresh, Poll, Feedback, Assessment,
  Download, Visibility, RemoveCircle, AddCircle,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface PollOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'multiple_choice';
  options?: string[];
  required: boolean;
}

export default function PollsSurveysPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [polls, setPolls] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feedback' as 'poll' | 'survey' | 'feedback',
    options: ['', ''] as string[],
    questions: [] as Question[],
    allow_multiple: false,
    require_auth: true,
    show_results: true,
    is_active: true,
    target_audience: 'all',
    ends_at: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const pollType = currentTab === 0 ? undefined : currentTab === 1 ? 'feedback' : 'survey';
      const res = await api.getPolls({ poll_type: pollType });
      setPolls(res.polls || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentTab]);

  const handleCreate = async () => {
    try {
      const data = {
        ...formData,
        options: formData.type === 'poll' ? formData.options.filter(Boolean) : undefined,
        questions: formData.type !== 'poll' ? formData.questions : undefined,
        ends_at: formData.ends_at || undefined,
      };
      await api.createPoll(data);
      setSuccess('Poll/Survey created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create');
    }
  };

  const handleDelete = async (pollId: string) => {
    if (!confirm('Delete this poll/survey and all responses?')) return;
    try {
      await api.deletePoll(pollId);
      setSuccess('Deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleToggleActive = async (poll: any) => {
    try {
      await api.updatePoll(poll.id, { is_active: !poll.is_active });
      setSuccess(`Poll ${poll.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleViewResults = async (poll: any) => {
    try {
      const details = await api.getPoll(poll.id);
      setSelectedPoll(details);
      setViewDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load results');
    }
  };

  const handleExport = async (pollId: string) => {
    try {
      const data = await api.exportPollResponses(pollId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poll_${pollId}_responses.json`;
      a.click();
      setSuccess('Export downloaded');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', type: 'feedback', options: ['', ''],
      questions: [], allow_multiple: false, require_auth: true,
      show_results: true, is_active: true, target_audience: 'all', ends_at: '',
    });
  };

  const addOption = () => setFormData({ ...formData, options: [...formData.options, ''] });
  const removeOption = (idx: number) => setFormData({ ...formData, options: formData.options.filter((_, i) => i !== idx) });
  const updateOption = (idx: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[idx] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addQuestion = () => {
    const newQ: Question = { id: Date.now().toString(), text: '', type: 'text', required: false };
    setFormData({ ...formData, questions: [...formData.questions, newQ] });
  };

  const removeQuestion = (idx: number) => setFormData({ ...formData, questions: formData.questions.filter((_, i) => i !== idx) });
  const updateQuestion = (idx: number, field: string, value: any) => {
    const newQuestions = [...formData.questions];
    (newQuestions[idx] as any)[field] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'poll': return 'primary';
      case 'feedback': return 'success';
      case 'survey': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Polls & Surveys</Typography>
          <Typography variant="body2" color="text.secondary">Collect app feedback and user opinions</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            Create New
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="All" icon={<Assessment />} iconPosition="start" />
        <Tab label="Feedback" icon={<Feedback />} iconPosition="start" />
        <Tab label="Surveys" icon={<Poll />} iconPosition="start" />
      </Tabs>

      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : polls.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No polls or surveys found</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Responses</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {polls.map((poll) => (
                  <TableRow key={poll.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{poll.title}</Typography>
                      {poll.description && <Typography variant="caption" color="text.secondary">{poll.description}</Typography>}
                    </TableCell>
                    <TableCell><Chip label={poll.type} size="small" color={getTypeColor(poll.type)} /></TableCell>
                    <TableCell><Chip label={poll.response_count || 0} size="small" variant="outlined" /></TableCell>
                    <TableCell>
                      <Switch checked={poll.is_active} onChange={() => handleToggleActive(poll)} size="small" />
                      <Typography variant="caption">{poll.is_active ? 'Active' : 'Inactive'}</Typography>
                    </TableCell>
                    <TableCell>{new Date(poll.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewResults(poll)}><Visibility /></IconButton>
                      <IconButton size="small" onClick={() => handleExport(poll.id)}><Download /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(poll.id)}><Delete /></IconButton>
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
        <DialogTitle>Create Poll / Survey</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField fullWidth label="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formData.type} label="Type" onChange={e => setFormData({...formData, type: e.target.value as any})}>
                  <MenuItem value="feedback">Feedback Form</MenuItem>
                  <MenuItem value="survey">Survey</MenuItem>
                  <MenuItem value="poll">Quick Poll</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Description" value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} />
            </Grid>

            {formData.type === 'poll' && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Poll Options</Typography>
                {formData.options.map((opt, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField fullWidth size="small" placeholder={`Option ${idx + 1}`} value={opt} onChange={e => updateOption(idx, e.target.value)} />
                    {formData.options.length > 2 && (
                      <IconButton size="small" onClick={() => removeOption(idx)}><RemoveCircle /></IconButton>
                    )}
                  </Box>
                ))}
                <Button size="small" startIcon={<AddCircle />} onClick={addOption}>Add Option</Button>
              </Grid>
            )}

            {formData.type !== 'poll' && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" gutterBottom>Questions</Typography>
                {formData.questions.map((q, idx) => (
                  <Card key={q.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 8 }}>
                        <TextField fullWidth size="small" label={`Question ${idx + 1}`} value={q.text} onChange={e => updateQuestion(idx, 'text', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Type</InputLabel>
                          <Select value={q.type} label="Type" onChange={e => updateQuestion(idx, 'type', e.target.value)}>
                            <MenuItem value="text">Text</MenuItem>
                            <MenuItem value="rating">Rating (1-5)</MenuItem>
                            <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, md: 1 }}>
                        <IconButton onClick={() => removeQuestion(idx)}><RemoveCircle /></IconButton>
                      </Grid>
                    </Grid>
                  </Card>
                ))}
                <Button size="small" startIcon={<AddCircle />} onClick={addQuestion}>Add Question</Button>
              </Grid>
            )}

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select value={formData.target_audience} label="Target Audience" onChange={e => setFormData({...formData, target_audience: e.target.value})}>
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="verified">Verified Users</MenuItem>
                  <MenuItem value="premium">Premium Users</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }}
                value={formData.ends_at} onChange={e => setFormData({...formData, ends_at: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel control={<Switch checked={formData.require_auth} onChange={e => setFormData({...formData, require_auth: e.target.checked})} />} 
                label="Require Login" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel control={<Switch checked={formData.show_results} onChange={e => setFormData({...formData, show_results: e.target.checked})} />} 
                label="Show Results to Users" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.title}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* View Results Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Results: {selectedPoll?.title}</DialogTitle>
        <DialogContent>
          {selectedPoll && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Total Responses: {selectedPoll.total_responses || 0}</Typography>
              
              {selectedPoll.type === 'poll' && selectedPoll.results && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Vote Distribution</Typography>
                  {Object.entries(selectedPoll.results).map(([option, count]: [string, any]) => (
                    <Box key={option} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography>{option}</Typography>
                        <Typography>{count} votes ({selectedPoll.total_responses > 0 ? Math.round((count / selectedPoll.total_responses) * 100) : 0}%)</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={selectedPoll.total_responses > 0 ? (count / selectedPoll.total_responses) * 100 : 0} />
                    </Box>
                  ))}
                </Box>
              )}

              {selectedPoll.type !== 'poll' && selectedPoll.responses && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Response</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPoll.responses.slice(0, 20).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.feedback && <Typography variant="body2">{r.feedback}</Typography>}
                            {r.answers && Object.entries(r.answers).map(([q, a]: [string, any]) => (
                              <Typography key={q} variant="caption" display="block">{q}: {String(a)}</Typography>
                            ))}
                          </TableCell>
                          <TableCell>{r.user_id || 'Anonymous'}</TableCell>
                          <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedPoll && <Button onClick={() => handleExport(selectedPoll.id)} startIcon={<Download />}>Export All</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
