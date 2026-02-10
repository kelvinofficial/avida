'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Chip,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  LinearProgress,
  Switch,
  FormControlLabel,
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
  TableChart as TableIcon,
  Map as MapIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  AutoFixHigh as AutoFixIcon,
  MyLocation as MyLocationIcon,
  Layers as LayersIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const LocationMapView = dynamic(() => import('./LocationMapView'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
      <CircularProgress />
    </Box>
  ),
});

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
  lat?: number;
  lng?: number;
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

interface GeocodingResult {
  display_name: string;
  lat: number;
  lng: number;
  type: string;
  address: Record<string, string>;
}

interface HeatmapCity {
  city_code: string;
  city_name: string;
  lat: number;
  lng: number;
  listing_count: number;
}

export default function LocationsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);

  // Selection states for drilling down
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'country' | 'region' | 'district' | 'city'>('country');
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Geocoding search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Batch import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Bulk update
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<any>(null);
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);

  // Export menu
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Heatmap
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [heatmapCities, setHeatmapCities] = useState<HeatmapCity[]>([]);

  // Auto-suggest
  const [suggestedCoords, setSuggestedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadStats();
    loadCountries();
    loadAllCities();
  }, []);

  // Load heatmap data when enabled
  useEffect(() => {
    if (showHeatmap) {
      loadHeatmapData();
    }
  }, [showHeatmap]);

  const loadStats = async () => {
    try {
      const response = await api.get('/locations/stats');
      setStats(response);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/locations/countries');
      setCountries(response);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const loadAllCities = async () => {
    try {
      const countriesResponse = await api.get('/locations/countries');
      let allCitiesData: City[] = [];
      
      for (const country of countriesResponse.slice(0, 5)) {
        try {
          const regionsResp = await api.get(`/locations/regions?country_code=${country.code}`);
          for (const region of regionsResp.slice(0, 3)) {
            try {
              const districtsResp = await api.get(`/locations/districts?country_code=${country.code}&region_code=${region.region_code}`);
              for (const district of districtsResp.slice(0, 3)) {
                try {
                  const citiesResp = await api.get(`/locations/cities?country_code=${country.code}&region_code=${region.region_code}&district_code=${district.district_code}`);
                  allCitiesData = [...allCitiesData, ...citiesResp];
                } catch (e) {}
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
      
      setAllCities(allCitiesData);
    } catch (err) {
      console.error('Failed to load all cities:', err);
    }
  };

  const loadHeatmapData = async () => {
    try {
      const response = await api.get('/locations/listing-density');
      setHeatmapData(response.heatmap_data || []);
      setHeatmapCities(response.city_details || []);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    }
  };

  const loadRegions = async (countryCode: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/locations/regions?country_code=${countryCode}`);
      setRegions(response);
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
      setDistricts(response);
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
      setCities(response);
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
    loadRegions(country.code);
  };

  const handleRegionClick = (region: Region) => {
    setSelectedRegion(region);
    setSelectedDistrict(null);
    loadDistricts(region.country_code, region.region_code);
  };

  const handleDistrictClick = (district: District) => {
    setSelectedDistrict(district);
    loadCities(district.country_code, district.region_code, district.district_code);
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === 0) {
      setSelectedCountry(null);
      setSelectedRegion(null);
      setSelectedDistrict(null);
    } else if (level === 1) {
      setSelectedRegion(null);
      setSelectedDistrict(null);
    } else if (level === 2) {
      setSelectedDistrict(null);
    }
  };

  // Geocoding search
  const handleGeoSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await api.get(`/locations/geocode?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'Geocoding search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectGeoResult = (result: GeocodingResult) => {
    setFormData({ ...formData, lat: result.lat, lng: result.lng });
    setSearchResults([]);
    setSearchQuery('');
    setSuccessMessage(`Coordinates set: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Auto-suggest coordinates
  const handleAutoSuggest = async () => {
    if (!selectedCountry || !selectedRegion || !selectedDistrict) return;
    
    try {
      const response = await api.get(`/locations/suggest-coordinates?country_code=${selectedCountry.code}&region_code=${selectedRegion.region_code}&district_code=${selectedDistrict.district_code}`);
      
      if (response.suggested_lat && response.suggested_lng) {
        setFormData({ ...formData, lat: response.suggested_lat, lng: response.suggested_lng });
        setSuggestedCoords({ lat: response.suggested_lat, lng: response.suggested_lng });
        setSuccessMessage(`Suggested coordinates (${response.source}): ${response.suggested_lat.toFixed(4)}, ${response.suggested_lng.toFixed(4)}`);
      } else {
        setError(response.message || 'Could not suggest coordinates');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get suggested coordinates');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const openAddDialog = (type: 'country' | 'region' | 'district' | 'city', coords?: { lat: number; lng: number }) => {
    setDialogType(type);
    setEditItem(null);
    if ((type === 'city' || type === 'district') && coords) {
      setFormData({ lat: coords.lat, lng: coords.lng });
    } else {
      setFormData({});
    }
    setSearchQuery('');
    setSearchResults([]);
    setSuggestedCoords(null);
    setDialogOpen(true);
  };

  const openEditDialog = (type: 'country' | 'region' | 'district' | 'city', item: any) => {
    setDialogType(type);
    setEditItem(item);
    setFormData(item);
    setSearchQuery('');
    setSearchResults([]);
    setSuggestedCoords(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      let endpoint: string;
      let method: 'post' | 'put';
      const dataToSend = { ...formData };
      
      if (dialogType === 'country') {
        endpoint = editItem ? `/locations/countries/${editItem.code}` : '/locations/countries';
        method = editItem ? 'put' : 'post';
      } else if (dialogType === 'region') {
        dataToSend.country_code = selectedCountry?.code;
        endpoint = '/locations/regions';
        method = 'post';
      } else if (dialogType === 'district') {
        dataToSend.country_code = selectedCountry?.code;
        dataToSend.region_code = selectedRegion?.region_code;
        endpoint = editItem ? '/locations/districts' : '/locations/districts';
        method = editItem ? 'put' : 'post';
      } else if (dialogType === 'city') {
        dataToSend.country_code = selectedCountry?.code;
        dataToSend.region_code = selectedRegion?.region_code;
        dataToSend.district_code = selectedDistrict?.district_code;
        endpoint = editItem ? `/locations/cities/${editItem.city_code}` : '/locations/cities';
        method = editItem ? 'put' : 'post';
      } else {
        return;
      }

      await api[method](endpoint, dataToSend);
      setDialogOpen(false);
      setSuccessMessage(`${dialogType} ${editItem ? 'updated' : 'created'} successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data
      if (dialogType === 'country') loadCountries();
      else if (dialogType === 'region' && selectedCountry) loadRegions(selectedCountry.code);
      else if (dialogType === 'district' && selectedCountry && selectedRegion) 
        loadDistricts(selectedCountry.code, selectedRegion.region_code);
      else if (dialogType === 'city' && selectedCountry && selectedRegion && selectedDistrict)
        loadCities(selectedCountry.code, selectedRegion.region_code, selectedDistrict.district_code);
      
      loadStats();
      loadAllCities();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  const handleDelete = async (type: string, item: any) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      let endpoint = `/locations/${type === 'country' ? 'countries' : type + 's'}`;
      
      if (type === 'country') {
        endpoint += `/${item.code}`;
      } else if (type === 'region') {
        endpoint += `?country_code=${item.country_code}&region_code=${item.region_code}`;
      } else if (type === 'district') {
        endpoint += `?country_code=${item.country_code}&region_code=${item.region_code}&district_code=${item.district_code}`;
      } else if (type === 'city') {
        endpoint += `?country_code=${item.country_code}&region_code=${item.region_code}&district_code=${item.district_code}&city_code=${item.city_code}`;
      }
      
      await api.delete(endpoint);
      setSuccessMessage(`${type} deleted successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      if (type === 'country') loadCountries();
      else if (type === 'region' && selectedCountry) loadRegions(selectedCountry.code);
      else if (type === 'district' && selectedCountry && selectedRegion)
        loadDistricts(selectedCountry.code, selectedRegion.region_code);
      else if (type === 'city' && selectedCountry && selectedRegion && selectedDistrict)
        loadCities(selectedCountry.code, selectedRegion.region_code, selectedDistrict.district_code);
      
      loadStats();
      loadAllCities();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  // Handle city/district marker drag on map
  const handleMarkerDrag = async (city: City, newLat: number, newLng: number) => {
    try {
      await api.put(`/locations/cities/${city.city_code}`, {
        ...city,
        lat: newLat,
        lng: newLng,
      });
      
      if (selectedDistrict) {
        loadCities(selectedDistrict.country_code, selectedDistrict.region_code, selectedDistrict.district_code);
      }
      loadAllCities();
      setSuccessMessage('City coordinates updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update city coordinates');
    }
  };

  // Handle map click to add new city/district
  const handleMapClick = (lat: number, lng: number) => {
    if (selectedDistrict) {
      openAddDialog('city', { lat, lng });
    } else if (selectedRegion) {
      openAddDialog('district', { lat, lng });
    }
  };

  // Batch import
  const handleBatchImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const geojson = JSON.parse(importJson);
      const result = await api.post('/locations/batch-import', { geojson });
      setImportResult(result);
      if (result.imported_count > 0) {
        loadStats();
        loadAllCities();
        if (selectedDistrict) {
          loadCities(selectedDistrict.country_code, selectedDistrict.region_code, selectedDistrict.district_code);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Batch import failed. Check JSON format.');
    } finally {
      setImporting(false);
    }
  };

  // Bulk coordinate update
  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    setBulkUpdateResult(null);
    try {
      const result = await api.post('/locations/bulk-update-coordinates', {});
      setBulkUpdateResult(result);
      if (result.updated_count > 0) {
        loadStats();
        loadAllCities();
        if (selectedRegion) {
          loadDistricts(selectedRegion.country_code, selectedRegion.region_code);
        }
        setSuccessMessage(`Updated coordinates for ${result.updated_count} districts`);
      }
    } catch (err: any) {
      setError(err.message || 'Bulk update failed');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Export functions
  const handleExport = async (level: string) => {
    setExportMenuAnchor(null);
    try {
      let params = `level=${level}`;
      if (selectedCountry) params += `&country_code=${selectedCountry.code}`;
      if (selectedRegion) params += `&region_code=${selectedRegion.region_code}`;
      if (selectedDistrict) params += `&district_code=${selectedDistrict.district_code}`;
      
      const result = await api.get(`/locations/export?${params}`);
      
      // Download as file
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locations_${level}_${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage(`Exported ${result.metadata.feature_count} features`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
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

  const currentCities = selectedDistrict ? cities : allCities;

  // Render location search field for dialogs
  const renderLocationSearch = () => (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Search Location (OpenStreetMap)
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search address or place name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleGeoSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button 
          variant="outlined" 
          onClick={handleGeoSearch}
          disabled={searching || !searchQuery.trim()}
        >
          {searching ? <CircularProgress size={20} /> : 'Search'}
        </Button>
      </Box>
      {searchResults.length > 0 && (
        <Paper elevation={3} sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
          <List dense>
            {searchResults.map((result, idx) => (
              <ListItemButton key={idx} onClick={() => handleSelectGeoResult(result)}>
                <ListItemText
                  primary={result.display_name}
                  secondary={`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
      {dialogType === 'city' && selectedDistrict && (
        <Button
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={handleAutoSuggest}
          sx={{ mt: 1 }}
        >
          Auto-suggest from nearby cities
        </Button>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Location Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button 
            startIcon={<AutoFixIcon />} 
            variant="outlined"
            color="secondary"
            onClick={() => setBulkUpdateDialogOpen(true)}
          >
            Bulk Update
          </Button>
          <Button 
            startIcon={<UploadIcon />} 
            variant="outlined"
            onClick={() => setImportDialogOpen(true)}
          >
            Import
          </Button>
          <Button 
            startIcon={<DownloadIcon />} 
            variant="outlined"
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          >
            Export
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleExport('cities')}>Export Cities</MenuItem>
            <MenuItem onClick={() => handleExport('districts')}>Export Districts</MenuItem>
            <MenuItem onClick={() => handleExport('all')}>Export All</MenuItem>
          </Menu>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="table" data-testid="view-table-btn">
              <Tooltip title="Table View">
                <TableIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="map" data-testid="view-map-btn">
              <Tooltip title="Map View">
                <MapIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button startIcon={<RefreshIcon />} onClick={() => { loadStats(); loadCountries(); loadAllCities(); }}>
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
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

      {/* Map View */}
      {viewMode === 'map' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {selectedDistrict 
                ? `Cities in ${selectedDistrict.name}` 
                : selectedRegion 
                  ? `Districts in ${selectedRegion.name}` 
                  : selectedCountry 
                    ? `Regions in ${selectedCountry.name}` 
                    : 'All Cities (Map View)'
              }
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    size="small"
                  />
                }
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LayersIcon fontSize="small" /> Listing Heatmap</Box>}
              />
              {(selectedDistrict || selectedRegion) && (
                <Typography variant="body2" color="text.secondary">
                  Click on map to add • Drag markers to update
                </Typography>
              )}
            </Box>
          </Box>
          <LocationMapView
            cities={currentCities}
            districts={selectedRegion && !selectedDistrict ? districts : []}
            selectedCountry={selectedCountry}
            selectedRegion={selectedRegion}
            selectedDistrict={selectedDistrict}
            onMarkerDrag={handleMarkerDrag}
            onMapClick={handleMapClick}
            onCityEdit={(city) => openEditDialog('city', city)}
            onCityDelete={(city) => handleDelete('city', city)}
            onDistrictClick={handleDistrictClick}
            onDistrictEdit={(district) => openEditDialog('district', district)}
            showHeatmap={showHeatmap}
            heatmapData={heatmapData}
            heatmapCities={heatmapCities}
          />
        </Paper>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
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

              {/* Districts Tab - with lat/lng */}
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
                          <TableCell>Latitude</TableCell>
                          <TableCell>Longitude</TableCell>
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
                            <TableCell onClick={() => handleDistrictClick(district)}>
                              {district.lat?.toFixed(4) || '-'}
                            </TableCell>
                            <TableCell onClick={() => handleDistrictClick(district)}>
                              {district.lng?.toFixed(4) || '-'}
                            </TableCell>
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
                            <TableCell>{city.lat?.toFixed(4)}</TableCell>
                            <TableCell>{city.lng?.toFixed(4)}</TableCell>
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
      )}

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
                  helperText="e.g., flag emoji"
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
                {renderLocationSearch()}
                <TextField
                  label="Latitude"
                  type="number"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.0001 }}
                  helperText="Optional: center point for district"
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
                {renderLocationSearch()}
                <TextField
                  label="Latitude"
                  type="number"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.0001 }}
                  helperText="Search above or click on map to set coordinates"
                />
                <TextField
                  label="Longitude"
                  type="number"
                  value={formData.lng || ''}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  inputProps={{ step: 0.0001 }}
                />
                {formData.lat && formData.lng && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Preview: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                  </Alert>
                )}
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

      {/* Batch Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Cities from GeoJSON</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a GeoJSON FeatureCollection with Point features. Each feature needs properties:
              <br />
              <code>country_code, region_code, district_code, city_code (or code), name</code>
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={12}
              label="GeoJSON"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder={`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [39.2083, -6.7924] },
      "properties": {
        "country_code": "TZ",
        "region_code": "DSM",
        "district_code": "KIN",
        "city_code": "NEW",
        "name": "New City"
      }
    }
  ]
}`}
            />
            {importResult && (
              <Alert 
                severity={importResult.error_count > 0 ? 'warning' : 'success'} 
                sx={{ mt: 2 }}
              >
                Imported: {importResult.imported_count} cities
                {importResult.error_count > 0 && ` | Errors: ${importResult.error_count}`}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleBatchImport}
            disabled={importing || !importJson.trim()}
            startIcon={importing ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateDialogOpen} onClose={() => setBulkUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Update District Coordinates</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will scan all districts without coordinates and attempt to find them using OpenStreetMap Nominatim.
              <br /><br />
              <strong>Note:</strong> This may take several minutes due to rate limiting (1 request/second).
            </Alert>
            {bulkUpdating && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Searching for coordinates... Please wait.
                </Typography>
              </Box>
            )}
            {bulkUpdateResult && (
              <Alert 
                severity={bulkUpdateResult.error_count > 0 ? 'warning' : 'success'} 
                sx={{ mb: 2 }}
              >
                Updated: {bulkUpdateResult.updated_count} districts
                {bulkUpdateResult.error_count > 0 && ` | Errors: ${bulkUpdateResult.error_count}`}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkUpdateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleBulkUpdate}
            disabled={bulkUpdating}
            startIcon={bulkUpdating ? <CircularProgress size={20} /> : <AutoFixIcon />}
          >
            Start Bulk Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
