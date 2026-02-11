'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  LinearProgress,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  Add,
  Edit,
  Delete,
  EmojiEvents,
  Flag,
  Timer,
  TrendingUp,
  Group,
  CheckCircle,
  Mail,
  Leaderboard,
  Stars,
  Celebration,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { api } from '@/lib/api';

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  criteria: string;
  target: number;
  categories: string[];
  start_date: string;
  end_date: string;
  badge_reward: {
    name: string;
    description: string;
    icon: string;
    color: string;
    points_value: number;
  };
  icon: string;
  color: string;
  theme: string;
  is_active: boolean;
  stats?: {
    participants: number;
    completions: number;
    completion_rate: number;
  };
}

interface ChallengeStats {
  total_custom_challenges: number;
  active_challenges: number;
  currently_running: number;
  total_participants: number;
  total_completions: number;
  completion_rate: number;
  recent_activity: {
    joins_last_7_days: number;
    completions_last_7_days: number;
  };
  top_challenges: { _id: string; participants: number; name: string }[];
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  user_email: string;
  progress: number;
  target: number;
  completed: boolean;
  joined_at: string;
}

const CRITERIA_OPTIONS = [
  { value: 'listings_created', label: 'Listings Created' },
  { value: 'items_sold', label: 'Items Sold' },
  { value: 'total_sales_value', label: 'Total Sales Value (€)' },
  { value: 'messages_sent', label: 'Messages Sent' },
  { value: 'category_listings', label: 'Category-Specific Listings' },
  { value: 'category_sales', label: 'Category-Specific Sales' },
];

const CATEGORY_OPTIONS = [
  'electronics', 'phones_tablets', 'fashion_beauty', 'home_furniture',
  'auto_vehicles', 'properties', 'jobs_services', 'kids_baby', 'books_media',
];

const ICON_OPTIONS = [
  'flash', 'star', 'rocket', 'trophy', 'layers', 'cash', 'chatbubbles',
  'heart', 'flower', 'sunny', 'school', 'moon', 'gift', 'sparkles', 'ribbon', 'medal',
];

const COLOR_OPTIONS = [
  '#F59E0B', '#EF4444', '#8B5CF6', '#FFD700', '#10B981', '#3B82F6',
  '#EC4899', '#1F2937', '#DC2626', '#059669', '#6366F1', '#F97316',
];

export default function ChallengesPage() {
  const [tabValue, setTabValue] = useState(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaderboardDialogOpen, setLeaderboardDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'seasonal',
    criteria: 'listings_created',
    target: 10,
    categories: [] as string[],
    start_date: new Date(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    badge_name: '',
    badge_description: '',
    badge_icon: 'trophy',
    badge_color: '#F59E0B',
    badge_points: 50,
    theme: 'default',
    is_active: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/challenges?page=${page + 1}&limit=${rowsPerPage}`);
      setChallenges(response.data.challenges || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch challenges');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/challenges/stats/overview');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
    fetchStats();
  }, [fetchChallenges, fetchStats]);

  const handleCreateChallenge = async () => {
    try {
      setSaving(true);
      await api.post('/api/admin/challenges', formData);
      setCreateDialogOpen(false);
      resetForm();
      fetchChallenges();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChallenge = async () => {
    if (!selectedChallenge) return;
    try {
      setSaving(true);
      await api.put(`/api/admin/challenges/${selectedChallenge.id}`, formData);
      setEditDialogOpen(false);
      resetForm();
      fetchChallenges();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await api.delete(`/api/admin/challenges/${challengeId}`);
      fetchChallenges();
      fetchStats();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete challenge');
    }
  };

  const handleViewLeaderboard = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    try {
      const response = await api.get(`/api/admin/challenges/${challenge.id}/leaderboard`);
      setLeaderboard(response.data.leaderboard || []);
      setLeaderboardDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch leaderboard');
    }
  };

  const handleSendReminder = async () => {
    if (!selectedChallenge) return;
    try {
      setSendingReminder(true);
      const response = await api.post(`/api/admin/challenges/${selectedChallenge.id}/send-reminder`);
      alert(`Reminder sent to ${response.data.emails_sent} users`);
      setReminderDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'seasonal',
      criteria: 'listings_created',
      target: 10,
      categories: [],
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      badge_name: '',
      badge_description: '',
      badge_icon: 'trophy',
      badge_color: '#F59E0B',
      badge_points: 50,
      theme: 'default',
      is_active: true,
    });
  };

  const openEditDialog = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setFormData({
      name: challenge.name,
      description: challenge.description,
      type: challenge.type,
      criteria: challenge.criteria || 'listings_created',
      target: challenge.target,
      categories: challenge.categories || [],
      start_date: new Date(challenge.start_date),
      end_date: new Date(challenge.end_date),
      badge_name: challenge.badge_reward?.name || '',
      badge_description: challenge.badge_reward?.description || '',
      badge_icon: challenge.icon || 'trophy',
      badge_color: challenge.color || '#F59E0B',
      badge_points: challenge.badge_reward?.points_value || 50,
      theme: challenge.theme || 'default',
      is_active: challenge.is_active,
    });
    setEditDialogOpen(true);
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Flag color="primary" />
              <Typography variant="h6">{stats?.total_custom_challenges || 0}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Total Challenges</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timer color="success" />
              <Typography variant="h6">{stats?.currently_running || 0}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Currently Running</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Group color="info" />
              <Typography variant="h6">{stats?.total_participants || 0}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Total Participants</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              <Typography variant="h6">{stats?.completion_rate || 0}%</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBadgePreview = () => (
    <Card sx={{ p: 2, textAlign: 'center', bgcolor: `${formData.badge_color}15` }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: formData.badge_color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 1,
        }}
      >
        <EmojiEvents sx={{ color: '#fff', fontSize: 32 }} />
      </Box>
      <Typography variant="subtitle1" fontWeight="bold">
        {formData.badge_name || 'Badge Name'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formData.badge_description || 'Badge description'}
      </Typography>
      <Chip
        label={`+${formData.badge_points} points`}
        size="small"
        sx={{ mt: 1, bgcolor: formData.badge_color, color: '#fff' }}
      />
    </Card>
  );

  const renderChallengeForm = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Challenge Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Challenge Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Challenge Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="seasonal">Seasonal/Event</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Criteria</InputLabel>
                <Select
                  value={formData.criteria}
                  label="Criteria"
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                >
                  {CRITERIA_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Target"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                multiple
                options={CATEGORY_OPTIONS}
                value={formData.categories}
                onChange={(_, newValue) => setFormData({ ...formData, categories: newValue })}
                renderInput={(params) => (
                  <TextField {...params} label="Categories (optional)" />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DateTimePicker
                label="Start Date"
                value={formData.start_date}
                onChange={(date) => date && setFormData({ ...formData, start_date: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DateTimePicker
                label="End Date"
                value={formData.end_date}
                onChange={(date) => date && setFormData({ ...formData, end_date: date })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom>Badge Reward</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Badge Name"
                value={formData.badge_name}
                onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Points Value"
                value={formData.badge_points}
                onChange={(e) => setFormData({ ...formData, badge_points: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Badge Description"
                value={formData.badge_description}
                onChange={(e) => setFormData({ ...formData, badge_description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Badge Icon</InputLabel>
                <Select
                  value={formData.badge_icon}
                  label="Badge Icon"
                  onChange={(e) => setFormData({ ...formData, badge_icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((icon) => (
                    <MenuItem key={icon} value={icon}>{icon}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Badge Color</InputLabel>
                <Select
                  value={formData.badge_color}
                  label="Badge Color"
                  onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                >
                  {COLOR_OPTIONS.map((color) => (
                    <MenuItem key={color} value={color}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, bgcolor: color, borderRadius: 1 }} />
                        {color}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="subtitle2" gutterBottom>Badge Preview</Typography>
          {renderBadgePreview()}
        </Grid>
      </Grid>
    </LocalizationProvider>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Flag /> Challenge Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Refresh />} onClick={() => { fetchChallenges(); fetchStats(); }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Challenge
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {renderStatsCards()}

      <Card>
        <CardContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="All Challenges" icon={<Flag />} iconPosition="start" />
            <Tab label="Leaderboard" icon={<Leaderboard />} iconPosition="start" />
          </Tabs>

          {tabValue === 0 && (
            <>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Participants</TableCell>
                        <TableCell>Completion Rate</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {challenges.map((challenge) => (
                        <TableRow key={challenge.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  bgcolor: challenge.color || '#F59E0B',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <EmojiEvents sx={{ color: '#fff', fontSize: 18 }} />
                              </Box>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">{challenge.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {challenge.badge_reward?.name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={challenge.type}
                              size="small"
                              color={challenge.type === 'seasonal' ? 'secondary' : challenge.type === 'weekly' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{challenge.target}</TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {new Date(challenge.start_date).toLocaleDateString()} -<br />
                              {new Date(challenge.end_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>{challenge.stats?.participants || 0}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={challenge.stats?.completion_rate || 0}
                                sx={{ width: 60 }}
                              />
                              <Typography variant="caption">
                                {challenge.stats?.completion_rate || 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={challenge.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={challenge.is_active ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Leaderboard">
                              <IconButton size="small" onClick={() => handleViewLeaderboard(challenge)}>
                                <Leaderboard />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Send Reminder">
                              <IconButton
                                size="small"
                                onClick={() => { setSelectedChallenge(challenge); setReminderDialogOpen(true); }}
                              >
                                <Mail />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditDialog(challenge)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteChallenge(challenge.id)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                  />
                </TableContainer>
              )}
            </>
          )}

          {tabValue === 1 && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" gutterBottom>Badge Leaderboard (Top Earners)</Typography>
              {/* Badge leaderboard will be loaded separately */}
              <Alert severity="info">
                Use the Badge Management page to view the full badge leaderboard, or click the leaderboard icon on any challenge to see challenge-specific rankings.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Challenge Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create New Challenge</DialogTitle>
        <DialogContent dividers>{renderChallengeForm()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateChallenge} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Create Challenge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Challenge Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Challenge</DialogTitle>
        <DialogContent dividers>{renderChallengeForm()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateChallenge} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leaderboard Dialog */}
      <Dialog open={leaderboardDialogOpen} onClose={() => setLeaderboardDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Leaderboard />
            {selectedChallenge?.name} - Leaderboard
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.user_id}>
                    <TableCell>
                      {entry.rank <= 3 ? (
                        <Chip
                          label={`#${entry.rank}`}
                          size="small"
                          color={entry.rank === 1 ? 'warning' : entry.rank === 2 ? 'default' : 'primary'}
                        />
                      ) : `#${entry.rank}`}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.user_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{entry.user_email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (entry.progress / entry.target) * 100)}
                          sx={{ width: 80 }}
                        />
                        <Typography variant="caption">{entry.progress}/{entry.target}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {entry.completed ? (
                        <Chip label="Completed" size="small" color="success" icon={<CheckCircle />} />
                      ) : (
                        <Chip label="In Progress" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaderboardDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)}>
        <DialogTitle>Send Challenge Reminder</DialogTitle>
        <DialogContent>
          <Typography>
            This will send reminder emails to all participants who haven't completed the
            "{selectedChallenge?.name}" challenge yet.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Mail />}
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? <CircularProgress size={24} /> : 'Send Reminders'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
