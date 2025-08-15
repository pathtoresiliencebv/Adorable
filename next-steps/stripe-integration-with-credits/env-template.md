# Stripe Integration Environment Variables Template

Copy these variables to your `.env.local` file and fill in your values:

```env
# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Configuration (if not already set)
DATABASE_URL=postgresql://...

# Optional: Stripe Configuration
STRIPE_API_VERSION=2024-12-18.acacia
STRIPE_CURRENCY=EUR
STRIPE_TIMEZONE=Europe/Amsterdam

# Optional: Credits Configuration
CREDITS_WARNING_THRESHOLD=5
CREDITS_DEFAULT_FREE_PLAN=5
CREDITS_DEFAULT_PRO_PLAN=100
CREDITS_DEFAULT_TEAM_PLAN=400
CREDITS_DEFAULT_ENTERPRISE_PLAN=2000

# Optional: Billing Configuration
BILLING_SUCCESS_URL=http://localhost:3000/billing/success
BILLING_CANCEL_URL=http://localhost:3000/billing/cancel
BILLING_WEBHOOK_ENDPOINT=/api/billing/webhook

# Optional: Monitoring
ENABLE_BILLING_LOGS=true
BILLING_LOG_LEVEL=info
```

## Required Variables

### STRIPE_SECRET_KEY
- **Type**: String
- **Required**: Yes
- **Description**: Your Stripe secret key for server-side operations
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Get it from**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### STRIPE_PUBLISHABLE_KEY
- **Type**: String
- **Required**: Yes
- **Description**: Your Stripe publishable key for client-side operations
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Get it from**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### STRIPE_WEBHOOK_SECRET
- **Type**: String
- **Required**: Yes
- **Description**: Webhook endpoint secret for verifying Stripe webhooks
- **Format**: `whsec_...`
- **Get it from**: [Stripe Dashboard](https://dashboard.stripe.com/webhooks)

## Optional Variables

### App Configuration
- `NEXT_PUBLIC_APP_URL`: Your application's base URL
- `DATABASE_URL`: PostgreSQL connection string (if not already configured)

### Stripe Configuration
- `STRIPE_API_VERSION`: Stripe API version to use (default: 2024-12-18.acacia)
- `STRIPE_CURRENCY`: Currency for payments (default: EUR)
- `STRIPE_TIMEZONE`: Timezone for date handling (default: Europe/Amsterdam)

### Credits Configuration
- `CREDITS_WARNING_THRESHOLD`: Credits threshold for low balance warnings (default: 5)
- `CREDITS_DEFAULT_FREE_PLAN`: Default credits for free plan (default: 5)
- `CREDITS_DEFAULT_PRO_PLAN`: Default credits for pro plan (default: 100)
- `CREDITS_DEFAULT_TEAM_PLAN`: Default credits for team plan (default: 400)
- `CREDITS_DEFAULT_ENTERPRISE_PLAN`: Default credits for enterprise plan (default: 2000)

### Billing Configuration
- `BILLING_SUCCESS_URL`: URL to redirect after successful payment
- `BILLING_CANCEL_URL`: URL to redirect after cancelled payment
- `BILLING_WEBHOOK_ENDPOINT`: Webhook endpoint path (default: /api/billing/webhook)

### Monitoring
- `ENABLE_BILLING_LOGS`: Enable detailed billing logs (default: true)
- `BILLING_LOG_LEVEL`: Log level for billing operations (default: info)

## Example Configuration

```env
# Development Configuration
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/adorable_dev
STRIPE_CURRENCY=EUR
CREDITS_WARNING_THRESHOLD=5
ENABLE_BILLING_LOGS=true

# Production Configuration
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://your-app.com
DATABASE_URL=postgresql://user:password@your-db-host:5432/adorable_prod
STRIPE_CURRENCY=EUR
CREDITS_WARNING_THRESHOLD=10
ENABLE_BILLING_LOGS=false
BILLING_LOG_LEVEL=warn
```

## Stripe Setup Steps

1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
3. **Create Products**: Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
4. **Set up Webhooks**: Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
   - Add endpoint: `https://your-domain.com/api/billing/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
5. **Get Webhook Secret**: Copy the signing secret from your webhook endpoint

## Security Notes

1. **Never commit your Stripe keys** to version control
2. **Use different keys** for development and production
3. **Rotate keys regularly** for security
4. **Monitor webhook events** in Stripe Dashboard
5. **Test webhooks** using Stripe CLI before going live

## Testing

Use Stripe's test mode for development:
- Test card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## Troubleshooting

If you encounter issues:

1. **Check API keys**: Ensure they're correct and have proper permissions
2. **Verify webhook endpoint**: Make sure it's accessible and returns 200
3. **Check webhook events**: Monitor in Stripe Dashboard
4. **Enable debug logs**: Set `ENABLE_BILLING_LOGS=true`
5. **Test with Stripe CLI**: Use `stripe listen` for local webhook testing
