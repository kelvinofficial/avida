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
  Checkbox,
  Toolbar,
  alpha,
  Tooltip,
  Snackbar,
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
  Download,
  Delete,
  PersonOff,
  PersonAdd,
  SelectAll,
  CloudUpload,
  Edit,
  VerifiedUser,
  LocationOn,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { User, PaginatedResponse } from '@/types';
import CSVImportDialog from '@/components/CSVImportDialog';

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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
  
  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ban' | 'unban' | ''>('');
  const [bulkBanReason, setBulkBanReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Edit User state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    is_verified: false,
    is_active: true,
    role: 'user',
  });

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

  // Clear selection when data changes
  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [page, rowsPerPage, statusFilter]);

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
      setSnackbar({ open: true, message: 'User banned successfully', severity: 'success' });
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
      setSnackbar({ open: true, message: 'User unbanned successfully', severity: 'success' });
    } catch (err) {
      console.error('Failed to unban user:', err);
      setSnackbar({ open: true, message: 'Failed to unban user', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.user_id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleBulkAction = async () => {
    if (selectedUserIds.size === 0 || !bulkAction) return;
    
    setActionLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      let successCount = 0;
      let errorCount = 0;
      
      for (const userId of userIds) {
        try {
          if (bulkAction === 'ban') {
            await api.banUser(userId, bulkBanReason || 'Bulk ban action');
          } else if (bulkAction === 'unban') {
            await api.unbanUser(userId);
          }
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      
      setBulkDialogOpen(false);
      setBulkAction('');
      setBulkBanReason('');
      setSelectedUserIds(new Set());
      await loadUsers();
      
      const action = bulkAction === 'ban' ? 'banned' : 'unbanned';
      setSnackbar({
        open: true,
        message: `${successCount} user(s) ${action} successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        severity: errorCount > 0 ? 'error' : 'success'
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Bulk action failed', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Status', 'Created At', 'Listings Count'];
    const rows = users.map(user => [
      user.user_id,
      user.name || '',
      user.email || '',
      user.phone || '',
      user.status || 'active',
      user.created_at,
      user.listings_count || 0,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    setSnackbar({ open: true, message: 'Users exported to CSV', severity: 'success' });
  };

  // CSV Import Handler
  const handleImportUsers = async (file: File) => {
    const result = await api.importUsersCSV(file);
    if (result.imported > 0) {
      await loadUsers();
    }
    return result;
  };

  // Edit User Handler
  const openEditDialog = (user: User) => {
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
      is_verified: user.is_verified || false,
      is_active: user.status !== 'banned',
      role: user.role || 'user',
    });
    setSelectedUser(user);
    setEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setError('');
    try {
      await api.updateUser(selectedUser.user_id, {
        name: editForm.name || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        location: editForm.location || undefined,
        bio: editForm.bio || undefined,
        is_verified: editForm.is_verified,
        is_active: editForm.is_active,
        role: editForm.role,
      });
      setEditDialogOpen(false);
      await loadUsers();
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to update user');
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

  const numSelected = selectedUserIds.size;

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportToCSV}
            disabled={users.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
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

      {/* Bulk Action Toolbar */}
      {numSelected > 0 && (
        <Toolbar
          sx={{
            mb: 2,
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
            borderRadius: 1,
          }}
        >
          <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1">
            {numSelected} user(s) selected
          </Typography>
          <Tooltip title="Ban Selected">
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<PersonOff />}
              onClick={() => {
                setBulkAction('ban');
                setBulkDialogOpen(true);
              }}
              sx={{ mr: 1 }}
            >
              Ban
            </Button>
          </Tooltip>
          <Tooltip title="Unban Selected">
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<PersonAdd />}
              onClick={() => {
                setBulkAction('unban');
                setBulkDialogOpen(true);
              }}
              sx={{ mr: 1 }}
            >
              Unban
            </Button>
          </Tooltip>
          <Tooltip title="Clear Selection">
            <IconButton onClick={() => setSelectedUserIds(new Set())}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={numSelected > 0 && numSelected < users.length}
                    checked={users.length > 0 && numSelected === users.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
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
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isSelected = selectedUserIds.has(user.user_id);
                  return (
                    <TableRow
                      key={user.user_id}
                      hover
                      selected={isSelected}
                      onClick={() => handleSelectUser(user.user_id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectUser(user.user_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={500}>{user.name || 'Unknown User'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {user.user_id.slice(0, 12)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{user.email || '-'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{user.phone || '-'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={user.status === 'banned' ? <Block /> : <CheckCircle />}
                          label={user.status === 'banned' ? 'Banned' : 'Active'}
                          color={user.status === 'banned' ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">{formatDate(user.created_at)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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
                  );
                })
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
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedUser && openEditDialog(selectedUser)}>
          <Edit sx={{ mr: 1 }} color="primary" />
          Edit User
        </MenuItem>
        {selectedUser?.status === 'banned' ? (
          <MenuItem
            onClick={() => {
              handleUnbanUser(selectedUser);
              setAnchorEl(null);
            }}
          >
            <CheckCircle sx={{ mr: 1 }} color="success" />
            Unban User
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setBanDialogOpen(true);
              setAnchorEl(null);
            }}
          >
            <Block sx={{ mr: 1 }} color="error" />
            Ban User
          </MenuItem>
        )}
      </Menu>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ban User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography gutterBottom>
            Are you sure you want to ban <strong>{selectedUser?.name || selectedUser?.email}</strong>?
          </Typography>
          <TextField
            label="Ban Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Duration (days)"
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value ? Number(e.target.value) : '')}
            type="number"
            fullWidth
            sx={{ mt: 2 }}
            helperText="Leave empty for permanent ban"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBanUser}
            variant="contained"
            color="error"
            disabled={!banReason || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Ban User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              fullWidth
              type="email"
            />
            <TextField
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Bio"
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editForm.role}
                label="Role"
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
                <MenuItem value="verified_seller">Verified Seller</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.is_verified}
                  onChange={(e) => setEditForm({ ...editForm, is_verified: e.target.checked })}
                />
              }
              label="Verified Account"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
              }
              label="Active Account"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={actionLoading}
            data-testid="save-user-btn"
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {bulkAction === 'ban' ? 'Bulk Ban Users' : 'Bulk Unban Users'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to {bulkAction} <strong>{numSelected}</strong> user(s).
          </Typography>
          {bulkAction === 'ban' && (
            <TextField
              label="Ban Reason"
              value={bulkBanReason}
              onChange={(e) => setBulkBanReason(e.target.value)}
              fullWidth
              required
              multiline
              rows={3}
              sx={{ mt: 2 }}
              placeholder="Reason for bulk ban..."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBulkAction}
            variant="contained"
            color={bulkAction === 'ban' ? 'error' : 'success'}
            disabled={actionLoading || (bulkAction === 'ban' && !bulkBanReason)}
          >
            {actionLoading ? <CircularProgress size={20} /> : `${bulkAction === 'ban' ? 'Ban' : 'Unban'} ${numSelected} Users`}
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

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportUsers}
        title="Import Users"
        description="Upload a CSV file to bulk import users. Each user will be created with 'active' status."
        sampleHeaders={['email', 'name', 'phone']}
        entityName="user"
      />
    </Box>
  );
}
