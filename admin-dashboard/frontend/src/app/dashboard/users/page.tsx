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
  Avatar,
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
} from '@mui/material';
import {
  Search,
  MoreVert,
  Block,
  CheckCircle,
  Email,
  Phone,
  CalendarToday,
  Refresh,
  FilterList,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { User, PaginatedResponse } from '@/types';

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<number | ''>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getUsers({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setPage(0);
    loadUsers();
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason) return;
    setActionLoading(true);
    setError('');
    
    try {
      await api.banUser(
        selectedUser.user_id,
        banReason,
        banDuration ? Number(banDuration) : undefined
      );
      setBanDialogOpen(false);
      setBanReason('');
      setBanDuration('');
      setSelectedUser(null);
      await loadUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async (user: User) => {
    setActionLoading(true);
    try {
      await api.unbanUser(user.user_id);
      await loadUsers();
    } catch (err) {
      console.error('Failed to unban user:', err);
    } finally {
      setActionLoading(false);
    }
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
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage marketplace users and accounts
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadUsers}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
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
                <MenuItem value="banned">Banned</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleSearch}>
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                          {user.name?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={500}>{user.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.user_id.slice(0, 12)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Email fontSize="small" color="action" />
                        {user.email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          {user.phone}
                        </Box>
                      ) : (
                        <Typography color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_banned ? (
                        <Chip
                          label="Banned"
                          color="error"
                          size="small"
                          icon={<Block />}
                        />
                      ) : user.verified ? (
                        <Chip
                          label="Verified"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                        />
                      ) : (
                        <Chip label="Active" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday fontSize="small" color="action" />
                        {formatDate(user.created_at)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedUser(user);
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
          setSelectedUser(null);
        }}
      >
        <MenuItem disabled>
          <Typography variant="caption">User Actions</Typography>
        </MenuItem>
        {selectedUser?.is_banned ? (
          <MenuItem
            onClick={() => {
              if (selectedUser) handleUnbanUser(selectedUser);
              setAnchorEl(null);
            }}
          >
            <CheckCircle fontSize="small" sx={{ mr: 1 }} color="success" />
            Unban User
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setBanDialogOpen(true);
              setAnchorEl(null);
            }}
          >
            <Block fontSize="small" sx={{ mr: 1 }} color="error" />
            Ban User
          </MenuItem>
        )}
      </Menu>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ban User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Banning &quot;{selectedUser?.name}&quot; ({selectedUser?.email})
          </Typography>
          <TextField
            fullWidth
            label="Ban Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            multiline
            rows={3}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Duration (days)"
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value ? Number(e.target.value) : '')}
            helperText="Leave empty for permanent ban"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBanUser}
            disabled={actionLoading || !banReason}
          >
            {actionLoading ? 'Banning...' : 'Ban User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
