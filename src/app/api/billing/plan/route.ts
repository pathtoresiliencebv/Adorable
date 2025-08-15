import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/schema';
import { subscriptionsTable, planConfigurationsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's active subscription
    const subscription = await db
      .select({
        id: subscriptionsTable.id,
        planType: subscriptionsTable.planType,
        status: subscriptionsTable.status,
        currentPeriodStart: subscriptionsTable.currentPeriodStart,
        currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionsTable.cancelAtPeriodEnd,
      })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .limit(1);

    if (subscription.length === 0) {
      // Return free plan info
      return NextResponse.json({
        name: 'Free Plan',
        price: 0,
        credits: 10,
        status: 'active',
        nextBillingDate: null,
      });
    }

    const userSubscription = subscription[0];

    // Get plan configuration
    const planConfig = await db
      .select({
        name: planConfigurationsTable.name,
        description: planConfigurationsTable.description,
        monthlyPrice: planConfigurationsTable.monthlyPrice,
        creditsPerMonth: planConfigurationsTable.creditsPerMonth,
        features: planConfigurationsTable.features,
      })
      .from(planConfigurationsTable)
      .where(eq(planConfigurationsTable.planType, userSubscription.planType))
      .limit(1);

    if (planConfig.length === 0) {
      return NextResponse.json(
        { error: 'Plan configuration not found' },
        { status: 404 }
      );
    }

    const plan = planConfig[0];

    return NextResponse.json({
      name: plan.name,
      price: plan.monthlyPrice,
      credits: plan.creditsPerMonth,
      status: userSubscription.status,
      nextBillingDate: userSubscription.currentPeriodEnd,
      description: plan.description,
      features: plan.features,
      cancelAtPeriodEnd: userSubscription.cancelAtPeriodEnd,
    });

  } catch (error) {
    console.error('Error fetching plan data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan data' },
      { status: 500 }
    );
  }
}
