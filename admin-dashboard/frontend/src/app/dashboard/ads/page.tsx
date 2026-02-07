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
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Campaign,
  Visibility,
  VisibilityOff,
  ContentCopy,
} from '@mui/icons-material';

interface AdPlacement {
  id: string;
  name: string;
  platform: 'admob' | 'adsense' | 'custom';
  ad_type: 'banner' | 'interstitial' | 'native' | 'rewarded';
  placement_id: string;
  is_active: boolean;
  location: string;
  created_at: string;
  impressions?: number;
  clicks?: number;
}

const mockAds: AdPlacement[] = [
  {
    id: 'ad_1',
    name: 'Home Banner',
    platform: 'admob',
    ad_type: 'banner',
    placement_id: 'ca-app-pub-xxxx/1234567890',
    is_active: true,
    location: 'home_top',
    created_at: '2026-02-01T00:00:00Z',
    impressions: 15420,
    clicks: 342,
  },
  {
    id: 'ad_2',
    name: 'Listing Detail Interstitial',
    platform: 'admob',
    ad_type: 'interstitial',
    placement_id: 'ca-app-pub-xxxx/0987654321',
    is_active: true,
    location: 'listing_detail',
    created_at: '2026-02-01T00:00:00Z',
    impressions: 8920,
    clicks: 156,
  },
  {
    id: 'ad_3',
    name: 'Search Results Native',
    platform: 'adsense',
    ad_type: 'native',
    placement_id: 'ca-pub-xxxx/native-1',
    is_active: false,
    location: 'search_results',
    created_at: '2026-02-03T00:00:00Z',
    impressions: 0,
    clicks: 0,
  },
];

export default function AdsPage() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<AdPlacement | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    platform: 'admob' as 'admob' | 'adsense' | 'custom',
    ad_type: 'banner' as 'banner' | 'interstitial' | 'native' | 'rewarded',
    placement_id: '',
    location: '',
    is_active: true,
  });

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      // In production, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500));
      setAds(mockAds);
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleOpenDialog = (ad?: AdPlacement) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        name: ad.name,
        platform: ad.platform,
        ad_type: ad.ad_type,
        placement_id: ad.placement_id,
        location: ad.location,
        is_active: ad.is_active,
      });
    } else {
      setEditingAd(null);
      setFormData({
        name: '',
        platform: 'admob',
        ad_type: 'banner',
        placement_id: '',
        location: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      // In production, this would call the API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (editingAd) {
        setAds(prev => prev.map(ad => 
          ad.id === editingAd.id 
            ? { ...ad, ...formData }
            : ad
        ));
        setSnackbar({ open: true, message: 'Ad placement updated successfully', severity: 'success' });
      } else {
        const newAd: AdPlacement = {
          id: `ad_${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString(),
          impressions: 0,
          clicks: 0,
        };
        setAds(prev => [...prev, newAd]);
        setSnackbar({ open: true, message: 'Ad placement created successfully', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save ad placement', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!adToDelete) return;
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setAds(prev => prev.filter(ad => ad.id !== adToDelete.id));
      setSnackbar({ open: true, message: 'Ad placement deleted successfully', severity: 'success' });
      setDeleteDialogOpen(false);
      setAdToDelete(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete ad placement', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (ad: AdPlacement) => {
    try {
      setAds(prev => prev.map(a => 
        a.id === ad.id ? { ...a, is_active: !a.is_active } : a
      ));
      setSnackbar({ 
        open: true, 
        message: `Ad ${ad.is_active ? 'deactivated' : 'activated'} successfully`, 
        severity: 'success' 
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update ad status', severity: 'error' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'admob': return 'primary';
      case 'adsense': return 'warning';
      default: return 'default';
    }
  };

  const getAdTypeColor = (type: string) => {
    switch (type) {
      case 'banner': return 'info';
      case 'interstitial': return 'secondary';
      case 'native': return 'success';
      case 'rewarded': return 'warning';
      default: return 'default';
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Ads Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage AdMob and AdSense placement IDs for your marketplace
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAds}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Placement
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 180 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" fontWeight={700}>
              {ads.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Placements
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {ads.filter(ad => ad.is_active).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {formatNumber(ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Impressions
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 180 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight={700}>
              {formatNumber(ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0))}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Clicks
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Ads Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Placement ID</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Impressions</TableCell>
                <TableCell align="right">CTR</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Campaign sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                    <Typography color="text.secondary">No ad placements found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{ad.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ad.platform.toUpperCase()}
                        color={getPlatformColor(ad.platform)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ad.ad_type}
                        color={getAdTypeColor(ad.ad_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontFamily="monospace" sx={{ maxWidth: 180 }} noWrap>
                          {ad.placement_id}
                        </Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => copyToClipboard(ad.placement_id)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{ad.location}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(ad.impressions || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {calculateCTR(ad.clicks || 0, ad.impressions || 0)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={ad.is_active ? <Visibility /> : <VisibilityOff />}
                        label={ad.is_active ? 'Active' : 'Inactive'}
                        color={ad.is_active ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(ad)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(ad)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setAdToDelete(ad);
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAd ? 'Edit Ad Placement' : 'Create Ad Placement'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={formData.platform}
                label="Platform"
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              >
                <MenuItem value="admob">AdMob</MenuItem>
                <MenuItem value="adsense">AdSense</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Ad Type</InputLabel>
              <Select
                value={formData.ad_type}
                label="Ad Type"
                onChange={(e) => setFormData({ ...formData, ad_type: e.target.value as any })}
              >
                <MenuItem value="banner">Banner</MenuItem>
                <MenuItem value="interstitial">Interstitial</MenuItem>
                <MenuItem value="native">Native</MenuItem>
                <MenuItem value="rewarded">Rewarded</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Placement ID"
              value={formData.placement_id}
              onChange={(e) => setFormData({ ...formData, placement_id: e.target.value })}
              fullWidth
              required
              placeholder="ca-app-pub-xxxx/1234567890"
            />
            <TextField
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
              required
              placeholder="e.g., home_top, listing_detail"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.placement_id || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : editingAd ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Ad Placement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{adToDelete?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
