'use client';

import { useState, useEffect, useCallback } from 'react';
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
  { value: 'checkbox', label: 'Checkboxes', icon: <CheckBox /> },
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
      const [attrsData, catsData] = await Promise.all([
        api.getAllAttributes(),
        api.getCategories({ flat: true }),
      ]);
      setAttributes(attrsData.attributes || []);
      setCategories(catsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    return true;
  });

  const getTypeIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(f => f.value === type);
    return fieldType?.icon || <TextFields />;
  };

  const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(formData.type);
  const needsLengthValidation = ['text', 'textarea'].includes(formData.type);
  const needsValueValidation = formData.type === 'number';

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

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Filter by Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
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
          <Typography variant="body2" color="text.secondary">
            Showing {filteredAttributes.length} of {attributes.length} attributes
          </Typography>
        </Box>
      </Card>

      {/* Attributes Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
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
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredAttributes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No attributes found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttributes.map((attr) => (
                  <TableRow key={attr.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 20 }}>{attr.icon || '📝'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography fontWeight={500}>{attr.name}</Typography>
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
                  />
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
    </Box>
  );
}
