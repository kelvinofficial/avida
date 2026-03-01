# Backend Deployment Instructions for New Emergent Agent

## Quick Deploy Command

Run this single command to deploy the full backend:

```bash
curl -sSL "https://auth-ui-template.preview.emergentagent.com/deploy-package/deploy.sh" | bash
```

## Manual Deployment Steps

If you prefer step-by-step:

### Step 1: Download Backend Package
```bash
cd /tmp
curl -L -o backend-full.zip "https://auth-ui-template.preview.emergentagent.com/deploy-package/backend-full.zip"
```

### Step 2: Backup Existing Backend
```bash
cp -r /app/backend /app/backend_backup_$(date +%Y%m%d)
```

### Step 3: Extract and Deploy
```bash
# Preserve your .env
cp /app/backend/.env /tmp/env_backup

# Extract new backend
unzip -o /tmp/backend-full.zip -d /app/

# Restore .env
cp /tmp/env_backup /app/backend/.env
```

### Step 4: Install Dependencies
```bash
cd /app/backend
pip install -r requirements.txt
```

### Step 5: Restart Backend
```bash
sudo supervisorctl restart backend
```

### Step 6: Verify
```bash
# Wait 5 seconds then test
sleep 5
curl http://localhost:8001/api/health

# Test new endpoints
curl http://localhost:8001/api/badges/leaderboard
curl http://localhost:8001/api/vouchers/available
```

## New Endpoints Added

After deployment, these endpoints will be available:

| Endpoint | Description |
|----------|-------------|
| `/api/users` | User management |
| `/api/badges` | Badge system |
| `/api/vouchers` | Voucher system |
| `/api/banners` | Banner ads |
| `/api/escrow` | Escrow transactions |
| `/api/business-profiles` | Business profiles |
| `/api/verification` | ID verification |
| `/api/executive-summary` | Executive reports |
| `/api/compliance` | Compliance center |
| `/api/cohort-analytics` | Cohort analysis |
| `/api/commission` | Commission system |
| `/api/premium-subscription` | Premium features |
| `/api/team` | Team workflow |
| `/api/invoices-pdf` | Invoice generation |
| `/api/moderation` | Content moderation |
| `/api/polls` | User polls |
| `/api/streaks` | User streaks |
| `/api/ai-analyzer` | AI listing analyzer |
| `/api/seo-analytics` | SEO analytics |
| ... and 40+ more routes |

## Environment Variables Required

Ensure your `/app/backend/.env` has these:

```env
MONGO_URL=mongodb+srv://...
DB_NAME=classifieds_db
JWT_SECRET_KEY=your-secret-key
SENDGRID_API_KEY=your-sendgrid-key (optional)
STRIPE_SECRET_KEY=your-stripe-key (optional)
OPENAI_API_KEY=your-openai-key (optional, for AI features)
```

## Troubleshooting

If backend fails to start:
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Common fixes:
pip install -r /app/backend/requirements.txt --upgrade
sudo supervisorctl restart backend
```
