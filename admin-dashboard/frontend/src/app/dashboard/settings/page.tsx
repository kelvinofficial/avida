'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function SettingsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Settings
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Construction sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Settings page coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure app settings, feature flags, and more
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
