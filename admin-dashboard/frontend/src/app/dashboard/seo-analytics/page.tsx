'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  TouchApp,
  Share,
  Search,
  Refresh,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface SEOOverview {
  period_days: number;
  overview: {
    total_impressions: number;
    total_clicks: number;
    total_shares: number;
    overall_ctr: number;
  };
  by_source: Array<{ source: string; clicks: number }>;
  by_category: Array<{ category: string; impressions: number; clicks: number; ctr: number }>;
  top_keywords: Array<{ keyword: string; impressions: number; clicks: number; ctr: number }>;
  daily_trend: Array<{ date: string; impressions: number; clicks: number; ctr: number }>;
  top_listings: Array<{
    id: string;
    title: string;
    price: number;
    category: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9', '#1B5E20', '#388E3C'];

export default function SEOAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SEOOverview | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [periodDays, setPeriodDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const result = await api.getSEOAnalyticsOverview(periodDays);
      setData(result);
    } catch (err: any) {
      console.error('Failed to load SEO analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load SEO analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodDays]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Make sure the SEO tracking system is properly configured and has collected some data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            SEO Performance Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track impressions, clicks, CTR, keywords, and competitor insights
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            size="small"
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={14}>Last 14 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={60}>Last 60 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </TextField>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh className={refreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Overview Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E8F5E9', border: '1px solid #A5D6A7' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Visibility sx={{ color: '#2E7D32' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Impressions
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#2E7D32">
                {formatNumber(data?.overview.total_impressions || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total search appearances
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#E3F2FD', border: '1px solid #90CAF9' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TouchApp sx={{ color: '#1565C0' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Clicks
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#1565C0">
                {formatNumber(data?.overview.total_clicks || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total listing visits
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#FFF3E0', border: '1px solid #FFCC80' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUp sx={{ color: '#EF6C00' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  CTR
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#EF6C00">
                {(data?.overview.overall_ctr || 0).toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Click-through rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#F3E5F5', border: '1px solid #CE93D8' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Share sx={{ color: '#7B1FA2' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Shares
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" color="#7B1FA2">
                {formatNumber(data?.overview.total_shares || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Social media shares
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Trend" icon={<TrendingUp />} iconPosition="start" />
          <Tab label="Keywords" icon={<Search />} iconPosition="start" />
          <Tab label="Sources" />
          <Tab label="Top Listings" />
          <Tab label="Categories" />
        </Tabs>

        <CardContent>
          {/* Trend Tab */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Performance Trend
              </Typography>
              {data?.daily_trend && data.daily_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.daily_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#2E7D32"
                      strokeWidth={2}
                      name="Impressions"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#1565C0"
                      strokeWidth={2}
                      name="Clicks"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="ctr"
                      stroke="#EF6C00"
                      strokeWidth={2}
                      name="CTR %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No trend data available yet. Start tracking SEO events to see performance over time.</Alert>
              )}
            </Box>
          )}

          {/* Keywords Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Top Keywords
              </Typography>
              {data?.top_keywords && data.top_keywords.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="right">Impressions</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                        <TableCell align="right">CTR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.top_keywords.map((keyword, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Search fontSize="small" color="action" />
                              <Typography fontWeight="medium">{keyword.keyword}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{formatNumber(keyword.impressions)}</TableCell>
                          <TableCell align="right">{formatNumber(keyword.clicks)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={`${keyword.ctr}%`}
                              color={keyword.ctr >= 5 ? 'success' : keyword.ctr >= 2 ? 'warning' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No keyword data available. Keywords are tracked when users search and click on listings.</Alert>
              )}
            </Box>
          )}

          {/* Sources Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Traffic Sources
              </Typography>
              {data?.by_source && data.by_source.length > 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.by_source}
                          dataKey="clicks"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {data.by_source.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                            <TableCell>Source</TableCell>
                            <TableCell align="right">Clicks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.by_source.map((source, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: '50%',
                                      bgcolor: COLORS[index % COLORS.length],
                                    }}
                                  />
                                  <Typography>{source.source}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">{formatNumber(source.clicks)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No source data available yet.</Alert>
              )}
            </Box>
          )}

          {/* Top Listings Tab */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Top Performing Listings
              </Typography>
              {data?.top_listings && data.top_listings.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                        <TableCell>Listing</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Impressions</TableCell>
                        <TableCell align="right">Clicks</TableCell>
                        <TableCell align="right">CTR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.top_listings.map((listing, index) => (
                        <TableRow key={listing.id} hover>
                          <TableCell>
                            <Box>
                              <Typography fontWeight="medium" noWrap sx={{ maxWidth: 300 }}>
                                {listing.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${listing.price?.toFixed(2)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={listing.category || 'Unknown'} variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{formatNumber(listing.impressions)}</TableCell>
                          <TableCell align="right">{formatNumber(listing.clicks)}</TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                              {listing.ctr >= 5 ? (
                                <ArrowUpward fontSize="small" color="success" />
                              ) : listing.ctr < 2 ? (
                                <ArrowDownward fontSize="small" color="error" />
                              ) : null}
                              <Chip
                                size="small"
                                label={`${listing.ctr}%`}
                                color={listing.ctr >= 5 ? 'success' : listing.ctr >= 2 ? 'warning' : 'error'}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No listings with sufficient impressions yet. Listings need at least 10 impressions to appear here.</Alert>
              )}
            </Box>
          )}

          {/* Categories Tab */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Performance by Category
              </Typography>
              {data?.by_category && data.by_category.length > 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.by_category}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <ChartTooltip />
                        <Legend />
                        <Bar dataKey="impressions" fill="#2E7D32" name="Impressions" />
                        <Bar dataKey="clicks" fill="#1565C0" name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Impressions</TableCell>
                            <TableCell align="right">Clicks</TableCell>
                            <TableCell align="right">CTR</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.by_category.map((cat, index) => (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Typography fontWeight="medium">{cat.category || 'Unknown'}</Typography>
                              </TableCell>
                              <TableCell align="right">{formatNumber(cat.impressions)}</TableCell>
                              <TableCell align="right">{formatNumber(cat.clicks)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  size="small"
                                  label={`${cat.ctr}%`}
                                  color={cat.ctr >= 5 ? 'success' : cat.ctr >= 2 ? 'warning' : 'default'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No category performance data available yet.</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
