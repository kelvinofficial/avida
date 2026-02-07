'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function ReportsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Reports & Moderation
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Construction sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Reports inbox coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and resolve user reports
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
