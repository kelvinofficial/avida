'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Settings,
  TextFields,
  Person,
  Tune,
  Visibility,
  VisibilityOff,
  Save,
  PlaylistAdd,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface FormConfig {
  id: string;
  category_id: string;
  subcategory_id?: string;
  config_type: string;
  config_data: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

interface ConfigStats {
  total: number;
  active: number;
  inactive: number;
  by_type: Record<string, number>;
  categories_configured: number;
  categories: string[];
}

// All available categories
const CATEGORIES = [
  { id: 'default', name: 'Default (Fallback)' },
  { id: 'global', name: 'Global Rules' },
  { id: 'auto_vehicles', name: 'Auto & Vehicles' },
  { id: 'properties', name: 'Properties' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'phones_tablets', name: 'Phones & Tablets' },
  { id: 'home_furniture', name: 'Home, Furniture & Appliances' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty' },
  { id: 'jobs_services', name: 'Jobs & Services' },
  { id: 'pets', name: 'Pets' },
  { id: 'sports_hobbies', name: 'Sports & Hobbies' },
  { id: 'kids_baby', name: 'Kids & Baby' },
  { id: 'health_medical', name: 'Health & Medical' },
  { id: 'agriculture', name: 'Agriculture' },
  { id: 'friendship_dating', name: 'Friendship & Dating' },
  { id: 'community', name: 'Community' },
];

const CONFIG_TYPES = [
  { value: 'placeholder', label: 'Placeholders', icon: <TextFields />, description: 'Title and description placeholders' },
  { value: 'seller_type', label: 'Listed By Options', icon: <Person />, description: 'Seller type label and options' },
  { value: 'preference', label: 'Preferences', icon: <Tune />, description: 'Category-specific preferences' },
  { value: 'visibility_rule', label: 'Visibility Rules', icon: <Visibility />, description: 'Show/hide field rules' },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FormConfigPage() {
  const [configs, setConfigs] = useState<FormConfig[]>([]);
  const [stats, setStats] = useState<ConfigStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FormConfig | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Form state for create/edit dialog
  const [formData, setFormData] = useState({
    category_id: '',
    subcategory_id: '',
    config_type: 'placeholder',
    is_active: true,
    priority: 0,
    // Placeholder fields
    title: '',
    titleLabel: '',
    description: '',
    descriptionLabel: '',
    // Seller type fields
    sellerTypeLabel: 'Listed by',
    sellerTypeOptions: ['Individual', 'Owner', 'Company'],
    // Preference fields
    acceptsOffers: true,
    acceptsExchanges: true,
    negotiable: true,
    // Visibility rule fields
    hidePriceCategories: [] as string[],
    showSalarySubcategories: [] as string[],
    chatOnlyCategories: [] as string[],
    hideConditionCategories: [] as string[],
    hideConditionSubcategories: [] as string[],
  });

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      let url = '/api/admin/form-config?limit=100';
      if (filterCategory) url += `&category_id=${filterCategory}`;
      if (filterType) url += `&config_type=${filterType}`;
      
      const response = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(response.data.configs || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await api.get('/api/admin/form-config/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchStats();
  }, [fetchConfigs, fetchStats]);

  const handleSeedDefaults = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await api.post('/api/admin/form-config/seed', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`${response.data.message}`);
      fetchConfigs();
      fetchStats();
    } catch (error) {
      console.error('Error seeding defaults:', error);
      alert('Failed to seed default configurations');
    }
  };

  const handleOpenDialog = (config?: FormConfig) => {
    if (config) {
      setEditingConfig(config);
      const data = config.config_data || {};
      setFormData({
        category_id: config.category_id,
        subcategory_id: config.subcategory_id || '',
        config_type: config.config_type,
        is_active: config.is_active,
        priority: config.priority,
        // Placeholder
        title: data.title || '',
        titleLabel: data.titleLabel || '',
        description: data.description || '',
        descriptionLabel: data.descriptionLabel || '',
        // Seller type
        sellerTypeLabel: data.label || 'Listed by',
        sellerTypeOptions: data.options || ['Individual'],
        // Preferences
        acceptsOffers: data.acceptsOffers ?? true,
        acceptsExchanges: data.acceptsExchanges ?? true,
        negotiable: data.negotiable ?? true,
        // Visibility rules
        hidePriceCategories: data.hide_price_categories || [],
        showSalarySubcategories: data.show_salary_subcategories || [],
        chatOnlyCategories: data.chat_only_categories || [],
        hideConditionCategories: data.hide_condition_categories || [],
        hideConditionSubcategories: data.hide_condition_subcategories || [],
      });
    } else {
      setEditingConfig(null);
      setFormData({
        category_id: '',
        subcategory_id: '',
        config_type: 'placeholder',
        is_active: true,
        priority: 0,
        title: '',
        titleLabel: '',
        description: '',
        descriptionLabel: '',
        sellerTypeLabel: 'Listed by',
        sellerTypeOptions: ['Individual', 'Owner', 'Company'],
        acceptsOffers: true,
        acceptsExchanges: true,
        negotiable: true,
        hidePriceCategories: [],
        showSalarySubcategories: [],
        chatOnlyCategories: [],
        hideConditionCategories: [],
        hideConditionSubcategories: [],
      });
    }
    setDialogOpen(true);
  };

  const buildConfigData = () => {
    switch (formData.config_type) {
      case 'placeholder':
        return {
          title: formData.title,
          titleLabel: formData.titleLabel,
          description: formData.description,
          descriptionLabel: formData.descriptionLabel,
        };
      case 'seller_type':
        return {
          label: formData.sellerTypeLabel,
          options: formData.sellerTypeOptions,
        };
      case 'preference':
        return {
          acceptsOffers: formData.acceptsOffers,
          acceptsExchanges: formData.acceptsExchanges,
          negotiable: formData.negotiable,
        };
      case 'visibility_rule':
        return {
          hide_price_categories: formData.hidePriceCategories,
          show_salary_subcategories: formData.showSalarySubcategories,
          chat_only_categories: formData.chatOnlyCategories,
          hide_condition_categories: formData.hideConditionCategories,
          hide_condition_subcategories: formData.hideConditionSubcategories,
        };
      default:
        return {};
    }
  };

  const handleSaveConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const configData = buildConfigData();

      if (editingConfig) {
        await api.put(`/api/admin/form-config/${editingConfig.id}`, {
          config_data: configData,
          is_active: formData.is_active,
          priority: formData.priority,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/api/admin/form-config', {
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id || null,
          config_type: formData.config_type,
          config_data: configData,
          is_active: formData.is_active,
          priority: formData.priority,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setDialogOpen(false);
      fetchConfigs();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving config:', error);
      alert(error.response?.data?.detail || 'Failed to save configuration');
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      await api.delete(`/api/admin/form-config/${configId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConfigs();
      fetchStats();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleToggleActive = async (config: FormConfig) => {
    try {
      const token = localStorage.getItem('admin_token');
      await api.put(`/api/admin/form-config/${config.id}`, {
        is_active: !config.is_active,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConfigs();
      fetchStats();
    } catch (error) {
      console.error('Error toggling config:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getConfigTypeName = (typeValue: string) => {
    const type = CONFIG_TYPES.find(t => t.value === typeValue);
    return type?.label || typeValue;
  };

  const renderConfigPreview = (config: FormConfig) => {
    const data = config.config_data || {};
    switch (config.config_type) {
      case 'placeholder':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              <strong>Title:</strong> {data.title || '(not set)'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Description:</strong> {data.description?.substring(0, 50) || '(not set)'}...
            </Typography>
          </Box>
        );
      case 'seller_type':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              <strong>Label:</strong> {data.label || 'Listed by'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Options:</strong> {(data.options || []).join(', ')}
            </Typography>
          </Box>
        );
      case 'preference':
        return (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {data.acceptsOffers === false && <Chip size="small" label="No Offers" color="warning" />}
            {data.acceptsExchanges === false && <Chip size="small" label="No Exchanges" color="warning" />}
            {data.negotiable === false && <Chip size="small" label="Non-negotiable" color="warning" />}
            {data.acceptsOffers !== false && data.acceptsExchanges !== false && data.negotiable !== false && 
              <Typography variant="body2" color="text.secondary">All preferences enabled</Typography>
            }
          </Box>
        );
      case 'visibility_rule':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {(data.hide_price_categories?.length || 0) + (data.chat_only_categories?.length || 0) + 
               (data.hide_condition_categories?.length || 0)} rules configured
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderFormFields = () => {
    switch (formData.config_type) {
      case 'placeholder':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title Placeholder"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              placeholder="e.g., What are you selling?"
              helperText="Placeholder text shown in the title field"
            />
            <TextField
              label="Title Label"
              value={formData.titleLabel}
              onChange={(e) => setFormData({ ...formData, titleLabel: e.target.value })}
              fullWidth
              placeholder="e.g., Title, Vehicle Title, Post Title"
              helperText="Label shown above the title field"
            />
            <TextField
              label="Description Placeholder"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Include details like condition, features..."
              helperText="Placeholder text shown in the description field"
            />
            <TextField
              label="Description Label"
              value={formData.descriptionLabel}
              onChange={(e) => setFormData({ ...formData, descriptionLabel: e.target.value })}
              fullWidth
              placeholder="e.g., Description, Vehicle Description, About You"
              helperText="Label shown above the description field"
            />
          </Box>
        );
      case 'seller_type':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Field Label"
              value={formData.sellerTypeLabel}
              onChange={(e) => setFormData({ ...formData, sellerTypeLabel: e.target.value })}
              fullWidth
              placeholder="e.g., Listed by, Posted by"
              helperText="Label shown above the seller type dropdown"
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>Options (one per line)</Typography>
              <TextField
                value={formData.sellerTypeOptions.join('\n')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  sellerTypeOptions: e.target.value.split('\n').filter(s => s.trim()) 
                })}
                fullWidth
                multiline
                rows={4}
                placeholder="Individual&#10;Owner&#10;Company&#10;Dealer"
                helperText="Each line becomes a dropdown option"
              />
            </Box>
          </Box>
        );
      case 'preference':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              These settings control which features are available for listings in this category.
            </Alert>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.acceptsOffers}
                  onChange={(e) => setFormData({ ...formData, acceptsOffers: e.target.checked })}
                />
              }
              label="Allow Offers"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.acceptsExchanges}
                  onChange={(e) => setFormData({ ...formData, acceptsExchanges: e.target.checked })}
                />
              }
              label="Allow Exchanges"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.negotiable}
                  onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                />
              }
              label="Price Negotiable"
            />
          </Box>
        );
      case 'visibility_rule':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Global visibility rules apply to the listing form. Use category IDs separated by commas.
            </Alert>
            <TextField
              label="Hide Price for Categories"
              value={formData.hidePriceCategories.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                hidePriceCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              fullWidth
              placeholder="e.g., friendship_dating"
              helperText="Categories where price field should be hidden"
            />
            <TextField
              label="Show Salary Range for Subcategories"
              value={formData.showSalarySubcategories.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                showSalarySubcategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              fullWidth
              placeholder="e.g., job_listings"
              helperText="Subcategories that show salary range instead of price"
            />
            <TextField
              label="Chat Only Categories"
              value={formData.chatOnlyCategories.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                chatOnlyCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              fullWidth
              placeholder="e.g., friendship_dating"
              helperText="Categories limited to chat-only contact method"
            />
            <TextField
              label="Hide Condition for Categories"
              value={formData.hideConditionCategories.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                hideConditionCategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              fullWidth
              placeholder="e.g., friendship_dating, community, jobs_services"
              helperText="Categories where condition selector is hidden"
            />
            <TextField
              label="Hide Condition for Subcategories"
              value={formData.hideConditionSubcategories.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                hideConditionSubcategories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              fullWidth
              placeholder="e.g., job_listings, services_offered"
              helperText="Subcategories where condition selector is hidden"
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Form Configuration</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage category-specific form fields, placeholders, and visibility rules
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => { fetchConfigs(); fetchStats(); }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<PlaylistAdd />}
            onClick={handleSeedDefaults}
          >
            Seed Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Configuration
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Configs</Typography>
              <Typography variant="h4">{stats?.total || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Active</Typography>
              <Typography variant="h4" color="success.main">{stats?.active || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Categories Configured</Typography>
              <Typography variant="h4">{stats?.categories_configured || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Config Types</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {CONFIG_TYPES.map(type => (
                  <Chip 
                    key={type.value} 
                    size="small" 
                    label={`${type.label}: ${stats?.by_type?.[type.value] || 0}`}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different config types */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            setFilterType(newValue === 0 ? '' : CONFIG_TYPES[newValue - 1]?.value || '');
          }}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="All Configurations" />
          {CONFIG_TYPES.map(type => (
            <Tab key={type.value} icon={type.icon} label={type.label} iconPosition="start" />
          ))}
        </Tabs>

        {/* Filters */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'grey.50' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              label="Filter by Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {CATEGORIES.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {filterCategory && (
            <Button size="small" onClick={() => setFilterCategory('')}>Clear Filter</Button>
          )}
        </Box>

        {/* Config List */}
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : configs.length === 0 ? (
            <Alert severity="info">
              No configurations found. Click "Seed Defaults" to add standard configurations.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Preview</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {getCategoryName(config.category_id)}
                        </Typography>
                        {config.subcategory_id && (
                          <Typography variant="caption" color="text.secondary">
                            Subcategory: {config.subcategory_id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={getConfigTypeName(config.config_type)}
                          color={
                            config.config_type === 'placeholder' ? 'primary' :
                            config.config_type === 'seller_type' ? 'secondary' :
                            config.config_type === 'preference' ? 'info' : 'warning'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        {renderConfigPreview(config)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={config.is_active ? 'Active' : 'Inactive'}
                          color={config.is_active ? 'success' : 'default'}
                          onClick={() => handleToggleActive(config)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>{config.priority}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenDialog(config)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteConfig(config.id)}
                          >
                            <Delete fontSize="small" />
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
          {editingConfig ? 'Edit Configuration' : 'Add Configuration'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            {/* Basic Settings */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!!editingConfig}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    label="Category"
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Subcategory ID (optional)"
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                  fullWidth
                  disabled={!!editingConfig}
                  placeholder="e.g., cars, job_listings"
                  helperText="Leave empty for category-level config"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!!editingConfig}>
                  <InputLabel>Configuration Type</InputLabel>
                  <Select
                    value={formData.config_type}
                    onChange={(e) => setFormData({ ...formData, config_type: e.target.value })}
                    label="Configuration Type"
                  >
                    {CONFIG_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          <Box>
                            <Typography variant="body2">{type.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  fullWidth
                  helperText="Higher = more priority"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* Type-specific fields */}
            <Box>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Configuration Details
              </Typography>
              {renderFormFields()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveConfig}
            startIcon={<Save />}
            disabled={!formData.category_id}
          >
            {editingConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
