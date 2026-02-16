'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Language,
  Article,
  Smartphone,
  AutoAwesome,
  Refresh,
  OpenInNew,
  Speed,
  Public,
  Search,
  Analytics,
  EmojiEvents,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Helper to get auth header
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

interface DashboardData {
  overview: {
    total_blog_posts: number;
    published_posts: number;
    total_active_listings: number;
    ai_citations: number;
  };
  traffic: {
    total_visits: number;
    organic_visits: number;
    organic_percentage: number;
    change_from_last_week: number;
  };
  top_content: any[];
  top_keywords: any[];
}

interface Targets {
  keyword_targets: any[];
  traffic_target: any;
  ai_citation_target: any;
  content_target: any;
}

export default function GrowthEnginePage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchDashboard();
    fetchTargets();
    fetchAudit();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/analytics/dashboard`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/analytics/targets`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (err) {
      console.error('Failed to fetch targets:', err);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/analytics/seo-audit`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit:', err);
    }
  };

  const runAudit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/growth/analytics/seo-audit/run`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data);
      }
    } catch (err) {
      console.error('Failed to run audit:', err);
      setError('Failed to run SEO audit');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Growth & Visibility Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI-powered SEO, ASO, and Content Management for Avida
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={() => {
            fetchDashboard();
            fetchTargets();
          }}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#e3f2fd', height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Article sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Blog Posts
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {dashboardData?.overview.total_blog_posts || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboardData?.overview.published_posts || 0} published
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#e8f5e9', height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp sx={{ mr: 1, color: '#388e3c' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Organic Traffic
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {dashboardData?.traffic.organic_percentage || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +{dashboardData?.traffic.change_from_last_week || 0}% vs last week
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#fff3e0', height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AutoAwesome sx={{ mr: 1, color: '#f57c00' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  AI Citations
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {dashboardData?.overview.ai_citations || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mentions by AI assistants
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#f3e5f5', height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Public sx={{ mr: 1, color: '#7b1fa2' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Active Listings
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {dashboardData?.overview.total_active_listings || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                SEO-optimized pages
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="6-Month Targets" icon={<EmojiEvents />} iconPosition="start" />
        <Tab label="SEO Health" icon={<Speed />} iconPosition="start" />
        <Tab label="Keywords" icon={<Search />} iconPosition="start" />
      </Tabs>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Keyword Targets */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Target Keywords
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Goal: Rank top 3 within 6 months
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Keyword</TableCell>
                        <TableCell align="center">Target</TableCell>
                        <TableCell align="center">Current</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {targets?.keyword_targets.map((target, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{target.keyword}</TableCell>
                          <TableCell align="center">#{target.target_position}</TableCell>
                          <TableCell align="center">
                            {target.current_position ? `#${target.current_position}` : 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={target.current_position && target.current_position <= target.target_position ? 'On Track' : 'In Progress'}
                              color={target.current_position && target.current_position <= target.target_position ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Other Targets */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Traffic Growth Target
                    </Typography>
                    <Typography variant="h5" color="primary">
                      +{targets?.traffic_target.organic_increase_percentage || 300}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organic traffic increase
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={30}
                      sx={{ mt: 2, height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      AI Citation Goal
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {targets?.ai_citation_target.goal}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="h5" sx={{ mr: 1 }}>
                        {targets?.ai_citation_target.current_citations || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / {targets?.ai_citation_target.target_citations || 50} citations
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((targets?.ai_citation_target.current_citations || 0) / (targets?.ai_citation_target.target_citations || 50)) * 100}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Content Target
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {targets?.content_target.posts_per_week || 5} posts per week
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <Typography variant="h5" sx={{ mr: 1 }}>
                        {targets?.content_target.current_published || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / {targets?.content_target.target_total || 120} posts
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((targets?.content_target.current_published || 0) / (targets?.content_target.target_total || 120)) * 100}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    SEO Health Score
                  </Typography>
                  <Button variant="outlined" size="small" onClick={runAudit} startIcon={<Refresh />}>
                    Run Audit
                  </Button>
                </Box>

                {auditResult ? (
                  <>
                    <Box display="flex" alignItems="center" mb={3}>
                      <Typography variant="h2" fontWeight="bold" sx={{ mr: 2 }}>
                        {auditResult.score}
                      </Typography>
                      <Chip
                        label={`Grade: ${auditResult.grade}`}
                        color={
                          auditResult.score >= 80 ? 'success' :
                          auditResult.score >= 60 ? 'warning' : 'error'
                        }
                        size="large"
                      />
                    </Box>

                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Issues ({auditResult.summary?.total_issues || 0})
                    </Typography>
                    {auditResult.issues?.map((issue: any, idx: number) => (
                      <Alert
                        key={idx}
                        severity={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info'}
                        sx={{ mb: 1 }}
                      >
                        {issue.message}
                      </Alert>
                    ))}
                  </>
                ) : (
                  <Alert severity="info">
                    No audit has been run yet. Click "Run Audit" to check your SEO health.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recommendations
                </Typography>
                {auditResult?.recommendations?.map((rec: any, idx: number) => (
                  <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Chip
                      label={rec.priority}
                      size="small"
                      color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'default'}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {rec.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rec.impact}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Keyword Rankings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Track your keyword positions across target countries
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell align="center">Position</TableCell>
                    <TableCell align="center">Change</TableCell>
                    <TableCell align="center">Search Volume</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData?.top_keywords?.length ? (
                    dashboardData.top_keywords.map((kw: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{kw.keyword}</TableCell>
                        <TableCell>{kw.country}</TableCell>
                        <TableCell align="center">#{kw.position}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={kw.change > 0 ? `+${kw.change}` : kw.change}
                            color={kw.change > 0 ? 'success' : kw.change < 0 ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">{kw.search_volume || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          No keywords tracked yet. Start tracking keywords in the Content Engine.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Article />}
              href="/api/admin-ui/dashboard/content-engine"
            >
              Generate Blog Post
            </Button>
          </Grid>
          <Grid>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Smartphone />}
              href="/api/admin-ui/dashboard/aso-engine"
            >
              Optimize App Store
            </Button>
          </Grid>
          <Grid>
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              href="/api/growth/seo-core/sitemap.xml"
              target="_blank"
            >
              View Sitemap
            </Button>
          </Grid>
          <Grid>
            <Button
              variant="outlined"
              startIcon={<Language />}
              href="/api/growth/seo-core/robots.txt"
              target="_blank"
            >
              View Robots.txt
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
