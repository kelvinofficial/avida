'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Chip, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Alert, LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Search, Add, Delete, Refresh, CompareArrows,
  LinkOff, NewReleases, Assessment, EmojiEvents, Warning, CheckCircle, Info,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  very_hard: '#9C27B0',
};

export default function BacklinkMonitoringPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [competitors, setCompetitors] = useState<any[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [backlinkChanges, setBacklinkChanges] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(['jiji.co.tz', 'olx.co.za']);
  const [newCompetitor, setNewCompetitor] = useState('');

  useEffect(() => {
    fetchCompetitors();
    fetchBacklinkChanges();
    fetchComparison();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/monitoring/competitors`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
      }
    } catch (err) {
      console.error('Failed to fetch competitors');
    }
  };

  const fetchBacklinkChanges = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/monitoring/backlink-changes?days=30`, { headers: getAuthHeaders() });
      if (res.ok) {
        setBacklinkChanges(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch backlink changes');
    }
  };

  const fetchComparison = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/monitoring/competitor-comparison`, { headers: getAuthHeaders() });
      if (res.ok) {
        setComparison(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch comparison');
    }
  };

  const runGapAnalysis = async () => {
    if (selectedCompetitors.length === 0) {
      setError('Select at least one competitor');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/growth/authority/monitoring/gap-analysis`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ competitors: selectedCompetitors, include_common: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setGapAnalysis(data);
        setSuccess('Gap analysis complete!');
      } else {
        setError('Failed to run gap analysis');
      }
    } catch (err) {
      setError('Failed to run gap analysis');
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = async () => {
    if (!newCompetitor.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/growth/authority/monitoring/competitors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain: newCompetitor }),
      });
      if (res.ok) {
        setSuccess('Competitor added');
        setNewCompetitor('');
        fetchCompetitors();
      }
    } catch (err) {
      setError('Failed to add competitor');
    }
  };

  const toggleCompetitor = (domain: string) => {
    setSelectedCompetitors(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain)
        : [...prev, domain].slice(0, 5) // Max 5 competitors
    );
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Warning color="error" />;
      default: return <Info color="info" />;
    }
  };

  return (
    <Box sx={{ p: 3 }} data-testid="backlink-monitoring-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Backlink Monitoring</Typography>
        <Typography variant="body1" color="text.secondary">
          Track backlink changes and analyze competitor link profiles
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        Demo Mode: Using simulated data. Connect Ahrefs or Moz API for real backlink monitoring.
      </Alert>

      {/* Overview Cards */}
      {backlinkChanges && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: 'success.dark', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <NewReleases sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">{backlinkChanges.summary?.new_backlinks || 0}</Typography>
                <Typography variant="body2">New Backlinks</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: 'error.dark', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <LinkOff sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">{backlinkChanges.summary?.lost_backlinks || 0}</Typography>
                <Typography variant="body2">Lost Backlinks</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                {backlinkChanges.summary?.net_change >= 0 ? (
                  <TrendingUp sx={{ fontSize: 32, mb: 1, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 32, mb: 1, color: 'error.main' }} />
                )}
                <Typography variant="h4" fontWeight="bold" color={backlinkChanges.summary?.net_change >= 0 ? 'success.main' : 'error.main'}>
                  {backlinkChanges.summary?.net_change > 0 ? '+' : ''}{backlinkChanges.summary?.net_change || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">Net Change (30d)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <EmojiEvents sx={{ fontSize: 32, mb: 1, color: 'primary.main' }} />
                <Typography variant="h4" fontWeight="bold">{comparison?.your_rank || '-'}</Typography>
                <Typography variant="body2" color="text.secondary">Your Rank</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerts */}
      {backlinkChanges?.alerts?.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Alerts</Typography>
            <Grid container spacing={1}>
              {backlinkChanges.alerts.map((alert: any, idx: number) => (
                <Grid item xs={12} md={6} lg={4} key={idx}>
                  <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {getAlertIcon(alert.type)}
                    <Box>
                      <Typography variant="subtitle2">{alert.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{alert.message}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Gap Analysis" icon={<CompareArrows />} iconPosition="start" />
        <Tab label="Competitor Comparison" icon={<Assessment />} iconPosition="start" />
        <Tab label="Backlink Changes" icon={<TrendingUp />} iconPosition="start" />
      </Tabs>

      {/* Gap Analysis Tab */}
      {tabValue === 0 && (
        <Box>
          {/* Competitor Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Select Competitors for Gap Analysis</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Find domains that link to your competitors but not to you (max 5)
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {['jiji.co.tz', 'jiji.co.ke', 'olx.co.za', 'pigiame.co.ke', 'zoom.co.tz', 'jumia.com', 'kilimall.co.ke'].map(domain => (
                  <Chip
                    key={domain}
                    label={domain}
                    onClick={() => toggleCompetitor(domain)}
                    color={selectedCompetitors.includes(domain) ? 'primary' : 'default'}
                    variant={selectedCompetitors.includes(domain) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Add custom competitor domain"
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  sx={{ width: 250 }}
                />
                <Button size="small" onClick={addCompetitor} disabled={!newCompetitor.trim()}>
                  <Add /> Add
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button 
                  variant="contained" 
                  onClick={runGapAnalysis}
                  disabled={loading || selectedCompetitors.length === 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                >
                  Run Gap Analysis
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Gap Analysis Results */}
          {gapAnalysis && (
            <>
              {/* Summary */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{gapAnalysis.summary?.total_gap_opportunities}</Typography>
                      <Typography variant="body2">Gap Opportunities</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">{gapAnalysis.summary?.common_link_opportunities}</Typography>
                      <Typography variant="body2">Common Links</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">{gapAnalysis.summary?.easy_wins_count}</Typography>
                      <Typography variant="body2">Easy Wins</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">{gapAnalysis.summary?.high_priority_count}</Typography>
                      <Typography variant="body2">High Priority</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Recommendations */}
              <Card sx={{ mb: 3, bgcolor: 'primary.dark', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recommendations</Typography>
                  {gapAnalysis.recommendations?.map((rec: string, idx: number) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <CheckCircle fontSize="small" />
                      <Typography variant="body2">{rec}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              {/* Opportunities Table */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Link Opportunities</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Domain</TableCell>
                          <TableCell>DA</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Competitors</TableCell>
                          <TableCell>Difficulty</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Approach</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...(gapAnalysis.gap_opportunities || []), ...(gapAnalysis.common_opportunities || [])].slice(0, 20).map((opp: any, idx: number) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography fontWeight="bold">{opp.source_domain}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={`DA ${opp.source_da}`} size="small" color={opp.source_da >= 60 ? 'success' : opp.source_da >= 40 ? 'warning' : 'default'} />
                            </TableCell>
                            <TableCell>{opp.category}</TableCell>
                            <TableCell>
                              <Tooltip title={opp.linking_competitors?.join(', ')}>
                                <Chip label={`${opp.competitors_with_link} competitors`} size="small" variant="outlined" />
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Chip label={opp.difficulty} size="small" sx={{ bgcolor: DIFFICULTY_COLORS[opp.difficulty], color: 'white' }} />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress variant="determinate" value={opp.opportunity_score} sx={{ width: 60, height: 8, borderRadius: 1 }} />
                                <Typography variant="body2">{opp.opportunity_score}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ maxWidth: 200, display: 'block' }}>{opp.suggested_approach}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* Competitor Comparison Tab */}
      {tabValue === 1 && comparison && (
        <Box>
          {/* Insights */}
          <Card sx={{ mb: 3, bgcolor: 'info.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Competitive Insights</Typography>
              {comparison.insights?.map((insight: string, idx: number) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Info fontSize="small" />
                  <Typography variant="body2">{insight}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Backlink Metrics Comparison</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>Domain</TableCell>
                      <TableCell>Est. DA</TableCell>
                      <TableCell>Total Backlinks</TableCell>
                      <TableCell>Dofollow</TableCell>
                      <TableCell>Referring Domains</TableCell>
                      <TableCell>Avg Source DA</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparison.comparison?.map((comp: any, idx: number) => (
                      <TableRow key={idx} hover sx={{ bgcolor: comp.is_you ? 'primary.light' : 'inherit' }}>
                        <TableCell>
                          {idx === 0 ? <EmojiEvents sx={{ color: 'gold' }} /> : idx + 1}
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={comp.is_you ? 'bold' : 'normal'}>
                            {comp.name}
                            {comp.is_you && <Chip label="YOU" size="small" color="primary" sx={{ ml: 1 }} />}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`DA ${comp.estimated_da}`} size="small" color={comp.estimated_da >= 50 ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell>{comp.total_backlinks?.toLocaleString()}</TableCell>
                        <TableCell>{comp.dofollow_backlinks?.toLocaleString()}</TableCell>
                        <TableCell>{comp.referring_domains?.toLocaleString()}</TableCell>
                        <TableCell>{comp.average_da}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Backlink Changes Tab */}
      {tabValue === 2 && backlinkChanges && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'success.main' }}>
                  <NewReleases sx={{ mr: 1, verticalAlign: 'middle' }} />
                  New Backlinks ({backlinkChanges.new_backlinks?.length || 0})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Domain</TableCell>
                        <TableCell>DA</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Discovered</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backlinkChanges.new_backlinks?.map((bl: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell>{bl.source_domain}</TableCell>
                          <TableCell><Chip label={`DA ${bl.source_da}`} size="small" /></TableCell>
                          <TableCell><Chip label={bl.link_type} size="small" color={bl.link_type === 'dofollow' ? 'success' : 'default'} /></TableCell>
                          <TableCell>{new Date(bl.discovered_date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
                  <LinkOff sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Lost Backlinks ({backlinkChanges.lost_backlinks?.length || 0})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Domain</TableCell>
                        <TableCell>DA</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Lost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backlinkChanges.lost_backlinks?.map((bl: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell>{bl.source_domain}</TableCell>
                          <TableCell><Chip label={`DA ${bl.domain_authority || '?'}`} size="small" /></TableCell>
                          <TableCell><Typography variant="caption">{bl.possible_reason}</Typography></TableCell>
                          <TableCell>{new Date(bl.lost_date).toLocaleDateString()}</TableCell>
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
    </Box>
  );
}
