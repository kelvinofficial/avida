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
  InputAdornment,
  TablePagination,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Avatar,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  Add,
  Edit,
  Delete,
  Search,
  EmojiEvents,
  Verified,
  Star,
  LocalFireDepartment,
  Shield,
  Diamond,
  WorkspacePremium,
  MilitaryTech,
  Person,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: 'achievement' | 'verification' | 'premium' | 'trust' | 'special';
  criteria?: string;
  auto_award: boolean;
  points_value: number;
  display_priority: number;
  is_active: boolean;
  created_at: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string;
  badge_color: string;
  awarded_at: string;
  awarded_by: string;
  reason?: string;
  is_visible: boolean;
}

interface BadgeStats {
  total_badges: number;
  active_badges: number;
  total_awards: number;
  users_with_badges: number;
  most_awarded_badge: string;
  recent_awards: number;
}

const BADGE_ICONS = [
  { value: 'verified', label: 'Verified', icon: <Verified /> },
  { value: 'star', label: 'Star', icon: <Star /> },
  { value: 'trophy', label: 'Trophy', icon: <EmojiEvents /> },
  { value: 'fire', label: 'Fire', icon: <LocalFireDepartment /> },
  { value: 'shield', label: 'Shield', icon: <Shield /> },
  { value: 'diamond', label: 'Diamond', icon: <Diamond /> },
  { value: 'premium', label: 'Premium', icon: <WorkspacePremium /> },
  { value: 'medal', label: 'Medal', icon: <MilitaryTech /> },
];

const BADGE_COLORS = [
  { value: '#4CAF50', label: 'Green' },
  { value: '#2196F3', label: 'Blue' },
  { value: '#FF9800', label: 'Orange' },
  { value: '#9C27B0', label: 'Purple' },
  { value: '#F44336', label: 'Red' },
  { value: '#FFD700', label: 'Gold' },
  { value: '#00BCD4', label: 'Cyan' },
  { value: '#E91E63', label: 'Pink' },
];

const BADGE_TYPES = [
  { value: 'achievement', label: 'Achievement' },
  { value: 'verification', label: 'Verification' },
  { value: 'premium', label: 'Premium' },
  { value: 'trust', label: 'Trust & Safety' },
  { value: 'special', label: 'Special' },
];

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Badge Dialog
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    icon: 'verified',
    color: '#4CAF50',
    type: 'achievement' as Badge['type'],
    criteria: '',
    auto_award: false,
    points_value: 10,
    display_priority: 0,
    is_active: true,
  });

  // Award Dialog
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({
    user_email: '',
    badge_id: '',
    reason: '',
  });
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalUserBadges, setTotalUserBadges] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchBadges = async () => {
    try {
      const response = await api.getBadges();
      setBadges(response.badges || []);
      setStats(response.stats || null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load badges');
    }
  };

  const fetchUserBadges = async () => {
    try {
      const params: Record<string, any> = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
      };
      if (searchQuery) params.search = searchQuery;
      
      const response = await api.getUserBadges(params);
      setUserBadges(response.user_badges || []);
      setTotalUserBadges(response.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load user badges');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchBadges(), fetchUserBadges()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 1) {
      fetchUserBadges();
    }
  }, [page, rowsPerPage, activeTab]);

  const handleCreateBadge = async () => {
    try {
      if (editingBadge) {
        await api.updateBadge(editingBadge.id, badgeForm);
        setSuccess('Badge updated successfully');
      } else {
        await api.createBadge(badgeForm);
        setSuccess('Badge created successfully');
      }
      setBadgeDialogOpen(false);
      resetBadgeForm();
      fetchBadges();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save badge');
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Are you sure you want to delete this badge? This will also remove it from all users.')) return;
    
    try {
      await api.deleteBadge(badgeId);
      setSuccess('Badge deleted successfully');
      fetchBadges();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete badge');
    }
  };

  const handleAwardBadge = async () => {
    try {
      await api.awardBadge(awardForm);
      setSuccess('Badge awarded successfully');
      setAwardDialogOpen(false);
      setAwardForm({ user_email: '', badge_id: '', reason: '' });
      fetchUserBadges();
      fetchBadges();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to award badge');
    }
  };

  const handleRevokeBadge = async (userBadgeId: string) => {
    if (!confirm('Are you sure you want to revoke this badge from the user?')) return;
    
    try {
      await api.revokeBadge(userBadgeId);
      setSuccess('Badge revoked successfully');
      fetchUserBadges();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke badge');
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSuggestions([]);
      return;
    }
    
    setSearchingUsers(true);
    try {
      const response = await api.searchUsers(query);
      setUserSuggestions(response.users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const resetBadgeForm = () => {
    setEditingBadge(null);
    setBadgeForm({
      name: '',
      description: '',
      icon: 'verified',
      color: '#4CAF50',
      type: 'achievement',
      criteria: '',
      auto_award: false,
      points_value: 10,
      display_priority: 0,
      is_active: true,
    });
  };

  const openEditDialog = (badge: Badge) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      type: badge.type,
      criteria: badge.criteria || '',
      auto_award: badge.auto_award,
      points_value: badge.points_value,
      display_priority: badge.display_priority || 0,
      is_active: badge.is_active,
    });
    setBadgeDialogOpen(true);
  };

  const getBadgeIcon = (iconName: string) => {
    const found = BADGE_ICONS.find(i => i.value === iconName);
    return found?.icon || <EmojiEvents />;
  };

  const getTypeColor = (type: string): 'success' | 'primary' | 'warning' | 'secondary' | 'error' => {
    switch (type) {
      case 'achievement': return 'primary';
      case 'verification': return 'success';
      case 'premium': return 'warning';
      case 'trust': return 'secondary';
      case 'special': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Badge Management
          </Typography>
          <Typography color="text.secondary">
            Create and manage user badges and achievements
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { resetBadgeForm(); setBadgeDialogOpen(true); }}
          >
            Create Badge
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Badges</Typography>
                <Typography variant="h4" fontWeight="bold">{stats.total_badges}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Active Badges</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">{stats.active_badges}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Total Awards</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">{stats.total_awards}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Users with Badges</Typography>
                <Typography variant="h4" fontWeight="bold">{stats.users_with_badges}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Recent Awards</Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.recent_awards}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>Most Awarded</Typography>
                <Typography variant="body1" fontWeight="bold" noWrap>{stats.most_awarded_badge || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Badge Definitions" icon={<EmojiEvents />} iconPosition="start" />
          <Tab label="User Badges" icon={<Person />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Badge Definitions Tab */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {BADGE_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Badges Grid */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {badges
                  .filter(b => typeFilter === 'all' || b.type === typeFilter)
                  .map((badge) => (
                  <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Card variant="outlined" sx={{ 
                      opacity: badge.is_active ? 1 : 0.6,
                      borderColor: badge.color,
                      borderWidth: 2,
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Avatar sx={{ bgcolor: badge.color, width: 48, height: 48 }}>
                            {getBadgeIcon(badge.icon)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight="bold">{badge.name}</Typography>
                            <Chip 
                              label={badge.type} 
                              size="small" 
                              color={getTypeColor(badge.type)}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                          {badge.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Chip 
                              label={`${badge.points_value} pts`} 
                              size="small" 
                              variant="outlined"
                            />
                            {badge.auto_award && (
                              <Chip 
                                label="Auto" 
                                size="small" 
                                color="info"
                                sx={{ ml: 0.5 }}
                              />
                            )}
                          </Box>
                          <Box>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditDialog(badge)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteBadge(badge.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Badges Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            {/* Search and Award Button */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="Search by user email or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchUserBadges()}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
                sx={{ width: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<EmojiEvents />}
                onClick={() => setAwardDialogOpen(true)}
              >
                Award Badge
              </Button>
            </Box>

            {/* User Badges Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Badge</TableCell>
                    <TableCell>Awarded At</TableCell>
                    <TableCell>Awarded By</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Visible</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : userBadges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <EmojiEvents sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">No badges awarded yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userBadges.map((ub) => (
                      <TableRow key={ub.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              <Person fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">{ub.user_name}</Typography>
                              <Typography variant="caption" color="text.secondary">{ub.user_email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: ub.badge_color, width: 28, height: 28 }}>
                              {getBadgeIcon(ub.badge_icon)}
                            </Avatar>
                            <Typography variant="body2">{ub.badge_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(ub.awarded_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{ub.awarded_by}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                            {ub.reason || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {ub.is_visible ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : (
                            <Cancel color="disabled" fontSize="small" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Revoke Badge">
                            <IconButton size="small" color="error" onClick={() => handleRevokeBadge(ub.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalUserBadges}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Badge Dialog */}
      <Dialog open={badgeDialogOpen} onClose={() => setBadgeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBadge ? 'Edit Badge' : 'Create Badge'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Badge Name"
                value={badgeForm.name}
                onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                value={badgeForm.description}
                onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Icon</InputLabel>
                <Select
                  value={badgeForm.icon}
                  label="Icon"
                  onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })}
                >
                  {BADGE_ICONS.map(icon => (
                    <MenuItem key={icon.value} value={icon.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {icon.icon}
                        {icon.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Color</InputLabel>
                <Select
                  value={badgeForm.color}
                  label="Color"
                  onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                >
                  {BADGE_COLORS.map(color => (
                    <MenuItem key={color.value} value={color.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: color.value }} />
                        {color.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={badgeForm.type}
                  label="Type"
                  onChange={(e) => setBadgeForm({ ...badgeForm, type: e.target.value as Badge['type'] })}
                >
                  {BADGE_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Points Value"
                value={badgeForm.points_value}
                onChange={(e) => setBadgeForm({ ...badgeForm, points_value: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Award Criteria (for auto-award)"
                value={badgeForm.criteria}
                onChange={(e) => setBadgeForm({ ...badgeForm, criteria: e.target.value })}
                placeholder="e.g., Complete 10 successful sales"
                helperText="Describe when this badge should be automatically awarded"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={badgeForm.auto_award}
                    onChange={(e) => setBadgeForm({ ...badgeForm, auto_award: e.target.checked })}
                  />
                }
                label="Auto-award when criteria met"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={badgeForm.is_active}
                    onChange={(e) => setBadgeForm({ ...badgeForm, is_active: e.target.checked })}
                  />
                }
                label="Badge is active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBadgeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBadge} disabled={!badgeForm.name}>
            {editingBadge ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Award Badge Dialog */}
      <Dialog open={awardDialogOpen} onClose={() => setAwardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Award Badge to User</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                freeSolo
                options={userSuggestions}
                getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.name} (${option.email})`}
                onInputChange={(_, value) => {
                  setAwardForm({ ...awardForm, user_email: value });
                  searchUsers(value);
                }}
                onChange={(_, value: any) => {
                  if (value && typeof value !== 'string') {
                    setAwardForm({ ...awardForm, user_email: value.email });
                  }
                }}
                loading={searchingUsers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="User Email"
                    placeholder="Search by email or name"
                    required
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Badge</InputLabel>
                <Select
                  value={awardForm.badge_id}
                  label="Badge"
                  onChange={(e) => setAwardForm({ ...awardForm, badge_id: e.target.value })}
                >
                  {badges.filter(b => b.is_active).map(badge => (
                    <MenuItem key={badge.id} value={badge.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: badge.color, width: 24, height: 24 }}>
                          {getBadgeIcon(badge.icon)}
                        </Avatar>
                        {badge.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Reason (optional)"
                value={awardForm.reason}
                onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
                multiline
                rows={2}
                placeholder="Why is this badge being awarded?"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAwardDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAwardBadge}
            disabled={!awardForm.user_email || !awardForm.badge_id}
            startIcon={<EmojiEvents />}
          >
            Award Badge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
