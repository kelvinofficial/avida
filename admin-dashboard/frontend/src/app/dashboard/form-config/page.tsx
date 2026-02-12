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
  Preview,
  Phone,
  Chat,
  AttachMoney,
  MoneyOff,
  Work,
  ContentCopy,
  Check,
  FileUpload,
  Error as ErrorIcon,
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

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<string>('');
  const [jsonCopied, setJsonCopied] = useState(false);
  
  // Import JSON state
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
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
      
      let url = '/form-config?limit=100';
      if (filterCategory) url += `&category_id=${filterCategory}`;
      if (filterType) url += `&config_type=${filterType}`;
      
      const response = await api.get(url);
      setConfigs(response.configs || []);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/form-config/stats');
      setStats(response);
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
      const response = await api.post('/form-config/seed');
      alert(`${response.message}`);
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
      const configData = buildConfigData();

      if (editingConfig) {
        await api.put(`/form-config/${editingConfig.id}`, {
          config_data: configData,
          is_active: formData.is_active,
          priority: formData.priority,
        });
      } else {
        await api.post('/form-config', {
          category_id: formData.category_id,
          subcategory_id: formData.subcategory_id || null,
          config_type: formData.config_type,
          config_data: configData,
          is_active: formData.is_active,
          priority: formData.priority,
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
      await api.delete(`/form-config/${configId}`);
      fetchConfigs();
      fetchStats();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleToggleActive = async (config: FormConfig) => {
    try {
      await api.put(`/form-config/${config.id}`, {
        is_active: !config.is_active,
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

  // Get preview data for a specific category
  const getPreviewData = useCallback((categoryId: string) => {
    const categoryConfigs = configs.filter(c => 
      (c.category_id === categoryId || c.category_id === 'default' || c.category_id === 'global') && 
      c.is_active
    );
    
    // Find placeholder config (category-specific or default)
    const placeholderConfig = categoryConfigs.find(c => c.config_type === 'placeholder' && c.category_id === categoryId) ||
                              categoryConfigs.find(c => c.config_type === 'placeholder' && c.category_id === 'default');
    
    // Find seller type config
    const sellerTypeConfig = categoryConfigs.find(c => c.config_type === 'seller_type' && c.category_id === categoryId) ||
                             categoryConfigs.find(c => c.config_type === 'seller_type' && c.category_id === 'default');
    
    // Find preference config
    const preferenceConfig = categoryConfigs.find(c => c.config_type === 'preference' && c.category_id === categoryId);
    
    // Find visibility rules (usually global)
    const visibilityConfig = categoryConfigs.find(c => c.config_type === 'visibility_rule');
    
    // Determine visibility rules for this category
    const visibilityData = visibilityConfig?.config_data || {};
    const hidePrice = (visibilityData.hide_price_categories || []).includes(categoryId);
    const chatOnly = (visibilityData.chat_only_categories || []).includes(categoryId);
    const hideCondition = (visibilityData.hide_condition_categories || []).includes(categoryId);
    
    return {
      placeholder: placeholderConfig?.config_data || {
        title: 'What are you selling?',
        titleLabel: 'Title',
        description: 'Include details like condition, features...',
        descriptionLabel: 'Description',
      },
      sellerType: sellerTypeConfig?.config_data || {
        label: 'Listed by',
        options: ['Individual', 'Owner', 'Company'],
      },
      preferences: preferenceConfig?.config_data || {
        acceptsOffers: true,
        acceptsExchanges: true,
        negotiable: true,
      },
      visibility: {
        hidePrice,
        chatOnly,
        hideCondition,
      },
    };
  }, [configs]);

  // Copy configuration to clipboard as JSON
  const copyConfigToClipboard = useCallback(async (categoryId: string) => {
    const preview = getPreviewData(categoryId);
    const categoryConfigs = configs.filter(c => 
      (c.category_id === categoryId || c.category_id === 'default' || c.category_id === 'global') && 
      c.is_active
    );
    
    const exportData = {
      category_id: categoryId,
      category_name: getCategoryName(categoryId),
      exported_at: new Date().toISOString(),
      configuration: {
        placeholders: preview.placeholder,
        seller_type: preview.sellerType,
        preferences: preview.preferences,
        visibility_rules: preview.visibility,
      },
      raw_configs: categoryConfigs.map(c => ({
        id: c._id,
        category_id: c.category_id,
        config_type: c.config_type,
        config_data: c.config_data,
        is_active: c.is_active,
        priority: c.priority,
      })),
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [configs, getPreviewData]);

  // Import configuration from JSON file
  const handleImportJson = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const importedData = JSON.parse(text);

      // Validate the imported JSON structure
      if (!importedData.category_id) {
        throw new Error('Invalid JSON: missing category_id');
      }

      if (!importedData.configuration) {
        throw new Error('Invalid JSON: missing configuration object');
      }

      const { category_id, configuration } = importedData;
      const { placeholders, seller_type, preferences, visibility_rules } = configuration;

      // Validate category exists
      const validCategory = CATEGORIES.find(c => c.id === category_id);
      if (!validCategory) {
        throw new Error(`Invalid category_id: ${category_id}`);
      }

      // Track created/updated configs
      let created = 0;
      let updated = 0;

      // Import placeholders
      if (placeholders && (placeholders.title || placeholders.description)) {
        const existingPlaceholder = configs.find(
          c => c.config_type === 'placeholder' && c.category_id === category_id && c.is_active
        );

        const placeholderData = {
          title: placeholders.title || '',
          titleLabel: placeholders.titleLabel || '',
          description: placeholders.description || '',
          descriptionLabel: placeholders.descriptionLabel || '',
        };

        if (existingPlaceholder) {
          await api.put(`/form-config/${existingPlaceholder.id}`, {
            config_data: placeholderData,
            is_active: true,
          });
          updated++;
        } else {
          await api.post('/form-config', {
            category_id,
            config_type: 'placeholder',
            config_data: placeholderData,
            is_active: true,
            priority: 0,
          });
          created++;
        }
      }

      // Import seller type
      if (seller_type && (seller_type.label || seller_type.options)) {
        const existingSellerType = configs.find(
          c => c.config_type === 'seller_type' && c.category_id === category_id && c.is_active
        );

        const sellerTypeData = {
          label: seller_type.label || 'Listed by',
          options: seller_type.options || ['Individual'],
        };

        if (existingSellerType) {
          await api.put(`/form-config/${existingSellerType.id}`, {
            config_data: sellerTypeData,
            is_active: true,
          });
          updated++;
        } else {
          await api.post('/form-config', {
            category_id,
            config_type: 'seller_type',
            config_data: sellerTypeData,
            is_active: true,
            priority: 0,
          });
          created++;
        }
      }

      // Import preferences
      if (preferences && typeof preferences === 'object') {
        const existingPreference = configs.find(
          c => c.config_type === 'preference' && c.category_id === category_id && c.is_active
        );

        const preferenceData = {
          acceptsOffers: preferences.acceptsOffers ?? true,
          acceptsExchanges: preferences.acceptsExchanges ?? true,
          negotiable: preferences.negotiable ?? true,
        };

        if (existingPreference) {
          await api.put(`/form-config/${existingPreference.id}`, {
            config_data: preferenceData,
            is_active: true,
          });
          updated++;
        } else {
          await api.post('/form-config', {
            category_id,
            config_type: 'preference',
            config_data: preferenceData,
            is_active: true,
            priority: 0,
          });
          created++;
        }
      }

      // Import visibility rules (these are typically global)
      if (visibility_rules && typeof visibility_rules === 'object') {
        const existingVisibility = configs.find(
          c => c.config_type === 'visibility_rule' && c.category_id === 'global' && c.is_active
        );

        // Merge with existing visibility rules if they exist
        const existingData = existingVisibility?.config_data || {};
        
        const visibilityData = {
          hide_price_categories: visibility_rules.hidePrice 
            ? [...new Set([...(existingData.hide_price_categories || []), category_id])]
            : (existingData.hide_price_categories || []).filter((c: string) => c !== category_id),
          chat_only_categories: visibility_rules.chatOnly
            ? [...new Set([...(existingData.chat_only_categories || []), category_id])]
            : (existingData.chat_only_categories || []).filter((c: string) => c !== category_id),
          hide_condition_categories: visibility_rules.hideCondition
            ? [...new Set([...(existingData.hide_condition_categories || []), category_id])]
            : (existingData.hide_condition_categories || []).filter((c: string) => c !== category_id),
          show_salary_subcategories: existingData.show_salary_subcategories || [],
          hide_condition_subcategories: existingData.hide_condition_subcategories || [],
        };

        if (existingVisibility) {
          await api.put(`/form-config/${existingVisibility.id}`, {
            config_data: visibilityData,
            is_active: true,
          });
          updated++;
        } else {
          await api.post('/form-config', {
            category_id: 'global',
            config_type: 'visibility_rule',
            config_data: visibilityData,
            is_active: true,
            priority: 0,
          });
          created++;
        }
      }

      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      
      // Refresh configs
      await fetchConfigs();
      await fetchStats();

      // Show success message
      alert(`Import successful! Created: ${created}, Updated: ${updated} configurations for ${validCategory.name}`);

    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Failed to import JSON');
    } finally {
      setImportLoading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [configs, fetchConfigs, fetchStats]);

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
            color="info"
            startIcon={<Preview />}
            onClick={() => {
              setPreviewCategory(filterCategory || 'default');
              setPreviewOpen(true);
            }}
          >
            Preview Mode
          </Button>
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

      {/* Preview Mode Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
          <Preview />
          <Box>
            <Typography variant="h6">Form Preview Mode</Typography>
            <Typography variant="caption">See how your configurations appear in the listing form</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Category to Preview</InputLabel>
              <Select
                value={previewCategory}
                onChange={(e) => setPreviewCategory(e.target.value)}
                label="Select Category to Preview"
              >
                {CATEGORIES.filter(c => c.id !== 'global').map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {previewCategory && (() => {
            const preview = getPreviewData(previewCategory);
            return (
              <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2 }}>
                {/* Simulated Form Header */}
                <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" gutterBottom>
                    Create Listing: {getCategoryName(previewCategory)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This is how the listing form will appear for this category
                  </Typography>
                </Box>

                {/* Title Field */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    {preview.placeholder.titleLabel || 'Title'} <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder={preview.placeholder.title || 'What are you selling?'}
                    disabled
                    sx={{ bgcolor: 'white' }}
                    size="small"
                  />
                </Box>

                {/* Description Field */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    {preview.placeholder.descriptionLabel || 'Description'} <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder={preview.placeholder.description || 'Include details...'}
                    disabled
                    multiline
                    rows={3}
                    sx={{ bgcolor: 'white' }}
                    size="small"
                  />
                </Box>

                {/* Condition Field - shown/hidden based on visibility */}
                {!preview.visibility.hideCondition && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Condition
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['New', 'Like New', 'Good', 'Fair'].map(c => (
                        <Chip key={c} label={c} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Visibility Rules Indicators */}
                {preview.visibility.hideCondition && (
                  <Alert severity="info" sx={{ mb: 2 }} icon={<VisibilityOff fontSize="small" />}>
                    <strong>Condition field is hidden</strong> for this category
                  </Alert>
                )}

                {/* Price Section - shown/hidden based on visibility */}
                {!preview.visibility.hidePrice ? (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                      Price <span style={{ color: 'red' }}>*</span>
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="0.00"
                      disabled
                      sx={{ bgcolor: 'white' }}
                      size="small"
                      InputProps={{
                        startAdornment: <AttachMoney fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
                      }}
                    />
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }} icon={<MoneyOff fontSize="small" />}>
                    <strong>Price field is hidden</strong> for this category
                  </Alert>
                )}

                {/* Seller Type / Listed By */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    {preview.sellerType.label || 'Listed by'}
                  </Typography>
                  <FormControl fullWidth size="small" disabled>
                    <Select
                      value=""
                      displayEmpty
                      sx={{ bgcolor: 'white' }}
                    >
                      <MenuItem value="" disabled>
                        <em>Select option...</em>
                      </MenuItem>
                      {(preview.sellerType.options || ['Individual']).map((opt: string) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Options: {(preview.sellerType.options || ['Individual']).join(', ')}
                  </Typography>
                </Box>

                {/* Contact Methods */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Contact Methods
                  </Typography>
                  {preview.visibility.chatOnly ? (
                    <Alert severity="info" sx={{ mb: 1 }} icon={<Chat fontSize="small" />}>
                      <strong>Chat only</strong> - Phone and WhatsApp options are disabled for this category
                    </Alert>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip icon={<Chat fontSize="small" />} label="In-App Chat" color="primary" variant="outlined" size="small" />
                      <Chip icon={<Phone fontSize="small" />} label="Phone Call" variant="outlined" size="small" />
                      <Chip label="WhatsApp" variant="outlined" size="small" />
                    </Box>
                  )}
                </Box>

                {/* Preferences Section */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                    Preferences
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={<Switch checked={preview.preferences.acceptsOffers !== false} disabled size="small" />}
                      label="Accept Offers"
                    />
                    <FormControlLabel
                      control={<Switch checked={preview.preferences.acceptsExchanges !== false} disabled size="small" />}
                      label="Accept Exchanges"
                    />
                    <FormControlLabel
                      control={<Switch checked={preview.preferences.negotiable !== false} disabled size="small" />}
                      label="Price Negotiable"
                    />
                  </Box>
                </Box>

                {/* Configuration Summary */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
                    Active Configuration Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Placeholder Config</Typography>
                      <Typography variant="body2">
                        {configs.find(c => c.config_type === 'placeholder' && c.category_id === previewCategory && c.is_active) 
                          ? '✅ Category-specific' 
                          : configs.find(c => c.config_type === 'placeholder' && c.category_id === 'default' && c.is_active)
                            ? '⚪ Using default'
                            : '❌ Not configured'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Seller Type Config</Typography>
                      <Typography variant="body2">
                        {configs.find(c => c.config_type === 'seller_type' && c.category_id === previewCategory && c.is_active) 
                          ? '✅ Category-specific' 
                          : configs.find(c => c.config_type === 'seller_type' && c.category_id === 'default' && c.is_active)
                            ? '⚪ Using default'
                            : '❌ Not configured'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Preferences Config</Typography>
                      <Typography variant="body2">
                        {configs.find(c => c.config_type === 'preference' && c.category_id === previewCategory && c.is_active) 
                          ? '✅ Category-specific' 
                          : '⚪ Using defaults'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Visibility Rules</Typography>
                      <Typography variant="body2">
                        {preview.visibility.hidePrice || preview.visibility.chatOnly || preview.visibility.hideCondition
                          ? '✅ Rules applied'
                          : '⚪ Standard visibility'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button 
              variant="outlined"
              color={jsonCopied ? 'success' : 'primary'}
              startIcon={jsonCopied ? <Check /> : <ContentCopy />}
              onClick={() => copyConfigToClipboard(previewCategory)}
              disabled={!previewCategory}
            >
              {jsonCopied ? 'Copied!' : 'Copy as JSON'}
            </Button>
            <Button
              variant="outlined"
              color={importSuccess ? 'success' : importError ? 'error' : 'secondary'}
              startIcon={importLoading ? <CircularProgress size={18} /> : importSuccess ? <Check /> : importError ? <ErrorIcon /> : <FileUpload />}
              component="label"
              disabled={importLoading}
            >
              {importLoading ? 'Importing...' : importSuccess ? 'Imported!' : importError ? 'Error' : 'Import from JSON'}
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleImportJson}
              />
            </Button>
          </Box>
          {importError && (
            <Typography variant="caption" color="error" sx={{ position: 'absolute', bottom: 60, left: 24 }}>
              {importError}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setPreviewOpen(false);
                setFilterCategory(previewCategory);
              }}
            >
              Filter Configs for This Category
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
