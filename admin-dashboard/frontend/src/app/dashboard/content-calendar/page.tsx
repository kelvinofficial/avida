'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Badge,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Edit,
  Delete,
  Today,
  ViewWeek,
  ViewModule,
  CalendarMonth,
  Article,
  Share,
  TrendingUp,
  Campaign,
  MoreHoriz,
  Schedule,
  Flag,
  Close,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  blog: '#4CAF50',
  social: '#2196F3',
  seo_milestone: '#FF9800',
  campaign: '#9C27B0',
  other: '#607D8B',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  blog: <Article fontSize="small" />,
  social: <Share fontSize="small" />,
  seo_milestone: <TrendingUp fontSize="small" />,
  campaign: <Campaign fontSize="small" />,
  other: <MoreHoriz fontSize="small" />,
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'default',
};

const PRIORITY_COLORS: Record<string, any> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

const REGIONS = [
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  scheduled_date: string;
  end_date?: string;
  status: string;
  priority: string;
  region?: string;
  category?: string;
  platform?: string;
  content_id?: string;
  tags: string[];
  color: string;
  recurrence?: string;
  assigned_to?: string;
  notes?: string;
}

interface EventTemplate {
  id: string;
  name: string;
  event_type: string;
  platform?: string;
  description: string;
  default_duration_hours: number;
  suggested_tags: string[];
  color: string;
}

export default function ContentCalendarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  // Dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'blog',
    scheduled_date: '',
    status: 'scheduled',
    priority: 'medium',
    region: '',
    platform: '',
    tags: [] as string[],
    notes: '',
  });

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const res = await fetch(
        `${API_BASE}/growth/calendar/events?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        { headers: getAuthHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/calendar/templates`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/calendar/stats`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.scheduled_date) {
      setError('Title and date are required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/calendar/events`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          scheduled_date: new Date(formData.scheduled_date).toISOString(),
          tags: formData.tags,
        }),
      });
      
      if (res.ok) {
        setSuccess('Event created successfully');
        setEventDialogOpen(false);
        resetForm();
        fetchEvents();
        fetchStats();
      } else {
        setError('Failed to create event');
      }
    } catch (err) {
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/growth/calendar/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          scheduled_date: new Date(formData.scheduled_date).toISOString(),
        }),
      });
      
      if (res.ok) {
        setSuccess('Event updated successfully');
        setEventDialogOpen(false);
        setSelectedEvent(null);
        resetForm();
        fetchEvents();
        fetchStats();
      } else {
        setError('Failed to update event');
      }
    } catch (err) {
      setError('Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/growth/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (res.ok) {
        setSuccess('Event deleted');
        fetchEvents();
        fetchStats();
      }
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  const openEditDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      scheduled_date: event.scheduled_date.slice(0, 16),
      status: event.status,
      priority: event.priority,
      region: event.region || '',
      platform: event.platform || '',
      tags: event.tags || [],
      notes: event.notes || '',
    });
    setEventDialogOpen(true);
  };

  const useTemplate = (template: EventTemplate) => {
    setFormData({
      ...formData,
      title: template.name,
      description: template.description,
      event_type: template.event_type,
      platform: template.platform || '',
      tags: template.suggested_tags,
    });
    setTemplateDialogOpen(false);
    setEventDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'blog',
      scheduled_date: '',
      status: 'scheduled',
      priority: 'medium',
      region: '',
      platform: '',
      tags: [],
      notes: '',
    });
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days = [];
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const eventDate = new Date(e.scheduled_date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <Box sx={{ p: 3 }} data-testid="content-calendar-page">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Content Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Schedule and manage blog posts, social media, and SEO campaigns
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Schedule />}
            onClick={() => setTemplateDialogOpen(true)}
            data-testid="use-template-btn"
          >
            Use Template
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setSelectedEvent(null);
              setEventDialogOpen(true);
            }}
            data-testid="create-event-btn"
          >
            Create Event
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Stats Overview */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary" fontWeight="bold">{stats.total_events}</Typography>
                <Typography variant="body2" color="text.secondary">Total Events</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">{stats.upcoming_this_week}</Typography>
                <Typography variant="body2" color="text.secondary">This Week</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="error.main" fontWeight="bold">{stats.overdue}</Typography>
                <Typography variant="body2" color="text.secondary">Overdue</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">{stats.by_status?.completed || 0}</Typography>
                <Typography variant="body2" color="text.secondary">Completed</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Calendar Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateMonth(-1)} data-testid="prev-month-btn">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
              {formatMonthYear(currentDate)}
            </Typography>
            <IconButton onClick={() => navigateMonth(1)} data-testid="next-month-btn">
              <ChevronRight />
            </IconButton>
            <Button variant="outlined" size="small" startIcon={<Today />} onClick={goToToday}>
              Today
            </Button>
          </Box>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            size="small"
          >
            <ToggleButton value="month"><CalendarMonth /></ToggleButton>
            <ToggleButton value="week"><ViewWeek /></ToggleButton>
            <ToggleButton value="list"><ViewModule /></ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {view === 'month' && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {/* Day headers */}
            <Grid container>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Grid item xs key={day} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">{day}</Typography>
                </Grid>
              ))}
            </Grid>
            
            {/* Calendar days */}
            <Grid container>
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day.date);
                return (
                  <Grid
                    item
                    xs
                    key={idx}
                    sx={{
                      minHeight: 100,
                      p: 0.5,
                      borderBottom: 1,
                      borderRight: (idx + 1) % 7 !== 0 ? 1 : 0,
                      borderColor: 'divider',
                      bgcolor: !day.isCurrentMonth ? 'grey.50' : isToday(day.date) ? 'primary.50' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => {
                      resetForm();
                      setFormData(prev => ({
                        ...prev,
                        scheduled_date: day.date.toISOString().slice(0, 16)
                      }));
                      setSelectedEvent(null);
                      setEventDialogOpen(true);
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday(day.date) ? 'bold' : 'normal',
                        color: !day.isCurrentMonth ? 'text.disabled' : isToday(day.date) ? 'primary.main' : 'text.primary',
                        p: 0.5
                      }}
                    >
                      {day.date.getDate()}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {dayEvents.slice(0, 3).map(event => (
                        <Box
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
                          sx={{
                            bgcolor: event.color || EVENT_TYPE_COLORS[event.event_type],
                            color: 'white',
                            borderRadius: 0.5,
                            px: 0.5,
                            py: 0.25,
                            fontSize: '0.7rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.9 }
                          }}
                        >
                          {event.title}
                        </Box>
                      ))}
                      {dayEvents.length > 3 && (
                        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(event => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: EVENT_TYPE_COLORS[event.event_type] }}>
                        {EVENT_TYPE_ICONS[event.event_type]}
                      </Box>
                      <Typography variant="body2" fontWeight="bold">{event.title}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.event_type}
                      size="small"
                      sx={{ bgcolor: EVENT_TYPE_COLORS[event.event_type], color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(event.scheduled_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip label={event.status} size="small" color={STATUS_COLORS[event.status] as any} />
                  </TableCell>
                  <TableCell>
                    <Chip label={event.priority} size="small" color={PRIORITY_COLORS[event.priority]} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {event.region && (
                      <Chip
                        label={`${REGIONS.find(r => r.code === event.region)?.flag || ''} ${event.region}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEditDialog(event)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteEvent(event.id)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No events for this period</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? 'Edit Event' : 'Create Event'}
          <IconButton
            onClick={() => setEventDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
              data-testid="event-title-input"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={formData.event_type}
                    label="Event Type"
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  >
                    <MenuItem value="blog">Blog Post</MenuItem>
                    <MenuItem value="social">Social Media</MenuItem>
                    <MenuItem value="seo_milestone">SEO Milestone</MenuItem>
                    <MenuItem value="campaign">Campaign</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Scheduled Date"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  data-testid="event-date-input"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={formData.region}
                    label="Region"
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    <MenuItem value="">All Regions</MenuItem>
                    {REGIONS.map(r => (
                      <MenuItem key={r.code} value={r.code}>{r.flag} {r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                {formData.event_type === 'social' && (
                  <FormControl fullWidth>
                    <InputLabel>Platform</InputLabel>
                    <Select
                      value={formData.platform}
                      label="Platform"
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    >
                      <MenuItem value="">Select Platform</MenuItem>
                      <MenuItem value="twitter">Twitter</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                      <MenuItem value="facebook">Facebook</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Grid>
            </Grid>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={selectedEvent ? handleUpdateEvent : handleCreateEvent}
            disabled={loading}
            data-testid="save-event-btn"
          >
            {loading ? <CircularProgress size={24} /> : selectedEvent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Select Template
          <IconButton
            onClick={() => setTemplateDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {templates.map(template => (
              <Grid item xs={6} key={template.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: `2px solid ${template.color}`,
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => useTemplate(template)}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box sx={{ color: template.color, mb: 1 }}>
                      {EVENT_TYPE_ICONS[template.event_type]}
                    </Box>
                    <Typography variant="subtitle2" fontWeight="bold">{template.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{template.description}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
