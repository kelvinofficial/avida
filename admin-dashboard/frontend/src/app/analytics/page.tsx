'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search,
  Public,
  LocationCity,
  Category,
  TrendingUp,
  CalendarToday,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Main backend API URL - search analytics is on the main backend
const MAIN_API_URL = process.env.NEXT_PUBLIC_MAIN_API_URL || 'https://shimmer-loading.preview.emergentagent.com/api';

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

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SearchAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<SearchAnalyticsData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${MAIN_API_URL}/admin-ui/search-analytics?days=${days}`);
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
    };
    fetchData();
  }, [days]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Error Loading Data
        </Typography>
        <Typography color="text.secondary">{error}</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No data available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Search Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track what users are searching for across different locations and categories
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
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

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Searches"
            value={data.total_searches}
            icon={<Search />}
            color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Unique Queries"
            value={data.top_searches.length}
            icon={<TrendingUp />}
            color="#2196F3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Countries"
            value={data.by_country.length}
            icon={<Public />}
            color="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Cities"
            value={data.by_city.length}
            icon={<LocationCity />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="search analytics tabs">
            <Tab label="Searches" icon={<Search />} iconPosition="start" />
            <Tab label="By Location" icon={<Public />} iconPosition="start" />
            <Tab label="Activity" icon={<CalendarToday />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab 0: Top Searches */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Top Search Queries
              </Typography>
              {data.top_searches.length > 0 ? (
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_searches.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="query" type="category" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No search data available for this period</Typography>
                </Box>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                All Queries
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Query</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.top_searches.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.query}</TableCell>
                        <TableCell align="right">
                          <Chip label={item.count} size="small" color="primary" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.top_searches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No queries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: By Location */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* By Country */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Searches by Country
              </Typography>
              {data.by_country.length > 0 ? (
                <>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.by_country}
                          dataKey="search_count"
                          nameKey="country_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ country_name, percent }) => `${country_name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {data.by_country.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">Searches</TableCell>
                          <TableCell align="right">Unique Queries</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.by_country.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={item.country_code}
                                  size="small"
                                  sx={{ bgcolor: COLORS[index % COLORS.length], color: '#fff' }}
                                />
                                {item.country_name}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{item.search_count}</TableCell>
                            <TableCell align="right">{item.unique_query_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No location data available</Typography>
                </Box>
              )}
            </Grid>

            {/* By Region */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Searches by Region
              </Typography>
              {data.by_region.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Region</TableCell>
                        <TableCell>Country</TableCell>
                        <TableCell align="right">Searches</TableCell>
                        <TableCell align="right">Unique</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.by_region.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.region_name}</TableCell>
                          <TableCell>
                            <Chip label={item.country_code} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{item.search_count}</TableCell>
                          <TableCell align="right">{item.unique_query_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No region data available</Typography>
                </Box>
              )}
            </Grid>

            {/* By City */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
                Searches by City
              </Typography>
              {data.by_city.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>City</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Country</TableCell>
                        <TableCell align="right">Searches</TableCell>
                        <TableCell align="right">Unique Queries</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.by_city.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationCity fontSize="small" color="action" />
                              {item.city_name}
                            </Box>
                          </TableCell>
                          <TableCell>{item.region_name}</TableCell>
                          <TableCell>
                            <Chip label={item.country_code} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{item.search_count}</TableCell>
                          <TableCell align="right">{item.unique_query_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No city data available</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Activity Timeline */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Search Activity Over Time
          </Typography>
          {data.recent_activity.length > 0 ? (
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...data.recent_activity].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="search_count"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    dot={{ fill: '#4CAF50' }}
                    name="Total Searches"
                  />
                  <Line
                    type="monotone"
                    dataKey="unique_query_count"
                    stroke="#2196F3"
                    strokeWidth={2}
                    dot={{ fill: '#2196F3' }}
                    name="Unique Queries"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No activity data available for this period</Typography>
            </Box>
          )}

          {/* Activity Table */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Total Searches</TableCell>
                  <TableCell align="right">Unique Queries</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recent_activity.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{item.date}</TableCell>
                    <TableCell align="right">
                      <Chip label={item.search_count} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={item.unique_query_count} size="small" color="primary" />
                    </TableCell>
                  </TableRow>
                ))}
                {data.recent_activity.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No activity recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  );
}
