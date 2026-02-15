'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Switch, Button,
  CircularProgress, Alert, Divider, Select, MenuItem,
  FormControl, InputLabel, TextField, Snackbar, Paper,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  FormControlLabel, Chip, Tooltip, IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility, VisibilityOff, Favorite, LocationOn,
  AttachMoney, Info, Save, Refresh, TrendingUp,
  Timer, LocalOffer, Star, Settings, Flag,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface FeatureSettings {
  show_view_count: boolean;
  show_save_count: boolean;
  show_listing_stats: boolean;
  show_seller_stats: boolean;
  show_distance: boolean;
  show_time_ago: boolean;
  show_negotiable_badge: boolean;
  show_featured_badge: boolean;
  location_mode: string;
  default_country: string;
  allow_country_change: boolean;
  currency: string;
  currency_symbol: string;
  currency_position: string;
}

const CURRENCIES = [
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
];

const COUNTRIES = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
];

export default function FeatureSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<FeatureSettings>({
    show_view_count: true,
    show_save_count: true,
    show_listing_stats: true,
    show_seller_stats: true,
    show_distance: true,
    show_time_ago: true,
    show_negotiable_badge: true,
    show_featured_badge: true,
    location_mode: 'region',
    default_country: 'TZ',
    allow_country_change: false,
    currency: 'TZS',
    currency_symbol: 'TSh',
    currency_position: 'before',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getFeatureSettings();
      setSettings(prev => ({ ...prev, ...response }));
    } catch (err: any) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await api.updateFeatureSettings(settings);
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError('Failed to save settings: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof FeatureSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChange = (key: keyof FeatureSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      setSettings(prev => ({
        ...prev,
        currency: currency.code,
        currency_symbol: currency.symbol,
      }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Feature Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control which features are visible to users across the platform
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchSettings}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
            onClick={handleSave}
            disabled={saving}
            color="primary"
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Listing Display Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Visibility sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Listing Display</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control what information is shown on listing cards and detail pages
              </Typography>

              <List disablePadding>
                <ListItem divider>
                  <ListItemText
                    primary="View Count"
                    secondary="Show how many times a listing has been viewed"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_view_count}
                      onChange={() => handleToggle('show_view_count')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem divider>
                  <ListItemText
                    primary="Save Count"
                    secondary="Show how many users have saved/favorited the listing"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_save_count}
                      onChange={() => handleToggle('show_save_count')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem divider>
                  <ListItemText
                    primary="Listing Statistics"
                    secondary="Show detailed stats like inquiries, shares on listing page"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_listing_stats}
                      onChange={() => handleToggle('show_listing_stats')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem divider>
                  <ListItemText
                    primary="Time Ago"
                    secondary="Show how long ago the listing was posted"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_time_ago}
                      onChange={() => handleToggle('show_time_ago')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Distance"
                    secondary="Show distance from user's location"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_distance}
                      onChange={() => handleToggle('show_distance')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Badges & Labels */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalOffer sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Badges & Labels</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control which badges and labels appear on listings
              </Typography>

              <List disablePadding>
                <ListItem divider>
                  <ListItemText
                    primary="Negotiable Badge"
                    secondary="Show 'Negotiable' badge on listings with flexible pricing"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_negotiable_badge}
                      onChange={() => handleToggle('show_negotiable_badge')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem divider>
                  <ListItemText
                    primary="Featured Badge"
                    secondary="Show 'Featured' or 'TOP' badge on promoted listings"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_featured_badge}
                      onChange={() => handleToggle('show_featured_badge')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Seller Statistics"
                    secondary="Show seller rating, response rate, and member since"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.show_seller_stats}
                      onChange={() => handleToggle('show_seller_stats')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Location Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Location Settings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure how location filtering works across the platform
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default Country</InputLabel>
                  <Select
                    value={settings.default_country}
                    label="Default Country"
                    onChange={(e) => handleChange('default_country', e.target.value)}
                  >
                    {COUNTRIES.map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Location Detail Level</InputLabel>
                  <Select
                    value={settings.location_mode}
                    label="Location Detail Level"
                    onChange={(e) => handleChange('location_mode', e.target.value)}
                  >
                    <MenuItem value="region">
                      <Box>
                        <Typography>Region Only</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Users can filter by region (e.g., Dar es Salaam, Arusha)
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="district">
                      <Box>
                        <Typography>Region + District</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Users can filter by region and district
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="city">
                      <Box>
                        <Typography>Region + District + City</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Full location hierarchy available
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allow_country_change}
                      onChange={() => handleToggle('allow_country_change')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Allow Country Change</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Let users switch to different countries (multi-country marketplace)
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Current configuration: <strong>{COUNTRIES.find(c => c.code === settings.default_country)?.name}</strong> only, 
                  with <strong>{settings.location_mode}</strong> level filtering
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Currency Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Currency Settings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure the default currency for pricing display
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={settings.currency}
                  label="Currency"
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map((currency) => (
                    <MenuItem key={currency.code} value={currency.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span>{currency.name}</span>
                        <Chip label={`${currency.symbol} ${currency.code}`} size="small" variant="outlined" />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Symbol Position</InputLabel>
                <Select
                  value={settings.currency_position}
                  label="Symbol Position"
                  onChange={(e) => handleChange('currency_position', e.target.value)}
                >
                  <MenuItem value="before">Before amount (e.g., TSh 10,000)</MenuItem>
                  <MenuItem value="after">After amount (e.g., 10,000 TSh)</MenuItem>
                </Select>
              </FormControl>

              <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Preview
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {settings.currency_position === 'before' 
                    ? `${settings.currency_symbol} 1,500,000`
                    : `1,500,000 ${settings.currency_symbol}`
                  }
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
