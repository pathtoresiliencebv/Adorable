# Stripe Setup en Configuratie

## 🔧 **Environment Variables**

### **Stripe Configuration**

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Test key voor development
STRIPE_PUBLISHABLE_KEY=pk_test_... # Public key voor frontend
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook secret

# Stripe Product IDs
STRIPE_PRO_PRODUCT_ID=prod_SeQcDaKIsNyqND
STRIPE_TEAM_PRODUCT_ID=prod_SeQcqHUMMoVaSv
STRIPE_ENTERPRISE_PRODUCT_ID=prod_SeQduXvVSzMI8g

# Stripe Price IDs
STRIPE_PRO_PRICE_ID=price_1Rj7lWRv5cVaeSzxWDOvwU0E
STRIPE_TEAM_PRICE_ID=price_1Rj7leRv5cVaeSzx4kAEEI5t
STRIPE_ENTERPRISE_PRICE_ID=price_1Rj7loRv5cVaeSzx59JS9yY8

# Billing Configuration
BILLING_CURRENCY=EUR
BILLING_SUCCESS_URL=https://qreatify.dev/billing/success
BILLING_CANCEL_URL=https://qreatify.dev/billing/cancel
```

## 📦 **Package Installation**

```bash
npm install stripe @stripe/stripe-js
```

## 🏗️ **Stripe Configuration Files**

### **1. Stripe Client Configuration**

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const stripeConfig = {
  currency: process.env.BILLING_CURRENCY || 'EUR',
  successUrl: process.env.BILLING_SUCCESS_URL || 'http://localhost:3000/billing/success',
  cancelUrl: process.env.BILLING_CANCEL_URL || 'http://localhost:3000/billing/cancel',
  products: {
    pro: {
      productId: process.env.STRIPE_PRO_PRODUCT_ID!,
      priceId: process.env.STRIPE_PRO_PRICE_ID!,
    },
    team: {
      productId: process.env.STRIPE_TEAM_PRODUCT_ID!,
      priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    },
    enterprise: {
      productId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID!,
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    },
  },
};
```

### **2. Stripe Types**

```typescript
// src/types/stripe.ts
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
      };
    }>;
  };
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  customer: string;
  subscription: string;
  status: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  stripePriceId: string;
}
```

## 🔄 **Webhook Setup**

### **1. Webhook Endpoint**

```typescript
// src/app/api/billing/webhook/route.ts
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeWebhook } from '@/lib/billing/webhook-handler';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await handleStripeWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }
}
```

### **2. Webhook Handler**

```typescript
// src/lib/billing/webhook-handler.ts
import { stripe } from '@/lib/stripe';
import { db } from '@/db/schema';
import { subscriptions, credits, billingEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export async function handleStripeWebhook(event: Stripe.Event) {
  const eventId = event.id;
  
  // Check if event already processed
  const existingEvent = await db
    .select()
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, eventId))
    .limit(1);

  if (existingEvent.length > 0) {
    console.log(`Event ${eventId} already processed`);
    return;
  }

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Log event
  await db.insert(billingEvents).values({
    stripeEventId: eventId,
    eventType: event.type,
    metadata: event.data.object,
    processedAt: new Date(),
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  
  // Find user by email
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, customer.email!))
    .limit(1);

  if (user.length === 0) {
    console.error(`User not found for customer ${customerId}`);
    return;
  }

  const userId = user[0].id;
  const priceId = subscription.items.data[0].price.id;
  
  // Determine plan type
  const planType = getPlanTypeFromPriceId(priceId);
  
  // Create subscription record
  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    planType,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Allocate credits
  await allocateCreditsForPlan(userId, planType);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  // Update subscription status
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  // Refresh credits for the month
  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (subscription.length > 0) {
    await allocateCreditsForPlan(subscription[0].userId, subscription[0].planType);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
}

function getPlanTypeFromPriceId(priceId: string): string {
  const config = {
    [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
    [process.env.STRIPE_TEAM_PRICE_ID!]: 'team',
    [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: 'enterprise',
  };
  
  return config[priceId] || 'free';
}

async function allocateCreditsForPlan(userId: string, planType: string) {
  const planCredits = {
    free: 5,
    pro: 100,
    team: 400,
    enterprise: 2000,
  };

  const credits = planCredits[planType as keyof typeof planCredits] || 5;

  await db
    .insert(credits)
    .values({
      userId,
      balance: credits,
      totalEarned: credits,
      lastRefreshDate: new Date(),
    })
    .onConflictDoUpdate({
      target: credits.userId,
      set: {
        balance: credits,
        totalEarned: credits + credits.totalEarned,
        lastRefreshDate: new Date(),
        updatedAt: new Date(),
      },
    });
}
```

## 🎯 **Stripe Dashboard Setup**

### **1. Product Configuration**

In je Stripe Dashboard:

1. **Ga naar Products**
2. **Maak 3 producten aan:**

#### **Pro Plan**
- **Name**: Pro Plan
- **Product ID**: `prod_SeQcDaKIsNyqND`
- **Price**: €20/month
- **Price ID**: `price_1Rj7lWRv5cVaeSzxWDOvwU0E`

#### **Team Plan**
- **Name**: Team Plan
- **Product ID**: `prod_SeQcqHUMMoVaSv`
- **Price**: €50/month
- **Price ID**: `price_1Rj7leRv5cVaeSzx4kAEEI5t`

#### **Enterprise Plan**
- **Name**: Enterprise Plan
- **Product ID**: `prod_SeQduXvVSzMI8g`
- **Price**: €200/month
- **Price ID**: `price_1Rj7loRv5cVaeSzx59JS9yY8`

### **2. Webhook Configuration**

1. **Ga naar Webhooks**
2. **Maak nieuwe webhook aan:**
   - **Endpoint URL**: `https://qreatify.dev/api/billing/webhook`
   - **Events to send:**
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Kopieer webhook secret** naar environment variables

### **3. Customer Portal Setup**

1. **Ga naar Settings → Customer Portal**
2. **Configureer:**
   - **Business information**
   - **Branding**
   - **Product catalog**
   - **Payment method updates**
   - **Subscription cancellation**

## 🔧 **Billing Service**

```typescript
// src/lib/billing/billing-service.ts
import { stripe, stripeConfig } from '@/lib/stripe';
import { db } from '@/db/schema';
import { users, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class BillingService {
  static async createCheckoutSession(userId: string, planType: string) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const priceId = this.getPriceIdForPlan(planType);
    
    const session = await stripe.checkout.sessions.create({
      customer_email: user[0].email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${stripeConfig.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeConfig.cancelUrl,
      metadata: {
        userId,
        planType,
      },
    });

    return session;
  }

  static async createCustomerPortalSession(userId: string) {
    const subscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (subscription.length === 0) {
      throw new Error('No active subscription found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription[0].stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
    });

    return session;
  }

  static async getSubscription(userId: string) {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
  }

  private static getPriceIdForPlan(planType: string): string {
    const priceIds = {
      pro: stripeConfig.products.pro.priceId,
      team: stripeConfig.products.team.priceId,
      enterprise: stripeConfig.products.enterprise.priceId,
    };

    return priceIds[planType as keyof typeof priceIds];
  }
}
```

## 🧪 **Testing Setup**

### **1. Test Cards**

```typescript
// Test card numbers voor development
const testCards = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient: '4000000000009995',
  expired: '4000000000000069',
};
```

### **2. Webhook Testing**

```bash
# Test webhook locally met Stripe CLI
stripe listen --forward-to localhost:3000/api/billing/webhook
```

---

**Volgende Stappen**: Implementeer credits systeem en frontend billing UI
