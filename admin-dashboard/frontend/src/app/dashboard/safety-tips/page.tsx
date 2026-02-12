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
  Grid,
  Avatar,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Add,
  Edit,
  Delete,
  Security,
  AutoAwesome,
  Category,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

interface SafetyTip {
  id: string;
  category_id: string;
  tip_text: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
}

interface SafetyTipStats {
  total: number;
  active: number;
  inactive: number;
  by_category: { [key: string]: number };
}

const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'phones_tablets', name: 'Phones & Tablets' },
  { id: 'home_furniture', name: 'Home & Furniture' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty' },
  { id: 'jobs_services', name: 'Jobs & Services' },
  { id: 'pets', name: 'Pets' },
  { id: 'kids_baby', name: 'Kids & Baby' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies' },
  { id: 'agriculture', name: 'Agriculture & Food' },
  { id: 'commercial_equipment', name: 'Commercial Equipment' },
  { id: 'repair_construction', name: 'Repair & Construction' },
];

export default function SafetyTipsPage() {
  const [tips, setTips] = useState<SafetyTip[]>([]);
  const [groupedTips, setGroupedTips] = useState<{ [key: string]: SafetyTip[] }>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SafetyTipStats | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<SafetyTip | null>(null);
  const [seeding, setSeeding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    tip_text: '',
    order: 0,
    is_active: true,
  });

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('grouped');
  
  const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      
      const response = await fetch(`${API_BASE}/safety-tips?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        setTips(data.tips || []);
        setGroupedTips(data.grouped || {});
      } else if (response.status === 401) {
        // Try public endpoint as fallback for viewing
        const publicResponse = await fetch(`${API_BASE}/safety-tips/defaults`);
        if (publicResponse.ok) {
          const defaults = await publicResponse.json();
          // Transform defaults to tip format
          const allTips: SafetyTip[] = [];
          const grouped: { [key: string]: SafetyTip[] } = {};
          
          for (const [catId, tipTexts] of Object.entries(defaults.defaults)) {
            if (catId === 'default') continue;
            grouped[catId] = [];
            (tipTexts as string[]).forEach((text, idx) => {
              const tip: SafetyTip = {
                id: `default-${catId}-${idx}`,
                category_id: catId,
                tip_text: text,
                order: idx,
                is_active: true,
                created_at: '',
                updated_at: '',
                is_default: true,
              };
              allTips.push(tip);
              grouped[catId].push(tip);
            });
          }
          setTips(allTips);
          setGroupedTips(grouped);
        }
      }
    } catch (err) {
      console.error('Error fetching tips:', err);
      setError('Failed to load safety tips');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, selectedCategory]);

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchTips();
    fetchStats();
  }, [fetchTips]);

  const handleSeedTips = async () => {
    try {
      setSeeding(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Safety tips seeded successfully');
        fetchTips();
        fetchStats();
      } else {
        setError(data.detail || 'Failed to seed safety tips');
      }
    } catch (err) {
      setError('Failed to seed safety tips');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateTip = async () => {
    if (!formData.category_id || !formData.tip_text) {
      setError('Category and tip text are required');
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Safety tip created successfully');
        setDialogOpen(false);
        resetForm();
        fetchTips();
        fetchStats();
      } else {
        setError(data.detail || 'Failed to create safety tip');
      }
    } catch (err) {
      setError('Failed to create safety tip');
    }
  };

  const handleUpdateTip = async () => {
    if (!editingTip) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips/${editingTip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tip_text: formData.tip_text,
          order: formData.order,
          is_active: formData.is_active,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Safety tip updated successfully');
        setDialogOpen(false);
        setEditingTip(null);
        resetForm();
        fetchTips();
      } else {
        setError(data.detail || 'Failed to update safety tip');
      }
    } catch (err) {
      setError('Failed to update safety tip');
    }
  };

  const handleDeleteTip = async (tipId: string) => {
    if (!confirm('Are you sure you want to delete this safety tip?')) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips/${tipId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        setSuccess('Safety tip deleted successfully');
        fetchTips();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to delete safety tip');
      }
    } catch (err) {
      setError('Failed to delete safety tip');
    }
  };

  const handleToggleActive = async (tip: SafetyTip) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/safety-tips/${tip.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_active: !tip.is_active }),
      });
      if (response.ok) {
        fetchTips();
      }
    } catch (err) {
      setError('Failed to toggle safety tip');
    }
  };

  const openEditDialog = (tip: SafetyTip) => {
    if (tip.is_default) {
      setError('Cannot edit default tips. Seed tips to database first to customize.');
      return;
    }
    setEditingTip(tip);
    setFormData({
      category_id: tip.category_id,
      tip_text: tip.tip_text,
      order: tip.order,
      is_active: tip.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category_id: selectedCategory || '',
      tip_text: '',
      order: 0,
      is_active: true,
    });
    setEditingTip(null);
  };

  const getCategoryName = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId)?.name || categoryId;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Safety Tips Management
          </Typography>
          <Typography color="text.secondary">
            Manage category-specific safety tips for buyers and sellers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => { fetchTips(); fetchStats(); }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<AutoAwesome />}
            onClick={handleSeedTips}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Default Tips'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { resetForm(); setDialogOpen(true); }}
          >
            Add Tip
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                    <Security />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Total Tips</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Active</Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">{stats.active}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Inactive</Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.inactive}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                    <Category />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Categories</Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {Object.keys(stats.by_category || {}).length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter & View Toggle */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Filter by Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tabs 
              value={viewMode} 
              onChange={(_, v) => setViewMode(v)}
              sx={{ ml: 'auto' }}
            >
              <Tab value="grouped" label="Grouped View" />
              <Tab value="table" label="Table View" />
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'grouped' ? (
        // Grouped View
        <Grid container spacing={3}>
          {(selectedCategory ? [selectedCategory] : CATEGORIES.map(c => c.id)).map(catId => {
            const categoryTips = groupedTips[catId] || [];
            if (categoryTips.length === 0 && selectedCategory) return null;
            
            return (
              <Grid item xs={12} md={6} key={catId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {getCategoryName(catId)}
                      </Typography>
                      <Chip 
                        label={`${categoryTips.length} tips`} 
                        size="small" 
                        color={categoryTips.length > 0 ? 'success' : 'default'}
                      />
                    </Box>
                    
                    {categoryTips.length === 0 ? (
                      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No tips configured. Default tips will be used.
                      </Typography>
                    ) : (
                      <List dense>
                        {categoryTips.map((tip, idx) => (
                          <Box key={tip.id}>
                            <ListItem sx={{ py: 1 }}>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {idx + 1}.
                                    </Typography>
                                    <Typography variant="body2">
                                      {tip.tip_text}
                                    </Typography>
                                  </Box>
                                }
                                secondary={
                                  tip.is_default ? (
                                    <Chip label="Default" size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                  ) : null
                                }
                              />
                              <ListItemSecondaryAction>
                                {!tip.is_default && (
                                  <>
                                    <IconButton 
                                      size="small" 
                                      onClick={() => openEditDialog(tip)}
                                    >
                                      <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      color="error"
                                      onClick={() => handleDeleteTip(tip.id)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </ListItemSecondaryAction>
                            </ListItem>
                            {idx < categoryTips.length - 1 && <Divider />}
                          </Box>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // Table View
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Tip</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tips.map((tip) => (
                    <TableRow key={tip.id} hover>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {getCategoryName(tip.category_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 400 }}>
                          {tip.tip_text}
                        </Typography>
                      </TableCell>
                      <TableCell>{tip.order + 1}</TableCell>
                      <TableCell>
                        {tip.is_default ? (
                          <Chip label="Default" size="small" variant="outlined" />
                        ) : (
                          <Switch
                            checked={tip.is_active}
                            onChange={() => handleToggleActive(tip)}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tip.is_default ? 'Default' : 'Custom'}
                          size="small"
                          color={tip.is_default ? 'default' : 'primary'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {!tip.is_default && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton onClick={() => openEditDialog(tip)} color="primary">
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton onClick={() => handleDeleteTip(tip.id)} color="error">
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTip ? 'Edit Safety Tip' : 'Add Safety Tip'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  disabled={!!editingTip}
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Safety Tip Text"
                value={formData.tip_text}
                onChange={(e) => setFormData({ ...formData, tip_text: e.target.value })}
                placeholder="Enter the safety tip text..."
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Display Order"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={6}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingTip ? handleUpdateTip : handleCreateTip}
          >
            {editingTip ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
