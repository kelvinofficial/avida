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
  CircularProgress,
  Avatar,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  PhotoCamera,
  Image as ImageIcon,
  PlaylistAdd,
  CloudUpload,
  Check,
  Close,
  DragIndicator,
} from '@mui/icons-material';
import { api } from '@/lib/api';
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

interface PhotographyGuide {
  id: string;
  category_id: string;
  title: string;
  description: string;
  icon: string;
  has_image: boolean;
  image_url?: string;
  order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface GuideStats {
  total: number;
  active: number;
  inactive: number;
  with_images: number;
  categories_count: number;
  by_category: Record<string, number>;
}

// All available categories
const CATEGORIES = [
  { id: 'default', name: 'Default (Fallback)' },
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

// Common Ionicons for photo tips
const IONICONS = [
  'camera-outline', 'image-outline', 'images-outline', 'sunny-outline', 
  'flash-outline', 'eye-outline', 'search-outline', 'resize-outline',
  'color-palette-outline', 'construct-outline', 'warning-outline', 
  'alert-circle-outline', 'checkmark-circle-outline', 'phone-portrait-outline',
  'cube-outline', 'gift-outline', 'car-outline', 'home-outline',
  'map-outline', 'speedometer-outline', 'shirt-outline', 'body-outline',
  'pricetag-outline', 'briefcase-outline', 'albums-outline', 'ribbon-outline',
  'build-outline', 'paw-outline', 'heart-outline', 'fitness-outline',
  'sparkles-outline', 'shield-checkmark-outline', 'document-text-outline',
  'medkit-outline', 'calendar-outline', 'leaf-outline', 'location-outline',
  'people-outline', 'happy-outline', 'information-circle-outline',
];

// Sortable table row component
interface SortableRowProps {
  guide: PhotographyGuide;
  getCategoryName: (id: string) => string;
  handleOpenDialog: (guide: PhotographyGuide) => void;
  handleDeleteGuide: (id: string) => void;
  handleToggleActive: (guide: PhotographyGuide) => void;
  handleImagePreview: (guide: PhotographyGuide) => void;
  isDragging: boolean;
}

function SortableTableRow({ guide, getCategoryName, handleOpenDialog, handleDeleteGuide, handleToggleActive, handleImagePreview, isDragging }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: guide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging ? '#f5f5f5' : undefined,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      hover
      sx={{ 
        '&:hover .drag-handle': { opacity: 1 },
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <TableCell sx={{ width: 40, padding: '0 8px' }}>
        <Box
          {...attributes}
          {...listeners}
          className="drag-handle"
          sx={{
            cursor: 'grab',
            opacity: 0.5,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { opacity: 1 },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicator sx={{ color: 'text.secondary' }} />
        </Box>
      </TableCell>
      <TableCell>
        <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
          <ion-icon name={guide.icon} style={{ fontSize: '20px' }}></ion-icon>
        </Avatar>
      </TableCell>
      <TableCell>
        <Chip 
          size="small" 
          label={getCategoryName(guide.category_id)}
          color="primary"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight="medium">
          {guide.title}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 250 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          {guide.description}
        </Typography>
      </TableCell>
      <TableCell>
        {guide.has_image ? (
          <Chip 
            size="small" 
            icon={<ImageIcon fontSize="small" />} 
            label="Has Image" 
            color="success" 
            variant="outlined"
            onClick={() => handleImagePreview(guide)}
            sx={{ cursor: 'pointer' }}
          />
        ) : (
          <Chip 
            size="small" 
            label="No Image" 
            color="default" 
            variant="outlined"
          />
        )}
      </TableCell>
      <TableCell>
        <Chip 
          size="small"
          label={guide.is_active ? 'Active' : 'Inactive'}
          color={guide.is_active ? 'success' : 'default'}
          onClick={() => handleToggleActive(guide)}
          sx={{ cursor: 'pointer' }}
        />
      </TableCell>
      <TableCell>
        <Chip 
          size="small" 
          label={guide.order} 
          variant="outlined"
          sx={{ minWidth: 32 }}
        />
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => handleOpenDialog(guide)}>
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton 
            size="small" 
            color="error"
            onClick={() => handleDeleteGuide(guide.id)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export default function PhotographyGuidesPage() {
  const [guides, setGuides] = useState<PhotographyGuide[]>([]);
  const [stats, setStats] = useState<GuideStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<PhotographyGuide | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reorderSnackbar, setReorderSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    icon: 'camera-outline',
    order: 0,
    is_active: true,
    image_base64: '',
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Image preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchGuides = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/photography-guides?limit=100';
      if (filterCategory) url += `&category_id=${filterCategory}`;
      
      const response = await api.get(url);
      // Sort by order to ensure correct display
      const sortedGuides = (response.guides || []).sort((a: PhotographyGuide, b: PhotographyGuide) => a.order - b.order);
      setGuides(sortedGuides);
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/photography-guides/stats');
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
    fetchStats();
  }, [fetchGuides, fetchStats]);

  const handleSeedDefaults = async () => {
    try {
      const response = await api.post('/photography-guides/seed');
      alert(`${response.message}`);
      fetchGuides();
      fetchStats();
    } catch (error) {
      console.error('Error seeding defaults:', error);
      alert('Failed to seed default guides');
    }
  };

  const handleOpenDialog = async (guide?: PhotographyGuide) => {
    if (guide) {
      setEditingGuide(guide);
      // Fetch full guide details including image
      try {
        const fullGuide = await api.get(`/photography-guides/${guide.id}`);
        setFormData({
          category_id: fullGuide.category_id,
          title: fullGuide.title,
          description: fullGuide.description,
          icon: fullGuide.icon || 'camera-outline',
          order: fullGuide.order || 0,
          is_active: fullGuide.is_active,
          image_base64: '',
        });
        setImagePreview(fullGuide.image_url || null);
      } catch (error) {
        console.error('Error fetching guide details:', error);
      }
    } else {
      setEditingGuide(null);
      setFormData({
        category_id: filterCategory || '',
        title: '',
        description: '',
        icon: 'camera-outline',
        order: 0,
        is_active: true,
        image_base64: '',
      });
      setImagePreview(null);
    }
    setDialogOpen(true);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData({ ...formData, image_base64: base64 });
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_base64: '' });
    setImagePreview(null);
  };

  const handleSaveGuide = async () => {
    try {
      const payload = {
        category_id: formData.category_id,
        title: formData.title,
        description: formData.description,
        icon: formData.icon,
        order: formData.order,
        is_active: formData.is_active,
        ...(formData.image_base64 && { image_base64: formData.image_base64 }),
      };

      if (editingGuide) {
        await api.put(`/photography-guides/${editingGuide.id}`, payload);
      } else {
        await api.post('/photography-guides', payload);
      }

      setDialogOpen(false);
      fetchGuides();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving guide:', error);
      alert(error.response?.data?.detail || 'Failed to save guide');
    }
  };

  const handleDeleteGuide = async (guideId: string) => {
    if (!confirm('Are you sure you want to delete this photography guide?')) return;
    
    try {
      await api.delete(`/photography-guides/${guideId}`);
      fetchGuides();
      fetchStats();
    } catch (error) {
      console.error('Error deleting guide:', error);
      alert('Failed to delete guide');
    }
  };

  const handleToggleActive = async (guide: PhotographyGuide) => {
    try {
      await api.put(`/photography-guides/${guide.id}`, {
        is_active: !guide.is_active,
      });
      fetchGuides();
      fetchStats();
    } catch (error) {
      console.error('Error toggling guide:', error);
    }
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // Get the category of the dragged guide
    const draggedGuide = guides.find(g => g.id === active.id);
    const targetGuide = guides.find(g => g.id === over.id);

    if (!draggedGuide || !targetGuide) return;

    // Only allow reordering within the same category
    if (draggedGuide.category_id !== targetGuide.category_id) {
      setReorderSnackbar({
        open: true,
        message: 'Cannot reorder across different categories. Filter by category first.',
        severity: 'error'
      });
      return;
    }

    // Filter guides by the same category
    const categoryGuides = guides.filter(g => g.category_id === draggedGuide.category_id);
    const oldIndex = categoryGuides.findIndex(g => g.id === active.id);
    const newIndex = categoryGuides.findIndex(g => g.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the category guides
    const reorderedCategoryGuides = arrayMove(categoryGuides, oldIndex, newIndex);
    const guideIds = reorderedCategoryGuides.map(g => g.id);

    // Optimistically update the UI
    const otherGuides = guides.filter(g => g.category_id !== draggedGuide.category_id);
    const updatedGuides = [
      ...otherGuides,
      ...reorderedCategoryGuides.map((g, index) => ({ ...g, order: index }))
    ].sort((a, b) => {
      if (a.category_id !== b.category_id) {
        return a.category_id.localeCompare(b.category_id);
      }
      return a.order - b.order;
    });
    setGuides(updatedGuides);

    try {
      // Call the reorder API
      await api.put(`/photography-guides/reorder/${draggedGuide.category_id}`, guideIds);
      setReorderSnackbar({
        open: true,
        message: 'Guides reordered successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error reordering guides:', error);
      setReorderSnackbar({
        open: true,
        message: 'Failed to save new order. Please try again.',
        severity: 'error'
      });
      // Revert on error
      fetchGuides();
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const getCategoryName = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Photography Guides</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage category-specific photo tips and illustration images for listing creation
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => { fetchGuides(); fetchStats(); }}
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
            Add Guide
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Guides</Typography>
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
              <Typography color="text.secondary" gutterBottom>With Images</Typography>
              <Typography variant="h4" color="info.main">{stats?.with_images || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Categories</Typography>
              <Typography variant="h4">{stats?.categories_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Drag & Drop Info Banner */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Drag & Drop Enabled:</strong> Drag guides by the handle (<DragIndicator sx={{ fontSize: 16, verticalAlign: 'middle' }} />) to reorder them within the same category. Filter by category for easier reordering.
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
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
          {filterCategory && (
            <Typography variant="body2" color="text.secondary">
              Showing {guides.filter(g => g.category_id === filterCategory).length} guides
            </Typography>
          )}
        </Box>

        {/* Guides Table with DnD */}
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : guides.length === 0 ? (
            <Alert severity="info">
              No photography guides found. Click "Seed Defaults" to add standard guides.
            </Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }}></TableCell>
                      <TableCell>Icon</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Image</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Order</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <SortableContext
                      items={guides.map(g => g.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {guides.map((guide) => (
                        <SortableTableRow
                          key={guide.id}
                          guide={guide}
                          getCategoryName={getCategoryName}
                          handleOpenDialog={handleOpenDialog}
                          handleDeleteGuide={handleDeleteGuide}
                          handleToggleActive={handleToggleActive}
                          isDragging={activeId === guide.id}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </TableContainer>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGuide ? 'Edit Photography Guide' : 'Add Photography Guide'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth disabled={!!editingGuide}>
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

            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              placeholder="e.g., Good Lighting"
              helperText="Short title for the photo tip"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="e.g., Use natural light when possible"
              helperText="Detailed advice for taking better photos"
            />

            {/* Icon Selector */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Icon</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <ion-icon name={formData.icon} style={{ fontSize: '24px' }}></ion-icon>
                </Avatar>
                <TextField
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  size="small"
                  sx={{ flex: 1, fontFamily: 'monospace' }}
                  placeholder="camera-outline"
                />
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setIconPickerOpen(true)}
                >
                  Browse
                </Button>
              </Box>
            </Box>

            {/* Image Upload */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Illustration Image (Optional)</Typography>
              {imagePreview ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 200, 
                      borderRadius: 8,
                      border: '1px solid #e0e0e0'
                    }} 
                  />
                  <IconButton
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      top: 4, 
                      right: 4, 
                      bgcolor: 'error.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'error.dark' }
                    }}
                    onClick={handleRemoveImage}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  sx={{ width: '100%', py: 3, borderStyle: 'dashed' }}
                >
                  Upload Image (Max 2MB)
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Images help users understand what kind of photos to take
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Display Order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  fullWidth
                  size="small"
                  helperText="Lower = displayed first"
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
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveGuide}
            disabled={!formData.category_id || !formData.title || !formData.description}
          >
            {editingGuide ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Icon Picker Dialog */}
      <Dialog open={iconPickerOpen} onClose={() => setIconPickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Icon</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
            {IONICONS.map(icon => (
              <Tooltip key={icon} title={icon}>
                <IconButton
                  onClick={() => {
                    setFormData({ ...formData, icon });
                    setIconPickerOpen(false);
                  }}
                  sx={{ 
                    border: formData.icon === icon ? '2px solid' : '1px solid #e0e0e0',
                    borderColor: formData.icon === icon ? 'primary.main' : 'grey.300',
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <ion-icon name={icon} style={{ fontSize: '24px' }}></ion-icon>
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIconPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reorder Snackbar */}
      <Snackbar
        open={reorderSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setReorderSnackbar({ ...reorderSnackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setReorderSnackbar({ ...reorderSnackbar, open: false })} 
          severity={reorderSnackbar.severity}
          sx={{ width: '100%' }}
        >
          {reorderSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
