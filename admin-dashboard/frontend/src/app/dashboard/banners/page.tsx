'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Divider,
  FormGroup,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Slider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Image,
  Code,
  Javascript,
  Analytics,
  Download,
  Refresh,
  CheckCircle,
  Cancel,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/lib/api';

interface Banner {
  id: string;
  name: string;
  placement: string;
  size: string;
  content: {
    type: string;
    image_url?: string;
    html_content?: string;
    script_content?: string;
    click_url?: string;
  };
  targeting: {
    devices: string[];
    countries: string[];
    cities: string[];
    categories: string[];
  };
  schedule: {
    start_date?: string;
    end_date?: string;
  };
  priority: number;
  rotation_rule: string;
  is_active: boolean;
  is_sponsored: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  is_seller_banner?: boolean;
  seller_id?: string;
  approval_status?: string;
  created_at: string;
}

interface BannerSlot {
  id: string;
  name: string;
  description: string;
  recommended_sizes: string[];
}

interface BannerSize {
  width: number;
  height: number;
  name: string;
  placements: string[];
}

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];

export default function BannersPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [slots, setSlots] = useState<BannerSlot[]>([]);
  const [sizes, setSizes] = useState<Record<string, BannerSize>>({});
  const [totalBanners, setTotalBanners] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterPlacement, setFilterPlacement] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Pending seller banners
  const [pendingBanners, setPendingBanners] = useState<Banner[]>([]);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    placement: '',
    size: '728x90',
    content_type: 'image',
    image_url: '',
    html_content: '',
    script_content: '',
    click_url: '',
    devices: ['all'],
    countries: [] as string[],
    categories: [] as string[],
    start_date: '',
    end_date: '',
    priority: 5,
    rotation_rule: 'random',
    is_sponsored: true,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filterPlacement, filterActive]);

  useEffect(() => {
    if (tabValue === 1) {
      loadAnalytics();
    } else if (tabValue === 2) {
      loadPendingBanners();
    }
  }, [tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersRes, slotsRes, sizesRes] = await Promise.all([
        api.getBanners(page + 1, rowsPerPage, filterPlacement || undefined, filterActive === '' ? undefined : filterActive === 'true'),
        api.getBannerSlots(),
        api.getBannerSizes(),
      ]);
      setBanners(bannersRes.banners || []);
      setTotalBanners(bannersRes.total || 0);
      setSlots(slotsRes || []);
      setSizes(sizesRes || {});
    } catch (error) {
      console.error('Failed to load banners:', error);
      setSnackbar({ open: true, message: 'Failed to load banners', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.getBannerAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadPendingBanners = async () => {
    try {
      const data = await api.getPendingSellerBanners();
      setPendingBanners(data || []);
    } catch (error) {
      console.error('Failed to load pending banners:', error);
    }
  };

  const handleCreateBanner = () => {
    setEditingBanner(null);
    setFormData({
      name: '',
      placement: '',
      size: '728x90',
      content_type: 'image',
      image_url: '',
      html_content: '',
      script_content: '',
      click_url: '',
      devices: ['all'],
      countries: [],
      categories: [],
      start_date: '',
      end_date: '',
      priority: 5,
      rotation_rule: 'random',
      is_sponsored: true,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name,
      placement: banner.placement,
      size: banner.size,
      content_type: banner.content.type,
      image_url: banner.content.image_url || '',
      html_content: banner.content.html_content || '',
      script_content: banner.content.script_content || '',
      click_url: banner.content.click_url || '',
      devices: banner.targeting.devices || ['all'],
      countries: banner.targeting.countries || [],
      categories: banner.targeting.categories || [],
      start_date: banner.schedule.start_date?.split('T')[0] || '',
      end_date: banner.schedule.end_date?.split('T')[0] || '',
      priority: banner.priority,
      rotation_rule: banner.rotation_rule,
      is_sponsored: banner.is_sponsored,
      is_active: banner.is_active,
    });
    setDialogOpen(true);
  };

  const handleSaveBanner = async () => {
    setSaving(true);
    try {
      const bannerData = {
        name: formData.name,
        placement: formData.placement,
        size: formData.size,
        content: {
          type: formData.content_type,
          image_url: formData.content_type === 'image' ? formData.image_url : undefined,
          html_content: formData.content_type === 'html' ? formData.html_content : undefined,
          script_content: formData.content_type === 'script' ? formData.script_content : undefined,
          click_url: formData.click_url || undefined,
        },
        targeting: {
          devices: formData.devices,
          countries: formData.countries,
          cities: [],
          categories: formData.categories,
        },
        schedule: {
          start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
        },
        priority: formData.priority,
        rotation_rule: formData.rotation_rule,
        is_sponsored: formData.is_sponsored,
        is_active: formData.is_active,
      };

      if (editingBanner) {
        await api.updateBanner(editingBanner.id, bannerData);
        setSnackbar({ open: true, message: 'Banner updated successfully', severity: 'success' });
      } else {
        await api.createBanner(bannerData);
        setSnackbar({ open: true, message: 'Banner created successfully', severity: 'success' });
      }
      
      setDialogOpen(false);
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save banner', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await api.deleteBanner(bannerId);
      setSnackbar({ open: true, message: 'Banner deleted', severity: 'success' });
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete banner', severity: 'error' });
    }
  };

  const handleToggleBanner = async (bannerId: string, isActive: boolean) => {
    try {
      await api.toggleBanner(bannerId, isActive);
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to toggle banner', severity: 'error' });
    }
  };

  const handleApproveBanner = async (bannerId: string, approved: boolean) => {
    try {
      await api.approveSellerBanner(bannerId, approved);
      setSnackbar({ open: true, message: approved ? 'Banner approved' : 'Banner rejected', severity: 'success' });
      loadPendingBanners();
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update banner', severity: 'error' });
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image fontSize="small" />;
      case 'html': return <Code fontSize="small" />;
      case 'script': return <Javascript fontSize="small" />;
      default: return <Image fontSize="small" />;
    }
  };

  const getPlacementName = (placementId: string) => {
    const slot = slots.find(s => s.id === placementId);
    return slot?.name || placementId;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Banner Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage display banners across the app and website
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<Add />}
          onClick={handleCreateBanner}
        >
          Create Banner
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Image />} label="All Banners" iconPosition="start" />
        <Tab icon={<Analytics />} label="Analytics" iconPosition="start" />
        <Tab icon={<Schedule />} label={`Pending Approval (${pendingBanners.length})`} iconPosition="start" />
      </Tabs>

      {/* Tab 0: All Banners */}
      {tabValue === 0 && (
        <>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Placement</InputLabel>
              <Select
                value={filterPlacement}
                label="Placement"
                onChange={(e) => setFilterPlacement(e.target.value)}
              >
                <MenuItem value="">All Placements</MenuItem>
                {slots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>{slot.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterActive}
                label="Status"
                onChange={(e) => setFilterActive(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
            <Button startIcon={<Refresh />} onClick={loadData}>Refresh</Button>
          </Box>

          {/* Banners Table */}
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Banner</TableCell>
                  <TableCell>Placement</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="center">Priority</TableCell>
                  <TableCell align="right">Impressions</TableCell>
                  <TableCell align="right">Clicks</TableCell>
                  <TableCell align="right">CTR</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No banners found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  banners.map((banner) => (
                    <TableRow key={banner.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{banner.name}</Typography>
                          {banner.is_seller_banner && (
                            <Chip label="Seller" size="small" color="info" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{getPlacementName(banner.placement)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={banner.size} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getContentTypeIcon(banner.content.type)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {banner.content.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={banner.priority} 
                          size="small"
                          color={banner.priority >= 7 ? 'success' : banner.priority >= 4 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">{banner.impressions.toLocaleString()}</TableCell>
                      <TableCell align="right">{banner.clicks.toLocaleString()}</TableCell>
                      <TableCell align="right">{banner.ctr}%</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={banner.is_active}
                          onChange={(e) => handleToggleBanner(banner.id, e.target.checked)}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEditBanner(banner)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteBanner(banner.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalBanners}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Card>
        </>
      )}

      {/* Tab 1: Analytics */}
      {tabValue === 1 && (
        <Box>
          {analyticsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : analytics ? (
            <Grid container spacing={3}>
              {/* Totals */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Total Impressions</Typography>
                    <Typography variant="h4" fontWeight={700}>{analytics.totals?.impressions?.toLocaleString() || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Total Clicks</Typography>
                    <Typography variant="h4" fontWeight={700}>{analytics.totals?.clicks?.toLocaleString() || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Average CTR</Typography>
                    <Typography variant="h4" fontWeight={700}>{analytics.totals?.ctr || 0}%</Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Chart */}
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600}>Performance by Day</Typography>
                      <Button startIcon={<Download />} onClick={() => api.exportBannerAnalytics()}>
                        Export CSV
                      </Button>
                    </Box>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.breakdown || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="key" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <ChartTooltip />
                          <Bar dataKey="impressions" name="Impressions" fill="#4CAF50" />
                          <Bar dataKey="clicks" name="Clicks" fill="#2196F3" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No analytics data available yet</Alert>
          )}
        </Box>
      )}

      {/* Tab 2: Pending Approval */}
      {tabValue === 2 && (
        <Box>
          {pendingBanners.length === 0 ? (
            <Alert severity="info">No pending seller banners to review</Alert>
          ) : (
            <Grid container spacing={2}>
              {pendingBanners.map((banner) => (
                <Grid size={{ xs: 12, md: 6 }} key={banner.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>{banner.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Seller: {banner.seller_id}
                          </Typography>
                        </Box>
                        <Chip label="Pending" color="warning" size="small" />
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2"><strong>Placement:</strong> {getPlacementName(banner.placement)}</Typography>
                        <Typography variant="body2"><strong>Size:</strong> {banner.size}</Typography>
                        <Typography variant="body2"><strong>Type:</strong> {banner.content.type}</Typography>
                      </Box>

                      {banner.content.type === 'image' && banner.content.image_url && (
                        <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <img 
                            src={banner.content.image_url} 
                            alt={banner.name}
                            style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'contain' }}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApproveBanner(banner.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleApproveBanner(banner.id, false)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Banner Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Placement</InputLabel>
                <Select
                  value={formData.placement}
                  label="Placement"
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                >
                  {slots.map((slot) => (
                    <MenuItem key={slot.id} value={slot.id}>
                      {slot.name} - {slot.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Size</InputLabel>
                <Select
                  value={formData.size}
                  label="Size"
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                >
                  {Object.entries(sizes).map(([key, size]) => (
                    <MenuItem key={key} value={key}>
                      {size.name} ({key})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={formData.content_type}
                  label="Content Type"
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                >
                  <MenuItem value="image">Image</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="script">Script (AdSense/AdMob)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.content_type === 'image' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Image URL"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  helperText="Direct URL to the banner image"
                />
              </Grid>
            )}

            {formData.content_type === 'html' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="HTML Content"
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  helperText="Custom HTML content for the banner"
                />
              </Grid>
            )}

            {formData.content_type === 'script' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Script Content"
                  value={formData.script_content}
                  onChange={(e) => setFormData({ ...formData, script_content: e.target.value })}
                  helperText="AdSense/AdMob script code"
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Click URL"
                value={formData.click_url}
                onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                helperText="URL to open when banner is clicked"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Targeting
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Devices</InputLabel>
                <Select
                  multiple
                  value={formData.devices}
                  label="Devices"
                  onChange={(e) => setFormData({ ...formData, devices: e.target.value as string[] })}
                  renderValue={(selected) => selected.join(', ')}
                >
                  <MenuItem value="all">All Devices</MenuItem>
                  <MenuItem value="mobile">Mobile</MenuItem>
                  <MenuItem value="tablet">Tablet</MenuItem>
                  <MenuItem value="desktop">Desktop</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Rotation Rule</InputLabel>
                <Select
                  value={formData.rotation_rule}
                  label="Rotation Rule"
                  onChange={(e) => setFormData({ ...formData, rotation_rule: e.target.value })}
                >
                  <MenuItem value="random">Random</MenuItem>
                  <MenuItem value="weighted">Weighted Priority</MenuItem>
                  <MenuItem value="fixed">Fixed (No Rotation)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography gutterBottom>Priority: {formData.priority}</Typography>
              <Slider
                value={formData.priority}
                onChange={(_, v) => setFormData({ ...formData, priority: v as number })}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_sponsored}
                    onChange={(e) => setFormData({ ...formData, is_sponsored: e.target.checked })}
                  />
                }
                label="Show 'Sponsored' label"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    color="success"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveBanner}
            disabled={saving || !formData.name || !formData.placement}
          >
            {saving ? <CircularProgress size={20} /> : editingBanner ? 'Update' : 'Create'}
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
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
