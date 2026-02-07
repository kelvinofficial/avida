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
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Refresh,
  Send,
  Person,
  SupportAgent,
  AccessTime,
  Flag,
  CheckCircle,
  Schedule,
  HighlightOff,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Ticket, TicketPriority, TicketResponse } from '@/types';

export default function TicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getTickets({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setTickets(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;
    setActionLoading(true);
    setError('');

    try {
      await api.respondToTicket(selectedTicket.id, responseText, isInternalNote);
      setResponseText('');
      // Refresh ticket details
      const tickets = await api.getTickets({ page: 1, limit: 100 });
      const updated = tickets.items.find((t: Ticket) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      await loadTickets();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to send response');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setActionLoading(true);

    try {
      await api.updateTicket(selectedTicket.id, { status: newStatus });
      const tickets = await api.getTickets({ page: 1, limit: 100 });
      const updated = tickets.items.find((t: Ticket) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      await loadTickets();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'warning';
      case 'in_progress': return 'info';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredTickets = () => {
    if (tabValue === 0) return tickets;
    if (tabValue === 1) return tickets.filter(t => t.status === 'open');
    if (tabValue === 2) return tickets.filter(t => t.status === 'in_progress');
    if (tabValue === 3) return tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    return tickets;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Support Tickets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage customer support requests and inquiries
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadTickets}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 120 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight={700}>
              {tickets.filter(t => t.status === 'open').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Open</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 120 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {tickets.filter(t => t.status === 'in_progress').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">In Progress</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 120 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" fontWeight={700}>
              {tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">High Priority</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 120 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Resolved</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All (${tickets.length})`} />
          <Tab label={`Open (${tickets.filter(t => t.status === 'open').length})`} />
          <Tab label={`In Progress (${tickets.filter(t => t.status === 'in_progress').length})`} />
          <Tab label={`Resolved (${tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})`} />
        </Tabs>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Responses</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : getFilteredTickets().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No tickets found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredTickets().map((ticket) => (
                  <TableRow key={ticket.id} hover sx={{ cursor: 'pointer' }} onClick={() => {
                    setSelectedTicket(ticket);
                    setDetailDialogOpen(true);
                  }}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        #{ticket.id.slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500} sx={{ maxWidth: 250 }} noWrap>
                        {ticket.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={ticket.priority === 'urgent' ? <Flag /> : undefined}
                        label={ticket.priority}
                        color={getPriorityColor(ticket.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.status.replace('_', ' ')}
                        color={getStatusColor(ticket.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.responses?.length || 0}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(ticket.created_at)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                        setDetailDialogOpen(true);
                      }}>
                        View
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
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Ticket #{selectedTicket?.id.slice(-8)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTicket?.created_at && formatDate(selectedTicket.created_at)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={selectedTicket?.priority}
                color={getPriorityColor(selectedTicket?.priority || '') as any}
                size="small"
              />
              <Chip
                label={selectedTicket?.status.replace('_', ' ')}
                color={getStatusColor(selectedTicket?.status || '') as any}
                size="small"
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Ticket Info */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {selectedTicket?.subject}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {selectedTicket?.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip label={`Category: ${selectedTicket?.category}`} size="small" variant="outlined" />
              <Chip label={`User: ${selectedTicket?.user_id?.slice(0, 12)}...`} size="small" variant="outlined" />
            </Box>
          </Paper>

          {/* Status Actions */}
          <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ mr: 1, alignSelf: 'center' }}>Change Status:</Typography>
            <Button
              size="small"
              variant={selectedTicket?.status === 'open' ? 'contained' : 'outlined'}
              color="warning"
              onClick={() => handleUpdateStatus('open')}
              disabled={actionLoading}
            >
              Open
            </Button>
            <Button
              size="small"
              variant={selectedTicket?.status === 'in_progress' ? 'contained' : 'outlined'}
              color="info"
              onClick={() => handleUpdateStatus('in_progress')}
              disabled={actionLoading}
            >
              In Progress
            </Button>
            <Button
              size="small"
              variant={selectedTicket?.status === 'resolved' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => handleUpdateStatus('resolved')}
              disabled={actionLoading}
            >
              Resolved
            </Button>
            <Button
              size="small"
              variant={selectedTicket?.status === 'closed' ? 'contained' : 'outlined'}
              onClick={() => handleUpdateStatus('closed')}
              disabled={actionLoading}
            >
              Closed
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Conversation Thread */}
          <Typography variant="subtitle2" gutterBottom>
            Conversation ({selectedTicket?.responses?.length || 0} responses)
          </Typography>

          <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper' }}>
            {selectedTicket?.responses?.length === 0 && (
              <ListItem>
                <ListItemText
                  primary={<Typography color="text.secondary">No responses yet</Typography>}
                />
              </ListItem>
            )}
            {selectedTicket?.responses?.map((response, index) => (
              <ListItem
                key={response.id || index}
                alignItems="flex-start"
                sx={{
                  bgcolor: response.is_internal ? 'warning.lighter' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: response.is_internal ? 'warning.main' : 'primary.main' }}>
                    <SupportAgent />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={500}>{response.admin_name}</Typography>
                      {response.is_internal && (
                        <Chip label="Internal Note" size="small" color="warning" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        {response.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(response.created_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Response Input */}
          <Typography variant="subtitle2" gutterBottom>
            Add Response
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Type your response..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FormControl size="small">
              <Select
                value={isInternalNote ? 'internal' : 'public'}
                onChange={(e) => setIsInternalNote(e.target.value === 'internal')}
              >
                <MenuItem value="public">Public Response</MenuItem>
                <MenuItem value="internal">Internal Note</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSendResponse}
              disabled={actionLoading || !responseText.trim()}
            >
              {actionLoading ? 'Sending...' : 'Send Response'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
