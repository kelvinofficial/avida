'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  CardActionArea,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  People,
  Inventory,
  Report,
  TrendingUp,
  Category,
  AttachMoney,
  Storefront,
  Flag,
  BarChart as BarChartIcon,
  VerifiedUser,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { api } from '@/lib/api';
import { AnalyticsOverview } from '@/types';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

function StatCard({ title, value, subtitle, icon, color, change }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: color,
            }}
          >
            {icon}
          </Box>
          {change && (
            <Chip
              label={change}
              size="small"
              color={change.startsWith('+') ? 'success' : 'error'}
              sx={{ height: 24 }}
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
}

function QuickActionCard({ title, description, icon, color, href }: QuickActionCardProps) {
  const router = useRouter();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea 
        onClick={() => router.push(href)}
        sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [categoryData, setCategoryData] = useState<{ category_name: string; count: number }[]>([]);
  const [growthData, setGrowthData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [overview, categories, growth] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getListingsByCategory(),
          api.getUsersGrowth(30),
        ]);
        setAnalytics(overview);
        setCategoryData(categories.slice(0, 8));
        setGrowthData(growth);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Dashboard Overview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back! Here&apos;s what&apos;s happening with your marketplace.
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Users"
            value={analytics?.users.total || 0}
            subtitle={`+${analytics?.users.new_7d || 0} this week`}
            icon={<People />}
            color="#2196F3"
            change={`+${analytics?.users.new_30d || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Listings"
            value={analytics?.listings.active || 0}
            subtitle={`${analytics?.listings.pending || 0} pending review`}
            icon={<Inventory />}
            color="#4CAF50"
            change={`+${analytics?.listings.new_7d || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending Reports"
            value={analytics?.reports.pending || 0}
            subtitle="Needs attention"
            icon={<Report />}
            color="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Open Tickets"
            value={analytics?.tickets.open || 0}
            subtitle="Support requests"
            icon={<TrendingUp />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                User Growth (Last 30 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2E7D32"
                      strokeWidth={2}
                      dot={{ fill: '#2E7D32' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Listings by Category
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="category_name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Stats Row */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: '#E3F2FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Category sx={{ color: '#1976D2' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {categoryData.length}+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Categories
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: '#E8F5E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AttachMoney sx={{ color: '#2E7D32' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {analytics?.listings.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Listings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: '#FFF3E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ color: '#E65100' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {((analytics?.listings.new_7d || 0) / 7).toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Listings/Day
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions Section */}
      <Typography variant="h5" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
        Quick Actions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage users, business profiles, challenges, and view analytics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Users & Verification"
            description="Manage users, sellers, and business profiles"
            icon={<VerifiedUser sx={{ fontSize: 32, color: '#fff' }} />}
            color="#E8F5E9"
            href="/dashboard/users"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Business Profiles"
            description="Review and manage business profiles"
            icon={<Storefront sx={{ fontSize: 32, color: '#fff' }} />}
            color="#FFF3E0"
            href="/dashboard/verification"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Challenges"
            description="Create and manage badge challenges"
            icon={<Flag sx={{ fontSize: 32, color: '#fff' }} />}
            color="#FCE4EC"
            href="/dashboard/challenges"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Analytics"
            description="View platform and seller analytics"
            icon={<BarChartIcon sx={{ fontSize: 32, color: '#fff' }} />}
            color="#E3F2FD"
            href="/dashboard/analytics"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
