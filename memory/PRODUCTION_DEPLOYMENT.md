# Production Deployment Guide

This document outlines the API keys and configurations needed for production deployment.

## Required API Keys

### 1. SMS/WhatsApp Notifications

#### Twilio (Primary Provider)
```env
# In /app/backend/.env
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
TWILIO_WHATSAPP_NUMBER=+14155238886  # Your WhatsApp Business number
```

**Where to get:**
- Sign up at https://www.twilio.com
- Account SID & Auth Token: Dashboard → Account Info
- Phone Number: Buy a number or use verified sender
- WhatsApp: Apply for WhatsApp Business API access

#### Africa's Talking (African Countries)
```env
# In /app/backend/.env
AFRICASTALKING_USERNAME=your_production_username
AFRICASTALKING_API_KEY=your_production_api_key
AFRICASTALKING_SENDER_ID=YOUR_BRAND_NAME
```

**Where to get:**
- Sign up at https://africastalking.com
- API Key: Dashboard → Settings → API Key
- Sender ID: Apply through their dashboard (requires verification)

---

### 2. Payment Gateways

#### Stripe
```env
# In /app/backend/.env
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Where to get:**
- Sign up at https://stripe.com
- Live keys: Dashboard → Developers → API keys
- Webhook secret: Dashboard → Developers → Webhooks → Add endpoint

**Webhook URL to configure:**
```
https://your-domain.com/api/payment/webhook/stripe
```

#### PayPal
```env
# In /app/backend/.env
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_SECRET=your_live_secret
PAYPAL_MODE=live  # Change from 'sandbox' to 'live'
```

**Where to get:**
- Sign up at https://developer.paypal.com
- Live credentials: My Apps & Credentials → Live tab → Create App

---

### 3. AI Services (Emergent LLM Key)

The AI Listing Analyzer uses the Emergent LLM Key which provides access to:
- OpenAI GPT-4o (Vision Analysis)
- Claude Sonnet 4.5 (Text Generation)

```env
# In /app/backend/.env
EMERGENT_LLM_KEY=sk-emergent-xxxxxxxxxxxxx
```

**Note:** The Emergent LLM Key is already configured. For production:
- Go to Profile → Universal Key → Add Balance
- Enable auto top-up for uninterrupted service

---

### 4. Mobile Money (M-Pesa / Vodacom)

#### Flutterwave
```env
# In /app/backend/.env
FW_SECRET_KEY=your_live_secret_key
FW_PUBLIC_KEY=your_live_public_key
FW_ENCRYPTION_KEY=your_encryption_key
```

**Where to get:**
- Sign up at https://flutterwave.com
- Keys: Dashboard → Settings → API Keys

---

## Environment Files Summary

### Backend (.env)
Location: `/app/backend/.env`

```env
# Database (DO NOT CHANGE)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="classifieds_db"

# AI Services
EMERGENT_LLM_KEY=sk-emergent-xxxxxxxxxxxxx

# Payment - Stripe
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Payment - PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
PAYPAL_SECRET=xxxxxxxxxxxxx
PAYPAL_MODE=live

# Payment - Flutterwave (Mobile Money)
FW_SECRET_KEY=xxxxxxxxxxxxx
FW_PUBLIC_KEY=xxxxxxxxxxxxx
FW_ENCRYPTION_KEY=xxxxxxxxxxxxx

# SMS - Africa's Talking
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=xxxxxxxxxxxxx
AFRICASTALKING_SENDER_ID=YOUR_BRAND

# SMS/WhatsApp - Twilio
TWILIO_ACCOUNT_SID=xxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886

# App URLs
APP_BASE_URL=https://your-production-domain.com
```

---

## Pre-Deployment Checklist

### Security
- [ ] Change all sandbox/test keys to production keys
- [ ] Update APP_BASE_URL to production domain
- [ ] Verify webhook URLs are configured in payment providers
- [ ] Enable HTTPS for all endpoints

### SMS/WhatsApp
- [ ] Register sender IDs with carriers (Africa's Talking)
- [ ] Apply for WhatsApp Business API (Twilio)
- [ ] Test SMS delivery to target countries
- [ ] Configure fallback providers

### Payments
- [ ] Complete Stripe account verification
- [ ] Complete PayPal business account setup
- [ ] Configure webhooks for payment confirmations
- [ ] Test small transactions before going live

### AI Features
- [ ] Add balance to Emergent LLM Key
- [ ] Enable auto top-up
- [ ] Configure rate limits in admin dashboard
- [ ] Review AI system prompts for production use

---

## Admin Dashboard Settings

After deployment, configure these in Admin Dashboard → Settings:

### AI Analyzer (`/dashboard/ai-analyzer`)
- Enable/disable AI analysis globally
- Set daily usage limits per user tier
- Enable/disable price suggestions
- Configure blocked terms for safety

### SMS/WhatsApp (`/dashboard/sms-notifications`)
- Manage notification templates
- View notification logs
- Manage transport partners

### Escrow (`/dashboard/escrow`)
- Verify sellers for online selling
- Manage disputes
- Configure fees and delivery options

---

## Monitoring

### Logs to Monitor
- `/var/log/supervisor/backend.err.log` - Backend errors
- `/var/log/supervisor/backend.out.log` - Backend requests
- Notification logs in Admin Dashboard
- AI usage analytics in Admin Dashboard

### Key Metrics
- SMS delivery rates
- Payment success rates
- AI analysis acceptance rates
- API response times

---

## Support

For issues with:
- **Emergent LLM Key:** Profile → Universal Key → Support
- **Stripe:** https://support.stripe.com
- **Twilio:** https://support.twilio.com
- **Africa's Talking:** https://help.africastalking.com
