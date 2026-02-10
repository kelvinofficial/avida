'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Switch,
  FormControlLabel, CircularProgress, Alert, Slider, Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Save, Refresh, Image, Transform, Speed, Storage } from '@mui/icons-material';
import { api } from '@/lib/api';

export default function ImageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [settings, setSettings] = useState({
    auto_convert_webp: true,
    webp_quality: 80,
    max_width: 1920,
    max_height: 1080,
    thumbnail_size: 300,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    max_file_size_mb: 5,
  });

  const [stats, setStats] = useState({
    listings_with_images: 0,
    profiles_with_logo: 0,
    webp_converted: 0,
    pending_conversion: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.getImageSettings(),
        api.getImageStats()
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
    setSaving(true);
    try {
      await api.updateImageSettings(settings);
      setSuccess('Image settings saved');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchConvert = async (target: string) => {
    setConverting(true);
    try {
      const result = await api.convertImagesBatch(target);
      setSuccess(result.message);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start batch conversion');
    } finally {
      setConverting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Image Settings</Typography>
          <Typography variant="body2" color="text.secondary">WebP conversion and image optimization</Typography>
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
          {/* Stats Cards */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Image color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{stats.listings_with_images}</Typography>
                <Typography variant="body2" color="text.secondary">Listing Images</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Storage color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{stats.profiles_with_logo}</Typography>
                <Typography variant="body2" color="text.secondary">Profile Images</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Transform color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={700} color="success.main">{stats.webp_converted}</Typography>
                <Typography variant="body2" color="text.secondary">WebP Converted</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Speed color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={700} color="warning.main">{stats.pending_conversion}</Typography>
                <Typography variant="body2" color="text.secondary">Pending Conversion</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* WebP Settings */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>WebP Conversion Settings</Typography>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={<Switch checked={settings.auto_convert_webp} onChange={e => setSettings({...settings, auto_convert_webp: e.target.checked})} />}
                      label={<Typography fontWeight={600}>Auto-convert uploaded images to WebP</Typography>}
                    />
                    <Typography variant="body2" color="text.secondary">
                      WebP format typically reduces file size by 25-35% compared to JPEG/PNG
                    </Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <Typography gutterBottom>WebP Quality: {settings.webp_quality}%</Typography>
                    <Slider
                      value={settings.webp_quality}
                      onChange={(_, v) => setSettings({...settings, webp_quality: v as number})}
                      min={10}
                      max={100}
                      marks={[
                        { value: 10, label: '10%' },
                        { value: 50, label: '50%' },
                        { value: 80, label: '80%' },
                        { value: 100, label: '100%' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Higher quality = larger files. 75-85% is optimal for most use cases.
                    </Typography>
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Width (px)"
                      value={settings.max_width}
                      onChange={e => setSettings({...settings, max_width: parseInt(e.target.value) || 1920})}
                      helperText="Images wider than this will be resized"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Height (px)"
                      value={settings.max_height}
                      onChange={e => setSettings({...settings, max_height: parseInt(e.target.value) || 1080})}
                      helperText="Images taller than this will be resized"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Thumbnail Size (px)"
                      value={settings.thumbnail_size}
                      onChange={e => setSettings({...settings, thumbnail_size: parseInt(e.target.value) || 300})}
                      helperText="Size for thumbnail generation"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max File Size (MB)"
                      value={settings.max_file_size_mb}
                      onChange={e => setSettings({...settings, max_file_size_mb: parseInt(e.target.value) || 5})}
                      helperText="Maximum upload size per image"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" gutterBottom>Allowed Formats</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff'].map(format => (
                        <Chip
                          key={format}
                          label={format.toUpperCase()}
                          color={settings.allowed_formats.includes(format) ? 'primary' : 'default'}
                          onClick={() => {
                            const formats = settings.allowed_formats.includes(format)
                              ? settings.allowed_formats.filter(f => f !== format)
                              : [...settings.allowed_formats, format];
                            setSettings({...settings, allowed_formats: formats});
                          }}
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Batch Conversion */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Batch Conversion</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Convert existing images to WebP format
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleBatchConvert('listings')}
                    disabled={converting}
                  >
                    Convert Listing Images
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleBatchConvert('profiles')}
                    disabled={converting}
                  >
                    Convert Profile Images
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleBatchConvert('all')}
                    disabled={converting}
                  >
                    {converting ? 'Processing...' : 'Convert All Images'}
                  </Button>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  Batch conversion runs in the background. Large collections may take several minutes.
                </Alert>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Benefits of WebP</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • 25-35% smaller file sizes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Faster page load times
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Better SEO rankings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Reduced bandwidth costs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
