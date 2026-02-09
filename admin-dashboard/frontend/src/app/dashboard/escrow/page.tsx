'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Divider,
  Slider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Gavel,
  AccountBalance,
  LocalShipping,
  Settings,
  Person,
  Store,
  Receipt,
  Warning,
  MonetizationOn,
  Refresh,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { api } from '@/lib/api';

// Direct API client for escrow endpoints (which are on the main backend, not admin backend)
const escrowApi = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token from localStorage
escrowApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

interface VerifiedSeller {
  seller_id: string;
  is_verified: boolean;
  verified_at: string;
  verified_by: string;
  status: string;
  seller_name?: string;
  seller_email?: string;
}

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: string;
  total_amount: number;
  currency: string;
  delivery_method: string;
  created_at: string;
  item?: {
    title: string;
    price: number;
  };
  buyer?: { name: string };
  seller?: { name: string };
}

interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  reason: string;
  description: string;
  status: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function EscrowPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Data states
  const [verifiedSellers, setVerifiedSellers] = useState<VerifiedSeller[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingPayment: 0,
    inEscrow: 0,
    completed: 0,
    disputed: 0,
    totalEscrowAmount: 0,
    verifiedSellers: 0,
  });
  
  // Settings states
  const [vatConfigs, setVatConfigs] = useState<any[]>([]);
  const [commissionConfig, setCommissionConfig] = useState({ percentage: 5, min_amount: 0 });
  const [transportPricing, setTransportPricing] = useState<any[]>([]);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialogs
  const [verifyDialog, setVerifyDialog] = useState({ open: false, sellerId: '', action: 'verify' as 'verify' | 'revoke' });
  const [disputeDialog, setDisputeDialog] = useState({ open: false, dispute: null as Dispute | null });
  const [releaseDialog, setReleaseDialog] = useState({ open: false, orderId: '' });
  
  useEffect(() => {
    fetchData();
  }, [tab]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sellersRes, ordersRes, disputesRes, vatRes, commissionRes, transportRes] = await Promise.all([
        escrowApi.get('/escrow/admin/verified-sellers'),
        escrowApi.get('/escrow/admin/orders?limit=100'),
        escrowApi.get('/escrow/admin/disputes'),
        escrowApi.get('/escrow/vat-configs'),
        escrowApi.get('/escrow/commission-configs'),
        escrowApi.get('/escrow/transport-pricing'),
      ]);
      
      setVerifiedSellers(sellersRes.data || []);
      setOrders(ordersRes.data?.orders || []);
      setDisputes(disputesRes.data || []);
      setVatConfigs(vatRes.data || []);
      setCommissionConfig(commissionRes.data?.[0] || { percentage: 5, min_amount: 0 });
      setTransportPricing(transportRes.data || []);
      
      // Calculate stats
      const orderList = ordersRes.data?.orders || [];
      setStats({
        totalOrders: orderList.length,
        pendingPayment: orderList.filter((o: Order) => o.status === 'pending_payment').length,
        inEscrow: orderList.filter((o: Order) => ['paid', 'shipped'].includes(o.status)).length,
        completed: orderList.filter((o: Order) => o.status === 'completed').length,
        disputed: orderList.filter((o: Order) => o.status === 'disputed').length,
        totalEscrowAmount: orderList
          .filter((o: Order) => ['paid', 'shipped'].includes(o.status))
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0),
        verifiedSellers: (sellersRes.data || []).filter((s: VerifiedSeller) => s.is_verified).length,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSnackbar({ open: true, message: 'Failed to load data', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifySeller = async () => {
    try {
      const { sellerId, action } = verifyDialog;
      await escrowApi.post(`/escrow/admin/verify-seller/${sellerId}`, {
        is_verified: action === 'verify',
        online_selling_enabled: action === 'verify',
      });
      
      setSnackbar({
        open: true,
        message: action === 'verify' ? 'Seller verified successfully' : 'Seller verification revoked',
        severity: 'success',
      });
      setVerifyDialog({ open: false, sellerId: '', action: 'verify' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update seller status', severity: 'error' });
    }
  };
  
  const handleResolveDispute = async (resolution: 'buyer' | 'seller' | 'split') => {
    if (!disputeDialog.dispute) return;
    
    try {
      await escrowApi.post(`/escrow/admin/disputes/${disputeDialog.dispute.id}/resolve`, {
        resolution,
        resolution_notes: `Resolved in favor of ${resolution}`,
      });
      
      setSnackbar({ open: true, message: 'Dispute resolved successfully', severity: 'success' });
      setDisputeDialog({ open: false, dispute: null });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to resolve dispute', severity: 'error' });
    }
  };
  
  const handleReleaseEscrow = async () => {
    try {
      await escrowApi.post(`/escrow/admin/orders/${releaseDialog.orderId}/release-escrow`);
      setSnackbar({ open: true, message: 'Escrow released successfully', severity: 'success' });
      setReleaseDialog({ open: false, orderId: '' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to release escrow', severity: 'error' });
    }
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
      pending_payment: 'default',
      paid: 'info',
      shipped: 'warning',
      delivered: 'primary',
      completed: 'success',
      disputed: 'error',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };
  
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };
  
  if (loading && tab === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Escrow & Online Selling
        </Typography>
        <Button startIcon={<Refresh />} onClick={fetchData} variant="outlined">
          Refresh
        </Button>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Receipt />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Orders</Typography>
                  <Typography variant="h5" fontWeight="bold">{stats.totalOrders}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <AccountBalance />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">In Escrow</Typography>
                  <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.totalEscrowAmount)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Gavel />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Open Disputes</Typography>
                  <Typography variant="h5" fontWeight="bold">{stats.disputed}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <Store />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Verified Sellers</Typography>
                  <Typography variant="h5" fontWeight="bold">{stats.verifiedSellers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabs */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<Store />} iconPosition="start" label="Verified Sellers" />
          <Tab icon={<Receipt />} iconPosition="start" label="Orders" />
          <Tab icon={<Gavel />} iconPosition="start" label="Disputes" />
          <Tab icon={<Settings />} iconPosition="start" label="Settings" />
        </Tabs>
        
        {/* Tab 0: Verified Sellers */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Premium Verified Sellers</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Only verified sellers can accept online payments and use the escrow system.
            </Typography>
            
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Seller ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Verified At</TableCell>
                  <TableCell>Verified By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {verifiedSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">No verified sellers yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  verifiedSellers.map((seller) => (
                    <TableRow key={seller.seller_id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}>
                            <Person fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{seller.seller_id}</Typography>
                            {seller.seller_email && (
                              <Typography variant="caption" color="textSecondary">{seller.seller_email}</Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={seller.is_verified ? <CheckCircle /> : <Cancel />}
                          label={seller.is_verified ? 'Verified' : 'Not Verified'}
                          color={seller.is_verified ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{seller.verified_at ? new Date(seller.verified_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{seller.verified_by || '-'}</TableCell>
                      <TableCell align="right">
                        {seller.is_verified ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setVerifyDialog({ open: true, sellerId: seller.seller_id, action: 'revoke' })}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            onClick={() => setVerifyDialog({ open: true, sellerId: seller.seller_id, action: 'verify' })}
                          >
                            Verify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Add seller manually */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Verify a New Seller</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  label="Seller ID"
                  placeholder="user_xxxxx"
                  id="new-seller-id"
                />
                <Button
                  variant="contained"
                  onClick={() => {
                    const input = document.getElementById('new-seller-id') as HTMLInputElement;
                    if (input?.value) {
                      setVerifyDialog({ open: true, sellerId: input.value, action: 'verify' });
                    }
                  }}
                >
                  Verify Seller
                </Button>
              </Box>
            </Box>
          </Box>
        </TabPanel>
        
        {/* Tab 1: Orders */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>All Orders</Typography>
            
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Delivery</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">No orders yet</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {order.id.slice(0, 12)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {order.item?.title || 'Unknown Item'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">
                          {formatCurrency(order.total_amount, order.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={order.status} color={getStatusColor(order.status)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={order.delivery_method === 'pickup' ? <Store /> : <LocalShipping />}
                          label={order.delivery_method === 'pickup' ? 'Pickup' : 'Delivery'}
                        />
                      </TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="right">
                        {['paid', 'shipped'].includes(order.status) && (
                          <Tooltip title="Release Escrow">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setReleaseDialog({ open: true, orderId: order.id })}
                            >
                              <MonetizationOn />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            <TablePagination
              component="div"
              count={orders.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        </TabPanel>
        
        {/* Tab 2: Disputes */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Dispute Resolution</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Review and resolve disputes between buyers and sellers.
            </Typography>
            
            {disputes.length === 0 ? (
              <Alert severity="success">No open disputes!</Alert>
            ) : (
              <List>
                {disputes.map((dispute) => (
                  <Paper key={dispute.id} sx={{ mb: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Order: {dispute.order_id.slice(0, 12)}...
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Raised by: {dispute.raised_by} • {new Date(dispute.created_at).toLocaleDateString()}
                        </Typography>
                        <Chip
                          size="small"
                          label={dispute.reason}
                          color="warning"
                          sx={{ mt: 1 }}
                        />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {dispute.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {dispute.status === 'open' ? (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => setDisputeDialog({ open: true, dispute })}
                          >
                            Resolve
                          </Button>
                        ) : (
                          <Chip
                            size="small"
                            label={`Resolved: ${dispute.resolution}`}
                            color="success"
                          />
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
        
        {/* Tab 3: Settings */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Commission Settings */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Commission Settings</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Platform commission deducted from seller payouts (hidden from buyers).
                    </Typography>
                    <Box sx={{ px: 2 }}>
                      <Typography gutterBottom>Commission Rate: {commissionConfig.percentage}%</Typography>
                      <Slider
                        value={commissionConfig.percentage}
                        onChange={(_, v) => setCommissionConfig({ ...commissionConfig, percentage: v as number })}
                        min={0}
                        max={20}
                        marks={[
                          { value: 0, label: '0%' },
                          { value: 5, label: '5%' },
                          { value: 10, label: '10%' },
                          { value: 15, label: '15%' },
                          { value: 20, label: '20%' },
                        ]}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* VAT Settings */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>VAT Configuration</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      VAT rates by country (visible to buyers).
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="right">VAT %</TableCell>
                          <TableCell align="center">Active</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vatConfigs.slice(0, 5).map((config) => (
                          <TableRow key={config.country_code}>
                            <TableCell>{config.country_name}</TableCell>
                            <TableCell align="right">{config.vat_percentage}%</TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={config.is_active ? 'Yes' : 'No'}
                                color={config.is_active ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {vatConfigs.length > 5 && (
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        +{vatConfigs.length - 5} more countries configured
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Transport Pricing */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Transport Pricing</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Delivery pricing matrix for door delivery orders.
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Base Price</TableCell>
                          <TableCell align="right">Per KG</TableCell>
                          <TableCell align="right">Per KM</TableCell>
                          <TableCell align="right">Est. Days</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transportPricing.map((pricing) => (
                          <TableRow key={pricing.id}>
                            <TableCell>
                              <Chip
                                size="small"
                                label={pricing.id}
                                icon={<LocalShipping />}
                              />
                            </TableCell>
                            <TableCell align="right">€{pricing.base_price}</TableCell>
                            <TableCell align="right">€{pricing.price_per_kg}</TableCell>
                            <TableCell align="right">€{pricing.price_per_km}</TableCell>
                            <TableCell align="right">{pricing.estimated_days_base} days</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Card>
      
      {/* Verify Seller Dialog */}
      <Dialog open={verifyDialog.open} onClose={() => setVerifyDialog({ open: false, sellerId: '', action: 'verify' })}>
        <DialogTitle>
          {verifyDialog.action === 'verify' ? 'Verify Seller' : 'Revoke Verification'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {verifyDialog.action === 'verify'
              ? `Are you sure you want to verify seller ${verifyDialog.sellerId}? They will be able to accept online payments.`
              : `Are you sure you want to revoke verification for seller ${verifyDialog.sellerId}? They will no longer be able to accept online payments.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialog({ open: false, sellerId: '', action: 'verify' })}>Cancel</Button>
          <Button
            variant="contained"
            color={verifyDialog.action === 'verify' ? 'primary' : 'error'}
            onClick={handleVerifySeller}
          >
            {verifyDialog.action === 'verify' ? 'Verify' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dispute Resolution Dialog */}
      <Dialog open={disputeDialog.open} onClose={() => setDisputeDialog({ open: false, dispute: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Dispute</DialogTitle>
        <DialogContent>
          {disputeDialog.dispute && (
            <Box>
              <Typography variant="subtitle2">Order: {disputeDialog.dispute.order_id}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Reason: {disputeDialog.dispute.reason}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {disputeDialog.dispute.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Resolution Options:</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 3 }}>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={() => handleResolveDispute('buyer')}
          >
            Refund Buyer (Full Amount)
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => handleResolveDispute('seller')}
          >
            Release to Seller (Order Valid)
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => handleResolveDispute('split')}
          >
            Split 50/50
          </Button>
          <Button fullWidth onClick={() => setDisputeDialog({ open: false, dispute: null })}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Release Escrow Dialog */}
      <Dialog open={releaseDialog.open} onClose={() => setReleaseDialog({ open: false, orderId: '' })}>
        <DialogTitle>Release Escrow Manually</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This will immediately release the escrow funds to the seller without buyer confirmation.
            Only use this in exceptional cases.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDialog({ open: false, orderId: '' })}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleReleaseEscrow}>
            Release Escrow
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
