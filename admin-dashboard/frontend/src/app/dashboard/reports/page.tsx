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
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Cancel,
  Flag,
  Warning,
  Gavel,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { Report, ReportStatus } from '@/types';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getReports({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
      });
      setReports(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleResolveReport = async () => {
    if (!selectedReport || !newStatus) return;
    setActionLoading(true);
    setError('');
    
    try {
      await api.updateReport(selectedReport.id, newStatus, resolutionNotes);
      setActionDialogOpen(false);
      setSelectedReport(null);
      setNewStatus('');
      setResolutionNotes('');
      await loadReports();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to update report');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_review': return 'info';
      case 'resolved': return 'success';
      case 'dismissed': return 'default';
      case 'escalated': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Flag />;
      case 'in_review': return <Warning />;
      case 'resolved': return <CheckCircle />;
      case 'dismissed': return <Cancel />;
      case 'escalated': return <Gavel />;
      default: return <Flag />;
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and resolve user reports
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadReports}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h4" color="warning.main" fontWeight={700}>
              {reports.filter(r => r.status === 'pending').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Pending</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {reports.filter(r => r.status === 'in_review').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">In Review</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {reports.filter(r => r.status === 'resolved').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">Resolved</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="dismissed">Dismissed</MenuItem>
                <MenuItem value="escalated">Escalated</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report ID</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No reports found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {report.id.slice(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.reason}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
                        {report.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(report.status)}
                        label={report.status.replace('_', ' ')}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(report.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedReport(report);
                          setNewStatus(report.status);
                          setActionDialogOpen(true);
                        }}
                      >
                        Review
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

      {/* Review Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Report</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Report Details</Typography>
            <Typography variant="body2"><strong>Reason:</strong> {selectedReport?.reason}</Typography>
            <Typography variant="body2"><strong>Description:</strong> {selectedReport?.description || 'No description'}</Typography>
            <Typography variant="body2"><strong>Created:</strong> {selectedReport?.created_at && formatDate(selectedReport.created_at)}</Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_review">In Review</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="dismissed">Dismissed</MenuItem>
              <MenuItem value="escalated">Escalated</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Resolution Notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Add notes about the resolution..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleResolveReport}
            disabled={actionLoading || !newStatus}
          >
            {actionLoading ? 'Updating...' : 'Update Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
