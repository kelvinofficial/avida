'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  Paper,
  Autocomplete,
  Checkbox,
  Menu,
  Avatar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  TextFields,
  Numbers,
  RadioButtonChecked,
  CheckBox as CheckBoxIcon,
  ArrowDropDown,
  Close,
  DragIndicator,
  FilterList,
  Search as SearchIcon,
  Visibility,
  ContentCopy,
  AutoAwesome,
  Link as LinkIcon,
  MoreVert,
  PlaylistAdd,
  CloudUpload,
  Image as ImageIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

interface Attribute {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  options?: string[];
  order: number;
  icon?: string;
  placeholder?: string;
  help_text?: string;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  default_value?: string;
  unit?: string;
  searchable?: boolean;
  filterable?: boolean;
  show_in_list?: boolean;
  category_id: string;
  category_name: string;
  is_inherited?: boolean;
  inherited_from_name?: string;
}

interface AttributeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  attribute_count: number;
  attributes_preview: string[];
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: <TextFields /> },
  { value: 'number', label: 'Number Input', icon: <Numbers /> },
  { value: 'textarea', label: 'Text Area', icon: <TextFields /> },
  { value: 'dropdown', label: 'Dropdown', icon: <ArrowDropDown /> },
  { value: 'radio', label: 'Radio Buttons', icon: <RadioButtonChecked /> },
  { value: 'checkbox', label: 'Checkboxes', icon: <CheckBoxIcon /> },
  { value: 'date', label: 'Date', icon: <TextFields /> },
  { value: 'email', label: 'Email', icon: <TextFields /> },
  { value: 'phone', label: 'Phone', icon: <TextFields /> },
  { value: 'url', label: 'URL', icon: <TextFields /> },
];

const COMMON_ICONS = ['📝', '🔢', '📅', '📧', '📞', '🔗', '🏷️', '📍', '💰', '⚙️', '🎨', '📏', '⏱️', '🚗', '🏠', '👤'];

export default function AttributesPage() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<AttributeTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attrToDelete, setAttrToDelete] = useState<Attribute | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInherited, setShowInherited] = useState(true);
  
  // Bulk operations state
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetCategory, setCopyTargetCategory] = useState('');
  
  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');

  // Icon upload state
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    key: '',
    type: 'text',
    required: false,
    options: [] as string[],
    order: 0,
    icon: '',
    placeholder: '',
    help_text: '',
    min_length: undefined as number | undefined,
    max_length: undefined as number | undefined,
    min_value: undefined as number | undefined,
    max_value: undefined as number | undefined,
    default_value: '',
    unit: '',
    searchable: true,
    filterable: true,
    show_in_list: true,
  });
  const [newOption, setNewOption] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attrsData, catsData, templatesData] = await Promise.all([
        api.getAllAttributes(showInherited),
        api.getCategories(true, true),
        api.getAttributeTemplates(),
      ]);
      setAttributes(attrsData.attributes || []);
      setCategories(catsData || []);
      setTemplates(templatesData.templates || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  }, [showInherited]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bulk operations handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttrs(filteredAttributes.filter(a => !a.is_inherited).map(a => a.id));
    } else {
      setSelectedAttrs([]);
    }
  };

  const handleSelectAttr = (attrId: string, checked: boolean) => {
    if (checked) {
      setSelectedAttrs([...selectedAttrs, attrId]);
    } else {
      setSelectedAttrs(selectedAttrs.filter(id => id !== attrId));
    }
  };

  const handleBulkDelete = async () => {
    if (!categoryFilter) {
      setError('Please filter by a specific category first');
      return;
    }
    setActionLoading(true);
    try {
      await api.bulkAttributeAction(categoryFilter, selectedAttrs, 'delete');
      setSuccess(`Deleted ${selectedAttrs.length} attributes`);
      setSelectedAttrs([]);
      await loadData();
    } catch (err) {
      setError('Failed to delete attributes');
    } finally {
      setActionLoading(false);
      setBulkMenuAnchor(null);
    }
  };

  const handleBulkCopy = async () => {
    if (!categoryFilter || !copyTargetCategory) {
      setError('Please select source and target categories');
      return;
    }
    setActionLoading(true);
    try {
      const result = await api.bulkAttributeAction(categoryFilter, selectedAttrs, 'copy', undefined, copyTargetCategory);
      setSuccess(`Copied ${result.affected} attributes`);
      setSelectedAttrs([]);
      setCopyDialogOpen(false);
      await loadData();
    } catch (err) {
      setError('Failed to copy attributes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!templateCategory || !selectedTemplate) {
      setError('Please select a category and template');
      return;
    }
    setActionLoading(true);
    try {
      const result = await api.applyAttributeTemplate(templateCategory, selectedTemplate, true);
      setSuccess(`Added ${result.added} attributes from template`);
      setTemplateDialogOpen(false);
      setSelectedTemplate('');
      setTemplateCategory('');
      await loadData();
    } catch (err) {
      setError('Failed to apply template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDialog = (attr?: Attribute) => {
    if (attr) {
      setEditingAttr(attr);
      setFormData({
        category_id: attr.category_id,
        name: attr.name,
        key: attr.key,
        type: attr.type,
        required: attr.required,
        options: attr.options || [],
        order: attr.order,
        icon: attr.icon || '',
        placeholder: attr.placeholder || '',
        help_text: attr.help_text || '',
        min_length: attr.min_length,
        max_length: attr.max_length,
        min_value: attr.min_value,
        max_value: attr.max_value,
        default_value: attr.default_value || '',
        unit: attr.unit || '',
        searchable: attr.searchable ?? true,
        filterable: attr.filterable ?? true,
        show_in_list: attr.show_in_list ?? true,
      });
      // Set icon preview if it's a data URL (uploaded image)
      if (attr.icon && attr.icon.startsWith('data:')) {
        setIconPreview(attr.icon);
      } else {
        setIconPreview(null);
      }
    } else {
      setEditingAttr(null);
      setFormData({
        category_id: categoryFilter || '',
        name: '',
        key: '',
        type: 'text',
        required: false,
        options: [],
        order: attributes.length,
        icon: '',
        placeholder: '',
        help_text: '',
        min_length: undefined,
        max_length: undefined,
        min_value: undefined,
        max_value: undefined,
        default_value: '',
        unit: '',
        searchable: true,
        filterable: true,
        show_in_list: true,
      });
      setIconPreview(null);
    }
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    setFormData({ ...formData, name, key: editingAttr ? formData.key : key });
  };

  const handleAddOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!formData.category_id || !formData.name || !formData.key) {
      setError('Please fill in all required fields');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      if (editingAttr) {
        await api.updateAttribute(editingAttr.category_id, editingAttr.id, formData);
        setSuccess('Attribute updated successfully');
      } else {
        await api.addAttribute(formData.category_id, formData);
        setSuccess('Attribute created successfully');
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save attribute';
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Attribute Icon upload handlers
  const handleAttrIconFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPG, or SVG.');
      return;
    }

    // Validate file size (200KB max for attributes)
    if (file.size > 200 * 1024) {
      setError('File too large. Maximum size is 200KB.');
      return;
    }

    // If editing existing attribute, upload immediately
    if (editingAttr) {
      setUploadingIcon(true);
      try {
        await api.uploadAttributeIcon(editingAttr.category_id, editingAttr.id, file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setIconPreview(e.target?.result as string);
          setFormData(prev => ({ ...prev, icon: '' })); // Clear emoji icon
        };
        reader.readAsDataURL(file);
        await loadData();
        setSuccess('Icon uploaded successfully');
      } catch (err) {
        setError('Failed to upload icon');
      } finally {
        setUploadingIcon(false);
      }
    } else {
      // For new attributes, just show preview (will need to save attribute first)
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
        setFormData(prev => ({ ...prev, icon: '' }));
      };
      reader.readAsDataURL(file);
      setError('Please save the attribute first, then edit it to upload an icon.');
    }

    // Reset file input
    if (iconInputRef.current) {
      iconInputRef.current.value = '';
    }
  };

  const handleRemoveAttrIcon = async () => {
    if (editingAttr) {
      setUploadingIcon(true);
      try {
        await api.deleteAttributeIcon(editingAttr.category_id, editingAttr.id);
        setIconPreview(null);
        setFormData(prev => ({ ...prev, icon: '' }));
        await loadData();
        setSuccess('Icon removed successfully');
      } catch (err) {
        setError('Failed to remove icon');
      } finally {
        setUploadingIcon(false);
      }
    } else {
      setIconPreview(null);
    }
  };

  const handleDelete = async () => {
    if (!attrToDelete) return;
    setActionLoading(true);
    try {
      await api.deleteAttribute(attrToDelete.category_id, attrToDelete.id);
      setSuccess('Attribute deleted successfully');
      setDeleteDialogOpen(false);
      setAttrToDelete(null);
      await loadData();
    } catch (err) {
      setError('Failed to delete attribute');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAttributes = attributes.filter(attr => {
    if (categoryFilter && attr.category_id !== categoryFilter) return false;
    if (typeFilter && attr.type !== typeFilter) return false;
    if (!showInherited && attr.is_inherited) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    return fieldType?.icon || <TextFields />;
  };

  const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(formData.type);
  const needsLengthValidation = ['text', 'textarea'].includes(formData.type);
  const needsValueValidation = formData.type === 'number';
  
  const selectableAttrs = filteredAttributes.filter(a => !a.is_inherited);
  const allSelected = selectableAttrs.length > 0 && selectedAttrs.length === selectableAttrs.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Custom Attributes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage custom attributes for listing categories
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AutoAwesome />}
            onClick={() => setTemplateDialogOpen(true)}
            color="secondary"
          >
            Use Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Attribute
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Templates Preview */}
      {templates.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AutoAwesome color="secondary" />
              <Typography variant="subtitle2">Quick Setup Templates</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {templates.map(template => (
                <Chip
                  key={template.id}
                  icon={<Typography sx={{ fontSize: 16, mr: -0.5 }}>{template.icon}</Typography>}
                  label={`${template.name} (${template.attribute_count})`}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setTemplateDialogOpen(true);
                  }}
                  variant="outlined"
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Filter by Category"
              onChange={(e) => { setCategoryFilter(e.target.value); setSelectedAttrs([]); }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={typeFilter}
              label="Filter by Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {FIELD_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={showInherited}
                onChange={(e) => setShowInherited(e.target.checked)}
                size="small"
              />
            }
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LinkIcon fontSize="small" /> Show Inherited</Box>}
          />
          <Typography variant="body2" color="text.secondary">
            Showing {filteredAttributes.length} attributes
          </Typography>
          
          {/* Bulk actions */}
          {selectedAttrs.length > 0 && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
              <Chip 
                label={`${selectedAttrs.length} selected`} 
                color="primary" 
                size="small"
                onDelete={() => setSelectedAttrs([])}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<MoreVert />}
                onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
              >
                Bulk Actions
              </Button>
            </Box>
          )}
        </Box>
      </Card>

      {/* Bulk Actions Menu */}
      <Menu
        anchorEl={bulkMenuAnchor}
        open={Boolean(bulkMenuAnchor)}
        onClose={() => setBulkMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setCopyDialogOpen(true); setBulkMenuAnchor(null); }}>
          <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Copy to Category
        </MenuItem>
        <MenuItem onClick={handleBulkDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete Selected
        </MenuItem>
      </Menu>

      {/* Attributes Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedAttrs.length > 0 && !allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={selectableAttrs.length === 0}
                  />
                </TableCell>
                <TableCell width={50}></TableCell>
                <TableCell>Attribute Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Required</TableCell>
                <TableCell>Options</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredAttributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No attributes found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttributes.map((attr) => (
                  <TableRow 
                    key={`${attr.category_id}-${attr.id}`} 
                    hover
                    sx={attr.is_inherited ? { bgcolor: 'action.hover', opacity: 0.8 } : {}}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedAttrs.includes(attr.id)}
                        onChange={(e) => handleSelectAttr(attr.id, e.target.checked)}
                        disabled={attr.is_inherited}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 20 }}>{attr.icon || '📝'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={500}>{attr.name}</Typography>
                          {attr.is_inherited && (
                            <Tooltip title={`Inherited from ${attr.inherited_from_name}`}>
                              <Chip 
                                icon={<LinkIcon sx={{ fontSize: 14 }} />}
                                label="Inherited" 
                                size="small" 
                                variant="outlined"
                                color="info"
                                sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: 10 } }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          key: {attr.key}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getTypeIcon(attr.type)}
                        label={FIELD_TYPES.find(f => f.value === attr.type)?.label || attr.type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={attr.category_name} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={attr.required ? 'Yes' : 'No'}
                        size="small"
                        color={attr.required ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {attr.options && attr.options.length > 0 ? (
                        <Tooltip title={attr.options.join(', ')}>
                          <Chip label={`${attr.options.length} options`} size="small" />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!attr.is_inherited && (
                        <>
                          <IconButton size="small" onClick={() => handleOpenDialog(attr)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setAttrToDelete(attr);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{editingAttr ? 'Edit Attribute' : 'Create Attribute'}</Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Basic Info Section */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>Basic Information</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <FormControl fullWidth required disabled={!!editingAttr}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.parent_id ? '  └ ' : ''}{cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Field Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Field Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, options: [] })}
                  >
                    {FIELD_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Field Name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  fullWidth
                  placeholder="e.g., Color, Size, Year"
                />
                <TextField
                  label="Field Key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  required
                  fullWidth
                  placeholder="e.g., color, size, year"
                  helperText="Used in database (lowercase, no spaces)"
                />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Icon</InputLabel>
                    <Select
                      value={formData.icon}
                      label="Icon"
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      disabled={!!iconPreview}
                    >
                      <MenuItem value="">None</MenuItem>
                      {COMMON_ICONS.map(icon => (
                        <MenuItem key={icon} value={icon}>{icon}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Or Custom"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    sx={{ width: 100 }}
                    placeholder="🔧"
                    disabled={!!iconPreview}
                  />
                </Box>
                
                {/* Custom Icon Upload */}
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Or upload a custom icon image
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {/* Icon Preview */}
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        border: '2px dashed',
                        borderColor: iconPreview ? 'primary.main' : 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: iconPreview ? 'grey.50' : 'transparent',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {uploadingIcon ? (
                        <CircularProgress size={20} />
                      ) : iconPreview ? (
                        <>
                          <img
                            src={iconPreview}
                            alt="Icon preview"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <IconButton
                            size="small"
                            onClick={handleRemoveAttrIcon}
                            sx={{
                              position: 'absolute',
                              top: -6,
                              right: -6,
                              bgcolor: 'error.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'error.dark' },
                              width: 16,
                              height: 16,
                            }}
                          >
                            <Close sx={{ fontSize: 12 }} />
                          </IconButton>
                        </>
                      ) : (
                        <ImageIcon sx={{ color: 'grey.400', fontSize: 24 }} />
                      )}
                    </Box>
                    
                    {/* Upload Button */}
                    <Box>
                      <input
                        ref={iconInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleAttrIconFileSelect}
                        style={{ display: 'none' }}
                        id="attr-icon-upload"
                      />
                      <label htmlFor="attr-icon-upload">
                        <Button
                          component="span"
                          variant="outlined"
                          size="small"
                          startIcon={<CloudUpload />}
                          disabled={uploadingIcon || !editingAttr}
                          data-testid="upload-attr-icon-btn"
                        >
                          Upload
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        PNG, JPG, SVG (max 200KB)
                        {!editingAttr && ' • Save first to upload'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <TextField
                  label="Order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  fullWidth
                />
              </Box>
            </Box>

            <Divider />

            {/* Options Section (for dropdown, radio, checkbox) */}
            {needsOptions && (
              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>Options</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    label="Add Option"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button variant="outlined" onClick={handleAddOption}>Add</Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.options.map((opt, idx) => (
                    <Chip
                      key={idx}
                      label={opt}
                      onDelete={() => handleRemoveOption(idx)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {formData.options.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No options added yet
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Validation Section */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>Validation & Constraints</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    />
                  }
                  label="Required Field"
                />
                {needsLengthValidation && (
                  <>
                    <TextField
                      label="Min Length"
                      type="number"
                      value={formData.min_length || ''}
                      onChange={(e) => setFormData({ ...formData, min_length: parseInt(e.target.value) || undefined })}
                      size="small"
                    />
                    <TextField
                      label="Max Length"
                      type="number"
                      value={formData.max_length || ''}
                      onChange={(e) => setFormData({ ...formData, max_length: parseInt(e.target.value) || undefined })}
                      size="small"
                    />
                  </>
                )}
                {needsValueValidation && (
                  <>
                    <TextField
                      label="Min Value"
                      type="number"
                      value={formData.min_value || ''}
                      onChange={(e) => setFormData({ ...formData, min_value: parseFloat(e.target.value) || undefined })}
                      size="small"
                    />
                    <TextField
                      label="Max Value"
                      type="number"
                      value={formData.max_value || ''}
                      onChange={(e) => setFormData({ ...formData, max_value: parseFloat(e.target.value) || undefined })}
                      size="small"
                    />
                    <TextField
                      label="Unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      size="small"
                      placeholder="e.g., km, kg, $"
                    />
                  </>
                )}
              </Box>
            </Box>

            <Divider />

            {/* Display Options */}
            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>Display & Search Options</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Placeholder"
                  value={formData.placeholder}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="Placeholder text shown in input"
                />
                <TextField
                  label="Help Text"
                  value={formData.help_text}
                  onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                  fullWidth
                  size="small"
                  placeholder="Help text shown below input"
                />
                <TextField
                  label="Default Value"
                  value={formData.default_value}
                  onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                  fullWidth
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.searchable}
                        onChange={(e) => setFormData({ ...formData, searchable: e.target.checked })}
                        size="small"
                      />
                    }
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><SearchIcon fontSize="small" /> Searchable</Box>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.filterable}
                        onChange={(e) => setFormData({ ...formData, filterable: e.target.checked })}
                        size="small"
                      />
                    }
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><FilterList fontSize="small" /> Filterable</Box>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.show_in_list}
                        onChange={(e) => setFormData({ ...formData, show_in_list: e.target.checked })}
                        size="small"
                      />
                    }
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Visibility fontSize="small" /> Show in List</Box>}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={actionLoading || !formData.category_id || !formData.name || !formData.key}
          >
            {actionLoading ? <CircularProgress size={20} /> : (editingAttr ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Attribute</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{attrToDelete?.name}</strong> from{' '}
            <strong>{attrToDelete?.category_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="secondary" />
            Apply Attribute Template
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Select Category</InputLabel>
              <Select
                value={templateCategory}
                label="Select Category"
                onChange={(e) => setTemplateCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Select Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Select Template"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 18 }}>{template.icon}</Typography>
                      <Box>
                        <Typography>{template.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {template.attribute_count} attributes
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Attributes:</strong>{' '}
                  {templates.find(t => t.id === selectedTemplate)?.attributes_preview.join(', ')}
                  {(templates.find(t => t.id === selectedTemplate)?.attribute_count || 0) > 5 && '...'}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleApplyTemplate}
            disabled={actionLoading || !templateCategory || !selectedTemplate}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <PlaylistAdd />}
          >
            Apply Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy to Category Dialog */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContentCopy color="primary" />
            Copy Attributes to Category
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity="info">
              You are about to copy {selectedAttrs.length} attribute(s) to another category.
              Existing attributes with the same key will be skipped.
            </Alert>
            <FormControl fullWidth required>
              <InputLabel>Target Category</InputLabel>
              <Select
                value={copyTargetCategory}
                label="Target Category"
                onChange={(e) => setCopyTargetCategory(e.target.value)}
              >
                {categories
                  .filter(cat => cat.id !== categoryFilter)
                  .map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleBulkCopy}
            disabled={actionLoading || !copyTargetCategory}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <ContentCopy />}
          >
            Copy Attributes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
