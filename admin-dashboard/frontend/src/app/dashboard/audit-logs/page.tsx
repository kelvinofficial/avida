'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Refresh,
  History,
  Person,
  Edit,
  Delete,
  Add,
  Visibility,
  FilterList,
  Info,
  Computer,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getAuditLogs({
        page: page + 1,
        limit: rowsPerPage,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
      });
      setLogs(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, actionFilter, entityFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Add fontSize="small" color="success" />;
      case 'update':
        return <Edit fontSize="small" color="info" />;
      case 'delete':
        return <Delete fontSize="small" color="error" />;
      default:
        return <History fontSize="small" color="action" />;
    }
  };

  const getActionColor = (action: string): 'success' | 'info' | 'error' | 'warning' | 'default' => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'error';
      case 'login':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const formatEntityType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // Get unique actions and entity types from loaded logs for filters
  const uniqueActions = [...new Set(logs.map((log) => log.action))];
  const uniqueEntityTypes = [...new Set(logs.map((log) => log.entity_type))];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Audit Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track all admin actions and system changes
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadLogs}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="text.primary" fontWeight={700}>
              {total.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Logs
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {logs.filter((l) => l.action === 'create').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Creates (Page)
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" fontWeight={700}>
              {logs.filter((l) => l.action === 'update').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updates (Page)
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" fontWeight={700}>
              {logs.filter((l) => l.action === 'delete').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Deletes (Page)
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterList color="action" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={actionFilter}
                label="Action"
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={entityFilter}
                label="Entity Type"
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="listing">Listing</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="categories">Categories (Bulk)</MenuItem>
                <MenuItem value="report">Report</MenuItem>
                <MenuItem value="ticket">Ticket</MenuItem>
                <MenuItem value="settings">Settings</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            {(actionFilter || entityFilter) && (
              <Button
                size="small"
                onClick={() => {
                  setActionFilter('');
                  setEntityFilter('');
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Entity ID</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell align="right">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <History sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                    <Typography color="text.secondary">No audit logs found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Tooltip title={formatDate(log.timestamp)} placement="top">
                        <Typography variant="body2">{formatRelativeTime(log.timestamp)}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {log.admin_email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {log.admin_id.slice(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getActionIcon(log.action)}
                        label={log.action.toUpperCase()}
                        color={getActionColor(log.action)}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatEntityType(log.entity_type)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                        {log.entity_id === 'bulk' ? 'Bulk Operation' : log.entity_id.slice(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Computer fontSize="small" color="action" />
                        <Typography variant="body2">{log.ip_address || 'N/A'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewDetails(log)}>
                        <Visibility fontSize="small" />
                      </IconButton>
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
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Log Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info color="primary" />
            <Typography variant="h6">Audit Log Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              {/* Basic Info */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Log ID
                    </Typography>
                    <Typography fontFamily="monospace" fontSize={12}>
                      {selectedLog.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Timestamp
                    </Typography>
                    <Typography>{formatDate(selectedLog.timestamp)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Admin
                    </Typography>
                    <Typography>{selectedLog.admin_email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Admin ID
                    </Typography>
                    <Typography fontFamily="monospace" fontSize={12}>
                      {selectedLog.admin_id}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Action Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Action
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip
                    icon={getActionIcon(selectedLog.action)}
                    label={selectedLog.action.toUpperCase()}
                    color={getActionColor(selectedLog.action)}
                  />
                  <Typography variant="body1">on</Typography>
                  <Chip label={formatEntityType(selectedLog.entity_type)} variant="outlined" />
                </Box>
              </Box>

              {/* Entity Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Entity ID
                </Typography>
                <Paper sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                  <Typography fontFamily="monospace" fontSize={13}>
                    {selectedLog.entity_id}
                  </Typography>
                </Paper>
              </Box>

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Changes / Details
                  </Typography>
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: 'grey.900',
                      color: 'grey.100',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}

              {/* Request Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    IP Address
                  </Typography>
                  <Typography fontFamily="monospace">{selectedLog.ip_address || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    User Agent
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      maxHeight: 60,
                      overflow: 'auto',
                    }}
                  >
                    {selectedLog.user_agent || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
