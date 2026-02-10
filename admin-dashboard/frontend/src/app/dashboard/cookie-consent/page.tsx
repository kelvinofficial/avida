'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, Select, MenuItem, FormControl,
  InputLabel, Chip, Tabs, Tab, Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Save, Refresh, Cookie, Add, Delete, Palette, Settings,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

export default function CookieConsentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  
  const [settings, setSettings] = useState<any>({
    enabled: true,
    banner_text: '',
    privacy_policy_url: '/privacy',
    cookie_policy_url: '/cookies',
    position: 'bottom',
    theme: 'dark',
    show_preferences: true,
    categories: [] as CookieCategory[],
    button_text: {
      accept_all: 'Accept All',
      reject_all: 'Reject All',
      customize: 'Customize',
      save: 'Save Preferences'
    }
  });
  
  const [stats, setStats] = useState<any>({ total_consents: 0, by_category: {} });
  const [editingCategory, setEditingCategory] = useState<CookieCategory | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.getCookieSettings(),
        api.getCookieStats()
      ]);
      setSettings(settingsRes);
      setStats(statsRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    try {
      await api.updateCookieSettings(settings);
      setSuccess('Cookie consent settings saved');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    }
  };

  const addCategory = () => {
    setEditingCategory({
      id: Date.now().toString(),
      name: '',
      description: '',
      required: false,
      enabled: true
    });
    setCategoryDialogOpen(true);
  };

  const saveCategory = () => {
    if (!editingCategory) return;
    const existing = settings.categories.findIndex((c: CookieCategory) => c.id === editingCategory.id);
    let newCategories;
    if (existing >= 0) {
      newCategories = [...settings.categories];
      newCategories[existing] = editingCategory;
    } else {
      newCategories = [...settings.categories, editingCategory];
    }
    setSettings({ ...settings, categories: newCategories });
    setCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const deleteCategory = (categoryId: string) => {
    const cat = settings.categories.find((c: CookieCategory) => c.id === categoryId);
    if (cat?.required) {
      setError('Cannot delete required categories');
      return;
    }
    setSettings({
      ...settings,
      categories: settings.categories.filter((c: CookieCategory) => c.id !== categoryId)
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Cookie Consent</Typography>
          <Typography variant="body2" color="text.secondary">GDPR-compliant cookie banner configuration</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save Settings</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Banner Settings" icon={<Cookie />} iconPosition="start" />
        <Tab label="Categories" icon={<Settings />} iconPosition="start" />
        <Tab label="Appearance" icon={<Palette />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* Banner Settings Tab */}
          {currentTab === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>General Settings</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={<Switch checked={settings.enabled} onChange={e => setSettings({...settings, enabled: e.target.checked})} />}
                          label="Enable Cookie Consent Banner"
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Banner Text"
                          value={settings.banner_text}
                          onChange={e => setSettings({...settings, banner_text: e.target.value})}
                          placeholder="We use cookies to enhance your experience..."
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Privacy Policy URL"
                          value={settings.privacy_policy_url}
                          onChange={e => setSettings({...settings, privacy_policy_url: e.target.value})}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Cookie Policy URL"
                          value={settings.cookie_policy_url}
                          onChange={e => setSettings({...settings, cookie_policy_url: e.target.value})}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={<Switch checked={settings.show_preferences} onChange={e => setSettings({...settings, show_preferences: e.target.checked})} />}
                          label="Allow users to customize cookie preferences"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Statistics</Typography>
                    <Typography variant="h3" color="primary" fontWeight={700}>{stats.total_consents}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Total Consents</Typography>
                    
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>By Category</Typography>
                    {Object.entries(stats.by_category || {}).map(([cat, count]: [string, any]) => (
                      <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{cat}</Typography>
                        <Typography variant="body2" fontWeight={600}>{count}</Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Categories Tab */}
          {currentTab === 1 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Cookie Categories</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={addCategory}>Add Category</Button>
                </Box>
                
                <Grid container spacing={2}>
                  {settings.categories.map((cat: CookieCategory) => (
                    <Grid key={cat.id} size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography fontWeight={600}>
                              {cat.name}
                              {cat.required && <Chip label="Required" size="small" color="warning" sx={{ ml: 1 }} />}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{cat.description}</Typography>
                          </Box>
                          <Box>
                            <Switch checked={cat.enabled} disabled={cat.required} size="small"
                              onChange={e => {
                                const newCats = settings.categories.map((c: CookieCategory) => 
                                  c.id === cat.id ? {...c, enabled: e.target.checked} : c
                                );
                                setSettings({...settings, categories: newCats});
                              }} />
                            <IconButton size="small" onClick={() => { setEditingCategory(cat); setCategoryDialogOpen(true); }}>
                              <Settings fontSize="small" />
                            </IconButton>
                            {!cat.required && (
                              <IconButton size="small" color="error" onClick={() => deleteCategory(cat.id)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Appearance Tab */}
          {currentTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Banner Appearance</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Position</InputLabel>
                      <Select value={settings.position} label="Position" onChange={e => setSettings({...settings, position: e.target.value})}>
                        <MenuItem value="bottom">Bottom</MenuItem>
                        <MenuItem value="top">Top</MenuItem>
                        <MenuItem value="bottom-left">Bottom Left (Floating)</MenuItem>
                        <MenuItem value="bottom-right">Bottom Right (Floating)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Theme</InputLabel>
                      <Select value={settings.theme} label="Theme" onChange={e => setSettings({...settings, theme: e.target.value})}>
                        <MenuItem value="dark">Dark</MenuItem>
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="auto">Auto (Match Site)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>Button Text</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" label="Accept All" value={settings.button_text?.accept_all || ''}
                      onChange={e => setSettings({...settings, button_text: {...settings.button_text, accept_all: e.target.value}})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" label="Reject All" value={settings.button_text?.reject_all || ''}
                      onChange={e => setSettings({...settings, button_text: {...settings.button_text, reject_all: e.target.value}})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" label="Customize" value={settings.button_text?.customize || ''}
                      onChange={e => setSettings({...settings, button_text: {...settings.button_text, customize: e.target.value}})} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField fullWidth size="small" label="Save" value={settings.button_text?.save || ''}
                      onChange={e => setSettings({...settings, button_text: {...settings.button_text, save: e.target.value}})} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory?.name ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Category Name" value={editingCategory?.name || ''}
                onChange={e => setEditingCategory(editingCategory ? {...editingCategory, name: e.target.value} : null)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="Description" value={editingCategory?.description || ''}
                onChange={e => setEditingCategory(editingCategory ? {...editingCategory, description: e.target.value} : null)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={editingCategory?.required || false}
                  onChange={e => setEditingCategory(editingCategory ? {...editingCategory, required: e.target.checked} : null)} />}
                label="Required (users cannot disable)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveCategory} disabled={!editingCategory?.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
