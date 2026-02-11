'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Badge,
  Popover,
  CircularProgress,
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
  Security,
  SettingsApplications,
  Groups,
  NotificationsNone,
  Assignment,
  CheckCircle,
  Warning,
  AccessTime,
  MarkEmailRead,
  GroupWork,
  BugReport,
  Science,
  VerifiedUser,
  Percent,
  Place,
  Cookie,
  Poll,
  Link,
  Image,
  Receipt,
  EmojiEvents,
  Business,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Admin } from '@/types';
import { useThemeMode } from '@/components/ThemeRegistry';
import { useLocale } from '@/components/LocaleProvider';

const DRAWER_WIDTH = 260;

const menuItems = [
  { text: 'Overview', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Executive Summary', icon: <Summarize />, path: '/dashboard/executive-summary' },
  { text: 'QA & Reliability', icon: <BugReport />, path: '/dashboard/qa-reliability' },
  { text: 'Admin Sandbox', icon: <Science />, path: '/dashboard/sandbox' },
  { text: 'Cohort Analytics', icon: <GroupWork />, path: '/dashboard/cohort-analytics' },
  { text: 'Analytics', icon: <Analytics />, path: '/dashboard/analytics' },
  { text: 'Categories', icon: <Category />, path: '/dashboard/categories' },
  { text: 'Attributes', icon: <Tune />, path: '/dashboard/attributes' },
  { text: 'Location Manager', icon: <Place />, path: '/dashboard/locations' },
  { text: 'Users', icon: <People />, path: '/dashboard/users' },
  { text: 'Verification', icon: <VerifiedUser />, path: '/dashboard/verification' },
  { text: 'Challenges', icon: <EmojiEvents />, path: '/dashboard/challenges' },
  { text: 'Business Profiles', icon: <Business />, path: '/dashboard/business-profiles' },
  { text: 'Listings', icon: <Inventory />, path: '/dashboard/listings' },
  { text: 'Listing Moderation', icon: <Shield />, path: '/dashboard/listing-moderation' },
  { text: 'Vouchers', icon: <Percent />, path: '/dashboard/vouchers' },
  { text: 'Commission', icon: <Percent />, path: '/dashboard/commission' },
  { text: 'Boosts', icon: <RocketLaunch />, path: '/dashboard/boosts' },
  { text: 'Escrow', icon: <AccountBalance />, path: '/dashboard/escrow' },
  { text: 'Invoices', icon: <Receipt />, path: '/dashboard/invoices' },
  { text: 'Badges', icon: <EmojiEvents />, path: '/dashboard/badges' },
  { text: 'Reports', icon: <Report />, path: '/dashboard/reports' },
  { text: 'Tickets', icon: <SupportAgent />, path: '/dashboard/tickets' },
  { text: 'Banners', icon: <Campaign />, path: '/dashboard/banners' },
  { text: 'Moderation', icon: <Shield />, path: '/dashboard/moderation' },
  { text: 'Team Management', icon: <Groups />, path: '/dashboard/team-management' },
  { text: 'Data Privacy', icon: <Security />, path: '/dashboard/compliance' },
  { text: 'Config Manager', icon: <SettingsApplications />, path: '/dashboard/config-manager' },
  { text: 'SEO Tools', icon: <Language />, path: '/dashboard/seo-tools' },
  { text: 'Polls & Surveys', icon: <Poll />, path: '/dashboard/polls-surveys' },
  { text: 'Cookie Consent', icon: <Cookie />, path: '/dashboard/cookie-consent' },
  { text: 'URL Shortener', icon: <Link />, path: '/dashboard/url-shortener' },
  { text: 'reCAPTCHA', icon: <Security />, path: '/dashboard/recaptcha' },
  { text: 'Image Settings', icon: <Image />, path: '/dashboard/image-settings' },
  { text: 'A/B Testing', icon: <Science />, path: '/dashboard/ab-testing' },
  { text: 'Notifications', icon: <NotificationsActive />, path: '/dashboard/notifications' },
  { text: 'Smart Notifications', icon: <Notifications />, path: '/dashboard/smart-notifications' },
  { text: 'Notification Analytics', icon: <TrendingUp />, path: '/dashboard/notification-analytics' },
  { text: 'AI Personalization', icon: <AutoAwesome />, path: '/dashboard/ai-personalization' },
  { text: 'Segment Builder', icon: <FilterList />, path: '/dashboard/segment-builder' },
  { text: 'SMS/WhatsApp', icon: <Sms />, path: '/dashboard/sms-notifications' },
  { text: 'Platform Config', icon: <Palette />, path: '/dashboard/platform-config' },
  { text: 'API Integrations', icon: <Settings />, path: '/dashboard/integrations' },
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
  
  // Notification state
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      // Get dashboard data which includes recent activity and pending items
      const [dashboardRes, tasksRes, approvalsRes] = await Promise.all([
        fetch(`${API_BASE}/team/dashboard`),
        fetch(`${API_BASE}/team/tasks?status=open&limit=5`),
        fetch(`${API_BASE}/team/approvals?status=pending&limit=5`)
      ]);
      
      const combinedNotifications: any[] = [];
      
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        tasks.forEach((task: any) => {
          combinedNotifications.push({
            id: `task_${task.id}`,
            type: 'task',
            title: task.title,
            description: `${task.type} - ${task.priority.toUpperCase()} priority`,
            priority: task.priority,
            status: task.status,
            time: task.created_at,
            link: '/dashboard/team-management',
            sla_breached: task.sla_breached
          });
        });
      }
      
      if (approvalsRes.ok) {
        const approvals = await approvalsRes.json();
        approvals.forEach((approval: any) => {
          combinedNotifications.push({
            id: `approval_${approval.id}`,
            type: 'approval',
            title: approval.title,
            description: `Requested by ${approval.requester_name}`,
            priority: approval.priority,
            status: approval.status,
            time: approval.created_at,
            link: '/dashboard/team-management'
          });
        });
      }
      
      // Sort by time
      combinedNotifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      setNotifications(combinedNotifications.slice(0, 10));
      setUnreadCount(combinedNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [API_BASE]);
  
  // Fetch notifications on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

          <Tooltip title="Notifications">
            <IconButton 
              onClick={(e) => setNotificationAnchor(e.currentTarget)}
              data-testid="notification-bell"
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                {unreadCount > 0 ? <NotificationsActive color="warning" /> : <NotificationsNone />}
              </Badge>
            </IconButton>
          </Tooltip>

          <Popover
            open={Boolean(notificationAnchor)}
            anchorEl={notificationAnchor}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 380, maxHeight: 480 } }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Notifications</Typography>
              {unreadCount > 0 && (
                <Chip label={`${unreadCount} new`} size="small" color="error" />
              )}
            </Box>
            
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsNone sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">No new notifications</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0, maxHeight: 340, overflow: 'auto' }}>
                {notifications.map((notification) => (
                  <ListItem
                    key={notification.id}
                    component="div"
                    sx={{
                      cursor: 'pointer',
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: notification.sla_breached ? 'error.50' : 'inherit'
                    }}
                    onClick={() => {
                      router.push(notification.link);
                      setNotificationAnchor(null);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {notification.type === 'task' ? (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: notification.sla_breached ? 'error.main' : notification.priority === 'critical' ? 'error.light' : notification.priority === 'high' ? 'warning.light' : 'info.light' }}>
                          <Assignment fontSize="small" />
                        </Avatar>
                      ) : (
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light' }}>
                          <CheckCircle fontSize="small" />
                        </Avatar>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 200 }}>
                            {notification.title}
                          </Typography>
                          {notification.sla_breached && (
                            <Chip label="SLA Breach" size="small" color="error" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {notification.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <AccessTime sx={{ fontSize: 12 }} color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notification.time).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    <Chip 
                      label={notification.type === 'task' ? notification.priority : 'Pending'} 
                      size="small" 
                      color={notification.priority === 'critical' ? 'error' : notification.priority === 'high' ? 'warning' : 'default'}
                      sx={{ fontSize: 10 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            
            <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Box 
                component="div"
                sx={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  py: 1, 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRadius: 1
                }}
                onClick={() => {
                  router.push('/dashboard/team-management');
                  setNotificationAnchor(null);
                }}
              >
                <Typography variant="body2" color="primary">
                  View All in Team Management
                </Typography>
              </Box>
            </Box>
          </Popover>

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
