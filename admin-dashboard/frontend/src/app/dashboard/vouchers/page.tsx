'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Percent,
  AttachMoney,
  CardGiftcard,
  ContentCopy,
  Visibility,
  FileUpload,
  Download,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface Voucher {
  id: string;
  code: string;
  voucher_type: 'amount' | 'percent' | 'credit';
  value: number;
  description?: string;
  status: string;
  total_uses: number;
  max_uses?: number;
  max_uses_per_user: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  new_users_only?: boolean;
  verified_users_only?: boolean;
  premium_users_only?: boolean;
  stackable?: boolean;
}

interface VoucherStats {
  total_vouchers: number;
  active_vouchers: number;
  total_redemptions: number;
  total_discount_given: number;
  by_type: Record<string, number>;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  
  // Import state
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    voucher_type: 'amount' as 'amount' | 'percent' | 'credit',
    value: 0,
    description: '',
    max_uses: '',
    max_uses_per_user: 1,
    min_order_amount: '',
    max_discount_amount: '',
    valid_until: '',
    new_users_only: false,
    verified_users_only: false,
    premium_users_only: false,
    stackable: false,
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vouchersRes, statsRes] = await Promise.all([
        api.getVouchers({ status: statusFilter || undefined, voucher_type: typeFilter || undefined }),
        api.getVoucherStats()
      ]);
      setVouchers(vouchersRes.vouchers || []);
      setStats(statsRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const handleCreate = async () => {
    setError('');
    try {
      const data = {
        ...formData,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : undefined,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        valid_until: formData.valid_until || undefined,
      };
      await api.createVoucher(data);
      setSuccess('Voucher created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create voucher');
    }
  };

  const handleUpdate = async () => {
    if (!selectedVoucher) return;
    setError('');
    try {
      const data = {
        description: formData.description,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
        max_uses_per_user: formData.max_uses_per_user,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : undefined,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        valid_until: formData.valid_until || undefined,
        new_users_only: formData.new_users_only,
        verified_users_only: formData.verified_users_only,
        premium_users_only: formData.premium_users_only,
        stackable: formData.stackable,
        is_active: formData.is_active,
      };
      await api.updateVoucher(selectedVoucher.id, data);
      setSuccess('Voucher updated successfully');
      setEditDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update voucher');
    }
  };

  const handleDelete = async () => {
    if (!selectedVoucher) return;
    try {
      await api.deleteVoucher(selectedVoucher.id);
      setSuccess('Voucher deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedVoucher(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete voucher');
    }
  };

  const handleViewDetails = async (voucher: Voucher) => {
    try {
      const details = await api.getVoucher(voucher.id);
      setSelectedVoucher(details);
      setViewDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load voucher details');
    }
  };

  const openEditDialog = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setFormData({
      code: voucher.code,
      voucher_type: voucher.voucher_type,
      value: voucher.value,
      description: voucher.description || '',
      max_uses: voucher.max_uses?.toString() || '',
      max_uses_per_user: voucher.max_uses_per_user,
      min_order_amount: voucher.min_order_amount?.toString() || '',
      max_discount_amount: voucher.max_discount_amount?.toString() || '',
      valid_until: voucher.valid_until ? voucher.valid_until.split('T')[0] : '',
      new_users_only: voucher.new_users_only || false,
      verified_users_only: voucher.verified_users_only || false,
      premium_users_only: voucher.premium_users_only || false,
      stackable: voucher.stackable || false,
      is_active: voucher.is_active,
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      voucher_type: 'amount',
      value: 0,
      description: '',
      max_uses: '',
      max_uses_per_user: 1,
      min_order_amount: '',
      max_discount_amount: '',
      valid_until: '',
      new_users_only: false,
      verified_users_only: false,
      premium_users_only: false,
      stackable: false,
      is_active: true,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Code copied to clipboard');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'depleted': return 'warning';
      case 'disabled': return 'default';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'amount': return <AttachMoney fontSize="small" />;
      case 'percent': return <Percent fontSize="small" />;
      case 'credit': return <CardGiftcard fontSize="small" />;
      default: return null;
    }
  };

  const formatValue = (voucher: Voucher) => {
    switch (voucher.voucher_type) {
      case 'amount': return `$${voucher.value.toFixed(2)}`;
      case 'percent': return `${voucher.value}%`;
      case 'credit': return `${voucher.value} credits`;
      default: return voucher.value;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Voucher Management</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage discount vouchers</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            Create Voucher
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight={700}>{stats.total_vouchers}</Typography>
                <Typography variant="body2" color="text.secondary">Total Vouchers</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight={700} color="success.main">{stats.active_vouchers}</Typography>
                <Typography variant="body2" color="text.secondary">Active Vouchers</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight={700} color="primary.main">{stats.total_redemptions}</Typography>
                <Typography variant="body2" color="text.secondary">Total Redemptions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight={700} color="warning.main">${stats.total_discount_given.toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">Total Discounts Given</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="depleted">Depleted</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Type">
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="amount">Fixed Amount</MenuItem>
                  <MenuItem value="percent">Percentage</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : vouchers.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">No vouchers found</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Usage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valid Until</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600} fontFamily="monospace">{voucher.code}</Typography>
                        <Tooltip title="Copy code">
                          <IconButton size="small" onClick={() => copyToClipboard(voucher.code)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {voucher.description && (
                        <Typography variant="caption" color="text.secondary">{voucher.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={getTypeIcon(voucher.voucher_type)} 
                        label={voucher.voucher_type} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{formatValue(voucher)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography>
                        {voucher.total_uses} / {voucher.max_uses || '∞'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={voucher.status} size="small" color={getStatusColor(voucher.status)} />
                    </TableCell>
                    <TableCell>
                      {voucher.valid_until ? new Date(voucher.valid_until).toLocaleDateString() : 'No expiry'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(voucher)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEditDialog(voucher)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => { setSelectedVoucher(voucher); setDeleteDialogOpen(true); }}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Voucher</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Voucher Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              fullWidth
              required
              helperText="Unique code that users will enter"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.voucher_type}
                    onChange={(e) => setFormData({ ...formData, voucher_type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="amount">Fixed Amount ($)</MenuItem>
                    <MenuItem value="percent">Percentage (%)</MenuItem>
                    <MenuItem value="credit">Credit Boost</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: formData.voucher_type === 'amount' ? <InputAdornment position="start">$</InputAdornment> : undefined,
                    endAdornment: formData.voucher_type === 'percent' ? <InputAdornment position="end">%</InputAdornment> : undefined,
                  }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Max Total Uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  fullWidth
                  helperText="Leave empty for unlimited"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Max Uses Per User"
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Min Order Amount"
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Max Discount Amount"
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText="For percent type"
                />
              </Grid>
            </Grid>
            <TextField
              label="Valid Until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty for no expiry"
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Restrictions</Typography>
              <FormControlLabel
                control={<Switch checked={formData.new_users_only} onChange={(e) => setFormData({ ...formData, new_users_only: e.target.checked })} />}
                label="New users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.verified_users_only} onChange={(e) => setFormData({ ...formData, verified_users_only: e.target.checked })} />}
                label="Verified users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.premium_users_only} onChange={(e) => setFormData({ ...formData, premium_users_only: e.target.checked })} />}
                label="Premium users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.stackable} onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })} />}
                label="Stackable with other vouchers"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.code || formData.value <= 0}>
            Create Voucher
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Voucher: {selectedVoucher?.code}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">Code and type cannot be changed after creation</Alert>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Max Total Uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Max Uses Per User"
                  type="number"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData({ ...formData, max_uses_per_user: parseInt(e.target.value) || 1 })}
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label="Valid Until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Restrictions</Typography>
              <FormControlLabel
                control={<Switch checked={formData.new_users_only} onChange={(e) => setFormData({ ...formData, new_users_only: e.target.checked })} />}
                label="New users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.verified_users_only} onChange={(e) => setFormData({ ...formData, verified_users_only: e.target.checked })} />}
                label="Verified users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.premium_users_only} onChange={(e) => setFormData({ ...formData, premium_users_only: e.target.checked })} />}
                label="Premium users only"
              />
              <FormControlLabel
                control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />}
                label="Active"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Voucher Details: {selectedVoucher?.code}</DialogTitle>
        <DialogContent>
          {selectedVoucher && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Typography>{selectedVoucher.voucher_type}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Value</Typography>
                  <Typography fontWeight={600}>{formatValue(selectedVoucher)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip label={selectedVoucher.status} color={getStatusColor(selectedVoucher.status)} size="small" />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Usage</Typography>
                  <Typography>{selectedVoucher.total_uses} / {selectedVoucher.max_uses || '∞'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography>{selectedVoucher.description || 'No description'}</Typography>
                </Grid>
              </Grid>
              
              {(selectedVoucher as any).usage_history?.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Recent Usage</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>User ID</TableCell>
                          <TableCell>Order Amount</TableCell>
                          <TableCell>Discount</TableCell>
                          <TableCell>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedVoucher as any).usage_history.slice(0, 10).map((usage: any) => (
                          <TableRow key={usage.id}>
                            <TableCell>{usage.user_id}</TableCell>
                            <TableCell>${usage.order_amount?.toFixed(2)}</TableCell>
                            <TableCell>${usage.discount_amount?.toFixed(2)}</TableCell>
                            <TableCell>{new Date(usage.used_at).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Voucher</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete voucher <strong>{selectedVoucher?.code}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
