'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  Divider,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Delete,
  Settings,
  Person,
  Store,
  LocalShipping,
  AdminPanelSettings,
  ShoppingCart,
  Receipt,
  Chat,
  Campaign,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  FastForward,
  BugReport,
  Visibility,
  Payment,
  Gavel,
  History,
  Science,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sandboxUsers, setSandboxUsers] = useState<any[]>([]);
  const [sandboxOrders, setSandboxOrders] = useState<any[]>([]);
  const [sandboxEscrows, setSandboxEscrows] = useState<any[]>([]);
  const [sandboxListings, setSandboxListings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Dialog states
  const [startSessionDialogOpen, setStartSessionDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('buyer');
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [simulationType, setSimulationType] = useState('');
  const [simulationParams, setSimulationParams] = useState<any>({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);

  // Current admin ID (would come from auth in real app)
  const adminId = 'admin';

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statsRes, sessionRes, usersRes, ordersRes, escrowsRes, listingsRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/sandbox/config`),
        fetch(`${API_BASE}/sandbox/stats`),
        fetch(`${API_BASE}/sandbox/session/active/${adminId}`),
        fetch(`${API_BASE}/sandbox/users`),
        fetch(`${API_BASE}/sandbox/orders`),
        fetch(`${API_BASE}/sandbox/escrows`),
        fetch(`${API_BASE}/sandbox/listings`),
        fetch(`${API_BASE}/sandbox/audit?limit=50`),
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setActiveSession(sessionData.active ? sessionData.session : null);
      }
      if (usersRes.ok) setSandboxUsers(await usersRes.json());
      if (ordersRes.ok) setSandboxOrders(await ordersRes.json());
      if (escrowsRes.ok) setSandboxEscrows(await escrowsRes.json());
      if (listingsRes.ok) setSandboxListings(await listingsRes.json());
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }
    } catch (err) {
      setError('Failed to fetch sandbox data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Start sandbox session
  const startSession = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sandbox/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, role: selectedRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        setStartSessionDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      setError('Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  // End sandbox session
  const endSession = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/sandbox/session/${activeSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId }),
      });
      setActiveSession(null);
      fetchData();
    } catch (err) {
      setError('Failed to end session');
    } finally {
      setActionLoading(false);
    }
  };

  // Switch role
  const switchRole = async (newRole: string) => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sandbox/session/${activeSession.id}/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, new_role: newRole }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to switch role');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate seed data
  const generateSeedData = async () => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/sandbox/seed-data/generate`, { method: 'POST' });
      fetchData();
    } catch (err) {
      setError('Failed to generate seed data');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset sandbox data
  const resetSandboxData = async () => {
    if (!confirm('Are you sure you want to reset ALL sandbox data? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/sandbox/data/reset`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId }),
      });
      fetchData();
    } catch (err) {
      setError('Failed to reset data');
    } finally {
      setActionLoading(false);
    }
  };

  // Process mock payment
  const processMockPayment = async (orderId: string, amount: number, method: string, simulateFailure: boolean = false) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sandbox/payment/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, amount, method, simulate_failure: simulateFailure }),
      });
      if (res.ok) {
        setPaymentDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      setError('Failed to process payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Run simulation
  const runSimulation = async () => {
    setActionLoading(true);
    try {
      let endpoint = '';
      let body: any = { admin_id: adminId };

      switch (simulationType) {
        case 'fast_forward':
          endpoint = '/sandbox/simulate/fast-forward';
          body = { session_id: activeSession?.id, hours: simulationParams.hours, admin_id: adminId };
          break;
        case 'delivery_failure':
          endpoint = '/sandbox/simulate/delivery-failure';
          body = { order_id: simulationParams.order_id, reason: simulationParams.reason, admin_id: adminId };
          break;
        case 'payment_failure':
          endpoint = '/sandbox/simulate/payment-failure';
          body = { order_id: simulationParams.order_id, reason: simulationParams.reason, admin_id: adminId };
          break;
        case 'transport_delay':
          endpoint = '/sandbox/simulate/transport-delay';
          body = { order_id: simulationParams.order_id, delay_hours: simulationParams.delay_hours, reason: simulationParams.reason, admin_id: adminId };
          break;
        case 'inject_error':
          endpoint = '/sandbox/simulate/inject-error';
          body = { error_type: simulationParams.error_type, component: simulationParams.component, message: simulationParams.message, admin_id: adminId };
          break;
      }

      if (endpoint) {
        await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        setSimulationDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      setError('Failed to run simulation');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle sandbox enabled
  const toggleSandboxEnabled = async (enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/sandbox/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, admin_id: adminId }),
      });
      fetchData();
    } catch (err) {
      setError('Failed to update config');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'buyer': return <Person />;
      case 'seller': return <Store />;
      case 'transport': case 'transport_partner': return <LocalShipping />;
      case 'admin': return <AdminPanelSettings />;
      default: return <Person />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'paid': case 'funded': return 'info';
      case 'shipped': case 'in_transit': return 'primary';
      case 'delivered': case 'releasing': return 'secondary';
      case 'completed': case 'released': return 'success';
      case 'disputed': case 'failed': case 'refunded': return 'error';
      default: return 'default';
    }
  };

  if (loading && !config) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading sandbox...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Sandbox Mode Banner */}
      {activeSession && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3, 
            bgcolor: 'warning.light', 
            border: '2px solid',
            borderColor: 'warning.main',
            '& .MuiAlert-icon': { fontSize: 28 }
          }}
          icon={<Science />}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                SANDBOX MODE ACTIVE
              </Typography>
              <Typography variant="body2">
                Testing as: <Chip label={activeSession.role} size="small" icon={getRoleIcon(activeSession.role)} /> | 
                Time Offset: {activeSession.simulated_time_offset_hours}h | 
                User: {activeSession.sandbox_user_id}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="outlined"
                color="inherit"
                startIcon={<Visibility />}
                onClick={() => window.open('/', '_blank')}
                sx={{ color: '#000', borderColor: 'rgba(0,0,0,0.3)' }}
              >
                Preview App
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                startIcon={<Stop />}
                onClick={endSession}
                disabled={actionLoading}
              >
                Exit Sandbox
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Admin Sandbox
          </Typography>
          <Typography color="text.secondary">
            Test platform features safely without affecting production data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config?.enabled || false}
                onChange={(e) => toggleSandboxEnabled(e.target.checked)}
                color="warning"
              />
            }
            label="Sandbox Enabled"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
          {!activeSession ? (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PlayArrow />}
              onClick={() => setStartSessionDialogOpen(true)}
              disabled={!config?.enabled}
              data-testid="start-sandbox-btn"
            >
              Enter Sandbox
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={endSession}
              disabled={actionLoading}
            >
              Exit Sandbox
            </Button>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Users</Typography>
              <Typography variant="h5">{stats?.users || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Sellers</Typography>
              <Typography variant="h5">{stats?.sellers || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Listings</Typography>
              <Typography variant="h5">{stats?.listings || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Orders</Typography>
              <Typography variant="h5">{stats?.orders || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Escrows</Typography>
              <Typography variant="h5">{stats?.escrows || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">Sessions</Typography>
              <Typography variant="h5">{stats?.active_sessions || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<Settings />} label="Controls" data-testid="tab-controls" />
        <Tab icon={<ShoppingCart />} label="Orders" data-testid="tab-orders" />
        <Tab icon={<Receipt />} label="Escrow" data-testid="tab-escrow" />
        <Tab icon={<Person />} label="Users" data-testid="tab-users" />
        <Tab icon={<Store />} label="Listings" data-testid="tab-listings" />
        <Tab icon={<BugReport />} label="Simulations" data-testid="tab-simulations" />
        <Tab icon={<History />} label="Audit Log" data-testid="tab-audit" />
      </Tabs>

      {/* Tab 0: Controls */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Session Controls</Typography>
                {activeSession ? (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Active session as: <strong>{activeSession.role}</strong>
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>Switch Role:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {['buyer', 'seller', 'transport_partner', 'admin'].map((role) => (
                        <Button
                          key={role}
                          variant={activeSession.role === role ? 'contained' : 'outlined'}
                          size="small"
                          startIcon={getRoleIcon(role)}
                          onClick={() => switchRole(role)}
                          disabled={actionLoading}
                        >
                          {role.replace('_', ' ')}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="warning">
                    No active sandbox session. Click "Enter Sandbox" to start testing.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Data Management</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={generateSeedData}
                    disabled={actionLoading}
                  >
                    Generate Seed Data
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={resetSandboxData}
                    disabled={actionLoading}
                  >
                    Reset All Data
                  </Button>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Configuration
                </Typography>
                <Typography variant="body2">
                  Max Sessions: {config?.max_concurrent_sessions} | Auto Cleanup: {config?.auto_cleanup_hours}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Orders */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sandbox Orders</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Seller</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sandboxOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {order.id.substring(0, 20)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small" color={getStatusColor(order.status) as any} />
                      </TableCell>
                      <TableCell>{order.buyer_id?.substring(0, 15)}...</TableCell>
                      <TableCell>{order.seller_id?.substring(0, 15)}...</TableCell>
                      <TableCell align="right">
                        {order.total?.toLocaleString()} {order.currency}
                      </TableCell>
                      <TableCell>
                        {order.status === 'pending' && (
                          <Button
                            size="small"
                            startIcon={<Payment />}
                            onClick={() => {
                              setSelectedOrderForPayment(order);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Escrow */}
      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sandbox Escrows</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Escrow ID</TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Seller Amount</TableCell>
                    <TableCell>Funded At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sandboxEscrows.map((escrow) => (
                    <TableRow key={escrow.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {escrow.id.substring(0, 20)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {escrow.order_id?.substring(0, 15)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={escrow.status} size="small" color={getStatusColor(escrow.status) as any} />
                      </TableCell>
                      <TableCell align="right">{escrow.amount?.toLocaleString()}</TableCell>
                      <TableCell align="right">{escrow.seller_amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        {escrow.funded_at ? new Date(escrow.funded_at).toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Users */}
      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sandbox Users</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Wallet</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sandboxUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {user.id.substring(0, 20)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" icon={getRoleIcon(user.role)} />
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.location}</TableCell>
                      <TableCell align="right">{user.wallet_balance?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Listings */}
      {activeTab === 4 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sandbox Listings</Typography>
            <Grid container spacing={2}>
              {sandboxListings.map((listing) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={listing.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {listing.title}
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {listing.price?.toLocaleString()} {listing.currency}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip label={listing.category} size="small" />
                        <Chip label={listing.condition} size="small" variant="outlined" />
                        {listing.is_boosted && <Chip label="Boosted" size="small" color="warning" />}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Views: {listing.views} | Favorites: {listing.favorites}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Simulations */}
      {activeTab === 5 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Simulation Tools</Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Use these tools to test edge cases and failure scenarios safely.
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <FastForward sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Fast Forward Time
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Simulate time passage for escrow expiry testing
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSimulationType('fast_forward');
                        setSimulationParams({ hours: 24 });
                        setSimulationDialogOpen(true);
                      }}
                      disabled={!activeSession}
                    >
                      Fast Forward
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <LocalShipping sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Delivery Failure
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Simulate a failed delivery
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setSimulationType('delivery_failure');
                        setSimulationParams({ order_id: '', reason: 'Address not found' });
                        setSimulationDialogOpen(true);
                      }}
                    >
                      Simulate Failure
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Payment Failure
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Simulate a payment failure
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setSimulationType('payment_failure');
                        setSimulationParams({ order_id: '', reason: 'Insufficient funds' });
                        setSimulationDialogOpen(true);
                      }}
                    >
                      Simulate Failure
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Transport Delay
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Simulate a transport delay
                    </Typography>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => {
                        setSimulationType('transport_delay');
                        setSimulationParams({ order_id: '', delay_hours: 24, reason: 'Weather conditions' });
                        setSimulationDialogOpen(true);
                      }}
                    >
                      Simulate Delay
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Inject Error
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Inject a test error for QA testing
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSimulationType('inject_error');
                        setSimulationParams({ error_type: 'test', component: 'sandbox', message: 'Test error' });
                        setSimulationDialogOpen(true);
                      }}
                    >
                      Inject Error
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Audit Log */}
      {activeTab === 6 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Sandbox Audit Log</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" />
                      </TableCell>
                      <TableCell>{log.admin_id}</TableCell>
                      <TableCell>
                        <Typography variant="caption" component="pre" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {JSON.stringify(log.details, null, 2).substring(0, 100)}...
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

      {/* Start Session Dialog */}
      <Dialog open={startSessionDialogOpen} onClose={() => setStartSessionDialogOpen(false)}>
        <DialogTitle>Start Sandbox Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a role to test the platform as:
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value="buyer">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Buyer
                </Box>
              </MenuItem>
              <MenuItem value="seller">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Store /> Seller
                </Box>
              </MenuItem>
              <MenuItem value="transport_partner">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalShipping /> Transport Partner
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AdminPanelSettings /> Admin
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartSessionDialogOpen(false)}>Cancel</Button>
          <Button onClick={startSession} variant="contained" color="warning" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Enter Sandbox'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Process Mock Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Order: {selectedOrderForPayment?.id?.substring(0, 25)}...
          </Typography>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Amount: {selectedOrderForPayment?.total?.toLocaleString()} {selectedOrderForPayment?.currency}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            This is a mock payment. No real money will be charged.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => processMockPayment(selectedOrderForPayment?.id, selectedOrderForPayment?.total, 'card', true)}
            color="error"
          >
            Simulate Failure
          </Button>
          <Button
            onClick={() => processMockPayment(selectedOrderForPayment?.id, selectedOrderForPayment?.total, 'card')}
            variant="contained"
            color="success"
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Simulation Dialog */}
      <Dialog open={simulationDialogOpen} onClose={() => setSimulationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Run Simulation: {simulationType.replace('_', ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {simulationType === 'fast_forward' && (
            <TextField
              label="Hours to Fast Forward"
              type="number"
              value={simulationParams.hours}
              onChange={(e) => setSimulationParams({ ...simulationParams, hours: parseInt(e.target.value) })}
              fullWidth
              sx={{ mt: 2 }}
            />
          )}
          {(simulationType === 'delivery_failure' || simulationType === 'payment_failure') && (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  value={simulationParams.order_id}
                  label="Order"
                  onChange={(e) => setSimulationParams({ ...simulationParams, order_id: e.target.value })}
                >
                  {sandboxOrders.map((order) => (
                    <MenuItem key={order.id} value={order.id}>
                      {order.id.substring(0, 25)}... ({order.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reason"
                value={simulationParams.reason}
                onChange={(e) => setSimulationParams({ ...simulationParams, reason: e.target.value })}
                fullWidth
                sx={{ mt: 2 }}
              />
            </>
          )}
          {simulationType === 'transport_delay' && (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Order</InputLabel>
                <Select
                  value={simulationParams.order_id}
                  label="Order"
                  onChange={(e) => setSimulationParams({ ...simulationParams, order_id: e.target.value })}
                >
                  {sandboxOrders.filter(o => ['shipped', 'in_transit'].includes(o.status)).map((order) => (
                    <MenuItem key={order.id} value={order.id}>
                      {order.id.substring(0, 25)}... ({order.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Delay Hours"
                type="number"
                value={simulationParams.delay_hours}
                onChange={(e) => setSimulationParams({ ...simulationParams, delay_hours: parseInt(e.target.value) })}
                fullWidth
                sx={{ mt: 2 }}
              />
              <TextField
                label="Reason"
                value={simulationParams.reason}
                onChange={(e) => setSimulationParams({ ...simulationParams, reason: e.target.value })}
                fullWidth
                sx={{ mt: 2 }}
              />
            </>
          )}
          {simulationType === 'inject_error' && (
            <>
              <TextField
                label="Error Type"
                value={simulationParams.error_type}
                onChange={(e) => setSimulationParams({ ...simulationParams, error_type: e.target.value })}
                fullWidth
                sx={{ mt: 2 }}
              />
              <TextField
                label="Component"
                value={simulationParams.component}
                onChange={(e) => setSimulationParams({ ...simulationParams, component: e.target.value })}
                fullWidth
                sx={{ mt: 2 }}
              />
              <TextField
                label="Message"
                value={simulationParams.message}
                onChange={(e) => setSimulationParams({ ...simulationParams, message: e.target.value })}
                fullWidth
                multiline
                rows={2}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSimulationDialogOpen(false)}>Cancel</Button>
          <Button onClick={runSimulation} variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Run Simulation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
