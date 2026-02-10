'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Badge,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Add,
  Delete,
  Edit,
  People,
  Refresh,
  Preview,
  Save,
  FilterList,
  GroupWork,
  CheckCircle,
  Cancel,
  Info,
  PlayArrow,
} from '@mui/icons-material';

const API_BASE = process.env.NEXT_PUBLIC_MAIN_API_URL || '';

// Available operators for segmentation rules
const OPERATORS = [
  { value: 'equals', label: 'Equals', icon: '=' },
  { value: 'not_equals', label: 'Not Equals', icon: '≠' },
  { value: 'greater_than', label: 'Greater Than', icon: '>' },
  { value: 'less_than', label: 'Less Than', icon: '<' },
  { value: 'contains', label: 'Contains', icon: '∈' },
  { value: 'in_list', label: 'In List', icon: '[]' },
  { value: 'between', label: 'Between', icon: '↔' },
  { value: 'exists', label: 'Exists', icon: '∃' },
  { value: 'not_exists', label: 'Not Exists', icon: '∄' },
];

// Common fields for segmentation
const COMMON_FIELDS = [
  { value: 'total_purchases', label: 'Total Purchases', type: 'number' },
  { value: 'total_views', label: 'Total Views', type: 'number' },
  { value: 'total_saves', label: 'Total Saves', type: 'number' },
  { value: 'listings_count', label: 'Listings Count', type: 'number' },
  { value: 'last_activity', label: 'Last Activity', type: 'date' },
  { value: 'created_at', label: 'Registration Date', type: 'date' },
  { value: 'email_verified', label: 'Email Verified', type: 'boolean' },
  { value: 'push_enabled', label: 'Push Enabled', type: 'boolean' },
  { value: 'preferred_language', label: 'Preferred Language', type: 'string' },
  { value: 'location', label: 'Location', type: 'string' },
];

interface SegmentRule {
  field: string;
  operator: string;
  value: any;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  rules: SegmentRule[];
  logic: 'AND' | 'OR';
  estimated_users: number;
  is_active: boolean;
  is_predefined?: boolean;
  last_calculated?: string;
  created_at?: string;
}

export default function SegmentBuilderPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ users: any[]; total: number } | null>(null);
  const [previewingSegmentId, setPreviewingSegmentId] = useState<string | null>(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/smart-notifications/admin/segments`);
      if (res.ok) {
        setSegments(await res.json());
      }
    } catch (err) {
      setError('Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  const saveSegment = async (segmentData: Partial<Segment>) => {
    try {
      const url = editingSegment && !editingSegment.is_predefined
        ? `${API_BASE}/smart-notifications/admin/segments/${editingSegment.id}`
        : `${API_BASE}/smart-notifications/admin/segments`;
      
      const res = await fetch(url, {
        method: editingSegment && !editingSegment.is_predefined ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(segmentData),
      });
      
      if (res.ok) {
        setDialogOpen(false);
        setEditingSegment(null);
        fetchSegments();
        setSuccess('Segment saved!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save segment');
    }
  };

  const deleteSegment = async (segmentId: string) => {
    if (!confirm('Delete this segment?')) return;
    try {
      await fetch(`${API_BASE}/smart-notifications/admin/segments/${segmentId}`, { method: 'DELETE' });
      fetchSegments();
      setSuccess('Segment deleted');
    } catch (err) {
      setError('Failed to delete segment');
    }
  };

  const previewSegment = async (segmentId: string) => {
    setPreviewingSegmentId(segmentId);
    try {
      const res = await fetch(`${API_BASE}/smart-notifications/admin/segments/${segmentId}/preview?limit=20`);
      if (res.ok) {
        setPreviewData(await res.json());
        setPreviewDialogOpen(true);
      }
    } catch (err) {
      setError('Failed to preview segment');
    } finally {
      setPreviewingSegmentId(null);
    }
  };

  const recalculateSegment = async (segmentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/smart-notifications/admin/segments/${segmentId}/recalculate`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchSegments();
        setSuccess('Segment recalculated');
      }
    } catch (err) {
      setError('Failed to recalculate');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const predefinedSegments = segments.filter(s => s.is_predefined);
  const customSegments = segments.filter(s => !s.is_predefined);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupWork sx={{ color: '#2E7D32' }} />
            Segment Builder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage user segments for targeted notifications
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchSegments}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingSegment(null); setDialogOpen(true); }}>
            Create Segment
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Predefined Segments */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList /> Predefined Segments
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {predefinedSegments.map((segment) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={segment.id}>
            <Card sx={{ height: '100%', bgcolor: '#F5F5F5' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{segment.name}</Typography>
                  <Chip label="Default" size="small" color="default" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {segment.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge badgeContent={segment.estimated_users} color="primary" max={9999}>
                    <People sx={{ color: '#666' }} />
                  </Badge>
                  <Box>
                    <Tooltip title="Preview Users">
                      <IconButton size="small" onClick={() => previewSegment(segment.id)} disabled={previewingSegmentId === segment.id}>
                        {previewingSegmentId === segment.id ? <CircularProgress size={16} /> : <Preview />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recalculate">
                      <IconButton size="small" onClick={() => recalculateSegment(segment.id)}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Custom Segments */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupWork /> Custom Segments
      </Typography>
      {customSegments.length === 0 ? (
        <Alert severity="info">
          No custom segments yet. Click "Create Segment" to build your first targeted audience.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Rules</TableCell>
                <TableCell>Logic</TableCell>
                <TableCell align="center">Users</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customSegments.map((segment) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <Typography fontWeight="bold">{segment.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                      {segment.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {segment.rules?.slice(0, 3).map((rule, i) => (
                        <Chip
                          key={i}
                          label={`${rule.field} ${OPERATORS.find(o => o.value === rule.operator)?.icon || rule.operator} ${typeof rule.value === 'object' ? JSON.stringify(rule.value) : rule.value}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {(segment.rules?.length || 0) > 3 && (
                        <Chip label={`+${segment.rules!.length - 3} more`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={segment.logic} size="small" color={segment.logic === 'AND' ? 'primary' : 'secondary'} />
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="bold">{segment.estimated_users?.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={segment.is_active ? <CheckCircle /> : <Cancel />}
                      label={segment.is_active ? 'Active' : 'Inactive'}
                      color={segment.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Preview"><IconButton size="small" onClick={() => previewSegment(segment.id)}><Preview /></IconButton></Tooltip>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditingSegment(segment); setDialogOpen(true); }}><Edit /></IconButton></Tooltip>
                    <Tooltip title="Recalculate"><IconButton size="small" onClick={() => recalculateSegment(segment.id)}><Refresh /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => deleteSegment(segment.id)}><Delete /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Segment Builder Dialog */}
      <SegmentBuilderDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingSegment(null); }}
        segment={editingSegment}
        onSave={saveSegment}
      />

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Segment Preview</DialogTitle>
        <DialogContent>
          {previewData && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Total matching users: <strong>{previewData.total.toLocaleString()}</strong>
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.users.map((user, i) => (
                      <TableRow key={i}>
                        <TableCell><Typography variant="caption">{user.user_id}</Typography></TableCell>
                        <TableCell>{user.name || '-'}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {previewData.total > previewData.users.length && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing {previewData.users.length} of {previewData.total} users
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Segment Builder Dialog Component
function SegmentBuilderDialog({
  open,
  onClose,
  segment,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  segment: Segment | null;
  onSave: (data: Partial<Segment>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<SegmentRule[]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (segment) {
      setName(segment.name);
      setDescription(segment.description || '');
      setLogic(segment.logic);
      setRules(segment.rules || []);
      setIsActive(segment.is_active);
    } else {
      setName('');
      setDescription('');
      setLogic('AND');
      setRules([{ field: 'total_purchases', operator: 'greater_than', value: 0 }]);
      setIsActive(true);
    }
  }, [segment, open]);

  const addRule = () => {
    setRules([...rules, { field: 'total_views', operator: 'greater_than', value: 0 }]);
  };

  const updateRule = (index: number, field: keyof SegmentRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      logic,
      rules,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {segment?.is_predefined ? 'View Segment' : segment ? 'Edit Segment' : 'Create Segment'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Segment Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={segment?.is_predefined}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Logic</InputLabel>
              <Select value={logic} onChange={(e) => setLogic(e.target.value as 'AND' | 'OR')} label="Logic" disabled={segment?.is_predefined}>
                <MenuItem value="AND">AND - All rules must match</MenuItem>
                <MenuItem value="OR">OR - Any rule can match</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={segment?.is_predefined}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            Rules
          </Typography>
          {!segment?.is_predefined && (
            <Button startIcon={<Add />} onClick={addRule} size="small">
              Add Rule
            </Button>
          )}
        </Box>

        {rules.length === 0 ? (
          <Alert severity="info">No rules defined. This segment will match all users.</Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rules.map((rule, index) => (
              <Box key={index}>
                {index > 0 && (
                  <Box sx={{ textAlign: 'center', my: 1 }}>
                    <Chip label={logic} color={logic === 'AND' ? 'primary' : 'secondary'} size="small" />
                  </Box>
                )}
                <Paper sx={{ p: 2, bgcolor: '#fafafa' }} variant="outlined">
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={rule.field}
                          onChange={(e) => updateRule(index, 'field', e.target.value)}
                          label="Field"
                          disabled={segment?.is_predefined}
                        >
                          {COMMON_FIELDS.map((f) => (
                            <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                          ))}
                          <MenuItem value="custom">Custom Field...</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={rule.operator}
                          onChange={(e) => updateRule(index, 'operator', e.target.value)}
                          label="Operator"
                          disabled={segment?.is_predefined}
                        >
                          {OPERATORS.map((op) => (
                            <MenuItem key={op.value} value={op.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontFamily: 'monospace', minWidth: 20 }}>{op.icon}</Typography>
                                {op.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      {rule.operator === 'exists' || rule.operator === 'not_exists' ? (
                        <Typography color="text.secondary" sx={{ py: 1 }}>No value needed</Typography>
                      ) : rule.operator === 'between' ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Min"
                            type="number"
                            value={Array.isArray(rule.value) ? rule.value[0] : ''}
                            onChange={(e) => updateRule(index, 'value', [parseInt(e.target.value) || 0, Array.isArray(rule.value) ? rule.value[1] : 0])}
                            disabled={segment?.is_predefined}
                          />
                          <TextField
                            size="small"
                            label="Max"
                            type="number"
                            value={Array.isArray(rule.value) ? rule.value[1] : ''}
                            onChange={(e) => updateRule(index, 'value', [Array.isArray(rule.value) ? rule.value[0] : 0, parseInt(e.target.value) || 0])}
                            disabled={segment?.is_predefined}
                          />
                        </Box>
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          value={rule.value}
                          onChange={(e) => {
                            const fieldType = COMMON_FIELDS.find(f => f.value === rule.field)?.type;
                            let val: any = e.target.value;
                            if (fieldType === 'number') val = parseInt(e.target.value) || 0;
                            if (fieldType === 'boolean') val = e.target.value === 'true';
                            updateRule(index, 'value', val);
                          }}
                          disabled={segment?.is_predefined}
                        />
                      )}
                    </Grid>
                    {!segment?.is_predefined && (
                      <Grid size={{ xs: 12, sm: 1 }}>
                        <IconButton color="error" onClick={() => removeRule(index)} disabled={rules.length <= 1}>
                          <Delete />
                        </IconButton>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {!segment?.is_predefined && (
          <Button variant="contained" onClick={handleSave} disabled={!name}>
            <Save sx={{ mr: 1 }} /> Save Segment
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
