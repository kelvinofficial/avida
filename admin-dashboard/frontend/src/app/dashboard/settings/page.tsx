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
  Chip,
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
  Snackbar,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  LocationOn,
  Link as LinkIcon,
  Security,
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  CloudUpload,
  MoreVert,
  Public,
  ContentCopy,
  OpenInNew,
  CheckCircle,
  Block,
  Email,
  Schedule,
  Send,
  History,
  Close,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Location {
  id: string;
  name: string;
  slug: string;
  type: string;
  parent_id?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_featured: boolean;
  listings_count?: number;
  created_at?: string;
}

interface Deeplink {
  id: string;
  name: string;
  slug: string;
  target_type: string;
  target_id?: string;
  target_url?: string;
  fallback_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  is_active: boolean;
  click_count: number;
  created_at?: string;
}

interface AuthSettings {
  allow_registration: boolean;
  require_email_verification: boolean;
  require_phone_verification: boolean;
  allow_social_login: boolean;
  social_providers: string[];
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  two_factor_enabled: boolean;
  two_factor_methods: string[];
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsTotal, setLocationsTotal] = useState(0);
  const [locationsPage, setLocationsPage] = useState(0);
  const [locationsPerPage, setLocationsPerPage] = useState(10);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState('');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationAnchorEl, setLocationAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Deeplinks State
  const [deeplinks, setDeeplinks] = useState<Deeplink[]>([]);
  const [deeplinksLoading, setDeeplinksLoading] = useState(true);
  const [deeplinksTotal, setDeeplinksTotal] = useState(0);
  const [deeplinksPage, setDeeplinksPage] = useState(0);
  const [deeplinksPerPage, setDeeplinksPerPage] = useState(10);
  const [deeplinkDialogOpen, setDeeplinkDialogOpen] = useState(false);
  const [editingDeeplink, setEditingDeeplink] = useState<Deeplink | null>(null);
  const [deeplinkAnchorEl, setDeeplinkAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDeeplink, setSelectedDeeplink] = useState<Deeplink | null>(null);

  // Auth Settings State
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSaving, setAuthSaving] = useState(false);

  // Scheduled Reports State
  const [reportsSettings, setReportsSettings] = useState({
    enabled: true,
    frequency: 'weekly',
    day_of_week: 1,
    hour: 9,
    admin_emails: [] as string[],
    include_seller_analytics: true,
    include_engagement_metrics: true,
    include_platform_overview: true,
    include_alerts: true,
  });
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsSaving, setReportsSaving] = useState(false);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [sendingReport, setSendingReport] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // Form States
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'city',
    parent_id: '',
    country_code: '',
    latitude: '',
    longitude: '',
    is_active: true,
    is_featured: false,
  });

  const [deeplinkForm, setDeeplinkForm] = useState({
    name: '',
    slug: '',
    target_type: 'listing',
    target_id: '',
    target_url: '',
    fallback_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    is_active: true,
  });

  // Load Locations
  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    try {
      const response = await api.getLocations({
        page: locationsPage + 1,
        limit: locationsPerPage,
        search: locationSearch || undefined,
        type: locationTypeFilter || undefined,
      });
      setLocations(response.items);
      setLocationsTotal(response.total);
    } catch (err) {
      console.error('Failed to load locations:', err);
      setSnackbar({ open: true, message: 'Failed to load locations', severity: 'error' });
    } finally {
      setLocationsLoading(false);
    }
  }, [locationsPage, locationsPerPage, locationSearch, locationTypeFilter]);

  // Load Deeplinks
  const loadDeeplinks = useCallback(async () => {
    setDeeplinksLoading(true);
    try {
      const response = await api.getDeeplinks({
        page: deeplinksPage + 1,
        limit: deeplinksPerPage,
      });
      setDeeplinks(response.items);
      setDeeplinksTotal(response.total);
    } catch (err) {
      console.error('Failed to load deeplinks:', err);
      setSnackbar({ open: true, message: 'Failed to load deeplinks', severity: 'error' });
    } finally {
      setDeeplinksLoading(false);
    }
  }, [deeplinksPage, deeplinksPerPage]);

  // Load Auth Settings
  const loadAuthSettings = useCallback(async () => {
    setAuthLoading(true);
    try {
      const settings = await api.getAuthSettings();
      setAuthSettings(settings);
    } catch (err) {
      console.error('Failed to load auth settings:', err);
      setSnackbar({ open: true, message: 'Failed to load auth settings', severity: 'error' });
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Load Scheduled Reports Settings
  const loadReportsSettings = useCallback(async () => {
    setReportsLoading(true);
    try {
      const [settings, history] = await Promise.all([
        api.get('/settings/scheduled-reports'),
        api.get('/reports/history?limit=5'),
      ]);
      setReportsSettings({
        enabled: settings.enabled ?? true,
        frequency: settings.frequency || 'weekly',
        day_of_week: settings.day_of_week ?? 1,
        hour: settings.hour ?? 9,
        admin_emails: settings.admin_emails || [],
        include_seller_analytics: settings.include_seller_analytics ?? true,
        include_engagement_metrics: settings.include_engagement_metrics ?? true,
        include_platform_overview: settings.include_platform_overview ?? true,
        include_alerts: settings.include_alerts ?? true,
      });
      setReportHistory(history.history || []);
    } catch (err) {
      console.error('Failed to load reports settings:', err);
      setSnackbar({ open: true, message: 'Failed to load reports settings', severity: 'error' });
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // Save Scheduled Reports Settings
  const saveReportsSettings = async () => {
    setReportsSaving(true);
    try {
      await api.post('/settings/scheduled-reports', reportsSettings);
      setSnackbar({ open: true, message: 'Reports settings saved successfully', severity: 'success' });
    } catch (err) {
      console.error('Failed to save reports settings:', err);
      setSnackbar({ open: true, message: 'Failed to save reports settings', severity: 'error' });
    } finally {
      setReportsSaving(false);
    }
  };

  // Send Report Now
  const handleSendReportNow = async () => {
    if (reportsSettings.admin_emails.length === 0) {
      setSnackbar({ open: true, message: 'Please add at least one admin email', severity: 'error' });
      return;
    }
    setSendingReport(true);
    try {
      // Save settings first
      await api.post('/settings/scheduled-reports', reportsSettings);
      // Then send report
      const result = await api.post('/reports/send');
      if (result.success) {
        setSnackbar({ open: true, message: `Report queued for ${result.recipients?.length || 0} recipient(s)`, severity: 'success' });
        loadReportsSettings(); // Refresh history
      } else {
        setSnackbar({ open: true, message: result.message || 'Failed to send report', severity: 'error' });
      }
    } catch (err) {
      console.error('Failed to send report:', err);
      setSnackbar({ open: true, message: 'Failed to send report', severity: 'error' });
    } finally {
      setSendingReport(false);
    }
  };

  // Add email to list
  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && !reportsSettings.admin_emails.includes(email)) {
      setReportsSettings(prev => ({
        ...prev,
        admin_emails: [...prev.admin_emails, email]
      }));
      setEmailInput('');
    }
  };

  // Remove email from list
  const handleRemoveEmail = (email: string) => {
    setReportsSettings(prev => ({
      ...prev,
      admin_emails: prev.admin_emails.filter(e => e !== email)
    }));
  };

  useEffect(() => {
    if (tabValue === 0) loadLocations();
    else if (tabValue === 1) loadDeeplinks();
    else if (tabValue === 2) loadAuthSettings();
    else if (tabValue === 3) loadReportsSettings();
  }, [tabValue, loadLocations, loadDeeplinks, loadAuthSettings, loadReportsSettings]);

  // Location Handlers
  const handleLocationSubmit = async () => {
    try {
      const payload = {
        name: locationForm.name,
        type: locationForm.type,
        parent_id: locationForm.parent_id || undefined,
        country_code: locationForm.country_code || undefined,
        latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : undefined,
        longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : undefined,
        is_active: locationForm.is_active,
        is_featured: locationForm.is_featured,
      };

      if (editingLocation) {
        await api.updateLocation(editingLocation.id, payload);
        setSnackbar({ open: true, message: 'Location updated successfully', severity: 'success' });
      } else {
        await api.createLocation(payload);
        setSnackbar({ open: true, message: 'Location created successfully', severity: 'success' });
      }
      setLocationDialogOpen(false);
      resetLocationForm();
      loadLocations();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save location', severity: 'error' });
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.deleteLocation(id);
      setSnackbar({ open: true, message: 'Location deleted successfully', severity: 'success' });
      loadLocations();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete location', severity: 'error' });
    }
  };

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      type: 'city',
      parent_id: '',
      country_code: '',
      latitude: '',
      longitude: '',
      is_active: true,
      is_featured: false,
    });
    setEditingLocation(null);
  };

  const openEditLocationDialog = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      type: location.type,
      parent_id: location.parent_id || '',
      country_code: location.country_code || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
      is_active: location.is_active,
      is_featured: location.is_featured,
    });
    setLocationDialogOpen(true);
    setLocationAnchorEl(null);
  };

  // Deeplink Handlers
  const handleDeeplinkSubmit = async () => {
    try {
      const payload = {
        name: deeplinkForm.name,
        slug: deeplinkForm.slug,
        target_type: deeplinkForm.target_type,
        target_id: deeplinkForm.target_id || undefined,
        target_url: deeplinkForm.target_url || undefined,
        fallback_url: deeplinkForm.fallback_url || undefined,
        utm_source: deeplinkForm.utm_source || undefined,
        utm_medium: deeplinkForm.utm_medium || undefined,
        utm_campaign: deeplinkForm.utm_campaign || undefined,
        is_active: deeplinkForm.is_active,
      };

      if (editingDeeplink) {
        await api.updateDeeplink(editingDeeplink.id, payload);
        setSnackbar({ open: true, message: 'Deeplink updated successfully', severity: 'success' });
      } else {
        await api.createDeeplink(payload);
        setSnackbar({ open: true, message: 'Deeplink created successfully', severity: 'success' });
      }
      setDeeplinkDialogOpen(false);
      resetDeeplinkForm();
      loadDeeplinks();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save deeplink', severity: 'error' });
    }
  };

  const handleDeleteDeeplink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deeplink?')) return;
    try {
      await api.deleteDeeplink(id);
      setSnackbar({ open: true, message: 'Deeplink deleted successfully', severity: 'success' });
      loadDeeplinks();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete deeplink', severity: 'error' });
    }
  };

  const resetDeeplinkForm = () => {
    setDeeplinkForm({
      name: '',
      slug: '',
      target_type: 'listing',
      target_id: '',
      target_url: '',
      fallback_url: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      is_active: true,
    });
    setEditingDeeplink(null);
  };

  const openEditDeeplinkDialog = (deeplink: Deeplink) => {
    setEditingDeeplink(deeplink);
    setDeeplinkForm({
      name: deeplink.name,
      slug: deeplink.slug,
      target_type: deeplink.target_type,
      target_id: deeplink.target_id || '',
      target_url: deeplink.target_url || '',
      fallback_url: deeplink.fallback_url || '',
      utm_source: deeplink.utm_source || '',
      utm_medium: deeplink.utm_medium || '',
      utm_campaign: deeplink.utm_campaign || '',
      is_active: deeplink.is_active,
    });
    setDeeplinkDialogOpen(true);
    setDeeplinkAnchorEl(null);
  };

  const copyDeeplinkUrl = (slug: string) => {
    const url = `${window.location.origin}/link/${slug}`;
    navigator.clipboard.writeText(url);
    setSnackbar({ open: true, message: 'Deeplink URL copied to clipboard', severity: 'success' });
  };

  // Auth Settings Handlers
  const handleAuthSettingChange = (key: keyof AuthSettings, value: boolean | number | string[]) => {
    if (authSettings) {
      setAuthSettings({ ...authSettings, [key]: value });
    }
  };

  const handleSaveAuthSettings = async () => {
    if (!authSettings) return;
    setAuthSaving(true);
    try {
      await api.updateAuthSettings(authSettings as unknown as Record<string, unknown>);
      setSnackbar({ open: true, message: 'Auth settings saved successfully', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save auth settings', severity: 'error' });
    } finally {
      setAuthSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage locations, deeplinks, and authentication settings
          </Typography>
        </Box>
      </Box>

      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<LocationOn />} iconPosition="start" label="Locations" data-testid="tab-locations" />
          <Tab icon={<LinkIcon />} iconPosition="start" label="Deeplinks" data-testid="tab-deeplinks" />
          <Tab icon={<Security />} iconPosition="start" label="Authentication" data-testid="tab-auth" />
          <Tab icon={<Email />} iconPosition="start" label="Scheduled Reports" data-testid="tab-reports" />
        </Tabs>

        {/* Locations Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Search locations..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                size="small"
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={locationTypeFilter}
                  label="Type"
                  onChange={(e) => setLocationTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="country">Country</MenuItem>
                  <MenuItem value="state">State</MenuItem>
                  <MenuItem value="city">City</MenuItem>
                  <MenuItem value="district">District</MenuItem>
                  <MenuItem value="neighborhood">Neighborhood</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<Refresh />} onClick={loadLocations}>
                Refresh
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetLocationForm();
                  setLocationDialogOpen(true);
                }}
                data-testid="add-location-btn"
              >
                Add Location
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Coordinates</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} />
                      </TableCell>
                    </TableRow>
                  ) : locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No locations found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    locations.map((location) => (
                      <TableRow key={location.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOn color="action" />
                            <Box>
                              <Typography fontWeight={500}>{location.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {location.slug}
                              </Typography>
                            </Box>
                            {location.is_featured && (
                              <Chip label="Featured" size="small" color="primary" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={location.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{location.country_code || '-'}</TableCell>
                        <TableCell>
                          {location.latitude && location.longitude
                            ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={location.is_active ? <CheckCircle /> : <Block />}
                            label={location.is_active ? 'Active' : 'Inactive'}
                            color={location.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setLocationAnchorEl(e.currentTarget);
                              setSelectedLocation(location);
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
              count={locationsTotal}
              page={locationsPage}
              onPageChange={(_, newPage) => setLocationsPage(newPage)}
              rowsPerPage={locationsPerPage}
              onRowsPerPageChange={(e) => {
                setLocationsPerPage(parseInt(e.target.value, 10));
                setLocationsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        </TabPanel>

        {/* Deeplinks Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between' }}>
              <Button variant="outlined" startIcon={<Refresh />} onClick={loadDeeplinks}>
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetDeeplinkForm();
                  setDeeplinkDialogOpen(true);
                }}
                data-testid="add-deeplink-btn"
              >
                Create Deeplink
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Target Type</TableCell>
                    <TableCell>Clicks</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deeplinksLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} />
                      </TableCell>
                    </TableRow>
                  ) : deeplinks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No deeplinks found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    deeplinks.map((deeplink) => (
                      <TableRow key={deeplink.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>{deeplink.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontFamily="monospace">
                              /link/{deeplink.slug}
                            </Typography>
                            <Tooltip title="Copy URL">
                              <IconButton size="small" onClick={() => copyDeeplinkUrl(deeplink.slug)}>
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={deeplink.target_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={500}>{deeplink.click_count}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={deeplink.is_active ? <CheckCircle /> : <Block />}
                            label={deeplink.is_active ? 'Active' : 'Inactive'}
                            color={deeplink.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setDeeplinkAnchorEl(e.currentTarget);
                              setSelectedDeeplink(deeplink);
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
              count={deeplinksTotal}
              page={deeplinksPage}
              onPageChange={(_, newPage) => setDeeplinksPage(newPage)}
              rowsPerPage={deeplinksPerPage}
              onRowsPerPageChange={(e) => {
                setDeeplinksPerPage(parseInt(e.target.value, 10));
                setDeeplinksPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </Box>
        </TabPanel>

        {/* Auth Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 2 }}>
            {authLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : authSettings ? (
              <Box>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Registration Settings
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.allow_registration}
                            onChange={(e) => handleAuthSettingChange('allow_registration', e.target.checked)}
                          />
                        }
                        label="Allow New Registrations"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.require_email_verification}
                            onChange={(e) => handleAuthSettingChange('require_email_verification', e.target.checked)}
                          />
                        }
                        label="Require Email Verification"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.require_phone_verification}
                            onChange={(e) => handleAuthSettingChange('require_phone_verification', e.target.checked)}
                          />
                        }
                        label="Require Phone Verification"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.allow_social_login}
                            onChange={(e) => handleAuthSettingChange('allow_social_login', e.target.checked)}
                          />
                        }
                        label="Allow Social Login"
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Password Requirements
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Minimum Password Length"
                        type="number"
                        value={authSettings.password_min_length}
                        onChange={(e) => handleAuthSettingChange('password_min_length', parseInt(e.target.value) || 8)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.password_require_uppercase}
                            onChange={(e) => handleAuthSettingChange('password_require_uppercase', e.target.checked)}
                          />
                        }
                        label="Require Uppercase Letter"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.password_require_number}
                            onChange={(e) => handleAuthSettingChange('password_require_number', e.target.checked)}
                          />
                        }
                        label="Require Number"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.password_require_special}
                            onChange={(e) => handleAuthSettingChange('password_require_special', e.target.checked)}
                          />
                        }
                        label="Require Special Character"
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Session & Security
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Session Timeout (minutes)"
                        type="number"
                        value={authSettings.session_timeout_minutes}
                        onChange={(e) => handleAuthSettingChange('session_timeout_minutes', parseInt(e.target.value) || 1440)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Max Login Attempts"
                        type="number"
                        value={authSettings.max_login_attempts}
                        onChange={(e) => handleAuthSettingChange('max_login_attempts', parseInt(e.target.value) || 5)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Lockout Duration (minutes)"
                        type="number"
                        value={authSettings.lockout_duration_minutes}
                        onChange={(e) => handleAuthSettingChange('lockout_duration_minutes', parseInt(e.target.value) || 30)}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={authSettings.two_factor_enabled}
                            onChange={(e) => handleAuthSettingChange('two_factor_enabled', e.target.checked)}
                          />
                        }
                        label="Enable Two-Factor Authentication"
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveAuthSettings}
                    disabled={authSaving}
                    data-testid="save-auth-settings-btn"
                  >
                    {authSaving ? <CircularProgress size={20} /> : 'Save Settings'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="error">Failed to load auth settings</Alert>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* Location Menu */}
      <Menu
        anchorEl={locationAnchorEl}
        open={Boolean(locationAnchorEl)}
        onClose={() => setLocationAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedLocation && openEditLocationDialog(selectedLocation)}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            selectedLocation && handleDeleteLocation(selectedLocation.id);
            setLocationAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Deeplink Menu */}
      <Menu
        anchorEl={deeplinkAnchorEl}
        open={Boolean(deeplinkAnchorEl)}
        onClose={() => setDeeplinkAnchorEl(null)}
      >
        <MenuItem onClick={() => selectedDeeplink && openEditDeeplinkDialog(selectedDeeplink)}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedDeeplink && copyDeeplinkUrl(selectedDeeplink.slug)}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            selectedDeeplink && handleDeleteDeeplink(selectedDeeplink.id);
            setDeeplinkAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={locationForm.type}
                label="Type"
                onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value })}
              >
                <MenuItem value="country">Country</MenuItem>
                <MenuItem value="state">State</MenuItem>
                <MenuItem value="city">City</MenuItem>
                <MenuItem value="district">District</MenuItem>
                <MenuItem value="neighborhood">Neighborhood</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Country Code (ISO 2-letter)"
              value={locationForm.country_code}
              onChange={(e) => setLocationForm({ ...locationForm, country_code: e.target.value.toUpperCase() })}
              fullWidth
              inputProps={{ maxLength: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Latitude"
                value={locationForm.latitude}
                onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                fullWidth
                type="number"
              />
              <TextField
                label="Longitude"
                value={locationForm.longitude}
                onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                fullWidth
                type="number"
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={locationForm.is_active}
                  onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={locationForm.is_featured}
                  onChange={(e) => setLocationForm({ ...locationForm, is_featured: e.target.checked })}
                />
              }
              label="Featured"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLocationSubmit}
            disabled={!locationForm.name}
          >
            {editingLocation ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deeplink Dialog */}
      <Dialog open={deeplinkDialogOpen} onClose={() => setDeeplinkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingDeeplink ? 'Edit Deeplink' : 'Create Deeplink'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={deeplinkForm.name}
              onChange={(e) => setDeeplinkForm({ ...deeplinkForm, name: e.target.value })}
              fullWidth
              required
              helperText="A descriptive name for this deeplink"
            />
            <TextField
              label="Slug"
              value={deeplinkForm.slug}
              onChange={(e) => setDeeplinkForm({ ...deeplinkForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              fullWidth
              required
              helperText="The URL path: /link/{slug}"
              disabled={!!editingDeeplink}
            />
            <FormControl fullWidth>
              <InputLabel>Target Type</InputLabel>
              <Select
                value={deeplinkForm.target_type}
                label="Target Type"
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, target_type: e.target.value })}
              >
                <MenuItem value="listing">Listing</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="page">Page</MenuItem>
                <MenuItem value="external">External URL</MenuItem>
              </Select>
            </FormControl>
            {deeplinkForm.target_type !== 'external' && (
              <TextField
                label="Target ID"
                value={deeplinkForm.target_id}
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, target_id: e.target.value })}
                fullWidth
                helperText="The ID of the listing, category, user, or page"
              />
            )}
            {deeplinkForm.target_type === 'external' && (
              <TextField
                label="Target URL"
                value={deeplinkForm.target_url}
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, target_url: e.target.value })}
                fullWidth
                helperText="Full URL for external links"
              />
            )}
            <TextField
              label="Fallback URL"
              value={deeplinkForm.fallback_url}
              onChange={(e) => setDeeplinkForm({ ...deeplinkForm, fallback_url: e.target.value })}
              fullWidth
              helperText="URL to redirect if target is unavailable"
            />
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              UTM Parameters (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="UTM Source"
                value={deeplinkForm.utm_source}
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, utm_source: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="UTM Medium"
                value={deeplinkForm.utm_medium}
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, utm_medium: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="UTM Campaign"
                value={deeplinkForm.utm_campaign}
                onChange={(e) => setDeeplinkForm({ ...deeplinkForm, utm_campaign: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={deeplinkForm.is_active}
                  onChange={(e) => setDeeplinkForm({ ...deeplinkForm, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeeplinkDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDeeplinkSubmit}
            disabled={!deeplinkForm.name || !deeplinkForm.slug}
          >
            {editingDeeplink ? 'Update' : 'Create'}
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
