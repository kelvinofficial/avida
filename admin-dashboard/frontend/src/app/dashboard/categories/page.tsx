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
  Visibility,
  VisibilityOff,
  DragIndicator,
  Settings,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Category } from '@/types';

interface CategoryItemProps {
  category: Category;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onManageAttributes: (category: Category) => void;
}

function CategoryItem({ category, level, onEdit, onDelete, onManageAttributes }: CategoryItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <>
      <ListItem
        sx={{
          pl: 2 + level * 3,
          bgcolor: level === 0 ? 'grey.50' : 'transparent',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <DragIndicator sx={{ color: 'grey.400', cursor: 'grab' }} />
        </ListItemIcon>
        
        {hasChildren && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        
        {!hasChildren && <Box sx={{ width: 34 }} />}

        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: category.color || 'grey.400',
            mr: 1.5,
          }}
        />

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              /{category.slug} • {category.attributes?.length || 0} attributes
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
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onManageAttributes={onManageAttributes}
            />
          ))}
        </Collapse>
      )}
    </>
  );
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [attributesCategory, setAttributesCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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
            Manage your marketplace category hierarchy and attributes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Category
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {flatCategories.length} categories • Drag to reorder
            </Typography>
          </Box>
          
          <List disablePadding>
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                level={0}
                onEdit={handleOpenDialog}
                onDelete={setDeleteCategory}
                onManageAttributes={setAttributesCategory}
              />
            ))}
          </List>

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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editCategory ? 'Edit Category' : 'Create Category'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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

      {/* Attributes Dialog - Placeholder */}
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
            Configure dynamic attributes for this category
          </Typography>
          
          {attributesCategory?.attributes?.length ? (
            <List>
              {attributesCategory.attributes.map((attr) => (
                <ListItem key={attr.id} divider>
                  <ListItemText
                    primary={attr.name}
                    secondary={`Type: ${attr.type} • Key: ${attr.key} ${attr.required ? '• Required' : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No attributes defined</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttributesCategory(null)}>Close</Button>
          <Button variant="contained" startIcon={<Add />}>
            Add Attribute
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
