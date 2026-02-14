'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Breadcrumbs,
  Link,
  Skeleton,
  alpha,
  Button,
  Stack,
  Autocomplete,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  Public,
  LocationCity,
  TrendingUp,
  CalendarToday,
  ArrowBack,
  KeyboardArrowRight,
  Map,
  QueryStats,
  Insights,
  FilterList,
  Clear,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts';

// Main backend API URL
const MAIN_API_URL = process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://mobile-classifieds.preview.emergentagent.com/api';

// Theme colors - consistent with admin dashboard
const THEME = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  secondary: '#1976D2',
  warning: '#FF9800',
  error: '#F44336',
  purple: '#9C27B0',
  cyan: '#00BCD4',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#64748B',
};

const CHART_COLORS = ['#2E7D32', '#1976D2', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

interface SearchAnalyticsData {
  period_days: number;
  total_searches: number;
  filters_applied: {
    country_code: string | null;
    region_code: string | null;
    city_code: string | null;
    category_id: string | null;
  };
  top_searches: Array<{ query: string; count: number }>;
  by_country: Array<{
    country_code: string;
    country_name: string;
    search_count: number;
    unique_query_count: number;
  }>;
  by_region: Array<{
    country_code: string;
    region_code: string;
    region_name: string;
    search_count: number;
    unique_query_count: number;
  }>;
  by_city: Array<{
    city_code: string;
    city_name: string;
    region_name: string;
    country_code: string;
    search_count: number;
    unique_query_count: number;
  }>;
  by_category: Array<{
    category_id: string;
    search_count: number;
    unique_query_count: number;
  }>;
  recent_activity: Array<{
    date: string;
    search_count: number;
    unique_query_count: number;
  }>;
}

interface LocationFilter {
  type: 'global' | 'country' | 'region' | 'city';
  country_code?: string;
  country_name?: string;
  region_code?: string;
  region_name?: string;
  city_code?: string;
  city_name?: string;
}

// Stat Card Component - consistent with dashboard
function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle,
  loading = false 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
          {loading ? (
            <Skeleton variant="text" width={60} height={40} />
          ) : (
            <Typography variant="h3" fontWeight={700} color={THEME.text}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color={THEME.textSecondary} sx={{ mt: 2, fontWeight: 500 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color={THEME.textSecondary}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Location Breadcrumb Component
function LocationBreadcrumb({ 
  filter, 
  onNavigate 
}: { 
  filter: LocationFilter; 
  onNavigate: (filter: LocationFilter) => void;
}) {
  return (
    <Breadcrumbs 
      separator={<KeyboardArrowRight fontSize="small" sx={{ color: THEME.textSecondary }} />}
      sx={{ mb: 3 }}
    >
      <Link
        component="button"
        variant="body2"
        underline="hover"
        onClick={() => onNavigate({ type: 'global' })}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          color: filter.type === 'global' ? THEME.primary : THEME.textSecondary,
          fontWeight: filter.type === 'global' ? 600 : 400,
          cursor: 'pointer',
          '&:hover': { color: THEME.primary }
        }}
      >
        <Public fontSize="small" />
        Global
      </Link>
      
      {filter.country_code && (
        <Link
          component="button"
          variant="body2"
          underline="hover"
          onClick={() => onNavigate({ 
            type: 'country', 
            country_code: filter.country_code,
            country_name: filter.country_name 
          })}
          sx={{ 
            color: filter.type === 'country' ? THEME.primary : THEME.textSecondary,
            fontWeight: filter.type === 'country' ? 600 : 400,
            cursor: 'pointer',
            '&:hover': { color: THEME.primary }
          }}
        >
          {filter.country_name || filter.country_code}
        </Link>
      )}
      
      {filter.region_code && (
        <Link
          component="button"
          variant="body2"
          underline="hover"
          onClick={() => onNavigate({ 
            type: 'region',
            country_code: filter.country_code,
            country_name: filter.country_name,
            region_code: filter.region_code,
            region_name: filter.region_name
          })}
          sx={{ 
            color: filter.type === 'region' ? THEME.primary : THEME.textSecondary,
            fontWeight: filter.type === 'region' ? 600 : 400,
            cursor: 'pointer',
            '&:hover': { color: THEME.primary }
          }}
        >
          {filter.region_name || filter.region_code}
        </Link>
      )}
      
      {filter.city_code && (
        <Typography 
          variant="body2" 
          sx={{ color: THEME.primary, fontWeight: 600 }}
        >
          {filter.city_name || filter.city_code}
        </Typography>
      )}
    </Breadcrumbs>
  );
}

// Location Card - clickable for drilldown
function LocationCard({ 
  name, 
  code, 
  searchCount, 
  uniqueQueries, 
  onClick,
  icon,
  color = THEME.primary
}: { 
  name: string;
  code: string;
  searchCount: number;
  uniqueQueries: number;
  onClick: () => void;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'transparent',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderColor: alpha(color, 0.3),
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} color={THEME.text}>
              {name}
            </Typography>
            <Typography variant="caption" color={THEME.textSecondary}>
              {code}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontWeight={700} color={color}>
              {searchCount.toLocaleString()}
            </Typography>
            <Typography variant="caption" color={THEME.textSecondary}>
              {uniqueQueries} unique
            </Typography>
          </Box>
          <KeyboardArrowRight sx={{ color: THEME.textSecondary }} />
        </Box>
      </CardContent>
    </Card>
  );
}

// Top Searches Table
function TopSearchesTable({ 
  searches, 
  locationName,
  loading = false
}: { 
  searches: Array<{ query: string; count: number }>;
  locationName: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Box>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={50} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (searches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Search sx={{ fontSize: 48, color: THEME.textSecondary, opacity: 0.5, mb: 2 }} />
        <Typography color={THEME.textSecondary}>
          No searches recorded in {locationName}
        </Typography>
      </Box>
    );
  }

  const maxCount = Math.max(...searches.map(s => s.count));

  return (
    <Box>
      {searches.slice(0, 10).map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            mb: 1,
            borderRadius: 2,
            bgcolor: index === 0 ? alpha(THEME.primary, 0.05) : 'transparent',
            '&:hover': { bgcolor: alpha(THEME.primary, 0.05) }
          }}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%',
              bgcolor: index < 3 ? THEME.primary : THEME.textSecondary,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {index + 1}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body1" fontWeight={500} color={THEME.text}>
              {item.query}
            </Typography>
            <Box sx={{ mt: 0.5, height: 4, bgcolor: alpha(THEME.primary, 0.1), borderRadius: 2, overflow: 'hidden' }}>
              <Box 
                sx={{ 
                  height: '100%', 
                  width: `${(item.count / maxCount) * 100}%`,
                  bgcolor: THEME.primary,
                  borderRadius: 2,
                }} 
              />
            </Box>
          </Box>
          <Chip 
            label={item.count.toLocaleString()} 
            size="small"
            sx={{ 
              bgcolor: alpha(THEME.primary, 0.1),
              color: THEME.primary,
              fontWeight: 600,
            }} 
          />
        </Box>
      ))}
    </Box>
  );
}

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          {label}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

export default function SearchAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<SearchAnalyticsData | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'global' });
  
  // Filter dropdown states
  const [availableCountries, setAvailableCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [availableRegions, setAvailableRegions] = useState<Array<{ code: string; name: string }>>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<{ code: string; name: string } | null>(null);
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<{ code: string; name: string } | null>(null);

  // Fetch available countries for filtering
  const fetchCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const response = await fetch(`${MAIN_API_URL}/locations/countries`);
      if (response.ok) {
        const countries = await response.json();
        setAvailableCountries(countries.map((c: any) => ({ code: c.code, name: c.name })));
      }
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  // Fetch regions for selected country
  const fetchRegions = useCallback(async (countryCode: string) => {
    setLoadingRegions(true);
    try {
      const response = await fetch(`${MAIN_API_URL}/locations/regions?country_code=${countryCode}`);
      if (response.ok) {
        const regions = await response.json();
        setAvailableRegions(regions.map((r: any) => ({ code: r.region_code, name: r.name })));
      }
    } catch (err) {
      console.error('Failed to fetch regions:', err);
    } finally {
      setLoadingRegions(false);
    }
  }, []);

  // Load countries on mount
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Load regions when country changes
  useEffect(() => {
    if (selectedCountryFilter) {
      fetchRegions(selectedCountryFilter.code);
    } else {
      setAvailableRegions([]);
      setSelectedRegionFilter(null);
    }
  }, [selectedCountryFilter, fetchRegions]);

  // Handle country filter change
  const handleCountryFilterChange = (country: { code: string; name: string } | null) => {
    setSelectedCountryFilter(country);
    setSelectedRegionFilter(null);
    
    if (country) {
      setLocationFilter({
        type: 'country',
        country_code: country.code,
        country_name: country.name,
      });
    } else {
      setLocationFilter({ type: 'global' });
    }
  };

  // Handle region filter change
  const handleRegionFilterChange = (region: { code: string; name: string } | null) => {
    setSelectedRegionFilter(region);
    
    if (region && selectedCountryFilter) {
      setLocationFilter({
        type: 'region',
        country_code: selectedCountryFilter.code,
        country_name: selectedCountryFilter.name,
        region_code: region.code,
        region_name: region.name,
      });
    } else if (selectedCountryFilter) {
      setLocationFilter({
        type: 'country',
        country_code: selectedCountryFilter.code,
        country_name: selectedCountryFilter.name,
      });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCountryFilter(null);
    setSelectedRegionFilter(null);
    setLocationFilter({ type: 'global' });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${MAIN_API_URL}/admin-ui/search-analytics?days=${days}`;
      
      if (locationFilter.country_code) {
        url += `&country_code=${locationFilter.country_code}`;
      }
      if (locationFilter.region_code) {
        url += `&region_code=${locationFilter.region_code}`;
      }
      if (locationFilter.city_code) {
        url += `&city_code=${locationFilter.city_code}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load search analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [days, locationFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLocationDrilldown = (filter: LocationFilter) => {
    setLocationFilter(filter);
  };

  const handleCountryClick = (country: { country_code: string; country_name: string }) => {
    setLocationFilter({
      type: 'country',
      country_code: country.country_code,
      country_name: country.country_name,
    });
  };

  const handleRegionClick = (region: { region_code: string; region_name: string; country_code: string }) => {
    setLocationFilter({
      ...locationFilter,
      type: 'region',
      region_code: region.region_code,
      region_name: region.region_name,
    });
  };

  const handleCityClick = (city: { city_code: string; city_name: string }) => {
    setLocationFilter({
      ...locationFilter,
      type: 'city',
      city_code: city.city_code,
      city_name: city.city_name,
    });
  };

  const getLocationName = () => {
    if (locationFilter.city_name) return locationFilter.city_name;
    if (locationFilter.region_name) return locationFilter.region_name;
    if (locationFilter.country_name) return locationFilter.country_name;
    return 'Global';
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Error Loading Data
        </Typography>
        <Typography color={THEME.textSecondary}>{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: THEME.background, minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {locationFilter.type !== 'global' && (
              <IconButton 
                onClick={() => {
                  if (locationFilter.type === 'city') {
                    setLocationFilter({
                      type: 'region',
                      country_code: locationFilter.country_code,
                      country_name: locationFilter.country_name,
                      region_code: locationFilter.region_code,
                      region_name: locationFilter.region_name,
                    });
                    // Update dropdown selections to match
                    setSelectedRegionFilter(availableRegions.find(r => r.code === locationFilter.region_code) || null);
                  } else if (locationFilter.type === 'region') {
                    setLocationFilter({
                      type: 'country',
                      country_code: locationFilter.country_code,
                      country_name: locationFilter.country_name,
                    });
                    setSelectedRegionFilter(null);
                  } else {
                    setLocationFilter({ type: 'global' });
                    setSelectedCountryFilter(null);
                    setSelectedRegionFilter(null);
                  }
                }}
                sx={{ 
                  bgcolor: alpha(THEME.primary, 0.1), 
                  color: THEME.primary,
                  '&:hover': { bgcolor: alpha(THEME.primary, 0.2) }
                }}
              >
                <ArrowBack />
              </IconButton>
            )}
            <Typography variant="h4" fontWeight={700} color={THEME.text}>
              Search Analytics
            </Typography>
          </Box>
          <Typography variant="body1" color={THEME.textSecondary}>
            {locationFilter.type === 'global' 
              ? 'Track what users are searching for across all locations'
              : `Viewing searches in ${getLocationName()}`
            }
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={days}
            label="Time Period"
            onChange={(e) => setDays(e.target.value as number)}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={14}>Last 14 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={60}>Last 60 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Location Filter Controls */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList sx={{ color: THEME.primary }} />
          <Typography variant="subtitle1" fontWeight={600} color={THEME.text}>
            Filter by Location
          </Typography>
          {(selectedCountryFilter || selectedRegionFilter) && (
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={handleClearFilters}
              sx={{ ml: 'auto', color: THEME.textSecondary }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={availableCountries}
            getOptionLabel={(option) => option.name}
            value={selectedCountryFilter}
            onChange={(_, value) => handleCountryFilterChange(value)}
            loading={loadingCountries}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Country" 
                placeholder="Select country..."
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Public sx={{ color: THEME.textSecondary, mr: 1, fontSize: 20 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.code === value.code}
          />
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={availableRegions}
            getOptionLabel={(option) => option.name}
            value={selectedRegionFilter}
            onChange={(_, value) => handleRegionFilterChange(value)}
            loading={loadingRegions}
            disabled={!selectedCountryFilter}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Region" 
                placeholder={selectedCountryFilter ? "Select region..." : "Select country first"}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Map sx={{ color: THEME.textSecondary, mr: 1, fontSize: 20 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.code === value.code}
          />
          {/* Show active filter chips */}
          {locationFilter.type !== 'global' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color={THEME.textSecondary} sx={{ mr: 1 }}>
                Active:
              </Typography>
              {locationFilter.country_name && (
                <Chip 
                  label={locationFilter.country_name} 
                  size="small"
                  icon={<Public sx={{ fontSize: 16 }} />}
                  sx={{ bgcolor: alpha(THEME.primary, 0.1), color: THEME.primary }}
                />
              )}
              {locationFilter.region_name && (
                <Chip 
                  label={locationFilter.region_name} 
                  size="small"
                  icon={<Map sx={{ fontSize: 16 }} />}
                  sx={{ bgcolor: alpha(THEME.secondary, 0.1), color: THEME.secondary }}
                />
              )}
              {locationFilter.city_name && (
                <Chip 
                  label={locationFilter.city_name} 
                  size="small"
                  icon={<LocationCity sx={{ fontSize: 16 }} />}
                  sx={{ bgcolor: alpha(THEME.warning, 0.1), color: THEME.warning }}
                />
              )}
            </Box>
          )}
        </Stack>
      </Card>

      {/* Location Breadcrumb */}
      {locationFilter.type !== 'global' && (
        <LocationBreadcrumb filter={locationFilter} onNavigate={handleLocationDrilldown} />
      )}

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Searches"
            value={data?.total_searches || 0}
            icon={<Search sx={{ fontSize: 28 }} />}
            color={THEME.primary}
            subtitle={`in ${getLocationName()}`}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Unique Queries"
            value={data?.top_searches.length || 0}
            icon={<QueryStats sx={{ fontSize: 28 }} />}
            color={THEME.secondary}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={locationFilter.type === 'global' ? 'Countries' : locationFilter.type === 'country' ? 'Regions' : 'Cities'}
            value={
              locationFilter.type === 'global' 
                ? data?.by_country.length || 0
                : locationFilter.type === 'country'
                  ? data?.by_region.length || 0
                  : data?.by_city.length || 0
            }
            icon={<Map sx={{ fontSize: 28 }} />}
            color={THEME.warning}
            loading={loading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Daily Average"
            value={data ? Math.round(data.total_searches / days) : 0}
            icon={<Insights sx={{ fontSize: 28 }} />}
            color={THEME.purple}
            subtitle="searches/day"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column - Top Searches */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TrendingUp sx={{ color: THEME.primary }} />
                <Typography variant="h6" fontWeight={600} color={THEME.text}>
                  Top Searches in {getLocationName()}
                </Typography>
              </Box>
              <TopSearchesTable 
                searches={data?.top_searches || []} 
                locationName={getLocationName()}
                loading={loading}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Location Drilldown */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocationCity sx={{ color: THEME.secondary }} />
                <Typography variant="h6" fontWeight={600} color={THEME.text}>
                  {locationFilter.type === 'global' && 'Searches by Country'}
                  {locationFilter.type === 'country' && 'Searches by Region'}
                  {locationFilter.type === 'region' && 'Searches by City'}
                  {locationFilter.type === 'city' && 'City Details'}
                </Typography>
                <Typography variant="caption" color={THEME.textSecondary} sx={{ ml: 'auto' }}>
                  Click to drill down
                </Typography>
              </Box>
              
              {loading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={70} sx={{ mb: 2, borderRadius: 2 }} />
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Show Countries at Global level */}
                  {locationFilter.type === 'global' && data?.by_country.map((country, idx) => (
                    <LocationCard
                      key={country.country_code}
                      name={country.country_name}
                      code={country.country_code}
                      searchCount={country.search_count}
                      uniqueQueries={country.unique_query_count}
                      onClick={() => handleCountryClick(country)}
                      icon={<Public />}
                      color={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                  
                  {/* Show Regions at Country level */}
                  {locationFilter.type === 'country' && data?.by_region.map((region, idx) => (
                    <LocationCard
                      key={region.region_code}
                      name={region.region_name}
                      code={region.region_code}
                      searchCount={region.search_count}
                      uniqueQueries={region.unique_query_count}
                      onClick={() => handleRegionClick(region)}
                      icon={<Map />}
                      color={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                  
                  {/* Show Cities at Region level */}
                  {locationFilter.type === 'region' && data?.by_city.map((city, idx) => (
                    <LocationCard
                      key={city.city_code}
                      name={city.city_name}
                      code={city.city_code}
                      searchCount={city.search_count}
                      uniqueQueries={city.unique_query_count}
                      onClick={() => handleCityClick(city)}
                      icon={<LocationCity />}
                      color={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}

                  {/* City level - show message */}
                  {locationFilter.type === 'city' && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <LocationCity sx={{ fontSize: 48, color: THEME.primary, mb: 2 }} />
                      <Typography variant="h6" color={THEME.text} gutterBottom>
                        {locationFilter.city_name}
                      </Typography>
                      <Typography color={THEME.textSecondary}>
                        Viewing all searches from this city. Check the top searches panel for details.
                      </Typography>
                    </Box>
                  )}

                  {/* Empty state */}
                  {!loading && (
                    (locationFilter.type === 'global' && data?.by_country.length === 0) ||
                    (locationFilter.type === 'country' && data?.by_region.length === 0) ||
                    (locationFilter.type === 'region' && data?.by_city.length === 0)
                  ) && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Map sx={{ fontSize: 48, color: THEME.textSecondary, opacity: 0.5, mb: 2 }} />
                      <Typography color={THEME.textSecondary}>
                        No location data available for this period
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Activity Chart */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <CalendarToday sx={{ color: THEME.warning }} />
                <Typography variant="h6" fontWeight={600} color={THEME.text}>
                  Search Activity Over Time
                </Typography>
              </Box>
              
              {loading ? (
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
              ) : data?.recent_activity && data.recent_activity.length > 0 ? (
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...data.recent_activity].reverse()}>
                      <defs>
                        <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={THEME.primary} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="uniqueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.secondary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={THEME.secondary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11, fill: THEME.textSecondary }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis tick={{ fontSize: 11, fill: THEME.textSecondary }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="search_count"
                        stroke={THEME.primary}
                        strokeWidth={2}
                        fill="url(#searchGradient)"
                        name="Total Searches"
                      />
                      <Area
                        type="monotone"
                        dataKey="unique_query_count"
                        stroke={THEME.secondary}
                        strokeWidth={2}
                        fill="url(#uniqueGradient)"
                        name="Unique Queries"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CalendarToday sx={{ fontSize: 48, color: THEME.textSecondary, opacity: 0.5, mb: 2 }} />
                  <Typography color={THEME.textSecondary}>
                    No activity data available for this period
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
