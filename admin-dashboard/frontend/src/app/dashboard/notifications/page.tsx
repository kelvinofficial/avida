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
  Grid,
  Paper,
  Divider,
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
  Description,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

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

interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  title: string;
  message: string;
  icon: string;
  recommended_type: string;
}

export default function NotificationsPage() {
  const { t } = useLocale();
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
  
  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('');

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
      const data = await api.getNotifications();
      // Handle both array and paginated response
      const notificationList = Array.isArray(data) ? data : (data.items || []);
      setNotifications(notificationList);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.getNotificationTemplates();
      setTemplates(data.templates || []);
      setTemplateCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
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
      const notificationData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        target_type: formData.target_type,
        target_ids: formData.target_ids.length > 0 ? formData.target_ids : undefined,
        scheduled_at: formData.scheduled_at || undefined,
      };
      
      if (editingNotif) {
        await api.updateNotification(editingNotif.id, notificationData);
        if (sendNow) {
          await api.sendNotification(editingNotif.id);
        }
        setSnackbar({ 
          open: true, 
          message: sendNow ? t('notifications.sent') + '!' : t('common.success'), 
          severity: 'success' 
        });
      } else {
        const created = await api.createNotification(notificationData);
        if (sendNow && created.id) {
          await api.sendNotification(created.id);
        }
        setSnackbar({ 
          open: true, 
          message: sendNow ? t('notifications.sent') + '!' : t('notifications.saveDraft'), 
          severity: 'success' 
        });
      }
      setDialogOpen(false);
      await loadNotifications();
    } catch (err) {
      console.error('Failed to save notification:', err);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notifToDelete) return;
    setActionLoading(true);
    try {
      await api.deleteNotification(notifToDelete.id);
      setSnackbar({ open: true, message: t('common.success'), severity: 'success' });
      setDeleteDialogOpen(false);
      setNotifToDelete(null);
      await loadNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendNow = async (notif: Notification) => {
    setActionLoading(true);
    try {
      await api.sendNotification(notif.id);
      setSnackbar({ open: true, message: t('notifications.sent') + '!', severity: 'success' });
      await loadNotifications();
    } catch (err) {
      console.error('Failed to send notification:', err);
      setSnackbar({ open: true, message: t('common.error'), severity: 'error' });
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
            {t('notifications.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('notifications.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadNotifications}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            {t('notifications.createNotification')}
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
              {t('common.all')}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {notifications.filter(n => n.status === 'sent').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('notifications.sent')}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {notifications.filter(n => n.status === 'scheduled').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('notifications.scheduled')}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="text.secondary" fontWeight={700}>
              {notifications.filter(n => n.status === 'draft').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('notifications.draft')}
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
          <Tab label={t('common.all')} />
          <Tab label={t('notifications.sent')} />
          <Tab label={t('notifications.scheduled')} />
          <Tab label={t('notifications.draft')} />
        </Tabs>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('notifications.notificationTitle')}</TableCell>
                <TableCell>{t('notifications.type')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('notifications.audience')}</TableCell>
                <TableCell>{t('notifications.sent')}/{t('notifications.scheduled')}</TableCell>
                <TableCell align="right">{t('notifications.delivery')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
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
                    <Typography color="text.secondary">{t('common.noData')}</Typography>
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
                            {notif.target_type === 'all' ? t('notifications.allUsers') : `${notif.target_ids?.length || 0} users`}
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
                            {notif.read_count}/{notif.total_recipients} {t('notifications.read')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {notif.total_recipients} {t('notifications.recipients')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {(notif.status === 'draft' || notif.status === 'scheduled') && (
                          <Tooltip title={t('notifications.sendNow')}>
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
        <DialogTitle>{editingNotif ? t('common.edit') : t('common.create')} {t('notifications.notificationTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={t('notifications.notificationTitle')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('notifications.message')}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              fullWidth
              required
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>{t('notifications.type')}</InputLabel>
              <Select
                value={formData.type}
                label={t('notifications.type')}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value="broadcast">{t('notifications.broadcast')}</MenuItem>
                <MenuItem value="targeted">{t('notifications.targeted')}</MenuItem>
                <MenuItem value="scheduled">{t('notifications.scheduled')}</MenuItem>
              </Select>
            </FormControl>
            {formData.type === 'targeted' && (
              <FormControl fullWidth>
                <InputLabel>{t('notifications.audience')}</InputLabel>
                <Select
                  value={formData.target_type}
                  label={t('notifications.audience')}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value as any })}
                >
                  <MenuItem value="users">Specific Users</MenuItem>
                  <MenuItem value="segments">User Segments</MenuItem>
                </Select>
              </FormControl>
            )}
            {formData.type === 'scheduled' && (
              <TextField
                label={t('notifications.scheduleDateTime')}
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
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={() => handleSave(false)}
            variant="outlined"
            disabled={!formData.title || !formData.message || actionLoading}
          >
            {t('notifications.saveDraft')}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            variant="contained"
            startIcon={<Send />}
            disabled={!formData.title || !formData.message || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : t('notifications.sendNow')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('common.delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{notifToDelete?.title}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : t('common.delete')}
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
