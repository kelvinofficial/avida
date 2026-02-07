'use client';

import { Box, Typography, Card, CardContent } from '@mui/material';
import { Construction } from '@mui/icons-material';

export default function TicketsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Support Tickets
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Construction sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Ticket system coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Handle customer support requests
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
