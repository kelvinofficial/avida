'use client';

import { useState, useEffect } from 'react';
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
  Avatar,
  Checkbox,
  Tooltip,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Slider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Check,
  Close,
  Delete,
  Refresh,
  Visibility,
  Image as ImageIcon,
  Person,
  Settings,
  History,
  Warning,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface Listing {
  id: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  images?: string[];
  user_id: string;
  user?: { name?: string; email?: string };
  moderation_status?: string;
  moderation_reason?: string;
  created_at: string;
  is_active: boolean;
}

interface ModerationLog {
  id: string;
  listing_id: string;
  listing_title?: string;
  admin_email?: string;
  action: string;
  reason?: string;
  created_at: string;
}

interface LimitSettings {
  require_moderation: boolean;
  auto_approve_verified_users: boolean;
  auto_approve_premium_users: boolean;
  default_tier: string;
  tier_limits: Record<string, number | null>;
  moderation_enabled: boolean;
}

export default function ListingModerationPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [settings, setSettings] = useState<LimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('pending');
  
  // Selection state
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [pendingAction, setPendingAction] = useState<'validate' | 'reject' | 'remove' | null>(null);
  
  // Form state
  const [actionReason, setActionReason] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);

  // Stats
  const [pendingCount, setPendingCount] = useState(0);

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getModerationQueue({ status: statusFilter });
      setListings(res.listings || []);
      setPendingCount(res.pending_count || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.getModerationLog({ limit: 100 });
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error('Failed to load logs', err);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.getListingLimitSettings();
      setSettings(res);
    } catch (err: any) {
      console.error('Failed to load settings', err);
    }
  };

  useEffect(() => {
    loadQueue();
    loadLogs();
    loadSettings();
  }, [statusFilter]);

  const handleAction = async () => {
    if (!selectedListing || !pendingAction) return;
    setError('');
    try {
      await api.moderateListing(selectedListing.id, {
        action: pendingAction,
        reason: actionReason,
        notify_user: notifyUser,
      });
      setSuccess(`Listing ${pendingAction === 'validate' ? 'approved' : pendingAction === 'reject' ? 'rejected' : 'removed'} successfully`);
      setActionDialogOpen(false);
      setActionReason('');
      loadQueue();
      loadLogs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Action failed');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedListings.length === 0) return;
    setError('');
    try {
      const result = await api.bulkModerateListing(
        selectedListings,
        action,
        actionReason,
        notifyUser
      );
      setSuccess(`Bulk action completed: ${result.success} succeeded, ${result.failed} failed`);
      setBulkActionDialogOpen(false);
      setSelectedListings([]);
      setActionReason('');
      loadQueue();
      loadLogs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Bulk action failed');
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await api.updateListingLimitSettings(settings);
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    }
  };

  const openActionDialog = (listing: Listing, action: 'validate' | 'reject' | 'remove') => {
    setSelectedListing(listing);
    setPendingAction(action);
    setActionReason('');
    setActionDialogOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedListings.length === listings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(listings.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedListings.includes(id)) {
      setSelectedListings(selectedListings.filter(i => i !== id));
    } else {
      setSelectedListings([...selectedListings, id]);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'validate': return 'success';
      case 'reject': return 'warning';
      case 'remove': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Listing Moderation</Typography>
          <Typography variant="body2" color="text.secondary">
            Review and moderate user listings
            {pendingCount > 0 && (
              <Chip label={`${pendingCount} pending`} size="small" color="warning" sx={{ ml: 1 }} />
            )}
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={() => { loadQueue(); loadLogs(); }} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Moderation Queue" icon={<Warning />} iconPosition="start" />
        <Tab label="Moderation Log" icon={<History />} iconPosition="start" />
        <Tab label="Settings" icon={<Settings />} iconPosition="start" />
      </Tabs>

      {/* Queue Tab */}
      {currentTab === 0 && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                      <MenuItem value="pending">Pending Review</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {selectedListings.length > 0 && (
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Chip label={`${selectedListings.length} selected`} />
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="success"
                        onClick={() => { setPendingAction('validate'); setBulkActionDialogOpen(true); }}
                      >
                        Approve All
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="warning"
                        onClick={() => { setPendingAction('reject'); setBulkActionDialogOpen(true); }}
                      >
                        Reject All
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="error"
                        onClick={() => { setPendingAction('remove'); setBulkActionDialogOpen(true); }}
                      >
                        Remove All
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <TableContainer>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : listings.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Typography color="text.secondary">No listings found</Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedListings.length === listings.length && listings.length > 0}
                          indeterminate={selectedListings.length > 0 && selectedListings.length < listings.length}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Listing</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {listings.map((listing) => (
                      <TableRow key={listing.id} hover selected={selectedListings.includes(listing.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedListings.includes(listing.id)}
                            onChange={() => toggleSelect(listing.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {listing.images?.[0] ? (
                              <Avatar variant="rounded" src={listing.images[0]} sx={{ width: 48, height: 48 }}>
                                <ImageIcon />
                              </Avatar>
                            ) : (
                              <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'grey.200' }}>
                                <ImageIcon color="disabled" />
                              </Avatar>
                            )}
                            <Box>
                              <Typography fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                                {listing.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {listing.category || 'Uncategorized'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              <Person fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{listing.user?.name || 'Unknown'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {listing.user?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {listing.price ? `${listing.currency || '$'}${listing.price.toLocaleString()}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={listing.moderation_status || 'pending'} 
                            size="small" 
                            color={getStatusColor(listing.moderation_status)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(listing.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => { setSelectedListing(listing); setViewDialogOpen(true); }}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {statusFilter === 'pending' && (
                            <>
                              <Tooltip title="Approve">
                                <IconButton size="small" color="success" onClick={() => openActionDialog(listing, 'validate')}>
                                  <Check />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" color="warning" onClick={() => openActionDialog(listing, 'reject')}>
                                  <Close />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Remove">
                            <IconButton size="small" color="error" onClick={() => openActionDialog(listing, 'remove')}>
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
        </>
      )}

      {/* Logs Tab */}
      {currentTab === 1 && (
        <Card>
          <TableContainer>
            {logs.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography color="text.secondary">No moderation history</Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Listing</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="body2">{log.listing_title || log.listing_id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" color={getActionColor(log.action)} />
                      </TableCell>
                      <TableCell>{log.admin_email}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {log.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Card>
      )}

      {/* Settings Tab */}
      {currentTab === 2 && settings && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Moderation Settings</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.moderation_enabled}
                    onChange={(e) => setSettings({ ...settings, moderation_enabled: e.target.checked })}
                  />
                }
                label="Enable Listing Moderation"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.require_moderation}
                    onChange={(e) => setSettings({ ...settings, require_moderation: e.target.checked })}
                    disabled={!settings.moderation_enabled}
                  />
                }
                label="Require Moderation for New Listings"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_approve_verified_users}
                    onChange={(e) => setSettings({ ...settings, auto_approve_verified_users: e.target.checked })}
                    disabled={!settings.moderation_enabled}
                  />
                }
                label="Auto-approve Listings from Verified Users"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auto_approve_premium_users}
                    onChange={(e) => setSettings({ ...settings, auto_approve_premium_users: e.target.checked })}
                    disabled={!settings.moderation_enabled}
                  />
                }
                label="Auto-approve Listings from Premium Users"
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>Default Listing Tier</Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={settings.default_tier}
                    onChange={(e) => setSettings({ ...settings, default_tier: e.target.value })}
                  >
                    <MenuItem value="free">Free (5 listings)</MenuItem>
                    <MenuItem value="basic">Basic (20 listings)</MenuItem>
                    <MenuItem value="premium">Premium (100 listings)</MenuItem>
                    <MenuItem value="unlimited">Unlimited</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>Tier Limits</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Free Tier"
                      type="number"
                      size="small"
                      value={settings.tier_limits.free || 5}
                      onChange={(e) => setSettings({
                        ...settings,
                        tier_limits: { ...settings.tier_limits, free: parseInt(e.target.value) || 5 }
                      })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Basic Tier"
                      type="number"
                      size="small"
                      value={settings.tier_limits.basic || 20}
                      onChange={(e) => setSettings({
                        ...settings,
                        tier_limits: { ...settings.tier_limits, basic: parseInt(e.target.value) || 20 }
                      })}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField
                      label="Premium Tier"
                      type="number"
                      size="small"
                      value={settings.tier_limits.premium || 100}
                      onChange={(e) => setSettings({
                        ...settings,
                        tier_limits: { ...settings.tier_limits, premium: parseInt(e.target.value) || 100 }
                      })}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </Box>

              <Button variant="contained" onClick={handleSaveSettings} sx={{ alignSelf: 'flex-start' }}>
                Save Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Listing Details</DialogTitle>
        <DialogContent>
          {selectedListing && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  {selectedListing.images?.[0] ? (
                    <Box
                      component="img"
                      src={selectedListing.images[0]}
                      alt={selectedListing.title}
                      sx={{ width: '100%', height: 250, objectFit: 'cover', borderRadius: 2 }}
                    />
                  ) : (
                    <Box sx={{ width: '100%', height: 250, bgcolor: 'grey.200', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon sx={{ fontSize: 64, color: 'grey.400' }} />
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>{selectedListing.title}</Typography>
                  <Typography variant="h4" color="primary" fontWeight={700} gutterBottom>
                    {selectedListing.price ? `${selectedListing.currency || '$'}${selectedListing.price.toLocaleString()}` : 'Price not set'}
                  </Typography>
                  <Chip 
                    label={selectedListing.moderation_status || 'pending'} 
                    color={getStatusColor(selectedListing.moderation_status)}
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Category: {selectedListing.category || 'Uncategorized'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Posted: {new Date(selectedListing.created_at).toLocaleString()}
                  </Typography>
                  {selectedListing.user && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2">Seller</Typography>
                      <Typography>{selectedListing.user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{selectedListing.user.email}</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" gutterBottom>Description</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedListing.description || 'No description provided'}
                  </Typography>
                </Grid>
                {selectedListing.moderation_reason && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">Moderation Note</Typography>
                      <Typography variant="body2">{selectedListing.moderation_reason}</Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedListing && selectedListing.moderation_status !== 'approved' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => { setViewDialogOpen(false); openActionDialog(selectedListing, 'validate'); }}
            >
              Approve
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {pendingAction === 'validate' && 'Approve Listing'}
          {pendingAction === 'reject' && 'Reject Listing'}
          {pendingAction === 'remove' && 'Remove Listing'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography gutterBottom>
              {pendingAction === 'validate' && `Are you sure you want to approve "${selectedListing?.title}"?`}
              {pendingAction === 'reject' && `Are you sure you want to reject "${selectedListing?.title}"?`}
              {pendingAction === 'remove' && `Are you sure you want to permanently remove "${selectedListing?.title}"?`}
            </Typography>
            {pendingAction !== 'validate' && (
              <TextField
                label="Reason (optional)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mt: 2 }}
                placeholder={pendingAction === 'reject' ? 'Explain why this listing was rejected...' : 'Reason for removal...'}
              />
            )}
            <FormControlLabel
              control={<Switch checked={notifyUser} onChange={(e) => setNotifyUser(e.target.checked)} />}
              label="Notify user about this decision"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color={pendingAction === 'validate' ? 'success' : pendingAction === 'remove' ? 'error' : 'warning'}
            onClick={handleAction}
          >
            {pendingAction === 'validate' && 'Approve'}
            {pendingAction === 'reject' && 'Reject'}
            {pendingAction === 'remove' && 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialogOpen} onClose={() => setBulkActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Bulk {pendingAction === 'validate' ? 'Approve' : pendingAction === 'reject' ? 'Reject' : 'Remove'} Listings
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will affect {selectedListings.length} listings
            </Alert>
            {pendingAction !== 'validate' && (
              <TextField
                label="Reason (optional)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            )}
            <FormControlLabel
              control={<Switch checked={notifyUser} onChange={(e) => setNotifyUser(e.target.checked)} />}
              label="Notify users"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained"
            color={pendingAction === 'validate' ? 'success' : pendingAction === 'remove' ? 'error' : 'warning'}
            onClick={() => handleBulkAction(pendingAction!)}
          >
            Confirm ({selectedListings.length} listings)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
