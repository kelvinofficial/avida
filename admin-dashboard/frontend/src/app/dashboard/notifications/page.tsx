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
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Autocomplete,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Send,
  Schedule,
  NotificationsActive,
  Group,
  Person,
  Campaign,
} from '@mui/icons-material';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'broadcast' | 'targeted' | 'scheduled';
  target_type?: 'all' | 'users' | 'segments';
  target_ids?: string[];
  scheduled_at?: string;
  sent_at?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  created_at: string;
  read_count?: number;
  total_recipients?: number;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif_1',
    title: 'Welcome to Avida!',
    message: 'Thank you for joining our marketplace. Start exploring listings today!',
    type: 'broadcast',
    target_type: 'all',
    status: 'sent',
    sent_at: '2026-02-06T10:00:00Z',
    created_at: '2026-02-06T09:00:00Z',
    read_count: 28,
    total_recipients: 34,
  },
  {
    id: 'notif_2',
    title: 'Your listing has new views!',
    message: 'Check out who viewed your listing today.',
    type: 'targeted',
    target_type: 'users',
    target_ids: ['user_1', 'user_2'],
    status: 'sent',
    sent_at: '2026-02-05T14:00:00Z',
    created_at: '2026-02-05T13:00:00Z',
    read_count: 2,
    total_recipients: 2,
  },
  {
    id: 'notif_3',
    title: 'Weekend Sale Reminder',
    message: 'Don\'t miss out on our weekend deals!',
    type: 'scheduled',
    target_type: 'all',
    scheduled_at: '2026-02-08T09:00:00Z',
    status: 'scheduled',
    created_at: '2026-02-07T10:00:00Z',
    total_recipients: 34,
  },
  {
    id: 'notif_4',
    title: 'New Features Update',
    message: 'We\'ve added exciting new features to the app!',
    type: 'broadcast',
    target_type: 'all',
    status: 'draft',
    created_at: '2026-02-07T12:00:00Z',
    total_recipients: 34,
  },
];

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<Notification | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<Notification | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'broadcast' as 'broadcast' | 'targeted' | 'scheduled',
    target_type: 'all' as 'all' | 'users' | 'segments',
    target_ids: [] as string[],
    scheduled_at: '',
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenDialog = (notif?: Notification) => {
    if (notif) {
      setEditingNotif(notif);
      setFormData({
        title: notif.title,
        message: notif.message,
        type: notif.type,
        target_type: notif.target_type || 'all',
        target_ids: notif.target_ids || [],
        scheduled_at: notif.scheduled_at || '',
      });
    } else {
      setEditingNotif(null);
      setFormData({
        title: '',
        message: '',
        type: 'broadcast',
        target_type: 'all',
        target_ids: [],
        scheduled_at: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async (sendNow: boolean = false) => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const status = sendNow ? 'sent' : (formData.type === 'scheduled' ? 'scheduled' : 'draft');
      
      if (editingNotif) {
        setNotifications(prev => prev.map(n => 
          n.id === editingNotif.id 
            ? { 
                ...n, 
                ...formData, 
                status,
                sent_at: sendNow ? new Date().toISOString() : n.sent_at,
              }
            : n
        ));
        setSnackbar({ 
          open: true, 
          message: sendNow ? 'Notification sent!' : 'Notification updated', 
          severity: 'success' 
        });
      } else {
        const newNotif: Notification = {
          id: `notif_${Date.now()}`,
          ...formData,
          status,
          created_at: new Date().toISOString(),
          sent_at: sendNow ? new Date().toISOString() : undefined,
          total_recipients: 34,
          read_count: 0,
        };
        setNotifications(prev => [newNotif, ...prev]);
        setSnackbar({ 
          open: true, 
          message: sendNow ? 'Notification sent!' : 'Notification saved as draft', 
          severity: 'success' 
        });
      }
      setDialogOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save notification', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notifToDelete) return;
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(prev => prev.filter(n => n.id !== notifToDelete.id));
      setSnackbar({ open: true, message: 'Notification deleted', severity: 'success' });
      setDeleteDialogOpen(false);
      setNotifToDelete(null);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete notification', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNow = async (notif: Notification) => {
    setActionLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(prev => prev.map(n => 
        n.id === notif.id 
          ? { ...n, status: 'sent' as const, sent_at: new Date().toISOString() }
          : n
      ));
      setSnackbar({ open: true, message: 'Notification sent!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to send notification', severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'scheduled': return 'info';
      case 'draft': return 'default';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'broadcast': return <Campaign fontSize="small" />;
      case 'targeted': return <Person fontSize="small" />;
      case 'scheduled': return <Schedule fontSize="small" />;
      default: return <NotificationsActive fontSize="small" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (tabValue === 0) return true;
    if (tabValue === 1) return n.status === 'sent';
    if (tabValue === 2) return n.status === 'scheduled';
    if (tabValue === 3) return n.status === 'draft';
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Notifications Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage push notifications for your users
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadNotifications}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Create Notification
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main" fontWeight={700}>
              {notifications.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {notifications.filter(n => n.status === 'sent').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sent
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {notifications.filter(n => n.status === 'scheduled').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Scheduled
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="text.secondary" fontWeight={700}>
              {notifications.filter(n => n.status === 'draft').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drafts
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs and Table */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, v) => { setTabValue(v); setPage(0); }}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="All" />
          <Tab label="Sent" />
          <Tab label="Scheduled" />
          <Tab label="Drafts" />
        </Tabs>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Notification</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Audience</TableCell>
                <TableCell>Sent/Scheduled</TableCell>
                <TableCell align="right">Delivery</TableCell>
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
              ) : filteredNotifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <NotificationsActive sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                    <Typography color="text.secondary">No notifications found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotifications
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((notif) => (
                    <TableRow key={notif.id} hover>
                      <TableCell>
                        <Box>
                          <Typography fontWeight={500}>{notif.title}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                            {notif.message}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getTypeIcon(notif.type)}
                          label={notif.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={notif.status}
                          color={getStatusColor(notif.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Group fontSize="small" color="action" />
                          <Typography variant="body2">
                            {notif.target_type === 'all' ? 'All users' : `${notif.target_ids?.length || 0} users`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {notif.status === 'scheduled' 
                            ? formatDate(notif.scheduled_at)
                            : formatDate(notif.sent_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {notif.status === 'sent' ? (
                          <Typography variant="body2">
                            {notif.read_count}/{notif.total_recipients} read
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {notif.total_recipients} recipients
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(notif.status === 'draft' || notif.status === 'scheduled') && (
                          <Tooltip title="Send Now">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleSendNow(notif)}
                              disabled={actionLoading}
                            >
                              <Send fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={() => handleOpenDialog(notif)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setNotifToDelete(notif);
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
        <TablePagination
          component="div"
          count={filteredNotifications.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingNotif ? 'Edit Notification' : 'Create Notification'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value="broadcast">Broadcast (All Users)</MenuItem>
                <MenuItem value="targeted">Targeted (Specific Users)</MenuItem>
                <MenuItem value="scheduled">Scheduled</MenuItem>
              </Select>
            </FormControl>
            {formData.type === 'targeted' && (
              <FormControl fullWidth>
                <InputLabel>Target</InputLabel>
                <Select
                  value={formData.target_type}
                  label="Target"
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                >
                  <MenuItem value="users">Specific Users</MenuItem>
                  <MenuItem value="segments">User Segments</MenuItem>
                </Select>
              </FormControl>
            )}
            {formData.type === 'scheduled' && (
              <TextField
                label="Schedule Date & Time"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleSave(false)}
            variant="outlined"
            disabled={!formData.title || !formData.message || actionLoading}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            variant="contained"
            startIcon={<Send />}
            disabled={!formData.title || !formData.message || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Notification</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{notifToDelete?.title}</strong>?
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
