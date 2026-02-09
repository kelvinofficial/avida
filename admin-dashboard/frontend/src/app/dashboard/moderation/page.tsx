'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Grid,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  InputAdornment,
} from '@mui/material';
import {
  Refresh,
  Search,
  Flag,
  Warning,
  Gavel,
  Block,
  Delete,
  Visibility,
  VisibilityOff,
  Pause,
  PlayArrow,
  PersonOff,
  Person,
  Chat,
  Report,
  Settings,
  FilterList,
  MoreVert,
  Lock,
  LockOpen,
  NoteAdd,
  History,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface ModerationStats {
  flags: { pending: number; by_risk: Record<string, number> };
  reports: { pending: number; by_reason: Record<string, number> };
  users: { muted: number; banned: number };
  conversations: { frozen: number };
  actions_24h: number;
}

interface ModerationFlag {
  id: string;
  conversation_id: string;
  message_id?: string;
  risk_level: string;
  reason_tags: string[];
  ai_confidence?: number;
  detected_patterns: string[];
  status: string;
  created_at: string;
  conversation?: any;
  message?: any;
}

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string;
  message_id?: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  reporter?: any;
  reported_user?: any;
  conversation?: any;
  message?: any;
}

interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_time?: string;
  moderation_status?: string;
  buyer?: any;
  seller?: any;
  listing?: any;
  flags_count?: number;
  reports_count?: number;
  message_count?: number;
  escrow?: any;
}

interface ModerationConfig {
  ai_moderation_enabled: boolean;
  auto_moderation_enabled: boolean;
  escrow_fraud_detection: boolean;
  mask_sensitive_data: boolean;
  rules: {
    auto_warning_threshold: number;
    auto_mute_duration_hours: number;
    auto_ban_threshold: number;
    block_contact_before_order: boolean;
    keyword_blacklist: string[];
    scam_keywords: string[];
  };
}

const RISK_COLORS: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const REASON_LABELS: Record<string, string> = {
  fraud: 'Fraud',
  scam: 'Scam',
  abuse: 'Abuse',
  harassment: 'Harassment',
  profanity: 'Profanity',
  off_platform_payment: 'Off-Platform Payment',
  contact_bypass: 'Contact Bypass',
  spam: 'Spam',
  fake_listing: 'Fake Listing',
  suspicious_pattern: 'Suspicious Pattern',
  other: 'Other',
};

export default function ModerationPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [config, setConfig] = useState<ModerationConfig | null>(null);
  
  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsTotal, setConversationsTotal] = useState(0);
  const [convPage, setConvPage] = useState(0);
  const [convLimit, setConvLimit] = useState(10);
  const [convSearch, setConvSearch] = useState('');
  const [convRiskFilter, setConvRiskFilter] = useState('');
  const [convHasFlags, setConvHasFlags] = useState<boolean | ''>('');
  
  // Flags state
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [flagsTotal, setFlagsTotal] = useState(0);
  const [flagsPage, setFlagsPage] = useState(0);
  const [flagsLimit, setFlagsLimit] = useState(10);
  const [flagsStatus, setFlagsStatus] = useState('pending');
  const [flagsRisk, setFlagsRisk] = useState('');
  
  // Reports state
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(0);
  const [reportsLimit, setReportsLimit] = useState(10);
  const [reportsStatus, setReportsStatus] = useState('pending');
  
  // Dialog states
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionTarget, setActionTarget] = useState<{ type: string; id: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionDuration, setActionDuration] = useState(24);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 15000); // Poll every 15 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Load initial data
  useEffect(() => {
    loadStats();
    loadConfig();
  }, []);
  
  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 0) loadConversations();
    else if (activeTab === 1) loadFlags();
    else if (activeTab === 2) loadReports();
  }, [activeTab, convPage, convLimit, convSearch, convRiskFilter, convHasFlags,
      flagsPage, flagsLimit, flagsStatus, flagsRisk,
      reportsPage, reportsLimit, reportsStatus]);
  
  const loadStats = async () => {
    try {
      const response = await fetch('/api/moderation/stats', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };
  
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/moderation/config', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };
  
  const loadConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(convPage + 1),
        limit: String(convLimit),
      });
      if (convSearch) params.append('search', convSearch);
      if (convRiskFilter) params.append('risk_level', convRiskFilter);
      if (convHasFlags !== '') params.append('has_flags', String(convHasFlags));
      
      const response = await fetch(`/api/moderation/conversations?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        setConversationsTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadFlags = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(flagsPage + 1),
        limit: String(flagsLimit),
        status: flagsStatus,
      });
      if (flagsRisk) params.append('risk_level', flagsRisk);
      
      const response = await fetch(`/api/moderation/flags?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFlags(data.flags);
        setFlagsTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load flags:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(reportsPage + 1),
        limit: String(reportsLimit),
        status: reportsStatus,
      });
      
      const response = await fetch(`/api/moderation/reports?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
        setReportsTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const openConversationDetail = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/moderation/conversations/${conversationId}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data);
        setDetailDialog(true);
      }
    } catch (err) {
      console.error('Failed to load conversation detail:', err);
    }
  };
  
  const openActionDialog = (type: string, targetType: string, targetId: string) => {
    setActionType(type);
    setActionTarget({ type: targetType, id: targetId });
    setActionReason('');
    setActionNotes('');
    setActionDuration(24);
    setActionDialog(true);
  };
  
  const performAction = async () => {
    if (!actionTarget) return;
    
    setActionLoading(true);
    try {
      const response = await fetch('/api/moderation/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action_type: actionType,
          target_type: actionTarget.type,
          target_id: actionTarget.id,
          reason: actionReason,
          notes: actionNotes,
          duration_hours: actionType === 'mute_user' ? actionDuration : undefined,
        }),
      });
      
      if (response.ok) {
        setSuccess('Action performed successfully');
        setActionDialog(false);
        loadStats();
        if (activeTab === 0) loadConversations();
        else if (activeTab === 1) loadFlags();
        else if (activeTab === 2) loadReports();
      } else {
        const data = await response.json();
        setError(data.detail || 'Action failed');
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };
  
  const updateFlagStatus = async (flagId: string, status: string) => {
    try {
      const response = await fetch(`/api/moderation/flags/${flagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        setSuccess('Flag updated');
        loadFlags();
        loadStats();
      }
    } catch (err) {
      setError('Failed to update flag');
    }
  };
  
  const updateReportStatus = async (reportId: string, status: string, actionTaken?: string) => {
    try {
      const response = await fetch(`/api/moderation/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, action_taken: actionTaken }),
      });
      
      if (response.ok) {
        setSuccess('Report updated');
        loadReports();
        loadStats();
      }
    } catch (err) {
      setError('Failed to update report');
    }
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };
  
  return (
    <Box>
      {/* Header with Stats */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Chat Moderation
        </Typography>
        
        {stats && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3} md={2}>
              <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.flags.pending}</Typography>
                  <Typography variant="body2">Pending Flags</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.reports.pending}</Typography>
                  <Typography variant="body2">Pending Reports</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.users.muted}</Typography>
                  <Typography variant="body2">Muted Users</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.users.banned}</Typography>
                  <Typography variant="body2">Banned Users</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Card>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.conversations.frozen}</Typography>
                  <Typography variant="body2">Frozen Chats</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Card>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" fontWeight="bold">{stats.actions_24h}</Typography>
                  <Typography variant="body2">Actions (24h)</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
      
      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab 
            label={
              <Badge badgeContent={stats?.flags.pending || 0} color="error">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chat /> Conversations
                </Box>
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats?.flags.pending || 0} color="error">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Flag /> Flagged Content
                </Box>
              </Badge>
            }
          />
          <Tab 
            label={
              <Badge badgeContent={stats?.reports.pending || 0} color="warning">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Report /> User Reports
                </Box>
              </Badge>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Settings /> Settings
              </Box>
            }
          />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search users or listings..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={convRiskFilter}
                  label="Risk Level"
                  onChange={(e) => setConvRiskFilter(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Has Flags</InputLabel>
                <Select
                  value={convHasFlags}
                  label="Has Flags"
                  onChange={(e) => setConvHasFlags(e.target.value as boolean | '')}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Flagged Only</MenuItem>
                  <MenuItem value="false">No Flags</MenuItem>
                </Select>
              </FormControl>
              <Button startIcon={<Refresh />} onClick={loadConversations}>
                Refresh
              </Button>
            </Box>
            
            {/* Conversations Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Users</TableCell>
                    <TableCell>Listing</TableCell>
                    <TableCell>Messages</TableCell>
                    <TableCell>Flags</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : conversations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No conversations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversations.map((conv) => (
                      <TableRow key={conv.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar src={conv.buyer?.picture} sx={{ width: 24, height: 24 }} />
                              <Typography variant="body2">{conv.buyer?.name || 'Unknown'}</Typography>
                              {conv.buyer?.chat_status === 'muted' && (
                                <Chip size="small" label="Muted" color="warning" />
                              )}
                              {conv.buyer?.chat_status === 'banned' && (
                                <Chip size="small" label="Banned" color="error" />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar src={conv.seller?.picture} sx={{ width: 24, height: 24 }} />
                              <Typography variant="body2">{conv.seller?.name || 'Unknown'}</Typography>
                              {conv.seller?.chat_status === 'muted' && (
                                <Chip size="small" label="Muted" color="warning" />
                              )}
                              {conv.seller?.chat_status === 'banned' && (
                                <Chip size="small" label="Banned" color="error" />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {conv.listing?.title || 'Direct Message'}
                          </Typography>
                          {conv.escrow && (
                            <Chip size="small" label="Escrow" color="primary" sx={{ mt: 0.5 }} />
                          )}
                        </TableCell>
                        <TableCell>{conv.message_count || 0}</TableCell>
                        <TableCell>
                          {(conv.flags_count || 0) > 0 ? (
                            <Chip 
                              size="small" 
                              label={conv.flags_count} 
                              color="error" 
                              icon={<Flag />}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={conv.moderation_status || 'active'}
                            color={
                              conv.moderation_status === 'frozen' ? 'warning' :
                              conv.moderation_status === 'under_review' ? 'info' : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {conv.last_message_time ? formatDate(conv.last_message_time) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => openConversationDetail(conv.id)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Freeze Chat">
                            <IconButton 
                              size="small" 
                              color={conv.moderation_status === 'frozen' ? 'success' : 'warning'}
                              onClick={() => openActionDialog(
                                conv.moderation_status === 'frozen' ? 'unfreeze_conversation' : 'freeze_conversation',
                                'conversation',
                                conv.id
                              )}
                            >
                              {conv.moderation_status === 'frozen' ? <PlayArrow /> : <Pause />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={conversationsTotal}
              page={convPage}
              rowsPerPage={convLimit}
              onPageChange={(_, p) => setConvPage(p)}
              onRowsPerPageChange={(e) => setConvLimit(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>
      )}
      
      {activeTab === 1 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={flagsStatus}
                  label="Status"
                  onChange={(e) => setFlagsStatus(e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="reviewed">Reviewed</MenuItem>
                  <MenuItem value="dismissed">Dismissed</MenuItem>
                  <MenuItem value="actioned">Actioned</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={flagsRisk}
                  label="Risk Level"
                  onChange={(e) => setFlagsRisk(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <Button startIcon={<Refresh />} onClick={loadFlags}>
                Refresh
              </Button>
            </Box>
            
            {/* Flags Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Risk</TableCell>
                    <TableCell>Reasons</TableCell>
                    <TableCell>Detected Patterns</TableCell>
                    <TableCell>AI Confidence</TableCell>
                    <TableCell>Flagged At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : flags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No flags found
                      </TableCell>
                    </TableRow>
                  ) : (
                    flags.map((flag) => (
                      <TableRow key={flag.id} hover>
                        <TableCell>
                          <Chip
                            size="small"
                            label={flag.risk_level.toUpperCase()}
                            color={RISK_COLORS[flag.risk_level] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {flag.reason_tags.map((tag) => (
                              <Chip key={tag} size="small" label={REASON_LABELS[tag] || tag} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                            {flag.detected_patterns.join(', ') || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {flag.ai_confidence ? `${(flag.ai_confidence * 100).toFixed(0)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {formatDate(flag.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Conversation">
                            <IconButton 
                              size="small" 
                              onClick={() => openConversationDetail(flag.conversation_id)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Dismiss">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => updateFlagStatus(flag.id, 'dismissed')}
                            >
                              <Gavel />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={flagsTotal}
              page={flagsPage}
              rowsPerPage={flagsLimit}
              onPageChange={(_, p) => setFlagsPage(p)}
              onRowsPerPageChange={(e) => setFlagsLimit(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>
      )}
      
      {activeTab === 2 && (
        <Card>
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={reportsStatus}
                  label="Status"
                  onChange={(e) => setReportsStatus(e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="reviewed">Reviewed</MenuItem>
                  <MenuItem value="dismissed">Dismissed</MenuItem>
                  <MenuItem value="actioned">Actioned</MenuItem>
                </Select>
              </FormControl>
              <Button startIcon={<Refresh />} onClick={loadReports}>
                Refresh
              </Button>
            </Box>
            
            {/* Reports Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Reporter</TableCell>
                    <TableCell>Reported User</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Reported At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }} />
                            <Typography variant="body2">
                              {report.reporter?.name || report.reporter_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }} />
                            <Typography variant="body2">
                              {report.reported_user?.name || report.reported_user_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={REASON_LABELS[report.reason] || report.reason} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                            {report.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {formatDate(report.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Conversation">
                            <IconButton 
                              size="small" 
                              onClick={() => openConversationDetail(report.conversation_id)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Dismiss">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => updateReportStatus(report.id, 'dismissed')}
                            >
                              <Gavel />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Take Action">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setActionTarget({ type: 'user', id: report.reported_user_id });
                                setActionDialog(true);
                              }}
                            >
                              <Block />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={reportsTotal}
              page={reportsPage}
              rowsPerPage={reportsLimit}
              onPageChange={(_, p) => setReportsPage(p)}
              onRowsPerPageChange={(e) => setReportsLimit(parseInt(e.target.value))}
            />
          </CardContent>
        </Card>
      )}
      
      {activeTab === 3 && config && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Moderation Settings</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    AI Moderation
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>AI Moderation Enabled</Typography>
                      <Chip 
                        label={config.ai_moderation_enabled ? 'ON' : 'OFF'} 
                        color={config.ai_moderation_enabled ? 'success' : 'default'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>Auto Moderation</Typography>
                      <Chip 
                        label={config.auto_moderation_enabled ? 'ON' : 'OFF'} 
                        color={config.auto_moderation_enabled ? 'success' : 'default'}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>Escrow Fraud Detection</Typography>
                      <Chip 
                        label={config.escrow_fraud_detection ? 'ON' : 'OFF'} 
                        color={config.escrow_fraud_detection ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Auto-Moderation Rules
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Warnings before mute</Typography>
                      <Typography fontWeight="bold">{config.rules.auto_warning_threshold}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Auto-mute duration</Typography>
                      <Typography fontWeight="bold">{config.rules.auto_mute_duration_hours}h</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Violations before ban</Typography>
                      <Typography fontWeight="bold">{config.rules.auto_ban_threshold}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography>Block contact before order</Typography>
                      <Chip 
                        label={config.rules.block_contact_before_order ? 'ON' : 'OFF'} 
                        color={config.rules.block_contact_before_order ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Scam Keywords ({config.rules.scam_keywords?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {config.rules.scam_keywords?.slice(0, 20).map((kw, idx) => (
                      <Chip key={idx} size="small" label={kw} variant="outlined" />
                    ))}
                    {(config.rules.scam_keywords?.length || 0) > 20 && (
                      <Chip size="small" label={`+${config.rules.scam_keywords.length - 20} more`} />
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {/* Conversation Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Conversation Details
          {selectedConversation?.conversation?.moderation_status === 'frozen' && (
            <Chip label="FROZEN" color="warning" sx={{ ml: 2 }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedConversation && (
            <Grid container spacing={2}>
              {/* Users Info */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Participants
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary">Buyer</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Avatar src={selectedConversation.buyer?.picture} sx={{ width: 32, height: 32 }} />
                      <Box>
                        <Typography variant="body2">{selectedConversation.buyer?.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {selectedConversation.buyer?.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<PersonOff />}
                        onClick={() => openActionDialog('mute_user', 'user', selectedConversation.buyer?.user_id)}
                      >
                        Mute
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Block />}
                        onClick={() => openActionDialog('ban_user', 'user', selectedConversation.buyer?.user_id)}
                      >
                        Ban
                      </Button>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="caption" color="textSecondary">Seller</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Avatar src={selectedConversation.seller?.picture} sx={{ width: 32, height: 32 }} />
                      <Box>
                        <Typography variant="body2">{selectedConversation.seller?.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {selectedConversation.seller?.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<PersonOff />}
                        onClick={() => openActionDialog('mute_user', 'user', selectedConversation.seller?.user_id)}
                      >
                        Mute
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Block />}
                        onClick={() => openActionDialog('ban_user', 'user', selectedConversation.seller?.user_id)}
                      >
                        Ban
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* Listing Info */}
                  {selectedConversation.listing && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Listing
                      </Typography>
                      <Typography variant="body2">{selectedConversation.listing.title}</Typography>
                      <Typography variant="body2" color="primary">
                        ${selectedConversation.listing.price}
                      </Typography>
                    </>
                  )}
                  
                  {/* Escrow Info */}
                  {selectedConversation.escrow && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Escrow
                      </Typography>
                      <Chip 
                        label={selectedConversation.escrow.status} 
                        color={selectedConversation.escrow.status === 'locked' ? 'error' : 'primary'}
                        size="small"
                      />
                      <Typography variant="body2">
                        Amount: ${selectedConversation.escrow.amount}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Lock />}
                        onClick={() => openActionDialog('lock_escrow', 'escrow', selectedConversation.escrow.id)}
                        sx={{ mt: 1 }}
                      >
                        Lock Escrow
                      </Button>
                    </>
                  )}
                </Paper>
              </Grid>
              
              {/* Messages */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Messages ({selectedConversation.messages?.length || 0})
                  </Typography>
                  <List dense>
                    {selectedConversation.messages?.map((msg: any) => (
                      <ListItem 
                        key={msg.id}
                        sx={{
                          bgcolor: msg.hidden ? 'action.disabledBackground' : 
                                  msg.moderation_status === 'flagged' ? 'error.light' : 'transparent',
                          borderRadius: 1,
                          mb: 0.5,
                        }}
                        secondaryAction={
                          <Box>
                            <Tooltip title="Hide Message">
                              <IconButton 
                                size="small"
                                onClick={() => openActionDialog('hide_message', 'message', msg.id)}
                              >
                                <VisibilityOff />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Message">
                              <IconButton 
                                size="small"
                                color="error"
                                onClick={() => openActionDialog('delete_message', 'message', msg.id)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {msg.sender_id === selectedConversation.buyer?.user_id ? 'B' : 'S'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{msg.content}</Typography>
                              {msg.moderation_status === 'flagged' && (
                                <Chip size="small" label="Flagged" color="error" />
                              )}
                              {msg.hidden && (
                                <Chip size="small" label="Hidden" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={formatDate(msg.created_at)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
                
                {/* Flags & Reports */}
                {(selectedConversation.flags?.length > 0 || selectedConversation.reports?.length > 0) && (
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Flags & Reports
                    </Typography>
                    {selectedConversation.flags?.map((flag: any) => (
                      <Alert 
                        key={flag.id} 
                        severity={flag.risk_level === 'critical' || flag.risk_level === 'high' ? 'error' : 'warning'}
                        sx={{ mb: 1 }}
                      >
                        <strong>{flag.risk_level.toUpperCase()}</strong>: {flag.reason_tags.join(', ')}
                        <br />
                        <Typography variant="caption">
                          Patterns: {flag.detected_patterns.join(', ')}
                        </Typography>
                      </Alert>
                    ))}
                    {selectedConversation.reports?.map((report: any) => (
                      <Alert key={report.id} severity="info" sx={{ mb: 1 }}>
                        <strong>User Report</strong>: {report.reason}
                        {report.description && <><br />{report.description}</>}
                      </Alert>
                    ))}
                  </Paper>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="warning"
            startIcon={selectedConversation?.conversation?.moderation_status === 'frozen' ? <PlayArrow /> : <Pause />}
            onClick={() => openActionDialog(
              selectedConversation?.conversation?.moderation_status === 'frozen' ? 'unfreeze_conversation' : 'freeze_conversation',
              'conversation',
              selectedConversation?.conversation?.id
            )}
          >
            {selectedConversation?.conversation?.moderation_status === 'frozen' ? 'Unfreeze' : 'Freeze'} Conversation
          </Button>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Action Dialog */}
      <Dialog open={actionDialog} onClose={() => setActionDialog(false)}>
        <DialogTitle>
          {actionType === 'mute_user' && 'Mute User'}
          {actionType === 'ban_user' && 'Ban User'}
          {actionType === 'delete_message' && 'Delete Message'}
          {actionType === 'hide_message' && 'Hide Message'}
          {actionType === 'freeze_conversation' && 'Freeze Conversation'}
          {actionType === 'unfreeze_conversation' && 'Unfreeze Conversation'}
          {actionType === 'lock_escrow' && 'Lock Escrow'}
          {actionType === 'warn_user' && 'Warn User'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Internal Notes (not visible to user)"
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          {actionType === 'mute_user' && (
            <TextField
              fullWidth
              type="number"
              label="Duration (hours)"
              value={actionDuration}
              onChange={(e) => setActionDuration(parseInt(e.target.value))}
              margin="normal"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(false)}>Cancel</Button>
          <Button 
            onClick={performAction} 
            variant="contained" 
            color={actionType.includes('ban') || actionType.includes('delete') ? 'error' : 'primary'}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
