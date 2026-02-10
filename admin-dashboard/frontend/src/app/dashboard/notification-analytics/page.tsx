'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  Refresh,
  Send,
  Email,
  PhoneAndroid,
  Notifications,
  CheckCircle,
  Warning,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const COLORS = {
  sent: '#2196F3',
  delivered: '#4CAF50',
  opened: '#FF9800',
  clicked: '#9C27B0',
  failed: '#F44336',
  primary: '#2E7D32',
};

const CHANNEL_COLORS = {
  push: '#4CAF50',
  email: '#F44336',
  in_app: '#2196F3',
};

interface TimeseriesData {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

interface TriggerData {
  trigger_type: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}

interface ChannelData {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  delivery_rate: number;
  open_rate: number;
}

interface ConversionData {
  total_conversions: number;
  total_value: number;
  by_type: Record<string, { count: number; value: number }>;
  avg_time_to_convert_seconds: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  new_listing_in_category: 'New Listing',
  price_drop_saved_item: 'Price Drop',
  message_received: 'Message',
  offer_received: 'Offer',
  seller_reply: 'Seller Reply',
  similar_listing_alert: 'Similar Listing',
  weekly_digest: 'Weekly Digest',
  promotional: 'Promotional',
};

export default function NotificationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [days, setDays] = useState(30);
  
  const [timeseries, setTimeseries] = useState<TimeseriesData[]>([]);
  const [byTrigger, setByTrigger] = useState<TriggerData[]>([]);
  const [byChannel, setByChannel] = useState<ChannelData[]>([]);
  const [conversions, setConversions] = useState<ConversionData | null>(null);
  const [totals, setTotals] = useState({ sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 });

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, triggerRes, channelRes, convRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/smart-notifications/admin/analytics/timeseries?days=${days}`),
        fetch(`${API_BASE}/smart-notifications/admin/analytics/by-trigger?days=${days}`),
        fetch(`${API_BASE}/smart-notifications/admin/analytics/by-channel?days=${days}`),
        fetch(`${API_BASE}/smart-notifications/admin/conversions`),
        fetch(`${API_BASE}/smart-notifications/admin/analytics`),
      ]);

      if (tsRes.ok) setTimeseries(await tsRes.json());
      if (triggerRes.ok) setByTrigger(await triggerRes.json());
      if (channelRes.ok) setByChannel(await channelRes.json());
      if (convRes.ok) setConversions(await convRes.json());
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setTotals(data.totals || { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 });
      }
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (data: TimeseriesData[]) => {
    if (data.length < 2) return { sent: 0, opened: 0, clicked: 0 };
    
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid);
    const secondHalf = data.slice(mid);
    
    const sumFirst = { sent: 0, opened: 0, clicked: 0 };
    const sumSecond = { sent: 0, opened: 0, clicked: 0 };
    
    firstHalf.forEach(d => { sumFirst.sent += d.sent; sumFirst.opened += d.opened; sumFirst.clicked += d.clicked; });
    secondHalf.forEach(d => { sumSecond.sent += d.sent; sumSecond.opened += d.opened; sumSecond.clicked += d.clicked; });
    
    return {
      sent: sumFirst.sent > 0 ? Math.round(((sumSecond.sent - sumFirst.sent) / sumFirst.sent) * 100) : 0,
      opened: sumFirst.opened > 0 ? Math.round(((sumSecond.opened - sumFirst.opened) / sumFirst.opened) * 100) : 0,
      clicked: sumFirst.clicked > 0 ? Math.round(((sumSecond.clicked - sumFirst.clicked) / sumFirst.clicked) * 100) : 0,
    };
  };

  const growth = calculateGrowth(timeseries);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Analytics sx={{ color: '#2E7D32' }} />
            Notification Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Performance metrics and trends for your notification system
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select value={days} onChange={(e) => setDays(e.target.value as number)} label="Time Range">
              <MenuItem value={7}>Last 7 days</MenuItem>
              <MenuItem value={14}>Last 14 days</MenuItem>
              <MenuItem value={30}>Last 30 days</MenuItem>
              <MenuItem value={60}>Last 60 days</MenuItem>
              <MenuItem value={90}>Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" color="#1976D2" fontWeight="bold">{totals.sent.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Sent</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', color: growth.sent >= 0 ? 'success.main' : 'error.main' }}>
                  {growth.sent >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                  <Typography variant="caption">{growth.sent}%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: '#E8F5E9' }}>
            <CardContent>
              <Typography variant="h4" color="#2E7D32" fontWeight="bold">{totals.delivered.toLocaleString()}</Typography>
              <Typography variant="body2" color="text.secondary">Delivered</Typography>
              <Typography variant="caption" color="text.secondary">
                {totals.sent > 0 ? ((totals.delivered / totals.sent) * 100).toFixed(1) : 0}% rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: '#FFF3E0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" color="#E65100" fontWeight="bold">{totals.opened.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Opened</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : 0}% rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', color: growth.opened >= 0 ? 'success.main' : 'error.main' }}>
                  {growth.opened >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                  <Typography variant="caption">{growth.opened}%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: '#F3E5F5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" color="#7B1FA2" fontWeight="bold">{totals.clicked.toLocaleString()}</Typography>
                  <Typography variant="body2" color="text.secondary">Clicked</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(1) : 0}% rate
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', color: growth.clicked >= 0 ? 'success.main' : 'error.main' }}>
                  {growth.clicked >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                  <Typography variant="caption">{growth.clicked}%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <Card sx={{ bgcolor: conversions && conversions.total_conversions > 0 ? '#E8F5E9' : '#ECEFF1' }}>
            <CardContent>
              <Typography variant="h4" color={conversions && conversions.total_conversions > 0 ? '#2E7D32' : '#607D8B'} fontWeight="bold">
                {conversions?.total_conversions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Conversions</Typography>
              {conversions && conversions.total_value > 0 && (
                <Typography variant="caption" color="success.main">
                  €{conversions.total_value.toFixed(2)} value
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Trends" icon={<TrendingUp />} iconPosition="start" />
          <Tab label="By Trigger Type" icon={<Notifications />} iconPosition="start" />
          <Tab label="By Channel" icon={<Send />} iconPosition="start" />
          <Tab label="Conversions" icon={<CheckCircle />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Trends Chart */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Notification Trends</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sent" name="Sent" stroke={COLORS.sent} fill={COLORS.sent} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="delivered" name="Delivered" stroke={COLORS.delivered} fill={COLORS.delivered} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="opened" name="Opened" stroke={COLORS.opened} fill={COLORS.opened} fillOpacity={0.3} />
                    <Area type="monotone" dataKey="clicked" name="Clicked" stroke={COLORS.clicked} fill={COLORS.clicked} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Daily Performance</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeseries.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric' })} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="sent" name="Sent" fill={COLORS.sent} />
                    <Bar dataKey="opened" name="Opened" fill={COLORS.opened} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Engagement Rate Trend</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeseries.slice(-14).map(d => ({
                    ...d,
                    openRate: d.sent > 0 ? ((d.opened / d.sent) * 100).toFixed(1) : 0,
                    clickRate: d.sent > 0 ? ((d.clicked / d.sent) * 100).toFixed(1) : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric' })} />
                    <YAxis unit="%" />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="openRate" name="Open Rate %" stroke={COLORS.opened} strokeWidth={2} />
                    <Line type="monotone" dataKey="clickRate" name="Click Rate %" stroke={COLORS.clicked} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: By Trigger Type */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Volume by Trigger Type</Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={byTrigger} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="trigger_type" type="category" width={100} tickFormatter={(t) => TRIGGER_LABELS[t] || t} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="sent" name="Sent" fill={COLORS.sent} />
                    <Bar dataKey="opened" name="Opened" fill={COLORS.opened} />
                    <Bar dataKey="clicked" name="Clicked" fill={COLORS.clicked} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Engagement by Trigger</Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={byTrigger}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trigger_type" tickFormatter={(t) => TRIGGER_LABELS[t] || t} angle={-45} textAnchor="end" height={80} />
                    <YAxis unit="%" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="open_rate" name="Open Rate %" fill={COLORS.opened} />
                    <Bar dataKey="click_rate" name="Click Rate %" fill={COLORS.clicked} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Trigger Performance Table</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Trigger Type</TableCell>
                        <TableCell align="right">Sent</TableCell>
                        <TableCell align="right">Delivered</TableCell>
                        <TableCell align="right">Opened</TableCell>
                        <TableCell align="right">Clicked</TableCell>
                        <TableCell align="right">Open Rate</TableCell>
                        <TableCell align="right">Click Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {byTrigger.map((row) => (
                        <TableRow key={row.trigger_type}>
                          <TableCell>
                            <Chip label={TRIGGER_LABELS[row.trigger_type] || row.trigger_type} size="small" />
                          </TableCell>
                          <TableCell align="right">{row.sent.toLocaleString()}</TableCell>
                          <TableCell align="right">{row.delivered.toLocaleString()}</TableCell>
                          <TableCell align="right">{row.opened.toLocaleString()}</TableCell>
                          <TableCell align="right">{row.clicked.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Typography color={row.open_rate > 20 ? 'success.main' : row.open_rate > 10 ? 'warning.main' : 'text.secondary'}>
                              {row.open_rate}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color={row.click_rate > 5 ? 'success.main' : row.click_rate > 2 ? 'warning.main' : 'text.secondary'}>
                              {row.click_rate}%
                            </Typography>
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

      {/* Tab 2: By Channel */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Distribution by Channel</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byChannel.map(c => ({ name: c.channel, value: c.sent }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {byChannel.map((entry, index) => (
                        <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel as keyof typeof CHANNEL_COLORS] || '#9E9E9E'} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Channel Performance</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byChannel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="sent" name="Sent" fill={COLORS.sent} />
                    <Bar dataKey="delivered" name="Delivered" fill={COLORS.delivered} />
                    <Bar dataKey="opened" name="Opened" fill={COLORS.opened} />
                    <Bar dataKey="clicked" name="Clicked" fill={COLORS.clicked} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={2}>
              {byChannel.map((channel) => (
                <Grid size={{ xs: 12, md: 4 }} key={channel.channel}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        {channel.channel === 'push' && <PhoneAndroid sx={{ color: CHANNEL_COLORS.push }} />}
                        {channel.channel === 'email' && <Email sx={{ color: CHANNEL_COLORS.email }} />}
                        {channel.channel === 'in_app' && <Notifications sx={{ color: CHANNEL_COLORS.in_app }} />}
                        <Typography variant="h6" textTransform="capitalize">{channel.channel}</Typography>
                      </Box>
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">Sent</Typography>
                          <Typography variant="h6">{channel.sent.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">Delivered</Typography>
                          <Typography variant="h6">{channel.delivered.toLocaleString()}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">Delivery Rate</Typography>
                          <Typography variant="h6" color="success.main">{channel.delivery_rate}%</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">Open Rate</Typography>
                          <Typography variant="h6" color="warning.main">{channel.open_rate}%</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Conversions */}
      {tabValue === 3 && conversions && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Conversion Overview</Typography>
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h2" color="primary" fontWeight="bold">
                    {conversions.total_conversions}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">Total Conversions</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Total Value</Typography>
                    <Typography variant="h6" color="success.main">€{conversions.total_value.toFixed(2)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Avg Time to Convert</Typography>
                    <Typography variant="h6">{Math.round(conversions.avg_time_to_convert_seconds / 60)} min</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Conversions by Type</Typography>
                {Object.keys(conversions.by_type).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(conversions.by_type).map(([type, data]) => ({
                      type,
                      count: data.count,
                      value: data.value,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="count" name="Count" fill={COLORS.clicked} />
                      <Bar dataKey="value" name="Value (€)" fill={COLORS.delivered} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Alert severity="info">No conversion data yet. Conversions will appear once users take actions after clicking notifications.</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
