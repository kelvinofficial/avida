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
  InputAdornment,
  Tabs,
  Tab,
  Grid,
  Avatar,
} from '@mui/material';
import {
  Refresh,
  Add,
  Edit,
  Delete,
  Search,
  InterestsOutlined,
  AutoAwesome,
  Category,
  FilterList,
} from '@mui/icons-material';

interface AttributeIcon {
  id: string;
  name: string;
  ionicon_name: string;
  category_id?: string;
  subcategory_id?: string;
  attribute_name?: string;
  icon_type: string;
  color?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface IconStats {
  total: number;
  active: number;
  inactive: number;
  by_type: {
    category: number;
    subcategory: number;
    attribute: number;
  };
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

const ICON_TYPES = [
  { id: 'category', name: 'Category' },
  { id: 'subcategory', name: 'Subcategory' },
  { id: 'attribute', name: 'Attribute' },
];

const ICON_COLORS = [
  { value: '#2E7D32', label: 'Green' },
  { value: '#1976D2', label: 'Blue' },
  { value: '#9333EA', label: 'Purple' },
  { value: '#E53935', label: 'Red' },
  { value: '#F57C00', label: 'Orange' },
  { value: '#00897B', label: 'Teal' },
  { value: '#5D4037', label: 'Brown' },
  { value: '#455A64', label: 'Blue Grey' },
];

// Common Ionicons list (subset for quick selection)
const COMMON_IONICONS = [
  'car-outline', 'car-sport-outline', 'home-outline', 'business-outline',
  'laptop-outline', 'phone-portrait-outline', 'shirt-outline', 'briefcase-outline',
  'paw-outline', 'calendar-outline', 'speedometer-outline', 'water-outline',
  'settings-outline', 'location-outline', 'person-outline', 'star-outline',
  'checkmark-circle-outline', 'pricetag-outline', 'cash-outline', 'document-outline',
  'bed-outline', 'key-outline', 'cube-outline', 'layers-outline',
  'resize-outline', 'color-palette-outline', 'flash-outline', 'time-outline',
  'construct-outline', 'hammer-outline', 'build-outline', 'cog-outline',
  'ribbon-outline', 'flag-outline', 'shield-checkmark-outline', 'information-circle-outline',
];

export default function IconsManagementPage() {
  const [icons, setIcons] = useState<AttributeIcon[]>([]);
  const [availableIonicons, setAvailableIonicons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IconStats | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<AttributeIcon | null>(null);
  const [seeding, setSeeding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ionicon_name: 'help-circle-outline',
    category_id: '',
    subcategory_id: '',
    attribute_name: '',
    icon_type: 'attribute',
    color: '#2E7D32',
    description: '',
  });

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  
  const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

  const fetchIcons = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory) params.append('category_id', filterCategory);
      if (filterType) params.append('icon_type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${API_BASE}/attribute-icons/public?${params}`);
      const data = await response.json();
      setIcons(data.icons || []);
    } catch (err) {
      console.error('Error fetching icons:', err);
      setError('Failed to load icons');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, filterCategory, filterType, searchQuery]);

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/attribute-icons/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Calculate stats from icons list as fallback
        console.log('Stats endpoint returned error, using local calculation');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Calculate stats from icons as fallback when stats API fails
  const calculateLocalStats = useCallback(() => {
    if (icons.length > 0 && !stats) {
      const localStats: IconStats = {
        total: icons.length,
        active: icons.filter(i => i.is_active).length,
        inactive: icons.filter(i => !i.is_active).length,
        by_type: {
          category: icons.filter(i => i.icon_type === 'category').length,
          subcategory: icons.filter(i => i.icon_type === 'subcategory').length,
          attribute: icons.filter(i => i.icon_type === 'attribute').length,
        }
      };
      setStats(localStats);
    }
  }, [icons, stats]);

  const fetchAvailableIonicons = async () => {
    try {
      const response = await fetch(`${API_BASE}/attribute-icons/ionicons`);
      const data = await response.json();
      setAvailableIonicons(data.icons || COMMON_IONICONS);
    } catch (err) {
      console.error('Error fetching ionicons:', err);
      setAvailableIonicons(COMMON_IONICONS);
    }
  };

  useEffect(() => {
    fetchIcons();
    fetchStats();
    fetchAvailableIonicons();
  }, [fetchIcons]);

  // Calculate local stats if API stats fail
  useEffect(() => {
    calculateLocalStats();
  }, [calculateLocalStats]);

  const handleSeedIcons = async () => {
    try {
      setSeeding(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/attribute-icons/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message || 'Icons seeded successfully');
        fetchIcons();
        fetchStats();
      } else {
        setError(data.detail || 'Failed to seed icons');
      }
    } catch (err) {
      setError('Failed to seed icons');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateIcon = async () => {
    if (!formData.name || !formData.ionicon_name) {
      setError('Name and icon are required');
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/attribute-icons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Icon created successfully');
        setDialogOpen(false);
        resetForm();
        fetchIcons();
        fetchStats();
      } else {
        setError(data.detail || 'Failed to create icon');
      }
    } catch (err) {
      setError('Failed to create icon');
    }
  };

  const handleUpdateIcon = async () => {
    if (!editingIcon) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/attribute-icons/${editingIcon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Icon updated successfully');
        setDialogOpen(false);
        setEditingIcon(null);
        resetForm();
        fetchIcons();
      } else {
        setError(data.detail || 'Failed to update icon');
      }
    } catch (err) {
      setError('Failed to update icon');
    }
  };

  const handleDeleteIcon = async (iconId: string) => {
    if (!confirm('Are you sure you want to delete this icon?')) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const response = await fetch(`${API_BASE}/attribute-icons/${iconId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        setSuccess('Icon deleted successfully');
        fetchIcons();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to delete icon');
      }
    } catch (err) {
      setError('Failed to delete icon');
    }
  };

  const openEditDialog = (icon: AttributeIcon) => {
    setEditingIcon(icon);
    setFormData({
      name: icon.name,
      ionicon_name: icon.ionicon_name,
      category_id: icon.category_id || '',
      subcategory_id: icon.subcategory_id || '',
      attribute_name: icon.attribute_name || '',
      icon_type: icon.icon_type,
      color: icon.color || '#2E7D32',
      description: icon.description || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ionicon_name: 'help-circle-outline',
      category_id: '',
      subcategory_id: '',
      attribute_name: '',
      icon_type: 'attribute',
      color: '#2E7D32',
      description: '',
    });
    setEditingIcon(null);
  };

  const filteredIonicons = availableIonicons.filter(icon => 
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const getTypeColor = (type: string): 'primary' | 'secondary' | 'success' => {
    switch (type) {
      case 'category': return 'primary';
      case 'subcategory': return 'secondary';
      case 'attribute': return 'success';
      default: return 'primary';
    }
  };

  // Render Ionicon using img tag with ionicons CDN
  const renderIonicon = (name: string, color?: string, size: number = 24) => {
    // Use ionicons web component style SVG
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          color: color || '#2E7D32',
          '& ion-icon': {
            fontSize: size,
          },
        }}
      >
        <ion-icon name={name} style={{ color: color || '#2E7D32', fontSize: size }}></ion-icon>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Ionicons Script */}
      <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
      <script noModule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Attribute Icons Management
          </Typography>
          <Typography color="text.secondary">
            Manage icons for categories and listing attributes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => { fetchIcons(); fetchStats(); }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<AutoAwesome />}
            onClick={handleSeedIcons}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Default Icons'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { resetForm(); setDialogOpen(true); }}
          >
            Create Icon
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
                    <InterestsOutlined />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Total Icons</Typography>
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
                    <InterestsOutlined />
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
                  <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                    <Category />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Category Icons</Typography>
                    <Typography variant="h4" fontWeight="bold" color="info.main">{stats.by_type?.category || 0}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.light', width: 48, height: 48 }}>
                    <FilterList />
                  </Avatar>
                  <Box>
                    <Typography color="text.secondary" variant="body2">Attribute Icons</Typography>
                    <Typography variant="h4" fontWeight="bold" color="secondary.main">{stats.by_type?.attribute || 0}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchIcons()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                label="Category"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {ICON_TYPES.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={fetchIcons}>
              Apply Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Icons Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : icons.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Shapes sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No icons found</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Click &quot;Seed Default Icons&quot; to get started with pre-defined icons
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Icon</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Ionicon</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {icons.map((icon) => (
                    <TableRow key={icon.id} hover>
                      <TableCell>
                        <Avatar
                          sx={{
                            bgcolor: icon.color ? `${icon.color}20` : '#E8F5E9',
                            color: icon.color || '#2E7D32',
                            width: 40,
                            height: 40,
                          }}
                        >
                          <ion-icon name={icon.ionicon_name} style={{ fontSize: 24 }}></ion-icon>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{icon.name}</Typography>
                        {icon.attribute_name && (
                          <Typography variant="caption" color="text.secondary">
                            attr: {icon.attribute_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                          {icon.ionicon_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={icon.icon_type}
                          size="small"
                          color={getTypeColor(icon.icon_type)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {icon.category_id ? (
                          <Typography variant="body2">
                            {CATEGORIES.find(c => c.id === icon.category_id)?.name || icon.category_id}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Global</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              bgcolor: icon.color || '#2E7D32',
                            }}
                          />
                          <Typography variant="caption" fontFamily="monospace">
                            {icon.color || '#2E7D32'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={icon.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={icon.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton onClick={() => openEditDialog(icon)} color="primary">
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDeleteIcon(icon.id)} color="error">
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingIcon ? 'Edit Icon' : 'Create Icon'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Car Make, Bedrooms"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Attribute Name"
                value={formData.attribute_name}
                onChange={(e) => setFormData({ ...formData, attribute_name: e.target.value })}
                placeholder="e.g., make, bedrooms"
              />
            </Grid>
            
            {/* Icon Selector */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Icon</Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setIconPickerOpen(true)}
              >
                <Avatar
                  sx={{
                    bgcolor: formData.color ? `${formData.color}20` : '#E8F5E9',
                    color: formData.color || '#2E7D32',
                    width: 56,
                    height: 56,
                  }}
                >
                  <ion-icon name={formData.ionicon_name} style={{ fontSize: 32 }}></ion-icon>
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Ionicon Name"
                    value={formData.ionicon_name}
                    onChange={(e) => setFormData({ ...formData, ionicon_name: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g., car-outline"
                    InputProps={{
                      style: { fontFamily: 'monospace' }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Click anywhere else to open icon picker
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Icon Type</InputLabel>
                <Select
                  value={formData.icon_type}
                  label="Icon Type"
                  onChange={(e) => setFormData({ ...formData, icon_type: e.target.value })}
                >
                  {ICON_TYPES.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <MenuItem value="">Global (All Categories)</MenuItem>
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Color Picker */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Icon Color</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {ICON_COLORS.map((color) => (
                  <Tooltip key={color.value} title={color.label}>
                    <Box
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: color.value,
                        cursor: 'pointer',
                        border: formData.color === color.value ? 3 : 1,
                        borderColor: formData.color === color.value ? 'primary.main' : 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': { opacity: 0.8 },
                      }}
                    >
                      {formData.color === color.value && (
                        <Box component="span" sx={{ color: '#fff', fontWeight: 'bold' }}>✓</Box>
                      )}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
              <TextField
                size="small"
                label="Custom Hex Color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#2E7D32"
                sx={{ width: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 0.5,
                          bgcolor: formData.color || '#2E7D32',
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this icon"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingIcon ? handleUpdateIcon : handleCreateIcon}
          >
            {editingIcon ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={iconPickerOpen} onClose={() => setIconPickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select Icon</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search icons..."
            value={iconSearch}
            onChange={(e) => setIconSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1,
              maxHeight: 400,
              overflowY: 'auto',
            }}
          >
            {filteredIonicons.map((iconName) => (
              <Box
                key={iconName}
                onClick={() => {
                  setFormData({ ...formData, ionicon_name: iconName });
                  setIconPickerOpen(false);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: 1,
                  borderColor: formData.ionicon_name === iconName ? 'primary.main' : 'divider',
                  bgcolor: formData.ionicon_name === iconName ? 'primary.light' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ion-icon 
                  name={iconName} 
                  style={{ 
                    fontSize: 28,
                    color: formData.ionicon_name === iconName ? '#fff' : formData.color || '#2E7D32',
                  }}
                ></ion-icon>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5, 
                    fontSize: 9,
                    textAlign: 'center',
                    wordBreak: 'break-word',
                    color: formData.ionicon_name === iconName ? '#fff' : 'text.secondary',
                  }}
                >
                  {iconName.replace('-outline', '')}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIconPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Declare ion-icon as a valid JSX element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { name: string }, HTMLElement>;
    }
  }
}
