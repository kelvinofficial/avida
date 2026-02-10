'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
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
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  Send,
  Sms,
  WhatsApp,
  Email,
  LocalShipping,
  Person,
  CheckCircle,
  Error,
  Schedule,
  Replay,
} from '@mui/icons-material';
import { api } from '@/lib/api';

// Types
interface NotificationTemplate {
  id: string;
  event: string;
  recipient_type: string;
  channel: string;
  country_code?: string;
  language: string;
  subject?: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationLog {
  id: string;
  order_id?: string;
  event: string;
  channel: string;
  recipient_type: string;
  recipient_phone?: string;
  recipient_email?: string;
  template_id?: string;
  message: string;
  status: string;
  provider?: string;
  provider_message_id?: string;
  error?: string;
  retry_count: number;
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

interface TransportPartner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  status: string;
  rating: number;
  total_deliveries: number;
  is_active: boolean;
  notification_preferences: { sms: boolean; whatsapp: boolean };
  created_at: string;
}

// Event labels
const EVENT_LABELS: Record<string, string> = {
  order_placed: 'Order Placed',
  payment_successful: 'Payment Successful',
  escrow_created: 'Escrow Created',
  ready_for_pickup: 'Ready for Pickup',
  transport_partner_assigned: 'Transport Partner Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_confirmed: 'Delivery Confirmed',
  escrow_locked: 'Escrow Locked',
  escrow_released: 'Escrow Released',
  escrow_delayed: 'Escrow Delayed',
  dispute_opened: 'Dispute Opened',
  dispute_resolved: 'Dispute Resolved',
  delivery_otp: 'Delivery OTP',
};

const RECIPIENT_LABELS: Record<string, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  transport_partner: 'Transport Partner',
  admin: 'Admin',
};

const CHANNEL_ICONS: Record<string, JSX.Element> = {
  sms: <Sms fontSize="small" />,
  whatsapp: <WhatsApp fontSize="small" />,
  email: <Email fontSize="small" />,
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  sent: 'success',
  delivered: 'success',
  failed: 'error',
  pending: 'warning',
  skipped: 'default',
};

export default function SMSNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    event: '',
    recipient_type: '',
    channel: 'sms',
    language: 'en',
    body: '',
    is_active: true,
  });

  // Logs state
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [logsPerPage, setLogsPerPage] = useState(25);
  const [logsFilter, setLogsFilter] = useState({ event: '', status: '' });

  // Transport Partners state
  const [partners, setPartners] = useState<TransportPartner[]>([]);
  const [partnersTotal, setPartnersTotal] = useState(0);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<TransportPartner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_type: '',
    vehicle_plate: '',
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const data = await api.get('/notifications/admin/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setSnackbar({ open: true, message: 'Failed to load templates', severity: 'error' });
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(logsPage + 1),
        limit: String(logsPerPage),
      });
      if (logsFilter.event) params.append('event', logsFilter.event);
      if (logsFilter.status) params.append('status', logsFilter.status);

      const data = await api.get(`/notifications/admin/logs?${params}`);
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [logsPage, logsPerPage, logsFilter]);

  // Fetch transport partners
  const fetchPartners = useCallback(async () => {
    try {
      const data = await api.get('/notifications/admin/transport-partners');
      setPartners(data.partners || []);
      setPartnersTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTemplates(), fetchLogs(), fetchPartners()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchLogs, fetchPartners]);

  // Template handlers
  const handleSaveTemplate = async () => {
    try {
      if (editingTemplate) {
        await api.put(`/notifications/admin/templates/${editingTemplate.id}`, templateForm as unknown as Record<string, unknown>);
        setSnackbar({ open: true, message: 'Template updated', severity: 'success' });
      } else {
        await api.post('/notifications/admin/templates', templateForm);
        setSnackbar({ open: true, message: 'Template created', severity: 'success' });
      }
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save template', severity: 'error' });
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      event: template.event,
      recipient_type: template.recipient_type,
      channel: template.channel,
      language: template.language,
      body: template.body,
      is_active: template.is_active,
    });
    setTemplateDialogOpen(true);
  };

  const handleToggleTemplate = async (template: NotificationTemplate) => {
    try {
      await api.put(`/notifications/admin/templates/${template.id}`, {
        is_active: !template.is_active,
      });
      fetchTemplates();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to toggle template', severity: 'error' });
    }
  };

  // Log handlers
  const handleResendNotification = async (notificationId: string) => {
    try {
      await api.post(`/notifications/admin/logs/${notificationId}/resend`);
      setSnackbar({ open: true, message: 'Notification resent', severity: 'success' });
      fetchLogs();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to resend notification', severity: 'error' });
    }
  };

  // Partner handlers
  const handleSavePartner = async () => {
    try {
      if (editingPartner) {
        await api.put(`/notifications/admin/transport-partners/${editingPartner.id}`, partnerForm as unknown as Record<string, unknown>);
        setSnackbar({ open: true, message: 'Partner updated', severity: 'success' });
      } else {
        await api.post('/notifications/admin/transport-partners', partnerForm);
        setSnackbar({ open: true, message: 'Partner created', severity: 'success' });
      }
      setPartnerDialogOpen(false);
      setEditingPartner(null);
      fetchPartners();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save partner', severity: 'error' });
    }
  };

  const handleEditPartner = (partner: TransportPartner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      phone: partner.phone,
      email: partner.email || '',
      vehicle_type: partner.vehicle_type || '',
      vehicle_plate: partner.vehicle_plate || '',
    });
    setPartnerDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        SMS & WhatsApp Notifications
      </Typography>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Templates" icon={<Sms />} iconPosition="start" />
        <Tab label="Notification Logs" icon={<Schedule />} iconPosition="start" />
        <Tab label="Transport Partners" icon={<LocalShipping />} iconPosition="start" />
      </Tabs>

      {/* Templates Tab */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Message Templates</Typography>
              <Box>
                <IconButton onClick={fetchTemplates} size="small" sx={{ mr: 1 }}>
                  <Refresh />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({
                      event: '',
                      recipient_type: '',
                      channel: 'sms',
                      language: 'en',
                      body: '',
                      is_active: true,
                    });
                    setTemplateDialogOpen(true);
                  }}
                >
                  Add Template
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Use variables like {'{{order_id}}'}, {'{{buyer_name}}'}, {'{{tracking_url}}'} in your templates.
            </Alert>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {EVENT_LABELS[template.event] || template.event}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<Person fontSize="small" />}
                          label={RECIPIENT_LABELS[template.recipient_type] || template.recipient_type}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={CHANNEL_ICONS[template.channel]}
                          label={template.channel.toUpperCase()}
                          color={template.channel === 'whatsapp' ? 'success' : 'primary'}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap title={template.body}>
                          {template.body}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={template.is_active}
                          onChange={() => handleToggleTemplate(template)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Logs Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Notification Logs</Typography>
              <Box display="flex" gap={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Event</InputLabel>
                  <Select
                    value={logsFilter.event}
                    label="Event"
                    onChange={(e) => setLogsFilter((prev) => ({ ...prev, event: e.target.value }))}
                  >
                    <MenuItem value="">All Events</MenuItem>
                    {Object.entries(EVENT_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={logsFilter.status}
                    label="Status"
                    onChange={(e) => setLogsFilter((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={fetchLogs}>
                  <Refresh />
                </IconButton>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Order</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="textSecondary">No notifications sent yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(log.created_at).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {log.order_id?.slice(0, 12) || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{EVENT_LABELS[log.event] || log.event}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={CHANNEL_ICONS[log.channel]}
                            label={log.channel.toUpperCase()}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{log.recipient_phone || log.recipient_email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={log.status}
                            color={STATUS_COLORS[log.status] || 'default'}
                            icon={
                              log.status === 'sent' || log.status === 'delivered' ? (
                                <CheckCircle fontSize="small" />
                              ) : log.status === 'failed' ? (
                                <Error fontSize="small" />
                              ) : undefined
                            }
                          />
                          {log.error && (
                            <Tooltip title={log.error}>
                              <Typography variant="caption" color="error" display="block">
                                {log.error.slice(0, 30)}...
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{log.provider || '-'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          {log.status === 'failed' && (
                            <Tooltip title="Resend">
                              <IconButton size="small" onClick={() => handleResendNotification(log.id)}>
                                <Replay fontSize="small" />
                              </IconButton>
                            </Tooltip>
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
              count={logsTotal}
              page={logsPage}
              onPageChange={(_, p) => setLogsPage(p)}
              rowsPerPage={logsPerPage}
              onRowsPerPageChange={(e) => setLogsPerPage(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>
      )}

      {/* Transport Partners Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Transport Partners</Typography>
              <Box>
                <IconButton onClick={fetchPartners} size="small" sx={{ mr: 1 }}>
                  <Refresh />
                </IconButton>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingPartner(null);
                    setPartnerForm({
                      name: '',
                      phone: '',
                      email: '',
                      vehicle_type: '',
                      vehicle_plate: '',
                    });
                    setPartnerDialogOpen(true);
                  }}
                >
                  Add Partner
                </Button>
              </Box>
            </Box>

            <Grid container spacing={2}>
              {partners.map((partner) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={partner.id}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box>
                        <Typography variant="h6">{partner.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {partner.phone}
                        </Typography>
                        {partner.email && (
                          <Typography variant="body2" color="textSecondary">
                            {partner.email}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={partner.status}
                        color={
                          partner.status === 'available'
                            ? 'success'
                            : partner.status === 'busy'
                            ? 'warning'
                            : 'default'
                        }
                      />
                    </Box>
                    <Box mt={2} display="flex" gap={1}>
                      {partner.vehicle_type && (
                        <Chip size="small" label={partner.vehicle_type} variant="outlined" />
                      )}
                      {partner.vehicle_plate && (
                        <Chip size="small" label={partner.vehicle_plate} variant="outlined" />
                      )}
                    </Box>
                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {partner.total_deliveries} deliveries • ⭐ {partner.rating.toFixed(1)}
                      </Typography>
                      <IconButton size="small" onClick={() => handleEditPartner(partner)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
              {partners.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography color="textSecondary" textAlign="center">
                    No transport partners yet. Add your first partner.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Event</InputLabel>
                <Select
                  value={templateForm.event}
                  label="Event"
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, event: e.target.value }))}
                >
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Recipient Type</InputLabel>
                <Select
                  value={templateForm.recipient_type}
                  label="Recipient Type"
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, recipient_type: e.target.value }))}
                >
                  {Object.entries(RECIPIENT_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Channel</InputLabel>
                <Select
                  value={templateForm.channel}
                  label="Channel"
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, channel: e.target.value }))}
                >
                  <MenuItem value="sms">SMS</MenuItem>
                  <MenuItem value="whatsapp">WhatsApp</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={templateForm.language}
                  label="Language"
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="sw">Swahili</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Message Body"
                multiline
                rows={4}
                value={templateForm.body}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))}
                helperText="Available variables: {{order_id}}, {{buyer_name}}, {{seller_name}}, {{item_title}}, {{total_amount}}, {{currency}}, {{tracking_url}}, {{otp_code}}, {{driver_name}}, {{driver_phone}}"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Partner Dialog */}
      <Dialog open={partnerDialogOpen} onClose={() => setPartnerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPartner ? 'Edit Transport Partner' : 'Add Transport Partner'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                value={partnerForm.name}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={partnerForm.phone}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+255712345678"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={partnerForm.email}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  value={partnerForm.vehicle_type}
                  label="Vehicle Type"
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
                >
                  <MenuItem value="motorcycle">Motorcycle</MenuItem>
                  <MenuItem value="car">Car</MenuItem>
                  <MenuItem value="van">Van</MenuItem>
                  <MenuItem value="truck">Truck</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Vehicle Plate"
                value={partnerForm.vehicle_plate}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, vehicle_plate: e.target.value }))}
                placeholder="T 123 ABC"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartnerDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePartner}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
