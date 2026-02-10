'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AttachMoney,
  Palette,
  Description,
  Link as LinkIcon,
  Save,
  Add,
  Edit,
  Delete,
  Refresh,
  CloudUpload,
  Visibility,
  VisibilityOff,
  Lock,
  LockOpen,
  History,
  Publish,
  DraftsOutlined,
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  YouTube,
  Apple,
  Android,
  Language,
  Check,
  Close,
  ContentCopy,
  Preview,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Types
interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_precision: number;
  rounding_rule: string;
  enabled: boolean;
  is_default: boolean;
  countries: string[];
  fx_rate_to_base: number;
  fx_rate_updated_at?: string;
  locked_for_escrow: boolean;
  locked_for_historical: boolean;
}

interface BrandingAsset {
  logo_type: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  uploaded_at: string;
  version: number;
  is_active: boolean;
}

interface SocialLink {
  platform: string;
  url: string;
  enabled: boolean;
  icon_visible: boolean;
  placements: string[];
}

interface AppStoreLink {
  store: string;
  url: string;
  country_code?: string;
  enabled: boolean;
  show_badge: boolean;
  deep_link_enabled: boolean;
}

interface LegalPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  country_code?: string;
  status: string;
  version: number;
  requires_acceptance: boolean;
  force_reaccept_on_change: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface PlatformConfig {
  id: string;
  environment: string;
  currencies: Currency[];
  default_currency: string;
  branding: Record<string, BrandingAsset>;
  social_links: SocialLink[];
  social_icon_style: string;
  social_icons_enabled: boolean;
  app_store_links: AppStoreLink[];
  external_links: any[];
  version: number;
  updated_at: string;
  updated_by: string;
}

const LOGO_TYPES = [
  { id: 'primary', name: 'Primary Logo', description: 'Main brand logo' },
  { id: 'dark', name: 'Dark Mode', description: 'Logo for dark backgrounds' },
  { id: 'light', name: 'Light Mode', description: 'Logo for light backgrounds' },
  { id: 'app_icon', name: 'App Icon', description: 'Mobile app icon' },
  { id: 'favicon', name: 'Favicon', description: 'Browser tab icon' },
  { id: 'email', name: 'Email Logo', description: 'Logo for email headers' },
  { id: 'splash', name: 'Splash Screen', description: 'App launch screen logo' },
];

const SOCIAL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: <Facebook /> },
  { id: 'instagram', name: 'Instagram', icon: <Instagram /> },
  { id: 'twitter', name: 'X (Twitter)', icon: <Twitter /> },
  { id: 'linkedin', name: 'LinkedIn', icon: <LinkedIn /> },
  { id: 'youtube', name: 'YouTube', icon: <YouTube /> },
  { id: 'tiktok', name: 'TikTok', icon: <Language /> },
];

const ROUNDING_RULES = [
  { id: 'round_half_up', name: 'Round Half Up (Standard)' },
  { id: 'round_down', name: 'Round Down (Floor)' },
  { id: 'round_up', name: 'Round Up (Ceiling)' },
];

const LEGAL_PAGE_TEMPLATES = [
  { slug: 'privacy-policy', title: 'Privacy Policy', requires_acceptance: true },
  { slug: 'terms-conditions', title: 'Terms & Conditions', requires_acceptance: true },
  { slug: 'cookie-policy', title: 'Cookie Policy', requires_acceptance: false },
  { slug: 'about-us', title: 'About Us', requires_acceptance: false },
  { slug: 'help-faq', title: 'Help / FAQ', requires_acceptance: false },
];

export default function PlatformConfigPage() {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [legalPageDialogOpen, setLegalPageDialogOpen] = useState(false);
  const [editingLegalPage, setEditingLegalPage] = useState<LegalPage | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null);

  // Form states
  const [newCurrency, setNewCurrency] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    decimal_precision: 2,
    rounding_rule: 'round_half_up',
    enabled: true,
    countries: [],
    fx_rate_to_base: 1.0,
  });

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/platform/config/${environment}`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setSnackbar({ open: true, message: 'Failed to load configuration', severity: 'error' });
    }
  }, [environment]);

  const fetchLegalPages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/platform/legal-pages/${environment}`);
      const data = await response.json();
      setLegalPages(data);
    } catch (error) {
      console.error('Failed to fetch legal pages:', error);
    }
  }, [environment]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchLegalPages()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchLegalPages]);

  const handleSaveConfig = async (updates: Partial<PlatformConfig>) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/config/${environment}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, updated_by: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to save');
      setSnackbar({ open: true, message: 'Configuration saved successfully', severity: 'success' });
      await fetchConfig();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save configuration', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCurrency = async () => {
    if (!newCurrency.code || !newCurrency.name || !newCurrency.symbol) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/currencies/${environment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCurrency, added_by: 'admin' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add currency');
      }
      setSnackbar({ open: true, message: 'Currency added successfully', severity: 'success' });
      setCurrencyDialogOpen(false);
      setNewCurrency({
        code: '',
        name: '',
        symbol: '',
        decimal_precision: 2,
        rounding_rule: 'round_half_up',
        enabled: true,
        countries: [],
        fx_rate_to_base: 1.0,
      });
      await fetchConfig();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to add currency', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCurrency = async (code: string, updates: Partial<Currency>) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/currencies/${environment}/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, updated_by: 'admin' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update currency');
      }
      setSnackbar({ open: true, message: 'Currency updated successfully', severity: 'success' });
      await fetchConfig();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update currency', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultCurrency = async (code: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/currencies/${environment}/${code}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_by: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to set default');
      setSnackbar({ open: true, message: `${code} is now the default currency`, severity: 'success' });
      await fetchConfig();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to set default currency', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLogo = async (logoType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('logo_type', logoType);
    formData.append('uploaded_by', 'admin');

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/branding/${environment}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload');
      setSnackbar({ open: true, message: 'Logo uploaded successfully', severity: 'success' });
      await fetchConfig();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to upload logo', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocialLinks = async (socialLinks: SocialLink[]) => {
    await handleSaveConfig({ social_links: socialLinks } as any);
  };

  const handleSaveAppStoreLinks = async (appStoreLinks: AppStoreLink[]) => {
    await handleSaveConfig({ app_store_links: appStoreLinks } as any);
  };

  const handleCreateLegalPage = async (pageData: Partial<LegalPage>) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/legal-pages/${environment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_data: pageData, created_by: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to create page');
      setSnackbar({ open: true, message: 'Legal page created successfully', severity: 'success' });
      setLegalPageDialogOpen(false);
      await fetchLegalPages();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create legal page', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublishLegalPage = async (pageId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/platform/legal-pages/${environment}/${pageId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_by: 'admin' }),
      });
      if (!response.ok) throw new Error('Failed to publish');
      setSnackbar({ open: true, message: 'Legal page published successfully', severity: 'success' });
      await fetchLegalPages();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to publish legal page', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette color="primary" />
            Platform Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage currencies, branding, legal pages, and external links
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={environment}
            exclusive
            onChange={(_, value) => value && setEnvironment(value)}
            size="small"
          >
            <ToggleButton value="production">
              <Chip label="Production" size="small" color={environment === 'production' ? 'success' : 'default'} />
            </ToggleButton>
            <ToggleButton value="staging">
              <Chip label="Staging" size="small" color={environment === 'staging' ? 'warning' : 'default'} />
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={() => { fetchConfig(); fetchLegalPages(); }}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {config && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Config Version: {config.version} | Last Updated: {new Date(config.updated_at).toLocaleString()} by {config.updated_by}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab icon={<AttachMoney />} label="Currency" />
        <Tab icon={<Palette />} label="Branding" />
        <Tab icon={<Description />} label="Legal Pages" />
        <Tab icon={<LinkIcon />} label="Links & Social" />
      </Tabs>

      {/* Currency Tab */}
      {tabValue === 0 && config && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Currencies</Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCurrencyDialogOpen(true)}
                  >
                    Add Currency
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Precision</TableCell>
                        <TableCell>FX Rate</TableCell>
                        <TableCell>Countries</TableCell>
                        <TableCell align="center">Default</TableCell>
                        <TableCell align="center">Enabled</TableCell>
                        <TableCell align="center">Locked</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {config.currencies.map((currency) => (
                        <TableRow key={currency.code}>
                          <TableCell>
                            <Chip label={currency.code} size="small" color="primary" />
                          </TableCell>
                          <TableCell>{currency.name}</TableCell>
                          <TableCell>
                            <Typography variant="h6">{currency.symbol}</Typography>
                          </TableCell>
                          <TableCell>{currency.decimal_precision}</TableCell>
                          <TableCell>{currency.fx_rate_to_base.toFixed(4)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {currency.countries.slice(0, 3).map((c) => (
                                <Chip key={c} label={c} size="small" variant="outlined" />
                              ))}
                              {currency.countries.length > 3 && (
                                <Chip label={`+${currency.countries.length - 3}`} size="small" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {currency.is_default ? (
                              <Chip label="Default" size="small" color="success" />
                            ) : (
                              <Button
                                size="small"
                                onClick={() => handleSetDefaultCurrency(currency.code)}
                                disabled={!currency.enabled}
                              >
                                Set Default
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Switch
                              checked={currency.enabled}
                              onChange={(e) => handleUpdateCurrency(currency.code, { enabled: e.target.checked })}
                              disabled={currency.is_default}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={currency.locked_for_escrow ? 'Locked for Escrow' : 'Not Locked'}>
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateCurrency(currency.code, { locked_for_escrow: !currency.locked_for_escrow })}
                              >
                                {currency.locked_for_escrow ? <Lock color="warning" /> : <LockOpen />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Edit FX Rate">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const rate = prompt('Enter new FX rate:', currency.fx_rate_to_base.toString());
                                  if (rate) {
                                    handleUpdateCurrency(currency.code, { fx_rate_to_base: parseFloat(rate) });
                                  }
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Branding Tab */}
      {tabValue === 1 && config && (
        <Grid container spacing={3}>
          {/* Logo Upload Cards */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Upload & Manage Logos
            </Typography>
            <Grid container spacing={2}>
              {LOGO_TYPES.map((logoType) => {
                const asset = config.branding[logoType.id];
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={logoType.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{logoType.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {logoType.description}
                        </Typography>
                        
                        {asset ? (
                          <Box>
                            <Box
                              sx={{
                                width: '100%',
                                height: 80,
                                bgcolor: logoType.id === 'dark' ? '#1a1a1a' : '#f5f5f5',
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 1,
                              }}
                            >
                              <img
                                src={`${API_BASE}/platform/assets/branding/${asset.file_path.split('/').pop()}`}
                                alt={logoType.name}
                                style={{ maxWidth: '80%', maxHeight: '90%', objectFit: 'contain' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              v{asset.version}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: 80,
                              bgcolor: '#f5f5f5',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed #ddd',
                              mb: 1,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">No logo</Typography>
                          </Box>
                        )}
                        
                        <Button
                          variant="outlined"
                          component="label"
                          size="small"
                          startIcon={<CloudUpload />}
                          fullWidth
                          sx={{ mt: 1 }}
                        >
                          {asset ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadLogo(logoType.id, file);
                            }}
                          />
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>

          {/* Preview Panel */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card sx={{ position: 'sticky', top: 20 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Preview color="primary" />
                    Live Preview
                  </Typography>
                  <Chip label="Real-time" size="small" color="success" />
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Mobile App Preview */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Mobile App
                </Typography>
                <Paper
                  elevation={3}
                  sx={{
                    width: 200,
                    height: 360,
                    mx: 'auto',
                    mb: 3,
                    borderRadius: 3,
                    overflow: 'hidden',
                    bgcolor: '#000',
                    position: 'relative',
                  }}
                >
                  {/* Phone notch */}
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 80,
                    height: 24,
                    bgcolor: '#000',
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12,
                    zIndex: 2,
                  }} />
                  
                  {/* Splash Screen */}
                  <Box sx={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                  }}>
                    {config.branding.splash || config.branding.primary ? (
                      <img
                        src={`${API_BASE}/platform/assets/branding/${(config.branding.splash || config.branding.primary)?.file_path?.split('/').pop()}`}
                        alt="App Logo"
                        style={{ maxWidth: 100, maxHeight: 100, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Typography color="white" variant="caption">Logo</Typography>
                      </Box>
                    )}
                    <Typography color="white" variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                      Marketplace
                    </Typography>
                    <CircularProgress size={20} sx={{ mt: 2, color: 'white' }} />
                  </Box>
                </Paper>

                {/* Website Preview */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Website Header
                </Typography>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: '#fff',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {config.branding.primary ? (
                        <img
                          src={`${API_BASE}/platform/assets/branding/${config.branding.primary?.file_path?.split('/').pop()}`}
                          alt="Logo"
                          style={{ height: 32, objectFit: 'contain' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Box sx={{ width: 100, height: 32, bgcolor: '#f0f0f0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Logo</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {['Home', 'Browse', 'Sell'].map((item) => (
                        <Typography key={item} variant="caption" color="text.secondary">{item}</Typography>
                      ))}
                    </Box>
                  </Box>
                </Paper>

                {/* Dark Mode Website Preview */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Website (Dark Mode)
                </Typography>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: '#1a1a1a',
                    border: '1px solid #333',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {(config.branding.dark || config.branding.light) ? (
                        <img
                          src={`${API_BASE}/platform/assets/branding/${(config.branding.dark || config.branding.light)?.file_path?.split('/').pop()}`}
                          alt="Logo"
                          style={{ height: 32, objectFit: 'contain' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Box sx={{ width: 100, height: 32, bgcolor: '#333', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="#888">Logo</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {['Home', 'Browse', 'Sell'].map((item) => (
                        <Typography key={item} variant="caption" color="#888">{item}</Typography>
                      ))}
                    </Box>
                  </Box>
                </Paper>

                {/* Email Preview */}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Email Template
                </Typography>
                <Paper
                  elevation={2}
                  sx={{
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  {/* Email Header */}
                  <Box sx={{ bgcolor: '#4CAF50', p: 2, textAlign: 'center' }}>
                    {(config.branding.email || config.branding.primary) ? (
                      <img
                        src={`${API_BASE}/platform/assets/branding/${(config.branding.email || config.branding.primary)?.file_path?.split('/').pop()}`}
                        alt="Email Logo"
                        style={{ height: 40, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="white" variant="body2" fontWeight={600}>MARKETPLACE</Typography>
                      </Box>
                    )}
                  </Box>
                  {/* Email Body */}
                  <Box sx={{ p: 2, bgcolor: '#fff' }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Welcome to Marketplace!
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Thank you for joining us. Start exploring amazing deals...
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button size="small" variant="contained" color="success" sx={{ textTransform: 'none' }}>
                        Get Started
                      </Button>
                    </Box>
                  </Box>
                  {/* Email Footer */}
                  <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderTop: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
                      {config.social_links.filter(s => s.enabled).slice(0, 4).map((social) => (
                        <Box
                          key={social.platform}
                          sx={{
                            width: 24,
                            height: 24,
                            bgcolor: '#4CAF50',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="caption" color="white" sx={{ fontSize: 10 }}>
                            {social.platform[0].toUpperCase()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
                      © 2026 Marketplace. All rights reserved.
                    </Typography>
                  </Box>
                </Paper>

                {/* Browser Tab Preview */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Browser Tab
                  </Typography>
                  <Paper
                    elevation={1}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: '#f5f5f5',
                      borderRadius: '8px 8px 0 0',
                      maxWidth: 200,
                    }}
                  >
                    {config.branding.favicon ? (
                      <img
                        src={`${API_BASE}/platform/assets/branding/${config.branding.favicon?.file_path?.split('/').pop()}`}
                        alt="Favicon"
                        style={{ width: 16, height: 16, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <Box sx={{ width: 16, height: 16, bgcolor: '#4CAF50', borderRadius: 0.5 }} />
                    )}
                    <Typography variant="caption" noWrap>
                      Marketplace - Buy & Sell
                    </Typography>
                    <Close sx={{ fontSize: 14, ml: 'auto', color: '#888' }} />
                  </Paper>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Legal Pages Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Legal & Static Pages</Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setEditingLegalPage(null);
                      setLegalPageDialogOpen(true);
                    }}
                  >
                    Create Page
                  </Button>
                </Box>
                
                {/* Quick Create Templates */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quick Create from Template:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {LEGAL_PAGE_TEMPLATES.map((template) => {
                      const exists = legalPages.some((p) => p.slug === template.slug);
                      return (
                        <Chip
                          key={template.slug}
                          label={template.title}
                          onClick={() => {
                            if (!exists) {
                              handleCreateLegalPage({
                                title: template.title,
                                slug: template.slug,
                                content: `<h1>${template.title}</h1><p>Enter your content here...</p>`,
                                requires_acceptance: template.requires_acceptance,
                                force_reaccept_on_change: template.requires_acceptance,
                              });
                            }
                          }}
                          color={exists ? 'default' : 'primary'}
                          variant={exists ? 'outlined' : 'filled'}
                          icon={exists ? <Check /> : <Add />}
                          disabled={exists}
                        />
                      );
                    })}
                  </Box>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Slug</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Requires Acceptance</TableCell>
                        <TableCell>Last Updated</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {legalPages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell>{page.title}</TableCell>
                          <TableCell>
                            <Chip label={page.slug} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={page.status}
                              size="small"
                              color={page.status === 'published' ? 'success' : page.status === 'draft' ? 'warning' : 'default'}
                              icon={page.status === 'published' ? <Check /> : <DraftsOutlined />}
                            />
                          </TableCell>
                          <TableCell>v{page.version}</TableCell>
                          <TableCell>
                            {page.requires_acceptance ? (
                              <Chip label="Yes" size="small" color="info" />
                            ) : (
                              <Chip label="No" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>{new Date(page.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Tooltip title="Preview">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setPreviewContent({ title: page.title, content: page.content });
                                  setPreviewDialogOpen(true);
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingLegalPage(page);
                                  setLegalPageDialogOpen(true);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {page.status === 'draft' && (
                              <Tooltip title="Publish">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handlePublishLegalPage(page.id)}
                                >
                                  <Publish fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {legalPages.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography color="text.secondary">No legal pages created yet</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Links & Social Tab */}
      {tabValue === 3 && config && (
        <Grid container spacing={3}>
          {/* Social Links */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Social Media Links</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.social_icons_enabled}
                      onChange={(e) => handleSaveConfig({ social_icons_enabled: e.target.checked } as any)}
                    />
                  }
                  label="Enable Social Icons"
                  sx={{ mb: 2 }}
                />
                <Divider sx={{ my: 2 }} />
                
                <List>
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const link = config.social_links.find((l) => l.platform === platform.id);
                    return (
                      <ListItem key={platform.id} divider>
                        <ListItemIcon>{platform.icon}</ListItemIcon>
                        <ListItemText
                          primary={platform.name}
                          secondary={link?.url || 'Not configured'}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const url = prompt(`Enter ${platform.name} URL:`, link?.url || '');
                              if (url !== null) {
                                const updatedLinks = [...config.social_links];
                                const idx = updatedLinks.findIndex((l) => l.platform === platform.id);
                                if (idx >= 0) {
                                  updatedLinks[idx] = { ...updatedLinks[idx], url };
                                } else {
                                  updatedLinks.push({
                                    platform: platform.id,
                                    url,
                                    enabled: true,
                                    icon_visible: true,
                                    placements: ['footer'],
                                  });
                                }
                                handleSaveSocialLinks(updatedLinks);
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          {link && (
                            <Switch
                              size="small"
                              checked={link.enabled}
                              onChange={(e) => {
                                const updatedLinks = config.social_links.map((l) =>
                                  l.platform === platform.id ? { ...l, enabled: e.target.checked } : l
                                );
                                handleSaveSocialLinks(updatedLinks);
                              }}
                            />
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* App Store Links */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>App Store Links</Typography>
                <Divider sx={{ my: 2 }} />
                
                <List>
                  {[
                    { id: 'google_play', name: 'Google Play Store', icon: <Android color="success" /> },
                    { id: 'apple_app_store', name: 'Apple App Store', icon: <Apple /> },
                    { id: 'huawei_appgallery', name: 'Huawei AppGallery', icon: <Language color="error" /> },
                  ].map((store) => {
                    const link = config.app_store_links.find((l) => l.store === store.id);
                    return (
                      <ListItem key={store.id} divider>
                        <ListItemIcon>{store.icon}</ListItemIcon>
                        <ListItemText
                          primary={store.name}
                          secondary={link?.url || 'Not configured'}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const url = prompt(`Enter ${store.name} URL:`, link?.url || '');
                              if (url !== null) {
                                const updatedLinks = [...config.app_store_links];
                                const idx = updatedLinks.findIndex((l) => l.store === store.id);
                                if (idx >= 0) {
                                  updatedLinks[idx] = { ...updatedLinks[idx], url };
                                } else {
                                  updatedLinks.push({
                                    store: store.id,
                                    url,
                                    enabled: true,
                                    show_badge: true,
                                    deep_link_enabled: false,
                                  });
                                }
                                handleSaveAppStoreLinks(updatedLinks);
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          {link && (
                            <Switch
                              size="small"
                              checked={link.enabled}
                              onChange={(e) => {
                                const updatedLinks = config.app_store_links.map((l) =>
                                  l.store === store.id ? { ...l, enabled: e.target.checked } : l
                                );
                                handleSaveAppStoreLinks(updatedLinks);
                              }}
                            />
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Add Currency Dialog */}
      <Dialog open={currencyDialogOpen} onClose={() => setCurrencyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Currency</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                label="Code"
                placeholder="USD"
                value={newCurrency.code}
                onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                inputProps={{ maxLength: 3 }}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                label="Symbol"
                placeholder="$"
                value={newCurrency.symbol}
                onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                label="Precision"
                type="number"
                value={newCurrency.decimal_precision}
                onChange={(e) => setNewCurrency({ ...newCurrency, decimal_precision: parseInt(e.target.value) })}
                inputProps={{ min: 0, max: 4 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                placeholder="US Dollar"
                value={newCurrency.name}
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="FX Rate to Base"
                type="number"
                value={newCurrency.fx_rate_to_base}
                onChange={(e) => setNewCurrency({ ...newCurrency, fx_rate_to_base: parseFloat(e.target.value) })}
                inputProps={{ step: 0.0001 }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Rounding Rule</InputLabel>
                <Select
                  value={newCurrency.rounding_rule}
                  label="Rounding Rule"
                  onChange={(e) => setNewCurrency({ ...newCurrency, rounding_rule: e.target.value })}
                >
                  {ROUNDING_RULES.map((rule) => (
                    <MenuItem key={rule.id} value={rule.id}>{rule.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Countries (comma separated)"
                placeholder="US, CA, GB"
                value={newCurrency.countries?.join(', ')}
                onChange={(e) => setNewCurrency({
                  ...newCurrency,
                  countries: e.target.value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
                })}
                helperText="ISO country codes where this currency applies"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCurrencyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCurrency} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Add Currency'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Legal Page Editor Dialog */}
      <Dialog open={legalPageDialogOpen} onClose={() => setLegalPageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingLegalPage ? 'Edit Legal Page' : 'Create Legal Page'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Title"
                value={editingLegalPage?.title || ''}
                onChange={(e) => setEditingLegalPage({ ...editingLegalPage!, title: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Slug"
                value={editingLegalPage?.slug || ''}
                onChange={(e) => setEditingLegalPage({ ...editingLegalPage!, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                helperText="URL-friendly identifier"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Content (HTML)"
                multiline
                rows={12}
                value={editingLegalPage?.content || ''}
                onChange={(e) => setEditingLegalPage({ ...editingLegalPage!, content: e.target.value })}
                helperText="Enter HTML content. A WYSIWYG editor can be integrated for better UX."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingLegalPage?.requires_acceptance || false}
                    onChange={(e) => setEditingLegalPage({ ...editingLegalPage!, requires_acceptance: e.target.checked })}
                  />
                }
                label="Requires User Acceptance"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingLegalPage?.force_reaccept_on_change || false}
                    onChange={(e) => setEditingLegalPage({ ...editingLegalPage!, force_reaccept_on_change: e.target.checked })}
                  />
                }
                label="Force Re-acceptance on Change"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalPageDialogOpen(false)}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => {
              if (editingLegalPage) {
                setPreviewContent({ title: editingLegalPage.title, content: editingLegalPage.content });
                setPreviewDialogOpen(true);
              }
            }}
            startIcon={<Preview />}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editingLegalPage) {
                if (editingLegalPage.id) {
                  // Update existing
                  fetch(`${API_BASE}/platform/legal-pages/${environment}/${editingLegalPage.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: editingLegalPage, updated_by: 'admin' }),
                  }).then(() => {
                    setSnackbar({ open: true, message: 'Page updated successfully', severity: 'success' });
                    setLegalPageDialogOpen(false);
                    fetchLegalPages();
                  });
                } else {
                  handleCreateLegalPage(editingLegalPage);
                }
              }
            }}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{previewContent?.title}</DialogTitle>
        <DialogContent>
          <Paper
            sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: previewContent?.content || '' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
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
