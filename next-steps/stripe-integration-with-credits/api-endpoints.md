# API Endpoints voor Billing & Credits

## 🔗 **Billing API Endpoints**

### **1. Stripe Checkout Session**

```typescript
// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/billing/billing-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { planType } = await req.json();

    if (!planType) {
      return NextResponse.json(
        { error: "Missing plan type" },
        { status: 400 }
      );
    }

    const session = await BillingService.createCheckoutSession(user.id, planType);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **2. Customer Portal Session**

```typescript
// src/app/api/billing/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/billing/billing-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await BillingService.createCustomerPortalSession(user.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **3. Billing History**

```typescript
// src/app/api/billing/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/schema";
import { billingEvents } from "@/db/schema";
import { getUser } from "@stackframe/stack/server";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const events = await db
      .select()
      .from(billingEvents)
      .where(eq(billingEvents.userId, user.id))
      .orderBy(desc(billingEvents.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Billing history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **4. Invoice Download**

```typescript
// src/app/api/billing/invoice/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@stackframe/stack/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const invoice = await stripe.invoices.retrieve(params.id, {
      expand: ['customer'],
    });

    // Verify the invoice belongs to the user
    if (invoice.customer_email !== user.email) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const pdf = await stripe.invoices.retrievePdf(params.id);

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${params.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Invoice download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 💳 **Credits API Endpoints**

### **1. Credits Balance**

```typescript
// src/app/api/credits/balance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const credits = await CreditsService.getCreditsBalance(user.id);
    
    if (!credits) {
      // Create free plan credits for new user
      await CreditsService.addCredits(user.id, 5);
      return NextResponse.json({
        balance: 5,
        totalEarned: 5,
        totalUsed: 0,
        lastRefreshDate: new Date().toISOString(),
      });
    }

    return NextResponse.json(credits);
  } catch (error) {
    console.error("Credits balance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **2. Deduct Credits**

```typescript
// src/app/api/credits/deduct/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { appId, messageLength, creditsToDeduct = 1 } = await req.json();

    if (!appId) {
      return NextResponse.json(
        { error: "Missing app ID" },
        { status: 400 }
      );
    }

    const success = await CreditsService.deductCredits(
      user.id,
      appId,
      creditsToDeduct,
      messageLength
    );

    if (!success) {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS"
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deduct credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **3. Usage Statistics**

```typescript
// src/app/api/credits/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const usage = await CreditsService.getUsageStats(user.id, days);

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **4. Add Credits (Admin)**

```typescript
// src/app/api/credits/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreditsService } from "@/lib/credits/credits-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin (implement your admin check logic)
    const isAdmin = await checkIfAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { userId, creditsToAdd, reason } = await req.json();

    if (!userId || !creditsToAdd) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const success = await CreditsService.addCredits(userId, creditsToAdd);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add credits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  // Implement your admin check logic here
  // This could check a role field in the user table
  return false; // Placeholder
}
```

## 📊 **Subscription API Endpoints**

### **1. Current Subscription**

```typescript
// src/app/api/subscriptions/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscriptions/subscription-service";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await SubscriptionService.getCurrentSubscription(user.id);
    
    if (subscription.length === 0) {
      return NextResponse.json({
        hasSubscription: false,
        planType: 'free',
        status: 'active',
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      ...subscription[0],
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **2. Upgrade Subscription**

```typescript
// src/app/api/subscriptions/upgrade/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscriptions/subscription-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { planType } = await req.json();

    if (!planType) {
      return NextResponse.json(
        { error: "Missing plan type" },
        { status: 400 }
      );
    }

    await SubscriptionService.upgradeSubscription(user.id, planType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **3. Cancel Subscription**

```typescript
// src/app/api/subscriptions/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscriptions/subscription-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await SubscriptionService.cancelSubscription(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### **4. Reactivate Subscription**

```typescript
// src/app/api/subscriptions/reactivate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/subscriptions/subscription-service";
import { getUser } from "@stackframe/stack/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await SubscriptionService.reactivateSubscription(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reactivate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 📈 **Analytics API Endpoints**

### **1. Subscription Analytics**

```typescript
// src/app/api/analytics/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionAnalytics } from "@/lib/subscriptions/subscription-analytics";
import { getUser } from "@stackframe/stack/server";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await checkIfAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const metrics = await SubscriptionAnalytics.getSubscriptionMetrics();
    const churnRate = await SubscriptionAnalytics.getChurnRate(days);
    const planChanges = await SubscriptionAnalytics.getPlanChangeTrends(days);

    return NextResponse.json({
      metrics,
      churnRate,
      planChanges,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  // Implement your admin check logic here
  return false; // Placeholder
}
```

### **2. Credits Analytics**

```typescript
// src/app/api/analytics/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/schema";
import { credits, usageLogs } from "@/db/schema";
import { getUser } from "@stackframe/stack/server";
import { eq, gte, lte, count, sum, avg } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await checkIfAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total credits distributed
    const totalCredits = await db
      .select({ total: sum(credits.totalEarned) })
      .from(credits);

    // Total credits used
    const totalUsed = await db
      .select({ total: sum(credits.totalUsed) })
      .from(credits);

    // Average daily usage
    const avgDailyUsage = await db
      .select({ avg: avg(usageLogs.creditsUsed) })
      .from(usageLogs)
      .where(gte(usageLogs.createdAt, startDate));

    // Low credits users
    const lowCreditsUsers = await db
      .select({ count: count() })
      .from(credits)
      .where(lte(credits.balance, 5));

    return NextResponse.json({
      totalCreditsDistributed: totalCredits[0]?.total || 0,
      totalCreditsUsed: totalUsed[0]?.total || 0,
      averageDailyUsage: avgDailyUsage[0]?.avg || 0,
      lowCreditsUsers: lowCreditsUsers[0]?.count || 0,
    });
  } catch (error) {
    console.error("Credits analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  // Implement your admin check logic here
  return false; // Placeholder
}
```

## 🔧 **Utility API Endpoints**

### **1. Health Check**

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/schema";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    // Check database connection
    await db.execute("SELECT 1");
    
    // Check Stripe connection
    await stripe.paymentMethods.list({ limit: 1 });

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        stripe: "connected",
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

### **2. Webhook Test**

```typescript
// src/app/api/webhook/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { eventType, data } = await req.json();

    // Create a test webhook event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2024-12-18.acacia',
      created: Math.floor(Date.now() / 1000),
      data: data || {},
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: `req_test_${Date.now()}`,
        idempotency_key: null,
      },
      type: eventType || 'customer.subscription.created',
    };

    // Process the test event
    await handleStripeWebhook(testEvent);

    return NextResponse.json({
      success: true,
      eventId: testEvent.id,
      eventType: testEvent.type,
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## 📋 **API Response Formats**

### **Standard Response Format**

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

// Success response
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### **Error Codes**

```typescript
const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PLAN_LIMIT_EXCEEDED: "PLAN_LIMIT_EXCEEDED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  WEBHOOK_SIGNATURE_INVALID: "WEBHOOK_SIGNATURE_INVALID",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;
```

---

**Volgende Stappen**: Implementeer Stack Auth integratie en testing
