'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Badge,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Group,
  Security,
  Assignment,
  CheckCircle,
  Settings,
  History,
  Add,
  Edit,
  Delete,
  Refresh,
  Person,
  AdminPanelSettings,
  SupportAgent,
  AccountBalance,
  LocalShipping,
  Campaign,
  Analytics,
  Gavel,
  Warning,
  Error as ErrorIcon,
  Schedule,
  PlayArrow,
  Pause,
  CheckCircleOutline,
  Cancel,
  MoreVert,
  Visibility,
  AssignmentInd,
  Flag,
  Timer,
  TrendingUp,
  PriorityHigh,
  Comment,
  AttachFile,
  Send,
  AccessTime,
  PhoneCallback,
  School,
  VpnKey,
  QrCode2,
  Email,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Types
interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: Record<string, string>;
  created_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role?: Role;
  status: string;
  department?: string;
  phone?: string;
  sandbox_only: boolean;
  last_login?: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assigned_to?: string;
  assignee?: { id: string; name: string; email: string };
  sla_deadline?: string;
  sla_breached: boolean;
  source_type?: string;
  tags: string[];
  created_at: string;
  resolved_at?: string;
}

interface Approval {
  id: string;
  type: string;
  title: string;
  description: string;
  requester_id: string;
  requester_name: string;
  status: string;
  priority: string;
  request_data: Record<string, any>;
  approvals: Array<{ approver_name: string; approved_at: string }>;
  created_at: string;
}

interface DashboardMetrics {
  task_stats: Record<string, number>;
  priority_stats: Record<string, number>;
  sla_breached_count: number;
  pending_approvals: number;
  active_members: number;
  tasks_today: number;
  resolved_this_week: number;
  tasks_by_team: Array<{ role_id: string; role_name: string; open_tasks: number }>;
  recent_activity: Array<any>;
}

interface TeamSettings {
  sla_timers: Record<string, number>;
  refund_approval_threshold: number;
  payout_approval_threshold: number;
  escalation_enabled: boolean;
  email_notifications_enabled: boolean;
}

const TASK_TYPES = ['dispute', 'fraud', 'bug', 'refund', 'review', 'moderation', 'verification', 'support', 'escalation', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated'];
const APPROVAL_TYPES = ['seller_verification', 'refund', 'escrow_override', 'user_ban', 'banner_publish', 'feature_toggle', 'config_change', 'payout'];

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <AdminPanelSettings />,
  admin: <AdminPanelSettings />,
  moderator: <Gavel />,
  support_agent: <SupportAgent />,
  finance: <AccountBalance />,
  operations: <LocalShipping />,
  marketing: <Campaign />,
  analyst: <Analytics />,
};

const PRIORITY_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
  open: 'info',
  in_progress: 'primary',
  waiting: 'warning',
  resolved: 'success',
  closed: 'default',
  escalated: 'error',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export default function TeamManagementPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });
  
  // Data states
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Filter states
  const [taskFilter, setTaskFilter] = useState({ status: '', priority: '', type: '' });
  const [approvalFilter, setApprovalFilter] = useState({ status: '' });
  
  // Dialog states
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  
  // Form states
  const [newMember, setNewMember] = useState({ email: '', name: '', role_id: '', department: '', phone: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', task_type: 'support', priority: 'medium', tags: '' });

  // Fetch functions
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/team/dashboard`);
      if (response.ok) {
        setDashboard(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/team/members`);
      if (response.ok) {
        setTeamMembers(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/team/roles`);
      if (response.ok) {
        setRoles(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (taskFilter.status) params.append('status', taskFilter.status);
      if (taskFilter.priority) params.append('priority', taskFilter.priority);
      if (taskFilter.type) params.append('task_type', taskFilter.type);
      
      const response = await fetch(`${API_BASE}/team/tasks?${params}`);
      if (response.ok) {
        setTasks(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [taskFilter]);

  const fetchApprovals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (approvalFilter.status) params.append('status', approvalFilter.status);
      
      const response = await fetch(`${API_BASE}/team/approvals?${params}`);
      if (response.ok) {
        setApprovals(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    }
  }, [approvalFilter]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/team/settings`);
      if (response.ok) {
        setSettings(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/team/audit-logs?limit=50`);
      if (response.ok) {
        setAuditLogs(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboard(),
        fetchTeamMembers(),
        fetchRoles(),
        fetchTasks(),
        fetchApprovals(),
        fetchSettings(),
        fetchAuditLogs(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchTeamMembers, fetchRoles, fetchTasks, fetchApprovals, fetchSettings, fetchAuditLogs]);

  // Refetch tasks when filter changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Handlers
  const handleCreateMember = async () => {
    try {
      const response = await fetch(`${API_BASE}/team/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMember, created_by: 'admin' }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Team member created successfully', severity: 'success' });
        setMemberDialogOpen(false);
        setNewMember({ email: '', name: '', role_id: '', department: '', phone: '' });
        fetchTeamMembers();
        fetchDashboard();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.detail || 'Failed to create member', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create member', severity: 'error' });
    }
  };

  const handleCreateTask = async () => {
    try {
      const response = await fetch(`${API_BASE}/team/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          created_by: 'admin',
          tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
        setTaskDialogOpen(false);
        setNewTask({ title: '', description: '', task_type: 'support', priority: 'medium', tags: '' });
        fetchTasks();
        fetchDashboard();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.detail || 'Failed to create task', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to create task', severity: 'error' });
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch(`${API_BASE}/team/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approver_id: 'admin',
          approver_name: 'Admin User',
        }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Request approved', severity: 'success' });
        fetchApprovals();
        fetchDashboard();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to approve', severity: 'error' });
    }
  };

  const handleReject = async (approvalId: string, reason: string) => {
    try {
      const response = await fetch(`${API_BASE}/team/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejector_id: 'admin',
          rejector_name: 'Admin User',
          reason: reason || 'Rejected by admin',
        }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Request rejected', severity: 'info' });
        fetchApprovals();
        fetchDashboard();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reject', severity: 'error' });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE}/team/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { status }, updated_by: 'admin' }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Task updated', severity: 'success' });
        fetchTasks();
        fetchDashboard();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update task', severity: 'error' });
    }
  };

  const handleAssignTask = async (taskId: string, memberId: string) => {
    try {
      const response = await fetch(`${API_BASE}/team/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: memberId, assigned_by: 'admin' }),
      });
      
      if (response.ok) {
        setSnackbar({ open: true, message: 'Task assigned', severity: 'success' });
        fetchTasks();
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to assign task', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} data-testid="team-management-page">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Team & Workflow Management</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage team members, tasks, approvals, and workflows
        </Typography>
      </Box>

      {/* Dashboard Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Group /></Avatar>
                <Box>
                  <Typography variant="h4">{dashboard?.active_members || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Members</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><Assignment /></Avatar>
                <Box>
                  <Typography variant="h4">{dashboard?.task_stats?.open || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Open Tasks</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}><CheckCircle /></Avatar>
                <Box>
                  <Typography variant="h4">{dashboard?.pending_approvals || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Pending Approvals</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: dashboard?.sla_breached_count ? 'error.main' : 'success.main' }}>
                  <Timer />
                </Avatar>
                <Box>
                  <Typography variant="h4">{dashboard?.sla_breached_count || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">SLA Breaches</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<TrendingUp />} label="Dashboard" data-testid="tab-dashboard" />
          <Tab icon={<Group />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Team <Chip label={teamMembers.length} size="small" /></Box>} data-testid="tab-team" />
          <Tab icon={<Security />} label="Roles & Permissions" data-testid="tab-roles" />
          <Tab icon={<Assignment />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Tasks <Chip label={tasks.filter(t => t.status !== 'closed').length} size="small" color="info" /></Box>} data-testid="tab-tasks" />
          <Tab icon={<CheckCircle />} label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Approvals <Chip label={approvals.filter(a => a.status === 'pending').length} size="small" color="warning" /></Box>} data-testid="tab-approvals" />
          <Tab icon={<Schedule />} label="Shifts" data-testid="tab-shifts" />
          <Tab icon={<School />} label="Sandbox" data-testid="tab-sandbox" />
          <Tab icon={<VpnKey />} label="Security" data-testid="tab-security" />
          <Tab icon={<Email />} label="Email Templates" data-testid="tab-email" />
          <Tab icon={<Settings />} label="Settings" data-testid="tab-settings" />
          <Tab icon={<History />} label="Audit Log" data-testid="tab-audit" />
        </Tabs>
      </Paper>

      {/* Tab 0: Dashboard */}
      {tabValue === 0 && dashboard && (
        <Grid container spacing={3}>
          {/* Tasks by Priority */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Tasks by Priority</Typography>
                {Object.entries(dashboard.priority_stats || {}).map(([priority, count]) => (
                  <Box key={priority} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Chip label={priority.toUpperCase()} size="small" color={PRIORITY_COLORS[priority]} />
                      <Typography variant="body2">{count as number} tasks</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(((count as number) / Math.max(...Object.values(dashboard.priority_stats || { x: 1 }) as number[])) * 100, 100)} 
                      color={PRIORITY_COLORS[priority]}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Tasks by Team */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Open Tasks by Team</Typography>
                <List dense>
                  {dashboard.tasks_by_team?.filter(t => t.open_tasks > 0).map((team) => (
                    <ListItem key={team.role_id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {ROLE_ICONS[team.role_id] || <Person />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={team.role_name} secondary={`${team.open_tasks} open tasks`} />
                      <Chip label={team.open_tasks} size="small" color="info" />
                    </ListItem>
                  ))}
                  {!dashboard.tasks_by_team?.some(t => t.open_tasks > 0) && (
                    <ListItem>
                      <ListItemText primary="No open tasks" secondary="All tasks are resolved or closed" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Actor</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Module</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.recent_activity?.slice(0, 10).map((activity, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{new Date(activity.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{activity.actor_name}</TableCell>
                          <TableCell>
                            <Chip label={activity.action} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{activity.module}</TableCell>
                          <TableCell>{activity.changes_summary || '-'}</TableCell>
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

      {/* Tab 1: Team Members */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Team Members</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={fetchTeamMembers}><Refresh /></IconButton>
                <Button variant="contained" startIcon={<Add />} onClick={() => setMemberDialogOpen(true)} data-testid="add-member-btn">
                  Add Member
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {ROLE_ICONS[member.role_id] || member.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{member.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={ROLE_ICONS[member.role_id] as any} 
                          label={member.role?.name || member.role_id} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{member.department || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={member.status} 
                          size="small" 
                          color={member.status === 'active' ? 'success' : 'default'}
                        />
                        {member.sandbox_only && <Chip label="Sandbox" size="small" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell>
                        {member.last_login ? new Date(member.last_login).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton size="small"><Edit /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Roles & Permissions */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Roles & Permissions</Typography>
              <IconButton onClick={fetchRoles}><Refresh /></IconButton>
            </Box>

            <Grid container spacing={2}>
              {roles.map((role) => (
                <Grid item xs={12} md={6} lg={4} key={role.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: role.is_system ? 'primary.main' : 'secondary.main' }}>
                          {ROLE_ICONS[role.id] || <Person />}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{role.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {role.is_system ? 'System Role' : 'Custom Role'}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {role.description}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" fontWeight="bold">Permissions:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {Object.entries(role.permissions || {}).filter(([_, level]) => level !== 'none').slice(0, 5).map(([module, level]) => (
                          <Chip
                            key={module}
                            label={`${module.replace(/_/g, ' ')}: ${level}`}
                            size="small"
                            variant="outlined"
                            color={level === 'override' ? 'error' : level === 'approve' ? 'warning' : level === 'write' ? 'info' : 'default'}
                            sx={{ fontSize: 10 }}
                          />
                        ))}
                        {Object.keys(role.permissions || {}).filter(k => role.permissions[k] !== 'none').length > 5 && (
                          <Chip label={`+${Object.keys(role.permissions || {}).filter(k => role.permissions[k] !== 'none').length - 5} more`} size="small" sx={{ fontSize: 10 }} />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Tasks */}
      {tabValue === 3 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Tasks & Tickets</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={taskFilter.status} label="Status" onChange={(e) => setTaskFilter({ ...taskFilter, status: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    {STATUSES.map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select value={taskFilter.priority} label="Priority" onChange={(e) => setTaskFilter({ ...taskFilter, priority: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
                <IconButton onClick={fetchTasks}><Refresh /></IconButton>
                <Button variant="contained" startIcon={<Add />} onClick={() => setTaskDialogOpen(true)} data-testid="create-task-btn">
                  Create Task
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>SLA</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} sx={{ bgcolor: task.sla_breached ? 'error.50' : 'inherit' }}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{task.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.description.substring(0, 50)}...
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {task.tags?.map(tag => (
                              <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, fontSize: 10 }} />
                            ))}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={task.type.replace(/_/g, ' ')} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={task.priority.toUpperCase()} size="small" color={PRIORITY_COLORS[task.priority]} />
                      </TableCell>
                      <TableCell>
                        <Chip label={task.status.replace(/_/g, ' ')} size="small" color={STATUS_COLORS[task.status]} />
                      </TableCell>
                      <TableCell>
                        {task.assignee ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{task.assignee.name.charAt(0)}</Avatar>
                            <Typography variant="body2">{task.assignee.name}</Typography>
                          </Box>
                        ) : (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              displayEmpty
                              value=""
                              onChange={(e) => handleAssignTask(task.id, e.target.value)}
                              sx={{ fontSize: 12 }}
                            >
                              <MenuItem value="" disabled>Assign to...</MenuItem>
                              {teamMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.sla_deadline && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {task.sla_breached ? (
                              <ErrorIcon color="error" fontSize="small" />
                            ) : (
                              <Timer color="action" fontSize="small" />
                            )}
                            <Typography variant="caption" color={task.sla_breached ? 'error' : 'text.secondary'}>
                              {new Date(task.sla_deadline).toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {task.status === 'open' && (
                            <Tooltip title="Start">
                              <IconButton size="small" onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}>
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          )}
                          {task.status === 'in_progress' && (
                            <Tooltip title="Resolve">
                              <IconButton size="small" color="success" onClick={() => handleUpdateTaskStatus(task.id, 'resolved')}>
                                <CheckCircleOutline />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => setSelectedTask(task)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Approvals */}
      {tabValue === 4 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Approval Requests</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={approvalFilter.status} label="Status" onChange={(e) => setApprovalFilter({ status: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={fetchApprovals}><Refresh /></IconButton>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Request</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{approval.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {approval.description.substring(0, 50)}...
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={approval.type.replace(/_/g, ' ')} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{approval.requester_name}</TableCell>
                      <TableCell>
                        <Chip label={approval.priority.toUpperCase()} size="small" color={PRIORITY_COLORS[approval.priority]} />
                      </TableCell>
                      <TableCell>
                        <Chip label={approval.status.toUpperCase()} size="small" color={STATUS_COLORS[approval.status]} />
                      </TableCell>
                      <TableCell>{new Date(approval.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {approval.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => handleApprove(approval.id)}>
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => handleReject(approval.id, 'Rejected')}>
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => setSelectedApproval(approval)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Shifts & Availability */}
      {tabValue === 5 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6">Shifts & Availability</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage team member schedules and on-call rotations
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<Add />}>Add Shift</Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <PhoneCallback sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Currently On-Call
                  </Typography>
                  <List dense>
                    {teamMembers.filter(m => m.status === 'active').slice(0, 3).map((member) => (
                      <ListItem key={member.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                            {member.name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={member.name} 
                          secondary={member.role?.name || member.role_id} 
                        />
                        <Chip label="On Call" size="small" color="success" />
                      </ListItem>
                    ))}
                    {teamMembers.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No team members on call" secondary="Configure shifts to set up on-call rotation" />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Today's Schedule
                  </Typography>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography color="text.secondary">
                      Shift calendar coming soon
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Configure working hours and shift rotations
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Auto-routing:</strong> Tasks will be automatically assigned to available team members based on their shift schedule and on-call status.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Sandbox / Training Mode */}
      {tabValue === 6 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6">Sandbox / Training Mode</Typography>
                <Typography variant="body2" color="text.secondary">
                  Practice environment for new team members
                </Typography>
              </Box>
              <Chip label="Training Environment" color="warning" />
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Sandbox Mode:</strong> Actions in this environment do not affect real users or transactions. Use this to train new team members.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Training Tasks
                  </Typography>
                  <List dense>
                    {['Handle refund request', 'Review seller verification', 'Moderate chat report', 'Resolve dispute', 'Process payout'].map((task, idx) => (
                      <ListItem key={idx} sx={{ bgcolor: 'warning.50', mb: 1, borderRadius: 1 }}>
                        <ListItemText 
                          primary={`Training Task #${idx + 1}: ${task}`} 
                          secondary="Mock scenario for practice"
                        />
                        <Button size="small" variant="outlined">Practice</Button>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Training Progress
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Team members in training:
                    </Typography>
                    {teamMembers.filter(m => m.sandbox_only).length > 0 ? (
                      teamMembers.filter(m => m.sandbox_only).map((member) => (
                        <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>{member.name.charAt(0)}</Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2">{member.name}</Typography>
                            <LinearProgress variant="determinate" value={60} sx={{ mt: 0.5 }} />
                          </Box>
                          <Chip label="In Progress" size="small" color="warning" />
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No team members currently in training mode
                      </Typography>
                    )}
                  </Box>
                  <Button variant="outlined" fullWidth startIcon={<Add />}>
                    Add Member to Training
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 7: Security (2FA) */}
      {tabValue === 7 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6">Security Settings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Two-factor authentication and access control
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    <VpnKey sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enable 2FA for enhanced account security
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Member</TableCell>
                          <TableCell>2FA Status</TableCell>
                          <TableCell>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {teamMembers.slice(0, 5).map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>
                              <Chip 
                                label="Not Enabled" 
                                size="small" 
                                color="default"
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="small" startIcon={<QrCode2 />}>
                                Setup
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Security Overview
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="2FA Enabled Members" secondary="0 out of 2 members" />
                      <Chip label="0%" size="small" color="error" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Recent Login Failures" secondary="Last 24 hours" />
                      <Chip label="0" size="small" color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Active Sessions" secondary="Currently logged in" />
                      <Chip label="1" size="small" color="info" />
                    </ListItem>
                  </List>
                  <Divider sx={{ my: 2 }} />
                  <Button variant="outlined" color="error" fullWidth>
                    Emergency Lockdown Mode
                  </Button>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Recommendation:</strong> Enable 2FA for all admin and finance roles to protect sensitive operations.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Email Templates */}
      {tabValue === 8 && (
        <EmailTemplatesTab />
      )}

      {/* Tab 9: Settings */}
      {tabValue === 9 && settings && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Team Settings</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>SLA Timers (minutes)</Typography>
                  {Object.entries(settings.sla_timers || {}).map(([priority, minutes]) => (
                    <Box key={priority} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Chip label={priority.toUpperCase()} size="small" color={PRIORITY_COLORS[priority]} />
                      <Typography>{minutes} min ({Math.round(minutes / 60)}h)</Typography>
                    </Box>
                  ))}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Approval Thresholds</Typography>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">Refund Approval Threshold</Typography>
                    <Typography variant="h6">${settings.refund_approval_threshold}</Typography>
                  </Box>
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">Payout Approval Threshold</Typography>
                    <Typography variant="h6">${settings.payout_approval_threshold}</Typography>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Notifications</Typography>
                  <FormControlLabel
                    control={<Switch checked={settings.email_notifications_enabled} disabled />}
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={<Switch checked={settings.escalation_enabled} disabled />}
                    label="Escalation Enabled"
                  />
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 10: Audit Log */}
      {tabValue === 10 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Audit Log</Typography>
              <IconButton onClick={fetchAuditLogs}><Refresh /></IconButton>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Module</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>Changes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{log.actor_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{log.actor_role}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{log.entity_type}: {log.entity_id.substring(0, 8)}...</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {log.changes_summary || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                data-testid="member-name-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                data-testid="member-email-input"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newMember.role_id}
                  label="Role"
                  onChange={(e) => setNewMember({ ...newMember, role_id: e.target.value })}
                  data-testid="member-role-select"
                >
                  {roles.map(role => (
                    <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Department"
                value={newMember.department}
                onChange={(e) => setNewMember({ ...newMember, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMember} data-testid="save-member-btn">
            Create Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Task</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                data-testid="task-title-input"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                data-testid="task-description-input"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newTask.task_type}
                  label="Type"
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                >
                  {TASK_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTask.priority}
                  label="Priority"
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={newTask.tags}
                onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                placeholder="urgent, refund, customer"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTask} data-testid="save-task-btn">
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
