'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  IconButton,
  CircularProgress,
  Snackbar,
  Tooltip,
  InputAdornment,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Percent,
  Edit,
  Delete,
  Save,
  Refresh,
  Calculate,
  VerifiedUser,
  Star,
  WorkspacePremium,
} from '@mui/icons-material';
import { api } from '@/lib/api';

interface CategoryCommission {
  id: string;
  name: string;
  icon?: string;
  commission_percentage: number;
  min_commission: number;
  max_commission: number | null;
  is_custom: boolean;
}

interface VerificationDiscount {
  tier: string;
  discount_percentage: number;
}

interface CommissionConfig {
  default_commission: number;
  category_commissions: any[];
  verification_discounts: VerificationDiscount[];
  min_global_commission: number;
  max_global_commission: number | null;
}

interface CalculationResult {
  amount: number;
  base_rate: number;
  verification_tier: string;
  discount_percentage: number;
  effective_rate: number;
  commission: number;
  seller_receives: number;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  unverified: <Percent fontSize="small" />,
  verified_user: <VerifiedUser fontSize="small" />,
  verified_seller: <Star fontSize="small" />,
  premium_verified_seller: <WorkspacePremium fontSize="small" />,
};

const TIER_LABELS: Record<string, string> = {
  unverified: 'Unverified',
  verified_user: 'Verified User',
  verified_seller: 'Verified Seller',
  premium_verified_seller: 'Premium Seller',
};

export default function CommissionPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [categories, setCategories] = useState<CategoryCommission[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Dialog states
  const [editCategoryDialog, setEditCategoryDialog] = useState<{ open: boolean; category: CategoryCommission | null }>({
    open: false,
    category: null,
  });
  const [editDiscountDialog, setEditDiscountDialog] = useState<{ open: boolean; discount: VerificationDiscount | null }>({
    open: false,
    discount: null,
  });
  const [calculatorDialog, setCalculatorDialog] = useState(false);
  
  // Form states
  const [categoryCommission, setCategoryCommission] = useState(5);
  const [categoryMinCommission, setCategoryMinCommission] = useState(0);
  const [categoryMaxCommission, setCategoryMaxCommission] = useState<number | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [defaultCommission, setDefaultCommission] = useState(5);
  
  // Calculator state
  const [calcAmount, setCalcAmount] = useState(100);
  const [calcCategory, setCalcCategory] = useState('');
  const [calcTier, setCalcTier] = useState('unverified');
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, categoriesRes] = await Promise.all([
        api.get('/commission/config'),
        api.get('/commission/categories'),
      ]);
      setConfig(configRes);
      setCategories(categoriesRes || []);
      setDefaultCommission(configRes.default_commission);
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateDefaultCommission = async () => {
    try {
      await api.put('/commission/config/default', { percentage: defaultCommission });
      setSnackbar({ open: true, message: 'Default commission updated', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update default commission', severity: 'error' });
    }
  };

  const handleSaveCategoryCommission = async () => {
    if (!editCategoryDialog.category) return;
    
    try {
      await api.put(`/commission/categories/${editCategoryDialog.category.id}`, {
        commission_percentage: categoryCommission,
        min_commission: categoryMinCommission,
        max_commission: categoryMaxCommission,
      });
      setSnackbar({ open: true, message: 'Category commission updated', severity: 'success' });
      setEditCategoryDialog({ open: false, category: null });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update category commission', severity: 'error' });
    }
  };

  const handleRemoveCategoryCommission = async (categoryId: string) => {
    try {
      await api.delete(`/commission/categories/${categoryId}`);
      setSnackbar({ open: true, message: 'Custom commission removed (reverted to default)', severity: 'success' });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to remove category commission', severity: 'error' });
    }
  };

  const handleSaveVerificationDiscount = async () => {
    if (!editDiscountDialog.discount) return;
    
    try {
      await api.put(`/commission/verification-discounts/${editDiscountDialog.discount.tier}`, {
        discount_percentage: discountPercentage,
      });
      setSnackbar({ open: true, message: 'Verification discount updated', severity: 'success' });
      setEditDiscountDialog({ open: false, discount: null });
      fetchData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update verification discount', severity: 'error' });
    }
  };

  const handleCalculate = async () => {
    try {
      const result = await api.post('/commission/calculate', {
        amount: calcAmount,
        category_id: calcCategory || null,
        seller_verification_tier: calcTier,
      });
      setCalcResult(result);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to calculate commission', severity: 'error' });
    }
  };

  const openEditCategoryDialog = (category: CategoryCommission) => {
    setCategoryCommission(category.commission_percentage);
    setCategoryMinCommission(category.min_commission);
    setCategoryMaxCommission(category.max_commission);
    setEditCategoryDialog({ open: true, category });
  };

  const openEditDiscountDialog = (discount: VerificationDiscount) => {
    setDiscountPercentage(discount.discount_percentage);
    setEditDiscountDialog({ open: true, discount });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Commission Settings
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Calculate />} onClick={() => setCalculatorDialog(true)}>
            Calculator
          </Button>
          <Button startIcon={<Refresh />} onClick={fetchData}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Default Commission Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Default Commission Rate</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This rate applies to all categories without a custom commission setting.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Slider
              value={defaultCommission}
              onChange={(_, v) => setDefaultCommission(v as number)}
              min={0}
              max={25}
              step={0.5}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v}%`}
              sx={{ maxWidth: 300 }}
            />
            <Button variant="contained" onClick={handleUpdateDefaultCommission} startIcon={<Save />}>
              Save
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Verification Discounts */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Verification Tier Discounts</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Commission discounts applied based on seller's verification tier.
              </Typography>
              <Box sx={{ mt: 2 }}>
                {config?.verification_discounts.map((discount) => (
                  <Box 
                    key={discount.tier}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {TIER_ICONS[discount.tier]}
                      <Typography>{TIER_LABELS[discount.tier]}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={`${discount.discount_percentage}% off`}
                        color={discount.discount_percentage > 0 ? 'success' : 'default'}
                        size="small"
                      />
                      <IconButton size="small" onClick={() => openEditDiscountDialog(discount)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Commissions */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Commission Rates</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Set custom commission rates for specific categories.
              </Typography>
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Commission %</TableCell>
                      <TableCell align="right">Min</TableCell>
                      <TableCell align="right">Max</TableCell>
                      <TableCell align="center">Custom</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            fontWeight={cat.is_custom ? 600 : 400}
                            color={cat.is_custom ? 'primary.main' : 'text.secondary'}
                          >
                            {cat.commission_percentage}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {cat.min_commission > 0 ? `$${cat.min_commission}` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {cat.max_commission ? `$${cat.max_commission}` : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {cat.is_custom ? (
                            <Chip label="Custom" size="small" color="primary" />
                          ) : (
                            <Chip label="Default" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => openEditCategoryDialog(cat)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          {cat.is_custom && (
                            <Tooltip title="Revert to default">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveCategoryCommission(cat.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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

      {/* Edit Category Commission Dialog */}
      <Dialog 
        open={editCategoryDialog.open} 
        onClose={() => setEditCategoryDialog({ open: false, category: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Commission - {editCategoryDialog.category?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Commission Percentage</Typography>
            <Slider
              value={categoryCommission}
              onChange={(_, v) => setCategoryCommission(v as number)}
              min={0}
              max={25}
              step={0.5}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v}%`}
            />
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Commission"
                  value={categoryMinCommission}
                  onChange={(e) => setCategoryMinCommission(parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Commission"
                  value={categoryMaxCommission || ''}
                  onChange={(e) => setCategoryMaxCommission(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="No limit"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCategoryDialog({ open: false, category: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCategoryCommission}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Verification Discount Dialog */}
      <Dialog 
        open={editDiscountDialog.open} 
        onClose={() => setEditDiscountDialog({ open: false, discount: null })}
      >
        <DialogTitle>
          Edit Discount - {TIER_LABELS[editDiscountDialog.discount?.tier || '']}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, minWidth: 300 }}>
            <Typography gutterBottom>Discount Percentage</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This percentage is deducted from the base commission rate.
            </Typography>
            <Slider
              value={discountPercentage}
              onChange={(_, v) => setDiscountPercentage(v as number)}
              min={0}
              max={50}
              step={5}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v}%`}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
              ]}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDiscountDialog({ open: false, discount: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveVerificationDiscount}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Commission Calculator Dialog */}
      <Dialog 
        open={calculatorDialog} 
        onClose={() => setCalculatorDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Commission Calculator</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Sale Amount"
              value={calcAmount}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              select
              label="Category (optional)"
              value={calcCategory}
              onChange={(e) => setCalcCategory(e.target.value)}
              sx={{ mb: 2 }}
              SelectProps={{ native: true }}
            >
              <option value="">Default Rate</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              select
              label="Seller Verification Tier"
              value={calcTier}
              onChange={(e) => setCalcTier(e.target.value)}
              sx={{ mb: 2 }}
              SelectProps={{ native: true }}
            >
              <option value="unverified">Unverified</option>
              <option value="verified_user">Verified User</option>
              <option value="verified_seller">Verified Seller</option>
              <option value="premium_verified_seller">Premium Verified Seller</option>
            </TextField>
            
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleCalculate}
              startIcon={<Calculate />}
            >
              Calculate
            </Button>
            
            {calcResult && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom>Result</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Base Rate</Typography>
                    <Typography variant="h6">{calcResult.base_rate}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Verification Discount</Typography>
                    <Typography variant="h6" color="success.main">-{calcResult.discount_percentage}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Effective Rate</Typography>
                    <Typography variant="h6" color="primary.main">{calcResult.effective_rate.toFixed(2)}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Commission</Typography>
                    <Typography variant="h6">${calcResult.commission}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">Seller Receives:</Typography>
                  <Typography variant="h5" color="success.main">${calcResult.seller_receives}</Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalculatorDialog(false)}>Close</Button>
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
