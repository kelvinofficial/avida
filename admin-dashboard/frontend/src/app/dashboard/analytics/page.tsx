'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function AnalyticsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Analytics & Insights
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Construction sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Advanced analytics coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deep insights into marketplace performance
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
