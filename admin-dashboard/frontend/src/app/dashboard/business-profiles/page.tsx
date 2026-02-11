'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  TablePagination,
  Avatar,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Refresh,
  Search,
  Business,
  Verified,
  Pending,
  Block,
  Visibility,
  Edit,
  CheckCircle,
  Cancel,
  Email,
  Phone,
  Language,
  LocationOn,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  created_at: string;
  updated_at?: string;
  verified_at?: string;
  user?: {
    name: string;
    email: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function BusinessProfilesPage() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<BusinessProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = tabValue === 0 ? 'all' : tabValue === 1 ? 'pending' : tabValue === 2 ? 'verified' : 'rejected';
      const response = await api.get(`/business-profiles/admin/list`, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: status !== 'all' ? status : undefined,
          search: searchQuery || undefined,
        },
      });
      setProfiles(response.profiles || []);
      setTotal(response.total || 0);
      setStats(response.stats || { total: 0, pending: 0, verified: 0, rejected: 0 });
    } catch (err: any) {
      console.error('Failed to fetch business profiles:', err);
      setError(err?.response?.data?.detail || 'Failed to load business profiles');
      // Set mock data for display
      setProfiles([]);
      setStats({ total: 0, pending: 0, verified: 0, rejected: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, tabValue]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleVerify = async (profileId: string) => {
    try {
      await api.post(`/business-profiles/admin/${profileId}/verify`);
      fetchProfiles();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to verify profile');
    }
  };

  const handleReject = async (profileId: string) => {
    try {
      await api.post(`/business-profiles/admin/${profileId}/reject`);
      fetchProfiles();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to reject profile');
    }
  };

  const handleViewDetails = (profile: BusinessProfile) => {
    setSelectedProfile(profile);
    setDetailsOpen(true);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'verified':
        return <Chip icon={<Verified />} label="Verified" color="success" size="small" />;
      case 'pending':
        return <Chip icon={<Pending />} label="Pending" color="warning" size="small" />;
      case 'rejected':
        return <Chip icon={<Block />} label="Rejected" color="error" size="small" />;
      case 'suspended':
        return <Chip icon={<Block />} label="Suspended" color="default" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Business Profiles
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchProfiles}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Profiles
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <Pending />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Review
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <Verified />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.verified}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verified
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}>
                  <Block />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stats.rejected}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by business name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`All (${stats.total})`} />
            <Tab label={`Pending (${stats.pending})`} />
            <Tab label={`Verified (${stats.verified})`} />
            <Tab label={`Rejected (${stats.rejected})`} />
          </Tabs>
        </CardContent>
      </Card>

      {/* Profiles Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Business</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">
                      No business profiles found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={profile.logo} sx={{ bgcolor: 'primary.main' }}>
                          <Business />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{profile.business_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {profile.website || 'No website'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{profile.user?.name || 'N/A'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {profile.user?.email || profile.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{profile.category || 'N/A'}</TableCell>
                    <TableCell>{getStatusChip(profile.status)}</TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(profile)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {profile.status === 'pending' && (
                        <>
                          <Tooltip title="Verify">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleVerify(profile.id)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(profile.id)}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
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
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={selectedProfile?.logo} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
              <Business />
            </Avatar>
            <Box>
              <Typography variant="h6">{selectedProfile?.business_name}</Typography>
              {selectedProfile && getStatusChip(selectedProfile.status)}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedProfile && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography>{selectedProfile.description || 'No description provided'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Email color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography>{selectedProfile.email || 'N/A'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Phone color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography>{selectedProfile.phone || 'N/A'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Language color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Website</Typography>
                    <Typography>{selectedProfile.website || 'N/A'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOn color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Address</Typography>
                    <Typography>{selectedProfile.address || 'N/A'}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Timeline
                </Typography>
                <Typography variant="body2">
                  Created: {new Date(selectedProfile.created_at).toLocaleString()}
                </Typography>
                {selectedProfile.verified_at && (
                  <Typography variant="body2">
                    Verified: {new Date(selectedProfile.verified_at).toLocaleString()}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedProfile?.status === 'pending' && (
            <>
              <Button
                color="error"
                startIcon={<Cancel />}
                onClick={() => {
                  handleReject(selectedProfile.id);
                  setDetailsOpen(false);
                }}
              >
                Reject
              </Button>
              <Button
                color="success"
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={() => {
                  handleVerify(selectedProfile.id);
                  setDetailsOpen(false);
                }}
              >
                Verify
              </Button>
            </>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
