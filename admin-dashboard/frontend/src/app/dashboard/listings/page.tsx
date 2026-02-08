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
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
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
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Checkbox,
  Avatar,
} from '@mui/material';
import {
  Search,
  MoreVert,
  CheckCircle,
  Cancel,
  Star,
  StarBorder,
  Refresh,
  Delete,
  Pause,
  PlayArrow,
  Image as ImageIcon,
  Download,
  Upload,
  Edit,
  CloudUpload,
  Close,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Listing, Category } from '@/types';
import CSVImportDialog from '@/components/CSVImportDialog';
import { useLocale } from '@/components/LocaleProvider';

export default function ListingsPage() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Edit listing state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'EUR',
    category_id: '',
    location: '',
    condition: 'new',
    status: 'active',
    contact_phone: '',
    contact_email: '',
    negotiable: false,
    attributes: {} as Record<string, unknown>,
  });
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<Array<{id: string; name: string; type: string; options?: string[]}>>([]);

  const handleOpenEditDialog = async (listing: Listing) => {
    setEditingListing(listing);
    setEditForm({
      name: listing.name || listing.title || '',
      description: listing.description || '',
      price: listing.price || 0,
      currency: listing.currency || 'EUR',
      category_id: listing.category_id || '',
      location: typeof listing.location === 'string' ? listing.location : listing.location?.city || '',
      condition: listing.condition || 'new',
      status: listing.status || 'active',
      contact_phone: listing.contact_phone || '',
      contact_email: listing.contact_email || '',
      negotiable: listing.negotiable || false,
      attributes: listing.attributes || {},
    });
    setEditImages(listing.images || []);
    setNewImageFiles([]);
    
    // Load category attributes if category is set
    if (listing.category_id) {
      try {
        const attrs = await api.getCategoryAttributes(listing.category_id);
        setCategoryAttributes(attrs || []);
      } catch (err) {
        console.error('Failed to load attributes:', err);
        setCategoryAttributes([]);
      }
    } else {
      setCategoryAttributes([]);
    }
    
    setEditDialogOpen(true);
  };

  const handleCategoryChange = async (categoryId: string) => {
    setEditForm({ ...editForm, category_id: categoryId, attributes: {} });
    if (categoryId) {
      try {
        const attrs = await api.getCategoryAttributes(categoryId);
        setCategoryAttributes(attrs || []);
      } catch (err) {
        console.error('Failed to load attributes:', err);
        setCategoryAttributes([]);
      }
    } else {
      setCategoryAttributes([]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImageFiles(prev => [...prev, ...files]);
    
    // Preview new images
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
    // Adjust new files if removing a newly added one
    const existingCount = editingListing?.images?.length || 0;
    if (index >= existingCount) {
      setNewImageFiles(prev => prev.filter((_, i) => i !== (index - existingCount)));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    setActionLoading(true);
    setError('');
    
    try {
      // Update listing data
      await api.updateListing(editingListing.id, {
        name: editForm.name,
        description: editForm.description,
        price: editForm.price,
        currency: editForm.currency,
        category_id: editForm.category_id,
        location: editForm.location,
        condition: editForm.condition,
        status: editForm.status,
        contact_phone: editForm.contact_phone,
        contact_email: editForm.contact_email,
        negotiable: editForm.negotiable,
        attributes: editForm.attributes,
        images: editImages.filter(img => !img.startsWith('data:')), // Only keep existing URLs
      });
      
      // Upload new images if any
      if (newImageFiles.length > 0) {
        await api.uploadListingImages(editingListing.id, newImageFiles);
      }
      
      setEditDialogOpen(false);
      await loadListings();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['Listing ID', 'Title', 'Price', 'Currency', 'Status', 'Category', 'Location', 'Created At', 'User ID'];
    const rows = listings.map(listing => [
      listing.id,
      listing.title || '',
      listing.price || 0,
      listing.currency || 'EUR',
      listing.status || 'active',
      listing.category_id || '',
      listing.location?.city || '',
      listing.created_at,
      listing.user_id || '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `listings_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getListings({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
      });
      setListings(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, categoryFilter]);

  const loadCategories = async () => {
    try {
      const cats = await api.getCategories(true, true);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadListings();
    loadCategories();
  }, [loadListings]);

  const handleSearch = () => {
    setPage(0);
    loadListings();
  };

  const handleStatusChange = async (listing: Listing, newStatus: string, reason?: string) => {
    setActionLoading(true);
    try {
      await api.updateListingStatus(listing.id, newStatus, reason);
      await loadListings();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeature = async (listing: Listing) => {
    setActionLoading(true);
    try {
      await api.toggleListingFeature(listing.id, !listing.featured);
      await loadListings();
    } catch (err) {
      console.error('Failed to toggle feature:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedListings.length === 0) return;
    setActionLoading(true);
    setError('');
    
    try {
      await api.bulkListingAction(selectedListings, actionType, undefined, actionReason);
      setActionDialogOpen(false);
      setActionType('');
      setActionReason('');
      setSelectedListings([]);
      await loadListings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to perform bulk action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListings(listings.map((l) => l.id));
    } else {
      setSelectedListings([]);
    }
  };

  const handleSelectListing = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedListings([...selectedListings, id]);
    } else {
      setSelectedListings(selectedListings.filter((i) => i !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'paused': return 'default';
      case 'sold': return 'info';
      default: return 'default';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Listings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage marketplace listings and moderation
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedListings.length > 0 && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setActionType('approve');
                setActionDialogOpen(true);
              }}
            >
              Bulk Action ({selectedListings.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            {t('common.import')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToCSV}
            disabled={listings.length === 0}
          >
            {t('common.export')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadListings}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search listings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSearch}>
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Listings Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedListings.length > 0 && selectedListings.length < listings.length}
                    checked={listings.length > 0 && selectedListings.length === listings.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Listing</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Featured</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : listings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No listings found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                listings.map((listing) => (
                  <TableRow key={listing.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedListings.includes(listing.id)}
                        onChange={(e) => handleSelectListing(listing.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {listing.images?.[0] ? (
                          <Avatar
                            variant="rounded"
                            src={listing.images[0]}
                            sx={{ width: 48, height: 48 }}
                          >
                            <ImageIcon />
                          </Avatar>
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.200' }}>
                            <ImageIcon color="action" />
                          </Avatar>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
                            {listing.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {listing.id.slice(0, 12)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} color="primary.main">
                        {formatPrice(listing.price, listing.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={listing.status}
                        color={getStatusColor(listing.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleFeature(listing)}
                        color={listing.featured ? 'warning' : 'default'}
                      >
                        {listing.featured ? <Star /> : <StarBorder />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{listing.views || 0}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(listing.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedListing(listing);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedListing(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedListing) handleOpenEditDialog(selectedListing);
            setAnchorEl(null);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} color="primary" />
          {t('common.edit')}
        </MenuItem>
        {selectedListing?.status === 'pending' && (
          <>
            <MenuItem
              onClick={() => {
                if (selectedListing) handleStatusChange(selectedListing, 'active');
                setAnchorEl(null);
              }}
            >
              <CheckCircle fontSize="small" sx={{ mr: 1 }} color="success" />
              Approve
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (selectedListing) handleStatusChange(selectedListing, 'rejected', 'Rejected by admin');
                setAnchorEl(null);
              }}
            >
              <Cancel fontSize="small" sx={{ mr: 1 }} color="error" />
              Reject
            </MenuItem>
          </>
        )}
        {selectedListing?.status === 'active' && (
          <MenuItem
            onClick={() => {
              if (selectedListing) handleStatusChange(selectedListing, 'paused');
              setAnchorEl(null);
            }}
          >
            <Pause fontSize="small" sx={{ mr: 1 }} />
            Pause
          </MenuItem>
        )}
        {selectedListing?.status === 'paused' && (
          <MenuItem
            onClick={() => {
              if (selectedListing) handleStatusChange(selectedListing, 'active');
              setAnchorEl(null);
            }}
          >
            <PlayArrow fontSize="small" sx={{ mr: 1 }} color="success" />
            Activate
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedListing) handleStatusChange(selectedListing, 'deleted');
            setAnchorEl(null);
          }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} color="error" />
          Delete
        </MenuItem>
      </Menu>

      {/* Bulk Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Action</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Apply action to {selectedListings.length} selected listings
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionType}
              label="Action"
              onChange={(e) => setActionType(e.target.value)}
            >
              <MenuItem value="approve">Approve</MenuItem>
              <MenuItem value="reject">Reject</MenuItem>
              <MenuItem value="pause">Pause</MenuItem>
              <MenuItem value="delete">Delete</MenuItem>
              <MenuItem value="feature">Feature</MenuItem>
              <MenuItem value="unfeature">Unfeature</MenuItem>
            </Select>
          </FormControl>
          {actionType === 'reject' && (
            <TextField
              fullWidth
              label="Rejection Reason"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              multiline
              rows={2}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkAction}
            disabled={actionLoading || !actionType}
          >
            {actionLoading ? 'Processing...' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={async (file) => {
          const result = await api.importListingsCSV(file);
          await loadListings();
          return result;
        }}
        title={t('listings.title') + ' - ' + t('common.import')}
        description="Upload a CSV file to import listings. Required columns: name, price. Optional: description, category_id, location, status, condition, currency."
        sampleHeaders={['name', 'price', 'description', 'category_id', 'location', 'status', 'condition', 'currency']}
        entityName="listing"
      />
    </Box>
  );
}
