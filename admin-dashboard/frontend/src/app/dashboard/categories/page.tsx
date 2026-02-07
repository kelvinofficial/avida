'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  ExpandLess,
  DragIndicator,
  Settings,
  Save,
  Download,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import { Category, CategoryAttribute } from '@/types';

interface SortableCategoryItemProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onManageAttributes: (category: Category) => void;
}

function SortableCategoryItem({ category, level, onEdit, onDelete, onManageAttributes }: SortableCategoryItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <ListItem
        ref={setNodeRef}
        style={style}
        sx={{
          pl: 2 + level * 3,
          bgcolor: isDragging ? 'action.hover' : level === 0 ? 'grey.50' : 'transparent',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, cursor: 'grab' }} {...attributes} {...listeners}>
          <DragIndicator sx={{ color: 'grey.400' }} />
        </ListItemIcon>
        
        {hasChildren && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        
        {!hasChildren && <Box sx={{ width: 34 }} />}

        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: category.color || 'grey.400',
            mr: 1.5,
            flexShrink: 0,
          }}
        />

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography fontWeight={level === 0 ? 600 : 400}>
                {category.name}
              </Typography>
              {!category.is_visible && (
                <Chip label="Hidden" size="small" color="default" sx={{ height: 20 }} />
              )}
              <Chip
                label={`${category.listings_count} listings`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
              {category.attributes?.length > 0 && (
                <Chip
                  label={`${category.attributes.length} attrs`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 11 }}
                />
              )}
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              /{category.slug} • Order: {category.order}
            </Typography>
          }
        />

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => onManageAttributes(category)} title="Manage Attributes">
            <Settings fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onEdit(category)} title="Edit">
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(category)} title="Delete" color="error">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>

      {hasChildren && (
        <Collapse in={expanded}>
          <SortableContext items={category.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {category.children.map((child) => (
              <SortableCategoryItem
                key={child.id}
                category={child}
                level={level + 1}
                onEdit={onEdit}
                onDelete={onDelete}
                onManageAttributes={onManageAttributes}
              />
            ))}
          </SortableContext>
        </Collapse>
      )}
    </>
  );
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [attributesCategory, setAttributesCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [hasOrderChanges, setHasOrderChanges] = useState(false);

  // Attribute dialog state
  const [attributeDialogOpen, setAttributeDialogOpen] = useState(false);
  const [editAttribute, setEditAttribute] = useState<CategoryAttribute | null>(null);
  const [attributeForm, setAttributeForm] = useState({
    name: '',
    key: '',
    type: 'text',
    required: false,
    options: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    color: '#4CAF50',
    parent_id: '',
    description: '',
    is_visible: true,
    order: 0,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadCategories = async () => {
    try {
      const [tree, flat] = await Promise.all([
        api.getCategories(true, false),
        api.getCategories(true, true),
      ]);
      setCategories(tree);
      setFlatCategories(flat);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Update order in flat categories
      const oldIndex = flatCategories.findIndex(c => c.id === active.id);
      const newIndex = flatCategories.findIndex(c => c.id === over.id);
      
      const newFlatCategories = arrayMove(flatCategories, oldIndex, newIndex);
      
      // Update order numbers
      const updatedCategories = newFlatCategories.map((cat, index) => ({
        ...cat,
        order: index,
      }));
      
      setFlatCategories(updatedCategories);
      setHasOrderChanges(true);
      
      // Rebuild tree
      const buildTree = (parentId: string | null = null): Category[] => {
        return updatedCategories
          .filter(c => c.parent_id === parentId)
          .sort((a, b) => a.order - b.order)
          .map(cat => ({
            ...cat,
            children: buildTree(cat.id),
          }));
      };
      
      setCategories(buildTree(null));
    }
  };

  const saveOrderChanges = async () => {
    setSaving(true);
    try {
      const orders = flatCategories.map((cat, index) => ({
        id: cat.id,
        order: index,
      }));
      await api.reorderCategories(orders);
      setHasOrderChanges(false);
    } catch (err) {
      console.error('Failed to save order:', err);
      setError('Failed to save category order');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        icon: category.icon || '',
        color: category.color || '#4CAF50',
        parent_id: category.parent_id || '',
        description: category.description || '',
        is_visible: category.is_visible,
        order: category.order,
      });
    } else {
      setEditCategory(null);
      setFormData({
        name: '',
        slug: '',
        icon: '',
        color: '#4CAF50',
        parent_id: '',
        description: '',
        is_visible: true,
        order: flatCategories.length,
      });
    }
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      setError('Name and slug are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editCategory) {
        await api.updateCategory(editCategory.id, formData);
      } else {
        await api.createCategory(formData);
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;

    setSaving(true);
    try {
      await api.deleteCategory(deleteCategory.id);
      setDeleteCategory(null);
      await loadCategories();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to delete category');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAttributeDialog = (attr?: CategoryAttribute) => {
    if (attr) {
      setEditAttribute(attr);
      setAttributeForm({
        name: attr.name,
        key: attr.key,
        type: attr.type,
        required: attr.required,
        options: attr.options?.join(', ') || '',
      });
    } else {
      setEditAttribute(null);
      setAttributeForm({
        name: '',
        key: '',
        type: 'text',
        required: false,
        options: '',
      });
    }
    setAttributeDialogOpen(true);
  };

  const handleSaveAttribute = async () => {
    if (!attributesCategory || !attributeForm.name || !attributeForm.key) return;

    setSaving(true);
    try {
      const attrData = {
        ...attributeForm,
        category_id: attributesCategory.id,
        options: attributeForm.options ? attributeForm.options.split(',').map(o => o.trim()) : undefined,
        order: attributesCategory.attributes?.length || 0,
      };

      if (editAttribute) {
        await api.updateAttribute(attributesCategory.id, editAttribute.id, attrData);
      } else {
        await api.addAttribute(attributesCategory.id, attrData);
      }

      setAttributeDialogOpen(false);
      // Refresh category data
      const updatedCat = await api.getCategory(attributesCategory.id);
      setAttributesCategory(updatedCat);
      await loadCategories();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save attribute');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttribute = async (attr: CategoryAttribute) => {
    if (!attributesCategory) return;

    setSaving(true);
    try {
      await api.deleteAttribute(attributesCategory.id, attr.id);
      const updatedCat = await api.getCategory(attributesCategory.id);
      setAttributesCategory(updatedCat);
      await loadCategories();
    } catch (err) {
      console.error('Failed to delete attribute:', err);
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Slug', 'Parent ID', 'Order', 'Is Visible', 'Listings Count', 'Attributes Count'];
    const rows = flatCategories.map(cat => [
      cat.id,
      cat.name,
      cat.slug,
      cat.parent_id || '',
      cat.order,
      cat.is_visible ? 'Yes' : 'No',
      cat.listings_count || 0,
      cat.attributes?.length || 0,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `categories_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your marketplace category hierarchy and attributes. Drag to reorder.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasOrderChanges && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={saveOrderChanges}
              disabled={saving}
            >
              Save Order
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Category
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {flatCategories.length} categories
            </Typography>
            {hasOrderChanges && (
              <Chip label="Unsaved changes" color="warning" size="small" />
            )}
          </Box>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={flatCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <List disablePadding>
                {categories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    level={0}
                    onEdit={handleOpenDialog}
                    onDelete={setDeleteCategory}
                    onManageAttributes={setAttributesCategory}
                  />
                ))}
              </List>
            </SortableContext>
          </DndContext>

          {categories.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">No categories yet</Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2 }}
              >
                Create your first category
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Category Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editCategory ? 'Edit Category' : 'Create Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: editCategory ? formData.slug : generateSlug(e.target.value),
              });
            }}
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            fullWidth
            label="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            helperText="URL-friendly identifier"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Parent Category</InputLabel>
            <Select
              value={formData.parent_id}
              label="Parent Category"
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <MenuItem value="">None (Top Level)</MenuItem>
              {flatCategories
                .filter((c) => c.id !== editCategory?.id)
                .map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="e.g., car, laptop"
              sx={{ flex: 1 }}
            />
            <TextField
              type="color"
              label="Color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              sx={{ width: 100 }}
            />
          </Box>

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              />
            }
            label="Visible to users"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCategory} onClose={() => setDeleteCategory(null)}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{deleteCategory?.name}&quot;?
          </Typography>
          {(deleteCategory?.listings_count || 0) > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This category has {deleteCategory?.listings_count} listings. You must migrate them first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCategory(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={handleDelete}
            disabled={saving || (deleteCategory?.listings_count || 0) > 0}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attributes Management Dialog */}
      <Dialog
        open={!!attributesCategory}
        onClose={() => setAttributesCategory(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Manage Attributes - {attributesCategory?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure dynamic attributes for this category. These fields will appear when users create listings.
          </Typography>
          
          {attributesCategory?.attributes?.length ? (
            <List sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
              {attributesCategory.attributes.map((attr) => (
                <ListItem
                  key={attr.id}
                  divider
                  secondaryAction={
                    <Box>
                      <IconButton size="small" onClick={() => handleOpenAttributeDialog(attr)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteAttribute(attr)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography fontWeight={500}>{attr.name}</Typography>
                        <Chip label={attr.type} size="small" variant="outlined" />
                        {attr.required && <Chip label="Required" size="small" color="error" />}
                      </Box>
                    }
                    secondary={`Key: ${attr.key}${attr.options ? ` • Options: ${attr.options.join(', ')}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography color="text.secondary">No attributes defined</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributesCategory(null)}>Close</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenAttributeDialog()}>
            Add Attribute
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Attribute Dialog */}
      <Dialog open={attributeDialogOpen} onClose={() => setAttributeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editAttribute ? 'Edit Attribute' : 'Add Attribute'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={attributeForm.name}
            onChange={(e) => setAttributeForm({
              ...attributeForm,
              name: e.target.value,
              key: editAttribute ? attributeForm.key : generateSlug(e.target.value).replace(/-/g, '_'),
            })}
            sx={{ mb: 2, mt: 1 }}
          />

          <TextField
            fullWidth
            label="Key"
            value={attributeForm.key}
            onChange={(e) => setAttributeForm({ ...attributeForm, key: e.target.value })}
            helperText="Internal identifier (snake_case)"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={attributeForm.type}
              label="Type"
              onChange={(e) => setAttributeForm({ ...attributeForm, type: e.target.value })}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="currency">Currency</MenuItem>
              <MenuItem value="dropdown">Dropdown</MenuItem>
              <MenuItem value="multiselect">Multi-Select</MenuItem>
              <MenuItem value="boolean">Boolean (Yes/No)</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="year">Year</MenuItem>
              <MenuItem value="range">Range</MenuItem>
              <MenuItem value="rich_text">Rich Text</MenuItem>
            </Select>
          </FormControl>

          {(attributeForm.type === 'dropdown' || attributeForm.type === 'multiselect') && (
            <TextField
              fullWidth
              label="Options"
              value={attributeForm.options}
              onChange={(e) => setAttributeForm({ ...attributeForm, options: e.target.value })}
              helperText="Comma-separated values (e.g., Option 1, Option 2, Option 3)"
              sx={{ mb: 2 }}
            />
          )}

          <FormControlLabel
            control={
              <Switch
                checked={attributeForm.required}
                onChange={(e) => setAttributeForm({ ...attributeForm, required: e.target.checked })}
              />
            }
            label="Required field"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAttribute}
            disabled={saving || !attributeForm.name || !attributeForm.key}
          >
            {saving ? 'Saving...' : editAttribute ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
