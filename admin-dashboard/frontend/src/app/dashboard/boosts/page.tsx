'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
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
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Grid,
  Paper,
  Divider,
  InputAdornment,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  TrendingUp,
  AttachMoney,
  LocalOffer,
  Star,
  Home,
  LocationOn,
  Category,
  Timer,
  AccountBalance,
  Person,
  Visibility,
  RocketLaunch,
  Payment,
  CreditCard,
  PhoneAndroid,
  Public,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface CreditPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  credits: number;
  bonus_credits: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
}

interface BoostPricing {
  id: string;
  boost_type: string;
  name: string;
  description?: string;
  credits_per_hour: number;
  credits_per_day: number;
  min_duration_hours: number;
  max_duration_days: number;
  is_enabled: boolean;
  priority: number;
}

interface SellerCredits {
  id: string;
  seller_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
}

interface Analytics {
  active_boosts: number;
  total_revenue: number;
  total_purchases: number;
  boosts_by_type: Record<string, { total: number; active: number }>;
  credits_stats: {
    total_balance?: number;
    total_purchased?: number;
    total_spent?: number;
  };
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  requires_phone: boolean;
  country?: string;
  currency?: string;
  exchange_rate: number;
  min_amount: number;
  max_amount: number;
  networks?: string[];
  priority: number;
}

const BOOST_TYPE_ICONS: Record<string, React.ReactNode> = {
  featured: <Star />,
  homepage: <Home />,
  urgent: <Timer />,
  location: <LocationOn />,
  category: <Category />,
};

const BOOST_TYPE_COLORS: Record<string, string> = {
  featured: '#FFD700',
  homepage: '#FF6B6B',
  urgent: '#FF9800',
  location: '#4CAF50',
  category: '#2196F3',
};

export default function BoostsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Data state
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [pricing, setPricing] = useState<BoostPricing[]>([]);
  const [sellers, setSellers] = useState<SellerCredits[]>([]);
  const [sellersTotal, setSellersTotal] = useState(0);
  const [sellersPage, setSellersPage] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Dialog state
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [creditAdjustDialogOpen, setCreditAdjustDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
  const [editingPricing, setEditingPricing] = useState<BoostPricing | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<SellerCredits | null>(null);

  // Form state
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    price: 5,
    credits: 50,
    bonus_credits: 0,
    is_active: true,
    is_popular: false,
  });

  const [pricingForm, setPricingForm] = useState({
    boost_type: 'featured',
    name: '',
    description: '',
    credits_per_hour: 1,
    credits_per_day: 10,
    min_duration_hours: 1,
    max_duration_days: 30,
    is_enabled: true,
    priority: 1,
  });

  const [creditAdjustForm, setCreditAdjustForm] = useState({
    amount: 0,
    reason: '',
  });

  // Load data
  const loadPackages = useCallback(async () => {
    try {
      const data = await api.getBoostPackages(false);
      setPackages(data);
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const data = await api.getBoostPricingAdmin();
      setPricing(data);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    }
  }, []);

  const loadSellers = useCallback(async () => {
    try {
      const data = await api.getBoostSellers(sellersPage + 1, 20);
      setSellers(data.items);
      setSellersTotal(data.total);
    } catch (err) {
      console.error('Failed to load sellers:', err);
    }
  }, [sellersPage]);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.getBoostAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const data = await api.getPaymentMethods();
      setPaymentMethods(data);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadPackages(), loadPricing(), loadAnalytics(), loadPaymentMethods()]);
      setLoading(false);
    };
    loadAll();
  }, [loadPackages, loadPricing, loadAnalytics, loadPaymentMethods]);

  useEffect(() => {
    if (tabValue === 3) {
      loadSellers();
    }
  }, [tabValue, loadSellers]);

  // Package handlers
  const openPackageDialog = (pkg?: CreditPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price,
        credits: pkg.credits,
        bonus_credits: pkg.bonus_credits,
        is_active: pkg.is_active,
        is_popular: pkg.is_popular,
      });
    } else {
      setEditingPackage(null);
      setPackageForm({
        name: '',
        description: '',
        price: 5,
        credits: 50,
        bonus_credits: 0,
        is_active: true,
        is_popular: false,
      });
    }
    setPackageDialogOpen(true);
  };

  const handleSavePackage = async () => {
    try {
      if (editingPackage) {
        await api.updateBoostPackage(editingPackage.id, packageForm);
        setSnackbar({ open: true, message: 'Package updated', severity: 'success' });
      } else {
        await api.createBoostPackage(packageForm);
        setSnackbar({ open: true, message: 'Package created', severity: 'success' });
      }
      setPackageDialogOpen(false);
      loadPackages();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save package', severity: 'error' });
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Delete this package?')) return;
    try {
      await api.deleteBoostPackage(id);
      setSnackbar({ open: true, message: 'Package deleted', severity: 'success' });
      loadPackages();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete package', severity: 'error' });
    }
  };

  // Pricing handlers
  const openPricingDialog = (bp?: BoostPricing) => {
    if (bp) {
      setEditingPricing(bp);
      setPricingForm({
        boost_type: bp.boost_type,
        name: bp.name,
        description: bp.description || '',
        credits_per_hour: bp.credits_per_hour,
        credits_per_day: bp.credits_per_day,
        min_duration_hours: bp.min_duration_hours,
        max_duration_days: bp.max_duration_days,
        is_enabled: bp.is_enabled,
        priority: bp.priority,
      });
    }
    setPricingDialogOpen(true);
  };

  const handleSavePricing = async () => {
    try {
      await api.setBoostPricing(pricingForm);
      setSnackbar({ open: true, message: 'Pricing updated', severity: 'success' });
      setPricingDialogOpen(false);
      loadPricing();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save pricing', severity: 'error' });
    }
  };

  const handleToggleBoostType = async (boostType: string, enabled: boolean) => {
    try {
      await api.toggleBoostType(boostType, enabled);
      loadPricing();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to toggle boost type', severity: 'error' });
    }
  };

  // Credit adjustment handlers
  const openCreditAdjustDialog = (seller: SellerCredits) => {
    setSelectedSeller(seller);
    setCreditAdjustForm({ amount: 0, reason: '' });
    setCreditAdjustDialogOpen(true);
  };

  const handleAdjustCredits = async () => {
    if (!selectedSeller || creditAdjustForm.amount === 0) return;
    try {
      await api.adjustSellerCredits(selectedSeller.seller_id, creditAdjustForm.amount, creditAdjustForm.reason);
      setSnackbar({ open: true, message: 'Credits adjusted', severity: 'success' });
      setCreditAdjustDialogOpen(false);
      loadSellers();
      loadAnalytics();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to adjust credits', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Boost & Promotions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage credit packages, boost pricing, and seller credits
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {
            loadPackages();
            loadPricing();
            loadAnalytics();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Analytics Summary */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <RocketLaunch sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={600}>{analytics.active_boosts}</Typography>
              <Typography variant="body2" color="text.secondary">Active Boosts</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={600}>${analytics.total_revenue.toFixed(2)}</Typography>
              <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <LocalOffer sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={600}>{analytics.total_purchases}</Typography>
              <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight={600}>
                {analytics.credits_stats?.total_balance || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">Credits in Circulation</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Card>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<LocalOffer />} iconPosition="start" label="Credit Packages" />
          <Tab icon={<TrendingUp />} iconPosition="start" label="Boost Pricing" />
          <Tab icon={<Payment />} iconPosition="start" label="Payment Methods" />
          <Tab icon={<Person />} iconPosition="start" label="Seller Credits" />
        </Tabs>

        {/* Credit Packages Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => openPackageDialog()}
                data-testid="add-package-btn"
              >
                Add Package
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Package Name</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Credits</TableCell>
                    <TableCell>Bonus</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={500}>{pkg.name}</Typography>
                          {pkg.is_popular && (
                            <Chip label="Popular" size="small" color="primary" />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {pkg.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600} color="success.main">
                          ${pkg.price}
                        </Typography>
                      </TableCell>
                      <TableCell>{pkg.credits}</TableCell>
                      <TableCell>
                        {pkg.bonus_credits > 0 ? (
                          <Chip label={`+${pkg.bonus_credits}`} size="small" color="success" />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pkg.is_active ? 'Active' : 'Inactive'}
                          color={pkg.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openPackageDialog(pkg)}>
                          <Edit />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeletePackage(pkg.id)}>
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Boost Pricing Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Boost Type</TableCell>
                    <TableCell>Cost per Hour</TableCell>
                    <TableCell>Cost per Day</TableCell>
                    <TableCell>Duration Range</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Enabled</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pricing.map((bp) => (
                    <TableRow key={bp.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              bgcolor: BOOST_TYPE_COLORS[bp.boost_type] || 'grey.300',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                            }}
                          >
                            {BOOST_TYPE_ICONS[bp.boost_type]}
                          </Box>
                          <Box>
                            <Typography fontWeight={500}>{bp.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {bp.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{bp.credits_per_hour} credits</TableCell>
                      <TableCell>{bp.credits_per_day} credits</TableCell>
                      <TableCell>
                        {bp.min_duration_hours}h - {bp.max_duration_days}d
                      </TableCell>
                      <TableCell>
                        <Chip label={bp.priority} size="small" />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bp.is_enabled}
                          onChange={(e) => handleToggleBoostType(bp.boost_type, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openPricingDialog(bp)}>
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Seller Credits Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Seller ID</TableCell>
                    <TableCell>Balance</TableCell>
                    <TableCell>Total Purchased</TableCell>
                    <TableCell>Total Spent</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No sellers with credits yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellers.map((seller) => (
                      <TableRow key={seller.id} hover>
                        <TableCell>
                          <Typography fontFamily="monospace">{seller.seller_id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${seller.balance} credits`}
                            color={seller.balance > 0 ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{seller.total_purchased}</TableCell>
                        <TableCell>{seller.total_spent}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openCreditAdjustDialog(seller)}
                          >
                            Adjust Credits
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sellersTotal}
              page={sellersPage}
              onPageChange={(_, newPage) => setSellersPage(newPage)}
              rowsPerPage={20}
              rowsPerPageOptions={[20]}
            />
          </Box>
        </TabPanel>
      </Card>

      {/* Package Dialog */}
      <Dialog open={packageDialogOpen} onClose={() => setPackageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Package Name"
              value={packageForm.name}
              onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={packageForm.description}
              onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price (USD)"
                type="number"
                value={packageForm.price}
                onChange={(e) => setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Credits"
                type="number"
                value={packageForm.credits}
                onChange={(e) => setPackageForm({ ...packageForm, credits: parseInt(e.target.value) || 0 })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Bonus Credits"
                type="number"
                value={packageForm.bonus_credits}
                onChange={(e) => setPackageForm({ ...packageForm, bonus_credits: parseInt(e.target.value) || 0 })}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={packageForm.is_active}
                    onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={packageForm.is_popular}
                    onChange={(e) => setPackageForm({ ...packageForm, is_popular: e.target.checked })}
                  />
                }
                label="Mark as Popular"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPackageDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePackage}>
            {editingPackage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={pricingDialogOpen} onClose={() => setPricingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Boost Pricing</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={pricingForm.name}
              onChange={(e) => setPricingForm({ ...pricingForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={pricingForm.description}
              onChange={(e) => setPricingForm({ ...pricingForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Credits per Hour"
                type="number"
                value={pricingForm.credits_per_hour}
                onChange={(e) => setPricingForm({ ...pricingForm, credits_per_hour: parseInt(e.target.value) || 0 })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Credits per Day"
                type="number"
                value={pricingForm.credits_per_day}
                onChange={(e) => setPricingForm({ ...pricingForm, credits_per_day: parseInt(e.target.value) || 0 })}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Min Duration (hours)"
                type="number"
                value={pricingForm.min_duration_hours}
                onChange={(e) => setPricingForm({ ...pricingForm, min_duration_hours: parseInt(e.target.value) || 1 })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Max Duration (days)"
                type="number"
                value={pricingForm.max_duration_days}
                onChange={(e) => setPricingForm({ ...pricingForm, max_duration_days: parseInt(e.target.value) || 30 })}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Priority (higher = more prominent)"
              type="number"
              value={pricingForm.priority}
              onChange={(e) => setPricingForm({ ...pricingForm, priority: parseInt(e.target.value) || 1 })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={pricingForm.is_enabled}
                  onChange={(e) => setPricingForm({ ...pricingForm, is_enabled: e.target.checked })}
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPricingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePricing}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Credit Adjust Dialog */}
      <Dialog open={creditAdjustDialogOpen} onClose={() => setCreditAdjustDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Seller Credits</DialogTitle>
        <DialogContent>
          {selectedSeller && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Alert severity="info">
                Current Balance: <strong>{selectedSeller.balance} credits</strong>
              </Alert>
              <TextField
                label="Amount (positive to add, negative to remove)"
                type="number"
                value={creditAdjustForm.amount}
                onChange={(e) => setCreditAdjustForm({ ...creditAdjustForm, amount: parseInt(e.target.value) || 0 })}
                fullWidth
                helperText={creditAdjustForm.amount > 0 ? `Will add ${creditAdjustForm.amount} credits` : creditAdjustForm.amount < 0 ? `Will remove ${Math.abs(creditAdjustForm.amount)} credits` : ''}
              />
              <TextField
                label="Reason"
                value={creditAdjustForm.reason}
                onChange={(e) => setCreditAdjustForm({ ...creditAdjustForm, reason: e.target.value })}
                fullWidth
                required
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditAdjustDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdjustCredits}
            disabled={!creditAdjustForm.amount || !creditAdjustForm.reason}
            color={creditAdjustForm.amount > 0 ? 'success' : 'error'}
          >
            {creditAdjustForm.amount > 0 ? 'Add Credits' : 'Remove Credits'}
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
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
