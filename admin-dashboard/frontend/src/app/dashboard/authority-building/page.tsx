'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Campaign, Link as LinkIcon, Email, Add, Edit, Delete, Refresh, Lightbulb,
  CheckCircle, Schedule, TrendingUp, Close, ContentCopy, Search, Speed, Assessment, Public,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';
const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const CAMPAIGN_TYPES = [
  { value: 'pr', label: 'PR Campaign', color: '#E91E63' },
  { value: 'guest_post', label: 'Guest Post', color: '#9C27B0' },
  { value: 'link_building', label: 'Link Building', color: '#3F51B5' },
  { value: 'partnership', label: 'Partnership', color: '#00BCD4' },
  { value: 'media', label: 'Media Outreach', color: '#FF9800' },
];

const CONTACT_STATUSES = [
  { value: 'identified', label: 'Identified', color: '#9E9E9E' },
  { value: 'contacted', label: 'Contacted', color: '#2196F3' },
  { value: 'responded', label: 'Responded', color: '#FF9800' },
  { value: 'negotiating', label: 'Negotiating', color: '#673AB7' },
  { value: 'linked', label: 'Linked', color: '#4CAF50' },
  { value: 'declined', label: 'Declined', color: '#F44336' },
];

const REGIONS = ['TZ', 'KE', 'DE', 'UG', 'NG', 'ZA'];

export default function AuthorityBuildingPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [dashboard, setDashboard] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignContacts, setCampaignContacts] = useState<any[]>([]);
  
  // New suggestion states
  const [backlinkOpportunities, setBacklinkOpportunities] = useState<any[]>([]);
  const [prOpportunities, setPrOpportunities] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [competitorDomain, setCompetitorDomain] = useState<string>('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'campaign' | 'contact' | 'backlink'>('campaign');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => { 
    fetchDashboard(); 
    fetchCampaigns(); 
    fetchTemplates(); 
    fetchBacklinks(); 
    fetchHealthScore();
    fetchBacklinkOpportunities();
    fetchPrOpportunities();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/dashboard`, { headers: getAuthHeaders() });
      if (res.ok) setDashboard(await res.json());
    } catch (err) { console.error('Failed to fetch dashboard'); }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/campaigns`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setCampaigns(data.campaigns || []); }
    } catch (err) { console.error('Failed to fetch campaigns'); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/templates`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setTemplates(data.templates || []); }
    } catch (err) { console.error('Failed to fetch templates'); }
  };

  const fetchBacklinks = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/backlinks`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setBacklinks(data.backlinks || []); }
    } catch (err) { console.error('Failed to fetch backlinks'); }
  };

  const fetchHealthScore = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/insights/health-score`, { headers: getAuthHeaders() });
      if (res.ok) setHealthScore(await res.json());
    } catch (err) { console.error('Failed to fetch health score'); }
  };

  const fetchBacklinkOpportunities = async (region?: string) => {
    try {
      const url = region 
        ? `${API_BASE}/growth/authority/suggestions/backlink-opportunities?region=${region}`
        : `${API_BASE}/growth/authority/suggestions/backlink-opportunities`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setBacklinkOpportunities(data.opportunities || []); }
    } catch (err) { console.error('Failed to fetch backlink opportunities'); }
  };

  const fetchPrOpportunities = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/suggestions/pr-opportunities`, { headers: getAuthHeaders() });
      if (res.ok) setPrOpportunities(await res.json());
    } catch (err) { console.error('Failed to fetch PR opportunities'); }
  };

  const analyzeCompetitor = async () => {
    if (!competitorDomain.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/authority/analyze/competitor-backlinks?competitor_domain=${encodeURIComponent(competitorDomain)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setCompetitorAnalysis(await res.json());
        setSuccess('Competitor analysis complete');
      }
    } catch (err) { setError('Failed to analyze competitor'); }
    finally { setLoading(false); }
  };

  const fetchCampaignContacts = async (campaignId: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/campaigns/${campaignId}`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setCampaignContacts(data.contacts || []); setSelectedCampaign(data.campaign); }
    } catch (err) { console.error('Failed to fetch contacts'); }
  };

  const createCampaign = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/authority/campaigns`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData),
      });
      if (res.ok) { setSuccess('Campaign created'); setDialogOpen(false); setFormData({}); fetchCampaigns(); fetchDashboard(); fetchHealthScore(); }
      else setError('Failed to create campaign');
    } catch (err) { setError('Failed to create campaign'); }
    finally { setLoading(false); }
  };

  const createContact = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/authority/contacts`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ ...formData, campaign_id: selectedCampaign?.id }),
      });
      if (res.ok) { setSuccess('Contact added'); setDialogOpen(false); setFormData({}); if (selectedCampaign) fetchCampaignContacts(selectedCampaign.id); fetchDashboard(); fetchHealthScore(); }
      else setError('Failed to add contact');
    } catch (err) { setError('Failed to add contact'); }
    finally { setLoading(false); }
  };

  const updateContactStatus = async (contactId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/growth/authority/contacts/${contactId}`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ status, campaign_id: selectedCampaign?.id }),
      });
      if (res.ok) { fetchCampaignContacts(selectedCampaign.id); fetchDashboard(); fetchHealthScore(); }
    } catch (err) { console.error('Failed to update contact'); }
  };

  const createBacklink = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/authority/backlinks`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(formData),
      });
      if (res.ok) { setSuccess('Backlink added'); setDialogOpen(false); setFormData({}); fetchBacklinks(); fetchDashboard(); fetchHealthScore(); }
      else setError('Failed to add backlink');
    } catch (err) { setError('Failed to add backlink'); }
    finally { setLoading(false); }
  };

  const addOpportunityAsContact = async (opp: any) => {
    if (!selectedCampaign) {
      setError('Please select a campaign first');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/growth/authority/contacts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          domain: opp.domain,
          domain_authority: opp.da,
          status: 'identified',
          notes: `Source: ${opp.type}, Region: ${opp.region}, Topics: ${opp.topics?.join(', ') || 'N/A'}`
        }),
      });
      if (res.ok) {
        setSuccess(`Added ${opp.domain} to campaign`);
        fetchCampaignContacts(selectedCampaign.id);
        fetchBacklinkOpportunities(selectedRegion);
        fetchHealthScore();
      }
    } catch (err) { setError('Failed to add contact'); }
  };

  const copyTemplate = (body: string) => { navigator.clipboard.writeText(body); setSuccess('Template copied!'); };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'info';
      case 'C': return 'warning';
      default: return 'error';
    }
  };

  return (
    <Box sx={{ p: 3 }} data-testid="authority-building-page">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Authority Building</Typography>
        <Typography variant="body1" color="text.secondary">PR campaigns, outreach management, backlink tracking, and opportunity discovery</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Health Score Card */}
      {healthScore && (
        <Card sx={{ mb: 3, bgcolor: healthScore.grade === 'A' ? 'success.dark' : healthScore.grade === 'B' ? 'info.dark' : healthScore.grade === 'C' ? 'warning.dark' : 'error.dark', color: 'white' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Assessment sx={{ fontSize: 48 }} />
                  <Typography variant="h2" fontWeight="bold">{healthScore.overall_score}</Typography>
                  <Chip label={`Grade ${healthScore.grade}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Performance Breakdown</Typography>
                {Object.entries(healthScore.components || {}).map(([key, value]: [string, any]) => (
                  <Box key={key} sx={{ mb: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">{key.replace(/_/g, ' ')}</Typography>
                      <Typography variant="caption">{value}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={Math.min(value, 100)} sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }} />
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Recommendations</Typography>
                {healthScore.recommendations?.slice(0, 3).map((rec: any, idx: number) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip label={rec.priority} size="small" color={rec.priority === 'high' ? 'error' : 'warning'} sx={{ fontSize: 10, height: 20 }} />
                    <Typography variant="caption">{rec.action}</Typography>
                  </Box>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Stats */}
      {dashboard && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary" fontWeight="bold">{dashboard.campaigns?.total || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Campaigns</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main" fontWeight="bold">{dashboard.outreach?.total_contacts || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Contacts</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">{dashboard.outreach?.by_status?.linked || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Links Won</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">{dashboard.backlinks?.total || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Backlinks</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Campaigns" icon={<Campaign />} iconPosition="start" />
        <Tab label="Opportunities" icon={<Lightbulb />} iconPosition="start" />
        <Tab label="Competitor Analysis" icon={<Search />} iconPosition="start" />
        <Tab label="Backlinks" icon={<LinkIcon />} iconPosition="start" />
        <Tab label="Templates" icon={<Email />} iconPosition="start" />
      </Tabs>

      {/* Campaigns Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">{selectedCampaign ? `Campaign: ${selectedCampaign.name}` : 'All Campaigns'}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedCampaign && <Button variant="outlined" onClick={() => { setSelectedCampaign(null); setCampaignContacts([]); }}>Back to Campaigns</Button>}
              <Button variant="contained" startIcon={<Add />} onClick={() => {
                setDialogType(selectedCampaign ? 'contact' : 'campaign');
                setFormData(selectedCampaign ? { status: 'identified' } : { campaign_type: 'link_building', status: 'draft' });
                setDialogOpen(true);
              }}>{selectedCampaign ? 'Add Contact' : 'New Campaign'}</Button>
            </Box>
          </Box>

          {!selectedCampaign ? (
            <Grid container spacing={2}>
              {campaigns.map(campaign => (
                <Grid item xs={12} md={6} lg={4} key={campaign.id}>
                  <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => fetchCampaignContacts(campaign.id)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">{campaign.name}</Typography>
                        <Chip label={campaign.status} size="small" color={campaign.status === 'active' ? 'success' : 'default'} />
                      </Box>
                      <Chip label={CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type)?.label} size="small" sx={{ bgcolor: campaign.color, color: 'white', mb: 1 }} />
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Typography variant="body2"><strong>{campaign.stats?.total_contacts || 0}</strong> contacts</Typography>
                        <Typography variant="body2"><strong>{campaign.stats?.linked || 0}</strong> links</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {campaigns.length === 0 && (
                <Grid item xs={12}><Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Campaign sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography color="text.secondary">No campaigns yet. Create your first campaign!</Typography>
                </CardContent></Card></Grid>
              )}
            </Grid>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Domain</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>DA</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaignContacts.map(contact => (
                    <TableRow key={contact.id} hover>
                      <TableCell><Typography fontWeight="bold">{contact.domain}</Typography></TableCell>
                      <TableCell>{contact.contact_name || '-'}<br/><Typography variant="caption" color="text.secondary">{contact.contact_email}</Typography></TableCell>
                      <TableCell><Chip label={`DA ${contact.domain_authority || '?'}`} size="small" /></TableCell>
                      <TableCell>
                        <Select size="small" value={contact.status} onChange={(e) => updateContactStatus(contact.id, e.target.value)} sx={{ minWidth: 120 }}>
                          {CONTACT_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell><IconButton size="small"><Edit fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  {campaignContacts.length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No contacts yet</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Opportunities Tab */}
      {tabValue === 1 && (
        <Box>
          <Grid container spacing={3}>
            {/* Backlink Opportunities */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Backlink Opportunities</Typography>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Region</InputLabel>
                      <Select value={selectedRegion} label="Region" onChange={(e) => { setSelectedRegion(e.target.value); fetchBacklinkOpportunities(e.target.value); }}>
                        <MenuItem value="">All Regions</MenuItem>
                        {REGIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Domain</TableCell>
                          <TableCell>DA</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Region</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {backlinkOpportunities.slice(0, 15).map((opp, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography fontWeight="bold">{opp.domain}</Typography>
                              <Typography variant="caption" color="text.secondary">{opp.topics?.slice(0, 2).join(', ')}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={`DA ${opp.da}`} size="small" color={opp.da >= 60 ? 'success' : opp.da >= 40 ? 'warning' : 'default'} />
                            </TableCell>
                            <TableCell>{opp.type}</TableCell>
                            <TableCell><Chip label={opp.region} size="small" variant="outlined" /></TableCell>
                            <TableCell>
                              <Tooltip title={selectedCampaign ? "Add to campaign" : "Select a campaign first"}>
                                <span>
                                  <Button size="small" variant="outlined" onClick={() => addOpportunityAsContact(opp)} disabled={!selectedCampaign}>
                                    <Add fontSize="small" />
                                  </Button>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* PR Opportunities */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>PR Opportunities</Typography>
                  {prOpportunities?.recommendations?.map((rec: any, idx: number) => (
                    <Paper key={idx} sx={{ p: 1.5, mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip label={rec.type} size="small" color="primary" sx={{ fontSize: 10 }} />
                        <Chip label={rec.estimated_impact} size="small" color={rec.estimated_impact === 'high' ? 'success' : 'default'} sx={{ fontSize: 10 }} />
                      </Box>
                      <Typography variant="subtitle2">{rec.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{rec.description}</Typography>
                    </Paper>
                  ))}
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Pitch Calendar</Typography>
                  {prOpportunities?.pitch_calendar && Object.entries(prOpportunities.pitch_calendar).map(([quarter, items]: [string, any]) => (
                    <Box key={quarter} sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold">{quarter}:</Typography>
                      <Typography variant="caption" color="text.secondary"> {items.join(', ')}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Competitor Analysis Tab */}
      {tabValue === 2 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Analyze Competitor Backlinks</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Competitor Domain"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  placeholder="e.g., jiji.co.tz"
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" onClick={analyzeCompetitor} disabled={loading || !competitorDomain.trim()} startIcon={loading ? <CircularProgress size={20} /> : <Search />}>
                  Analyze
                </Button>
              </Box>
            </CardContent>
          </Card>

          {competitorAnalysis && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Analysis for <strong>{competitorAnalysis.competitor}</strong>: Found {competitorAnalysis.total_backlinks} backlinks (simulated data for demo)
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Summary</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Dofollow Links</Typography>
                        <Typography variant="h4" color="success.main">{competitorAnalysis.summary?.dofollow_count}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Avg Domain Authority</Typography>
                        <Typography variant="h4">{competitorAnalysis.summary?.avg_domain_authority}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Top Source DA</Typography>
                        <Typography variant="h4" color="primary">{competitorAnalysis.summary?.top_source_da}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Backlink Sources (Opportunities for You)</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Source Domain</TableCell>
                              <TableCell>DA</TableCell>
                              <TableCell>Link Type</TableCell>
                              <TableCell>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {competitorAnalysis.opportunities?.slice(0, 10).map((opp: any, idx: number) => (
                              <TableRow key={idx} hover>
                                <TableCell><Typography fontWeight="bold">{opp.source_domain}</Typography></TableCell>
                                <TableCell><Chip label={`DA ${opp.domain_authority}`} size="small" color={opp.domain_authority >= 60 ? 'success' : 'default'} /></TableCell>
                                <TableCell><Chip label={opp.link_type} size="small" color={opp.link_type === 'dofollow' ? 'success' : 'default'} /></TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="primary">{opp.action}</Typography>
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
            </>
          )}
        </Box>
      )}

      {/* Backlinks Tab */}
      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setDialogType('backlink'); setFormData({ status: 'active', link_type: 'dofollow' }); setDialogOpen(true); }}>Add Backlink</Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead><TableRow>
                <TableCell>Source Domain</TableCell><TableCell>Target URL</TableCell><TableCell>Anchor</TableCell><TableCell>DA</TableCell><TableCell>Type</TableCell><TableCell>Status</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {backlinks.map(link => (
                  <TableRow key={link.id} hover>
                    <TableCell><Typography fontWeight="bold">{link.source_domain}</Typography><Typography variant="caption" color="text.secondary">{link.source_url}</Typography></TableCell>
                    <TableCell>{link.target_url}</TableCell>
                    <TableCell>{link.anchor_text || '-'}</TableCell>
                    <TableCell><Chip label={`DA ${link.domain_authority || '?'}`} size="small" /></TableCell>
                    <TableCell><Chip label={link.link_type} size="small" color={link.link_type === 'dofollow' ? 'success' : 'default'} /></TableCell>
                    <TableCell><Chip label={link.status} size="small" color={link.status === 'active' ? 'success' : link.status === 'lost' ? 'error' : 'default'} /></TableCell>
                  </TableRow>
                ))}
                {backlinks.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No backlinks tracked yet</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Templates Tab */}
      {tabValue === 4 && (
        <Grid container spacing={2}>
          {templates.map(template => (
            <Grid item xs={12} md={6} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{template.name}</Typography>
                    <IconButton size="small" onClick={() => copyTemplate(template.body)}><ContentCopy fontSize="small" /></IconButton>
                  </Box>
                  <Chip label={template.template_type} size="small" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}><strong>Subject:</strong> {template.subject}</Typography>
                  <Paper sx={{ p: 1.5, bgcolor: 'grey.50', maxHeight: 150, overflow: 'auto' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{template.body}</Typography>
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'campaign' ? 'New Campaign' : dialogType === 'contact' ? 'Add Contact' : 'Add Backlink'}
          <IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {dialogType === 'campaign' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Campaign Name" fullWidth value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <FormControl fullWidth><InputLabel>Campaign Type</InputLabel>
                <Select value={formData.campaign_type || 'link_building'} label="Campaign Type" onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}>
                  {CAMPAIGN_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Goal" fullWidth value={formData.goal || ''} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} />
            </Box>
          )}
          {dialogType === 'contact' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Domain" fullWidth value={formData.domain || ''} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="example.com" />
              <TextField label="Contact Name" fullWidth value={formData.contact_name || ''} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              <TextField label="Contact Email" fullWidth value={formData.contact_email || ''} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
              <TextField label="Domain Authority" type="number" fullWidth value={formData.domain_authority || ''} onChange={(e) => setFormData({ ...formData, domain_authority: parseInt(e.target.value) })} />
            </Box>
          )}
          {dialogType === 'backlink' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Source URL" fullWidth value={formData.source_url || ''} onChange={(e) => setFormData({ ...formData, source_url: e.target.value })} />
              <TextField label="Source Domain" fullWidth value={formData.source_domain || ''} onChange={(e) => setFormData({ ...formData, source_domain: e.target.value })} />
              <TextField label="Target URL" fullWidth value={formData.target_url || ''} onChange={(e) => setFormData({ ...formData, target_url: e.target.value })} />
              <TextField label="Anchor Text" fullWidth value={formData.anchor_text || ''} onChange={(e) => setFormData({ ...formData, anchor_text: e.target.value })} />
              <TextField label="Domain Authority" type="number" fullWidth value={formData.domain_authority || ''} onChange={(e) => setFormData({ ...formData, domain_authority: parseInt(e.target.value) })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={dialogType === 'campaign' ? createCampaign : dialogType === 'contact' ? createContact : createBacklink} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
