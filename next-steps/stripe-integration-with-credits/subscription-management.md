# Subscription Management

## 🔄 **Subscription Lifecycle**

### **1. Subscription Service**

```typescript
// src/lib/subscriptions/subscription-service.ts
import { db } from '@/db/schema';
import { subscriptions, planConfigurations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { CreditsService } from '@/lib/credits/credits-service';

export class SubscriptionService {
  /**
   * Get user's current subscription
   */
  static async getCurrentSubscription(userId: string) {
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .limit(1);
  }

  /**
   * Create new subscription
   */
  static async createSubscription(
    userId: string,
    planType: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string
  ) {
    const plan = await db
      .select()
      .from(planConfigurations)
      .where(eq(planConfigurations.planType, planType))
      .limit(1);

    if (plan.length === 0) {
      throw new Error(`Plan ${planType} not found`);
    }

    // Create subscription record
    await db.insert(subscriptions).values({
      userId,
      stripeSubscriptionId,
      stripeCustomerId,
      planType,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Allocate credits for the plan
    await CreditsService.addCredits(userId, plan[0].creditsMonthly);
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string
  ) {
    await db
      .update(subscriptions)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (subscription.length === 0) {
      throw new Error('No active subscription found');
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(subscription[0].stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local record
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (subscription.length === 0) {
      throw new Error('No subscription found');
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription[0].stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local record
    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  /**
   * Upgrade subscription
   */
  static async upgradeSubscription(userId: string, newPlanType: string) {
    const currentSubscription = await this.getCurrentSubscription(userId);
    
    if (currentSubscription.length === 0) {
      throw new Error('No active subscription found');
    }

    const newPlan = await db
      .select()
      .from(planConfigurations)
      .where(eq(planConfigurations.planType, newPlanType))
      .limit(1);

    if (newPlan.length === 0) {
      throw new Error(`Plan ${newPlanType} not found`);
    }

    // Update subscription in Stripe
    await stripe.subscriptions.update(currentSubscription[0].stripeSubscriptionId, {
      items: [
        {
          id: currentSubscription[0].stripeSubscriptionId,
          price: newPlan[0].stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });

    // Update local record
    await db
      .update(subscriptions)
      .set({
        planType: newPlanType,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    // Add prorated credits
    const proratedCredits = Math.floor(newPlan[0].creditsMonthly / 30); // Daily rate
    await CreditsService.addCredits(userId, proratedCredits);
  }

  /**
   * Downgrade subscription
   */
  static async downgradeSubscription(userId: string, newPlanType: string) {
    const currentSubscription = await this.getCurrentSubscription(userId);
    
    if (currentSubscription.length === 0) {
      throw new Error('No active subscription found');
    }

    const newPlan = await db
      .select()
      .from(planConfigurations)
      .where(eq(planConfigurations.planType, newPlanType))
      .limit(1);

    if (newPlan.length === 0) {
      throw new Error(`Plan ${newPlanType} not found`);
    }

    // Update subscription in Stripe
    await stripe.subscriptions.update(currentSubscription[0].stripeSubscriptionId, {
      items: [
        {
          id: currentSubscription[0].stripeSubscriptionId,
          price: newPlan[0].stripePriceId,
        },
      ],
      proration_behavior: 'none', // No proration for downgrades
    });

    // Update local record
    await db
      .update(subscriptions)
      .set({
        planType: newPlanType,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  /**
   * Get subscription history
   */
  static async getSubscriptionHistory(userId: string) {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(subscriptions.createdAt);
  }

  /**
   * Check if subscription is active
   */
  static async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    return subscription.length > 0;
  }

  /**
   * Get subscription expiration date
   */
  static async getSubscriptionExpiration(userId: string) {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (subscription.length === 0) {
      return null;
    }

    return subscription[0].currentPeriodEnd;
  }
}
```

### **2. Subscription API Endpoints**

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
        plan: 'free',
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

### **3. Subscription Hook**

```typescript
// src/hooks/use-subscription.ts
import { useState, useEffect } from 'react';
import { useUser } from '@stackframe/stack';

interface SubscriptionData {
  hasSubscription: boolean;
  planType?: string;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export function useSubscription() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/subscriptions/current');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = async (planType: string) => {
    try {
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade subscription');
      }

      await fetchSubscription();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const cancelSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await fetchSubscription();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  return {
    subscription,
    loading,
    error,
    fetchSubscription,
    upgradeSubscription,
    cancelSubscription,
    isActive: subscription?.status === 'active',
    isCanceling: subscription?.cancelAtPeriodEnd === true,
  };
}
```

## 📊 **Subscription Analytics**

### **1. Subscription Metrics**

```typescript
// src/lib/subscriptions/subscription-analytics.ts
import { db } from '@/db/schema';
import { subscriptions, planConfigurations } from '@/db/schema';
import { eq, and, gte, lte, count, sum } from 'drizzle-orm';

export class SubscriptionAnalytics {
  /**
   * Get subscription metrics
   */
  static async getSubscriptionMetrics() {
    const totalSubscriptions = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const planDistribution = await db
      .select({
        planType: subscriptions.planType,
        count: count(),
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.planType);

    const monthlyRevenue = await db
      .select({
        revenue: sum(planConfigurations.priceMonthly),
      })
      .from(subscriptions)
      .innerJoin(planConfigurations, eq(subscriptions.planType, planConfigurations.planType))
      .where(eq(subscriptions.status, 'active'));

    return {
      totalSubscriptions: totalSubscriptions[0]?.count || 0,
      planDistribution,
      monthlyRevenue: monthlyRevenue[0]?.revenue || 0,
    };
  }

  /**
   * Get churn rate
   */
  static async getChurnRate(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const canceledSubscriptions = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'canceled'),
          gte(subscriptions.updatedAt, startDate)
        )
      );

    const totalSubscriptions = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(gte(subscriptions.createdAt, startDate));

    const churnRate = totalSubscriptions[0]?.count > 0 
      ? (canceledSubscriptions[0]?.count || 0) / totalSubscriptions[0].count
      : 0;

    return {
      churnRate: churnRate * 100, // Percentage
      canceledCount: canceledSubscriptions[0]?.count || 0,
      totalCount: totalSubscriptions[0]?.count || 0,
    };
  }

  /**
   * Get upgrade/downgrade trends
   */
  static async getPlanChangeTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const planChanges = await db
      .select({
        planType: subscriptions.planType,
        count: count(),
      })
      .from(subscriptions)
      .where(gte(subscriptions.updatedAt, startDate))
      .groupBy(subscriptions.planType);

    return planChanges;
  }
}
```

## 🔔 **Subscription Notifications**

### **1. Notification Service**

```typescript
// src/lib/subscriptions/notification-service.ts
import { SubscriptionService } from './subscription-service';

export class SubscriptionNotificationService {
  /**
   * Send low credits notification
   */
  static async sendLowCreditsNotification(userId: string, credits: number) {
    // Implement notification logic (email, push, etc.)
    console.log(`Low credits notification for user ${userId}: ${credits} credits remaining`);
  }

  /**
   * Send subscription expiration notification
   */
  static async sendExpirationNotification(userId: string, expirationDate: Date) {
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 7) {
      console.log(`Subscription expires in ${daysUntilExpiration} days for user ${userId}`);
    }
  }

  /**
   * Send payment failed notification
   */
  static async sendPaymentFailedNotification(userId: string) {
    console.log(`Payment failed notification for user ${userId}`);
  }

  /**
   * Send subscription canceled notification
   */
  static async sendCanceledNotification(userId: string) {
    console.log(`Subscription canceled notification for user ${userId}`);
  }
}
```

## 🛡️ **Subscription Security**

### **1. Subscription Validation**

```typescript
// src/lib/subscriptions/subscription-validator.ts
import { SubscriptionService } from './subscription-service';
import { CreditsService } from '@/lib/credits/credits-service';

export class SubscriptionValidator {
  /**
   * Validate user can perform action
   */
  static async canPerformAction(userId: string, action: string): Promise<boolean> {
    const subscription = await SubscriptionService.getCurrentSubscription(userId);
    
    if (subscription.length === 0) {
      // Free plan restrictions
      return this.canFreeUserPerformAction(action);
    }

    const planType = subscription[0].planType;
    return this.canPlanPerformAction(planType, action);
  }

  /**
   * Check if free user can perform action
   */
  private static canFreeUserPerformAction(action: string): boolean {
    const freePlanActions = [
      'send_message',
      'create_app',
      'basic_support',
    ];

    return freePlanActions.includes(action);
  }

  /**
   * Check if plan can perform action
   */
  private static canPlanPerformAction(planType: string, action: string): boolean {
    const planCapabilities = {
      free: ['send_message', 'create_app', 'basic_support'],
      pro: ['send_message', 'create_app', 'priority_support', 'advanced_features'],
      team: ['send_message', 'create_app', 'priority_support', 'advanced_features', 'team_collaboration'],
      enterprise: ['send_message', 'create_app', 'dedicated_support', 'advanced_features', 'team_collaboration', 'custom_integrations'],
    };

    return planCapabilities[planType as keyof typeof planCapabilities]?.includes(action) || false;
  }

  /**
   * Validate credits for action
   */
  static async hasCreditsForAction(userId: string, action: string): Promise<boolean> {
    const creditsRequired = this.getCreditsRequired(action);
    return await CreditsService.hasEnoughCredits(userId, creditsRequired);
  }

  /**
   * Get credits required for action
   */
  private static getCreditsRequired(action: string): number {
    const creditsMap = {
      'send_message': 1,
      'create_app': 0, // Free
      'advanced_feature': 2,
      'custom_integration': 5,
    };

    return creditsMap[action as keyof typeof creditsMap] || 1;
  }
}
```

---

**Volgende Stappen**: Implementeer billing UI en frontend components
