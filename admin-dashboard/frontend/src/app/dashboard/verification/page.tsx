'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Snackbar,
  Avatar,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  VerifiedUser,
  CheckCircle,
  Cancel,
  PersonAdd,
  Search,
  Refresh,
  Star,
  WorkspacePremium,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface VerificationRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  current_tier: string;
  requested_tier: string;
  reason?: string;
  status: string;
  created_at: string;
}

interface VerifiedUser {
  user_id: string;
  name: string;
  email: string;
  verification?: {
    tier: string;
    verified_at: string;
    verified_by: string;
  };
}

interface TierInfo {
  id: string;
  name: string;
  benefits: {
    badge: string | null;
    commission_discount: number;
    search_priority_boost: number;
  };
}

interface Stats {
  by_tier: Record<string, number>;
  total_verified: number;
  pending_requests: number;
}

const TIER_COLORS: Record<string, string> = {
  unverified: 'default',
  verified_user: 'info',
  verified_seller: 'success',
  premium_verified_seller: 'warning',
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  verified_user: <VerifiedUser fontSize="small" />,
  verified_seller: <Star fontSize="small" />,
  premium_verified_seller: <WorkspacePremium fontSize="small" />,
};

export default function VerificationPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Dialog states
  const [processDialog, setProcessDialog] = useState<{ open: boolean; request: VerificationRequest | null; action: string }>({
    open: false,
    request: null,
    action: '',
  });
  const [setTierDialog, setSetTierDialog] = useState<{ open: boolean; user: VerifiedUser | null }>({
    open: false,
    user: null,
  });
  const [selectedNewTier, setSelectedNewTier] = useState('');
  const [actionReason, setActionReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tiersRes] = await Promise.all([
        api.get('/verification/stats'),
        api.get('/verification/tiers'),
      ]);
      setStats(statsRes);
      setTiers(tiersRes.tiers);
    } catch (error) {
      console.error('Failed to fetch verification data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await api.get('/verification/requests');
      setPendingRequests(res.requests || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  }, []);

  const fetchVerifiedUsers = useCallback(async (tier?: string) => {
    try {
      const params = tier ? `?tier=${tier}` : '';
      const res = await api.get(`/verification/users${params}`);
      setVerifiedUsers(res.users || []);
    } catch (error) {
      console.error('Failed to fetch verified users:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPendingRequests();
    fetchVerifiedUsers();
  }, [fetchData, fetchPendingRequests, fetchVerifiedUsers]);

  const handleProcessRequest = async () => {
    if (!processDialog.request) return;
    
    try {
      await api.post(`/verification/requests/${processDialog.request.id}/process`, {
        action: processDialog.action,
        reason: actionReason,
      });
      setSnackbar({
        open: true,
        message: `Request ${processDialog.action}d successfully`,
        severity: 'success',
      });
      setProcessDialog({ open: false, request: null, action: '' });
      setActionReason('');
      fetchData();
      fetchPendingRequests();
      fetchVerifiedUsers();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${processDialog.action} request`,
        severity: 'error',
      });
    }
  };

  const handleSetUserTier = async () => {
    if (!setTierDialog.user || !selectedNewTier) return;
    
    try {
      await api.put(`/verification/users/${setTierDialog.user.user_id}`, {
        tier: selectedNewTier,
        reason: actionReason,
      });
      setSnackbar({
        open: true,
        message: 'User verification tier updated',
        severity: 'success',
      });
      setSetTierDialog({ open: false, user: null });
      setSelectedNewTier('');
      setActionReason('');
      fetchData();
      fetchVerifiedUsers(selectedTierFilter || undefined);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update user verification',
        severity: 'error',
      });
    }
  };

  const handleFilterChange = (tier: string) => {
    setSelectedTierFilter(tier);
    fetchVerifiedUsers(tier || undefined);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          User Verification
        </Typography>
        <Button startIcon={<Refresh />} onClick={() => { fetchData(); fetchPendingRequests(); fetchVerifiedUsers(); }}>
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Requests</Typography>
              <Typography variant="h4" color="warning.main">{stats?.pending_requests || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Verified Users</Typography>
              <Typography variant="h4" color="info.main">{stats?.by_tier?.verified_user || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Verified Sellers</Typography>
              <Typography variant="h4" color="success.main">{stats?.by_tier?.verified_seller || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Premium Sellers</Typography>
              <Typography variant="h4" color="warning.main">{stats?.by_tier?.premium_verified_seller || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Pending Requests (${pendingRequests.length})`} />
          <Tab label="Verified Users" />
          <Tab label="Tier Benefits" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pending Verification Requests</Typography>
            {pendingRequests.length === 0 ? (
              <Alert severity="info">No pending verification requests</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Current Tier</TableCell>
                      <TableCell>Requested Tier</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.user_name}</TableCell>
                        <TableCell>{request.user_email}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={request.current_tier.replace(/_/g, ' ')}
                            color={TIER_COLORS[request.current_tier] as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={request.requested_tier.replace(/_/g, ' ')}
                            color={TIER_COLORS[request.requested_tier] as any}
                            icon={TIER_ICONS[request.requested_tier] as any}
                          />
                        </TableCell>
                        <TableCell>{request.reason || '-'}</TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Tooltip title="Approve">
                            <IconButton 
                              color="success" 
                              onClick={() => setProcessDialog({ open: true, request, action: 'approve' })}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              color="error"
                              onClick={() => setProcessDialog({ open: true, request, action: 'reject' })}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Verified Users</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Tier</InputLabel>
                <Select
                  value={selectedTierFilter}
                  label="Filter by Tier"
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  <MenuItem value="">All Tiers</MenuItem>
                  <MenuItem value="verified_user">Verified Users</MenuItem>
                  <MenuItem value="verified_seller">Verified Sellers</MenuItem>
                  <MenuItem value="premium_verified_seller">Premium Sellers</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Verified At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verifiedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>{user.name?.[0]}</Avatar>
                          {user.name}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small"
                          label={user.verification?.tier?.replace(/_/g, ' ') || 'Unknown'}
                          color={TIER_COLORS[user.verification?.tier || 'unverified'] as any}
                          icon={TIER_ICONS[user.verification?.tier || ''] as any}
                        />
                      </TableCell>
                      <TableCell>
                        {user.verification?.verified_at 
                          ? new Date(user.verification.verified_at).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          onClick={() => {
                            setSetTierDialog({ open: true, user });
                            setSelectedNewTier(user.verification?.tier || '');
                          }}
                        >
                          Change Tier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Grid container spacing={3}>
          {tiers.map((tier) => (
            <Grid size={{ xs: 12, md: 6, lg: 3 }} key={tier.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {TIER_ICONS[tier.id] || <VerifiedUser />}
                    <Typography variant="h6">{tier.name}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Badge</Typography>
                    <Chip 
                      size="small"
                      label={tier.benefits.badge || 'None'}
                      color={TIER_COLORS[tier.id] as any}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Commission Discount</Typography>
                    <Typography variant="h6" color="success.main">
                      {tier.benefits.commission_discount}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Search Priority Boost</Typography>
                    <Typography variant="h6" color="primary.main">
                      +{tier.benefits.search_priority_boost}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Process Request Dialog */}
      <Dialog open={processDialog.open} onClose={() => setProcessDialog({ open: false, request: null, action: '' })}>
        <DialogTitle>
          {processDialog.action === 'approve' ? 'Approve' : 'Reject'} Verification Request
        </DialogTitle>
        <DialogContent>
          {processDialog.request && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>User:</strong> {processDialog.request.user_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Requested Tier:</strong> {processDialog.request.requested_tier.replace(/_/g, ' ')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason (optional)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialog({ open: false, request: null, action: '' })}>Cancel</Button>
          <Button 
            variant="contained" 
            color={processDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleProcessRequest}
          >
            {processDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Tier Dialog */}
      <Dialog open={setTierDialog.open} onClose={() => setSetTierDialog({ open: false, user: null })}>
        <DialogTitle>Change User Verification Tier</DialogTitle>
        <DialogContent>
          {setTierDialog.user && (
            <Box sx={{ mt: 1, minWidth: 300 }}>
              <Typography variant="body2" gutterBottom>
                <strong>User:</strong> {setTierDialog.user.name}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>New Tier</InputLabel>
                <Select
                  value={selectedNewTier}
                  label="New Tier"
                  onChange={(e) => setSelectedNewTier(e.target.value)}
                >
                  <MenuItem value="unverified">Unverified</MenuItem>
                  <MenuItem value="verified_user">Verified User</MenuItem>
                  <MenuItem value="verified_seller">Verified Seller</MenuItem>
                  <MenuItem value="premium_verified_seller">Premium Verified Seller</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Reason (optional)"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetTierDialog({ open: false, user: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSetUserTier}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
