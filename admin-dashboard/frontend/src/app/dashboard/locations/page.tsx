'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Public as CountryIcon,
  Map as RegionIcon,
  LocationCity as CityIcon,
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
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

interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface Region {
  country_code: string;
  region_code: string;
  name: string;
}

interface District {
  country_code: string;
  region_code: string;
  district_code: string;
  name: string;
}

interface City {
  country_code: string;
  region_code: string;
  district_code: string;
  city_code: string;
  name: string;
  lat: number;
  lng: number;
}

interface LocationStats {
  countries: number;
  regions: number;
  districts: number;
  cities: number;
}

export default function LocationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  // Selection states for drilling down
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'country' | 'region' | 'district' | 'city'>('country');
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadStats();
    loadCountries();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/locations/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/locations/countries');
      setCountries(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async (countryCode: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/locations/regions?country_code=${countryCode}`);
      setRegions(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load regions');
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async (countryCode: string, regionCode: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/locations/districts?country_code=${countryCode}&region_code=${regionCode}`);
      setDistricts(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load districts');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async (countryCode: string, regionCode: string, districtCode: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/locations/cities?country_code=${countryCode}&region_code=${regionCode}&district_code=${districtCode}`);
      setCities(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryClick = (country: Country) => {
    setSelectedCountry(country);
    setSelectedRegion(null);
    setSelectedDistrict(null);
    setTabValue(1);
    loadRegions(country.code);
  };

  const handleRegionClick = (region: Region) => {
    setSelectedRegion(region);
    setSelectedDistrict(null);
    setTabValue(2);
    loadDistricts(region.country_code, region.region_code);
  };

  const handleDistrictClick = (district: District) => {
    setSelectedDistrict(district);
    setTabValue(3);
    loadCities(district.country_code, district.region_code, district.district_code);
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === 0) {
      setSelectedCountry(null);
      setSelectedRegion(null);
      setSelectedDistrict(null);
      setTabValue(0);
    } else if (level === 1) {
      setSelectedRegion(null);
      setSelectedDistrict(null);
      setTabValue(1);
    } else if (level === 2) {
      setSelectedDistrict(null);
      setTabValue(2);
    }
  };

  const openAddDialog = (type: 'country' | 'region' | 'district' | 'city') => {
    setDialogType(type);
    setEditItem(null);
    setFormData({});
    setDialogOpen(true);
  };

  const openEditDialog = (type: 'country' | 'region' | 'district' | 'city', item: any) => {
    setDialogType(type);
    setEditItem(item);
    setFormData(item);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const endpoint = editItem 
        ? `/admin/locations/${dialogType}s/${editItem.code || editItem.city_code}`
        : `/admin/locations/${dialogType}s`;
      
      const method = editItem ? 'put' : 'post';
      
      // Add parent codes for nested items
      if (dialogType === 'region') {
        formData.country_code = selectedCountry?.code;
      } else if (dialogType === 'district') {
        formData.country_code = selectedCountry?.code;
        formData.region_code = selectedRegion?.region_code;
      } else if (dialogType === 'city') {
        formData.country_code = selectedCountry?.code;
        formData.region_code = selectedRegion?.region_code;
        formData.district_code = selectedDistrict?.district_code;
      }

      await api[method](endpoint, formData);
      setDialogOpen(false);
      
      // Refresh data
      if (dialogType === 'country') loadCountries();
      else if (dialogType === 'region' && selectedCountry) loadRegions(selectedCountry.code);
      else if (dialogType === 'district' && selectedCountry && selectedRegion) 
        loadDistricts(selectedCountry.code, selectedRegion.region_code);
      else if (dialogType === 'city' && selectedCountry && selectedRegion && selectedDistrict)
        loadCities(selectedCountry.code, selectedRegion.region_code, selectedDistrict.district_code);
      
      loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (type: string, item: any) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      const code = item.code || item.region_code || item.district_code || item.city_code;
      await api.delete(`/admin/locations/${type}s/${code}`);
      
      // Refresh data
      if (type === 'country') loadCountries();
      else if (type === 'region' && selectedCountry) loadRegions(selectedCountry.code);
      else if (type === 'district' && selectedCountry && selectedRegion)
        loadDistricts(selectedCountry.code, selectedRegion.region_code);
      else if (type === 'city' && selectedCountry && selectedRegion && selectedDistrict)
        loadCities(selectedCountry.code, selectedRegion.region_code, selectedDistrict.district_code);
      
      loadStats();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const renderBreadcrumbs = () => (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link 
        component="button" 
        variant="body1" 
        onClick={() => handleBreadcrumbClick(0)}
        underline="hover"
        color={!selectedCountry ? 'text.primary' : 'inherit'}
      >
        Countries
      </Link>
      {selectedCountry && (
        <Link
          component="button"
          variant="body1"
          onClick={() => handleBreadcrumbClick(1)}
          underline="hover"
          color={!selectedRegion ? 'text.primary' : 'inherit'}
        >
          {selectedCountry.flag} {selectedCountry.name}
        </Link>
      )}
      {selectedRegion && (
        <Link
          component="button"
          variant="body1"
          onClick={() => handleBreadcrumbClick(2)}
          underline="hover"
          color={!selectedDistrict ? 'text.primary' : 'inherit'}
        >
          {selectedRegion.name}
        </Link>
      )}
      {selectedDistrict && (
        <Typography color="text.primary">{selectedDistrict.name}</Typography>
      )}
    </Breadcrumbs>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Location Manager
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => { loadStats(); loadCountries(); }}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CountryIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4">{stats.countries}</Typography>
                <Typography variant="body2" color="text.secondary">Countries</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <RegionIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4">{stats.regions}</Typography>
                <Typography variant="body2" color="text.secondary">Regions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CityIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4">{stats.districts}</Typography>
                <Typography variant="body2" color="text.secondary">Districts</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PlaceIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h4">{stats.cities}</Typography>
                <Typography variant="body2" color="text.secondary">Cities</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Navigation Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* Data Tables */}
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Countries Tab */}
            {!selectedCountry && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Countries ({countries.length})</Typography>
                  <Button startIcon={<AddIcon />} variant="contained" onClick={() => openAddDialog('country')}>
                    Add Country
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Flag</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {countries.map((country) => (
                        <TableRow key={country.code} hover sx={{ cursor: 'pointer' }}>
                          <TableCell onClick={() => handleCountryClick(country)}>
                            <Typography fontSize={24}>{country.flag}</Typography>
                          </TableCell>
                          <TableCell onClick={() => handleCountryClick(country)}>
                            <Chip label={country.code} size="small" />
                          </TableCell>
                          <TableCell onClick={() => handleCountryClick(country)}>{country.name}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Regions">
                              <IconButton onClick={() => handleCountryClick(country)}>
                                <ArrowIcon />
                              </IconButton>
                            </Tooltip>
                            <IconButton onClick={() => openEditDialog('country', country)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete('country', country)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Regions Tab */}
            {selectedCountry && !selectedRegion && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Regions in {selectedCountry.name} ({regions.length})</Typography>
                  <Button startIcon={<AddIcon />} variant="contained" onClick={() => openAddDialog('region')}>
                    Add Region
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {regions.map((region) => (
                        <TableRow key={region.region_code} hover sx={{ cursor: 'pointer' }}>
                          <TableCell onClick={() => handleRegionClick(region)}>
                            <Chip label={region.region_code} size="small" />
                          </TableCell>
                          <TableCell onClick={() => handleRegionClick(region)}>{region.name}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Districts">
                              <IconButton onClick={() => handleRegionClick(region)}>
                                <ArrowIcon />
                              </IconButton>
                            </Tooltip>
                            <IconButton onClick={() => openEditDialog('region', region)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete('region', region)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Districts Tab */}
            {selectedRegion && !selectedDistrict && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Districts in {selectedRegion.name} ({districts.length})</Typography>
                  <Button startIcon={<AddIcon />} variant="contained" onClick={() => openAddDialog('district')}>
                    Add District
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {districts.map((district) => (
                        <TableRow key={district.district_code} hover sx={{ cursor: 'pointer' }}>
                          <TableCell onClick={() => handleDistrictClick(district)}>
                            <Chip label={district.district_code} size="small" />
                          </TableCell>
                          <TableCell onClick={() => handleDistrictClick(district)}>{district.name}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Cities">
                              <IconButton onClick={() => handleDistrictClick(district)}>
                                <ArrowIcon />
                              </IconButton>
                            </Tooltip>
                            <IconButton onClick={() => openEditDialog('district', district)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete('district', district)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Cities Tab */}
            {selectedDistrict && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Cities in {selectedDistrict.name} ({cities.length})</Typography>
                  <Button startIcon={<AddIcon />} variant="contained" onClick={() => openAddDialog('city')}>
                    Add City
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Latitude</TableCell>
                        <TableCell>Longitude</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cities.map((city) => (
                        <TableRow key={city.city_code} hover>
                          <TableCell>
                            <Chip label={city.city_code} size="small" />
                          </TableCell>
                          <TableCell>{city.name}</TableCell>
                          <TableCell>{city.lat.toFixed(4)}</TableCell>
                          <TableCell>{city.lng.toFixed(4)}</TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => openEditDialog('city', city)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDelete('city', city)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editItem ? `Edit ${dialogType}` : `Add ${dialogType}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {dialogType === 'country' && (
              <>
                <TextField
                  label="Country Code"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editItem}
                  inputProps={{ maxLength: 2 }}
                  helperText="2-letter country code (e.g., US, DE)"
                />
                <TextField
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <TextField
                  label="Flag Emoji"
                  value={formData.flag || ''}
                  onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                  helperText="e.g., 🇺🇸"
                />
              </>
            )}
            {dialogType === 'region' && (
              <>
                <TextField
                  label="Region Code"
                  value={formData.region_code || ''}
                  onChange={(e) => setFormData({ ...formData, region_code: e.target.value.toUpperCase() })}
                  disabled={!!editItem}
                  inputProps={{ maxLength: 5 }}
                />
                <TextField
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </>
            )}
            {dialogType === 'district' && (
              <>
                <TextField
                  label="District Code"
                  value={formData.district_code || ''}
                  onChange={(e) => setFormData({ ...formData, district_code: e.target.value.toUpperCase() })}
                  disabled={!!editItem}
                  inputProps={{ maxLength: 5 }}
                />
                <TextField
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </>
            )}
            {dialogType === 'city' && (
              <>
                <TextField
                  label="City Code"
                  value={formData.city_code || ''}
                  onChange={(e) => setFormData({ ...formData, city_code: e.target.value.toUpperCase() })}
                  disabled={!!editItem}
                  inputProps={{ maxLength: 5 }}
                />
                <TextField
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <TextField
                  label="Latitude"
                  type="number"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.0001 }}
                />
                <TextField
                  label="Longitude"
                  type="number"
                  value={formData.lng || ''}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.0001 }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
