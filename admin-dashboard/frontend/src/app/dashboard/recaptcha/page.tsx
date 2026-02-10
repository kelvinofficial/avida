'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, CircularProgress, Alert, Select, MenuItem,
  FormControl, InputLabel, Chip, Paper, FormHelperText,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save, Refresh, Security, Shield, Verified } from '@mui/icons-material';
import { api } from '@/lib/api';

const PROTECTED_FORMS = [
  { id: 'login', name: 'Login Form' },
  { id: 'register', name: 'Registration Form' },
  { id: 'contact', name: 'Contact Form' },
  { id: 'listing_create', name: 'Create Listing' },
  { id: 'password_reset', name: 'Password Reset' },
  { id: 'checkout', name: 'Checkout' },
  { id: 'review', name: 'Submit Review' },
];

export default function RecaptchaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [settings, setSettings] = useState({
    enabled: false,
    site_key: '',
    secret_key: '',
    type: 'v2_invisible',
    threshold: 0.5,
    protected_forms: [] as string[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getRecaptchaSettings();
      setSettings({ ...settings, ...res, secret_key: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...settings };
      if (!data.secret_key) delete (data as any).secret_key; // Don't overwrite if empty
      await api.updateRecaptchaSettings(data);
      setSuccess('reCAPTCHA settings saved');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleForm = (formId: string) => {
    const forms = settings.protected_forms.includes(formId)
      ? settings.protected_forms.filter(f => f !== formId)
      : [...settings.protected_forms, formId];
    setSettings({ ...settings, protected_forms: forms });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>reCAPTCHA Configuration</Typography>
          <Typography variant="body2" color="text.secondary">Protect forms from spam and bots</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                  reCAPTCHA Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={<Switch checked={settings.enabled} onChange={e => setSettings({...settings, enabled: e.target.checked})} />}
                      label={<Typography fontWeight={600}>Enable reCAPTCHA Protection</Typography>}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>reCAPTCHA Type</InputLabel>
                      <Select
                        value={settings.type}
                        label="reCAPTCHA Type"
                        onChange={e => setSettings({...settings, type: e.target.value})}
                        disabled={!settings.enabled}
                      >
                        <MenuItem value="v2_invisible">v2 Invisible (Recommended)</MenuItem>
                        <MenuItem value="v2_checkbox">v2 Checkbox</MenuItem>
                        <MenuItem value="v3">v3 Score-based</MenuItem>
                      </Select>
                      <FormHelperText>
                        {settings.type === 'v2_invisible' && 'Runs in background, challenges only suspicious users'}
                        {settings.type === 'v2_checkbox' && 'Shows "I\'m not a robot" checkbox'}
                        {settings.type === 'v3' && 'Invisible, returns a score for each request'}
                      </FormHelperText>
                    </FormControl>
                  </Grid>

                  {settings.type === 'v3' && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Score Threshold"
                        value={settings.threshold}
                        onChange={e => setSettings({...settings, threshold: parseFloat(e.target.value) || 0.5})}
                        disabled={!settings.enabled}
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                        helperText="0.0 = most lenient, 1.0 = strictest (0.5 recommended)"
                      />
                    </Grid>
                  )}
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Site Key"
                      value={settings.site_key}
                      onChange={e => setSettings({...settings, site_key: e.target.value})}
                      disabled={!settings.enabled}
                      placeholder="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                      helperText="Get from Google reCAPTCHA Admin Console"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Secret Key"
                      value={settings.secret_key}
                      onChange={e => setSettings({...settings, secret_key: e.target.value})}
                      disabled={!settings.enabled}
                      placeholder="Enter to update (hidden for security)"
                      helperText="Leave empty to keep existing key"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Protected Forms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select which forms should require reCAPTCHA verification
                </Typography>
                
                {PROTECTED_FORMS.map(form => (
                  <Paper 
                    key={form.id} 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      cursor: settings.enabled ? 'pointer' : 'default',
                      opacity: settings.enabled ? 1 : 0.5,
                      bgcolor: settings.protected_forms.includes(form.id) ? 'success.light' : 'background.paper',
                      '&:hover': settings.enabled ? { bgcolor: settings.protected_forms.includes(form.id) ? 'success.main' : 'action.hover' } : {}
                    }}
                    onClick={() => settings.enabled && toggleForm(form.id)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>{form.name}</Typography>
                      {settings.protected_forms.includes(form.id) && (
                        <Verified color="success" fontSize="small" />
                      )}
                    </Box>
                  </Paper>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Setup Instructions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  1. Go to <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer">Google reCAPTCHA Admin</a>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  2. Register a new site with v2 Invisible
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  3. Add your domain(s) to allowed domains
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. Copy the Site Key and Secret Key here
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
