import Stripe from 'stripe';

// Stripe configuration
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Plan configurations
export const PLANS = {
  free: {
    name: 'Free Plan',
    priceMonthly: 0,
    creditsMonthly: 5,
    stripeProductId: null,
    stripePriceId: null,
    features: {
      ai_builder: true,
      basic_support: false,
    },
  },
  pro: {
    name: 'Pro Plan',
    priceMonthly: 2000, // €20.00 in cents
    creditsMonthly: 100,
    stripeProductId: 'prod_SeQcDaKIsNyqND',
    stripePriceId: 'price_1Rj7lWRv5cVaeSzxWDOvwU0E',
    features: {
      ai_builder: true,
      priority_support: true,
      advanced_features: true,
    },
  },
  team: {
    name: 'Team Plan',
    priceMonthly: 5000, // €50.00 in cents
    creditsMonthly: 400,
    stripeProductId: 'prod_SeQcqHUMMoVaSv',
    stripePriceId: 'price_1Rj7leRv5cVaeSzx4kAEEI5t',
    features: {
      ai_builder: true,
      priority_support: true,
      advanced_features: true,
      team_collaboration: true,
    },
  },
  enterprise: {
    name: 'Enterprise Plan',
    priceMonthly: 20000, // €200.00 in cents
    creditsMonthly: 2000,
    stripeProductId: 'prod_SeQduXvVSzMI8g',
    stripePriceId: 'price_1Rj7loRv5cVaeSzx59JS9yY8',
    features: {
      ai_builder: true,
      dedicated_support: true,
      advanced_features: true,
      team_collaboration: true,
      custom_integrations: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Environment validation
export function validateStripeConfig() {
  const requiredVars = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing required Stripe environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// Helper functions
export function getPlan(planType: PlanType) {
  return PLANS[planType];
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount / 100);
}

export function getPlanByStripePriceId(priceId: string): PlanType | null {
  for (const [planType, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId === priceId) {
      return planType as PlanType;
    }
  }
  return null;
}

// Webhook event types
export const STRIPE_WEBHOOK_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'checkout.session.completed',
] as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[number];
