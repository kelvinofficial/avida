'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  Dashboard,
  Category,
  People,
  Inventory,
  Report,
  SupportAgent,
  Analytics,
  Settings,
  History,
  Menu as MenuIcon,
  Logout,
  AccountCircle,
  Notifications,
  DarkMode,
  LightMode,
  Campaign,
  NotificationsActive,
  Language,
  Tune,
  RocketLaunch,
  AccountBalance,
  Sms,
  AutoAwesome,
  Shield,
  Summarize,
  TrendingUp,
  FilterList,
  Palette,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Admin } from '@/types';
import { useThemeMode } from '@/components/ThemeRegistry';
import { useLocale } from '@/components/LocaleProvider';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Overview', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Executive Summary', icon: <Summarize />, path: '/dashboard/executive-summary' },
  { text: 'Categories', icon: <Category />, path: '/dashboard/categories' },
  { text: 'Attributes', icon: <Tune />, path: '/dashboard/attributes' },
  { text: 'Users', icon: <People />, path: '/dashboard/users' },
  { text: 'Listings', icon: <Inventory />, path: '/dashboard/listings' },
  { text: 'Boosts', icon: <RocketLaunch />, path: '/dashboard/boosts' },
  { text: 'Escrow', icon: <AccountBalance />, path: '/dashboard/escrow' },
  { text: 'Reports', icon: <Report />, path: '/dashboard/reports' },
  { text: 'Tickets', icon: <SupportAgent />, path: '/dashboard/tickets' },
  { text: 'Analytics', icon: <Analytics />, path: '/dashboard/analytics' },
  { text: 'Banners', icon: <Campaign />, path: '/dashboard/banners' },
  { text: 'Moderation', icon: <Shield />, path: '/dashboard/moderation' },
  { text: 'Notifications', icon: <NotificationsActive />, path: '/dashboard/notifications' },
  { text: 'Smart Notifications', icon: <Notifications />, path: '/dashboard/smart-notifications' },
  { text: 'Notification Analytics', icon: <TrendingUp />, path: '/dashboard/notification-analytics' },
  { text: 'AI Personalization', icon: <AutoAwesome />, path: '/dashboard/ai-personalization' },
  { text: 'Segment Builder', icon: <FilterList />, path: '/dashboard/segment-builder' },
  { text: 'SMS/WhatsApp', icon: <Sms />, path: '/dashboard/sms-notifications' },
  { text: 'Platform Config', icon: <Palette />, path: '/dashboard/platform-config' },
  { text: 'AI Analyzer', icon: <AutoAwesome />, path: '/dashboard/ai-analyzer' },
  { text: 'Settings', icon: <Settings />, path: '/dashboard/settings' },
  { text: 'Audit Logs', icon: <History />, path: '/dashboard/audit-logs' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();
  const { locale, setLocale, t, availableLocales } = useLocale();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        api.loadToken();
        const data = await api.getMe();
        setAdmin(data);
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    loadAdmin();
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.push('/');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'primary';
      case 'moderator': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dashboard sx={{ color: 'white' }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            Admin
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Marketplace
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ flex: 1, px: 1, py: 2, overflowY: 'auto' }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                router.push(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              selected={pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
            {admin?.name?.charAt(0) || 'A'}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {admin?.name}
            </Typography>
            <Chip
              label={admin?.role?.replace('_', ' ')}
              size="small"
              color={getRoleColor(admin?.role || '')}
              sx={{ height: 20, fontSize: 10 }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: mode === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" fontWeight={600} sx={{ flex: 1 }}>
            {menuItems.find((item) => item.path === pathname)?.text || 'Dashboard'}
          </Typography>

          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton onClick={toggleTheme} sx={{ mr: 1 }}>
              {mode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Change language">
            <IconButton onClick={(e) => setLangAnchorEl(e.currentTarget)} sx={{ mr: 1 }}>
              <Language />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={langAnchorEl}
            open={Boolean(langAnchorEl)}
            onClose={() => setLangAnchorEl(null)}
            PaperProps={{ sx: { width: 160 } }}
          >
            {availableLocales.map((loc) => (
              <MenuItem
                key={loc.code}
                onClick={() => {
                  setLocale(loc.code);
                  setLangAnchorEl(null);
                }}
                selected={locale === loc.code}
              >
                <Typography sx={{ mr: 1 }}>{loc.flag}</Typography>
                {loc.name}
              </MenuItem>
            ))}
          </Menu>

          <IconButton>
            <Notifications />
          </IconButton>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <AccountCircle />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { width: 200 } }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {admin?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t('auth.signOut')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              width: DRAWER_WIDTH, 
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
