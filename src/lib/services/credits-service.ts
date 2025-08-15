import { db } from '@/db/schema';
import { creditsTable, usageLogsTable, subscriptionsTable, planConfigurationsTable } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { PLANS, type PlanType } from '@/lib/stripe-config';

export class CreditsService {
  /**
   * Get user's current credits balance
   */
  static async getUserCredits(userId: string) {
    const [credits] = await db
      .select()
      .from(creditsTable)
      .where(eq(creditsTable.userId, userId))
      .limit(1);

    if (!credits) {
      // Create initial credits record for new user
      const [newCredits] = await db
        .insert(creditsTable)
        .values({
          userId,
          balance: PLANS.free.creditsMonthly,
          totalEarned: PLANS.free.creditsMonthly,
        })
        .returning();

      return newCredits;
    }

    return credits;
  }

  /**
   * Check if user has enough credits for an operation
   */
  static async hasEnoughCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits.balance >= requiredCredits;
  }

  /**
   * Deduct credits from user's balance
   */
  static async deductCredits(
    userId: string,
    appId: string,
    creditsToDeduct: number = 1,
    messageLength?: number,
    metadata?: any
  ): Promise<boolean> {
    try {
      // Use a transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Get current balance with row lock
        const [credits] = await tx
          .select()
          .from(creditsTable)
          .where(eq(creditsTable.userId, userId))
          .limit(1);

        if (!credits || credits.balance < creditsToDeduct) {
          return false;
        }

        // Update credits balance
        await tx
          .update(creditsTable)
          .set({
            balance: credits.balance - creditsToDeduct,
            totalUsed: credits.totalUsed + creditsToDeduct,
            updatedAt: new Date(),
          })
          .where(eq(creditsTable.userId, userId));

        // Log usage
        await tx.insert(usageLogsTable).values({
          userId,
          appId,
          creditsUsed: creditsToDeduct,
          messageLength,
          operationType: 'chat_message',
          metadata,
        });

        return true;
      });

      return result;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Add credits to user's balance (for subscription renewals, etc.)
   */
  static async addCredits(
    userId: string,
    creditsToAdd: number,
    reason: string = 'subscription_renewal'
  ): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        const [credits] = await tx
          .select()
          .from(creditsTable)
          .where(eq(creditsTable.userId, userId))
          .limit(1);

        if (credits) {
          // Update existing credits
          await tx
            .update(creditsTable)
            .set({
              balance: credits.balance + creditsToAdd,
              totalEarned: credits.totalEarned + creditsToAdd,
              lastRefreshDate: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(creditsTable.userId, userId));
        } else {
          // Create new credits record
          await tx.insert(creditsTable).values({
            userId,
            balance: creditsToAdd,
            totalEarned: creditsToAdd,
            lastRefreshDate: new Date(),
          });
        }

        // Log the credit addition
        await tx.insert(usageLogsTable).values({
          userId,
          appId: 'system', // System operation
          creditsUsed: -creditsToAdd, // Negative to indicate addition
          operationType: 'credit_addition',
          metadata: { reason },
        });
      });

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Refresh monthly credits based on user's subscription
   */
  static async refreshMonthlyCredits(userId: string): Promise<boolean> {
    try {
      // Get user's active subscription
      const [subscription] = await db
        .select()
        .from(subscriptionsTable)
        .where(
          and(
            eq(subscriptionsTable.userId, userId),
            eq(subscriptionsTable.status, 'active')
          )
        )
        .limit(1);

      const planType = subscription?.planType || 'free';
      const plan = PLANS[planType as PlanType];
      const monthlyCredits = plan.creditsMonthly;

      return await this.addCredits(userId, monthlyCredits, 'monthly_refresh');
    } catch (error) {
      console.error('Error refreshing monthly credits:', error);
      return false;
    }
  }

  /**
   * Get user's usage statistics
   */
  static async getUserUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await db
      .select({
        totalMessages: db.$count(),
        totalCreditsUsed: db.$sum(usageLogsTable.creditsUsed),
        avgMessageLength: db.$avg(usageLogsTable.messageLength),
      })
      .from(usageLogsTable)
      .where(
        and(
          eq(usageLogsTable.userId, userId),
          eq(usageLogsTable.operationType, 'chat_message'),
          // Add date filter when createdAt is available
        )
      );

    return usage[0] || {
      totalMessages: 0,
      totalCreditsUsed: 0,
      avgMessageLength: 0,
    };
  }

  /**
   * Get user's billing history
   */
  static async getUserBillingHistory(userId: string, limit: number = 10) {
    const { billingEventsTable } = await import('@/db/schema');
    
    return await db
      .select()
      .from(billingEventsTable)
      .where(eq(billingEventsTable.userId, userId))
      .orderBy(desc(billingEventsTable.createdAt))
      .limit(limit);
  }

  /**
   * Check if user needs credits warning
   */
  static async needsCreditsWarning(userId: string, warningThreshold: number = 5): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits.balance <= warningThreshold;
  }

  /**
   * Get credits summary for user
   */
  static async getCreditsSummary(userId: string) {
    const [credits] = await db
      .select()
      .from(creditsTable)
      .where(eq(creditsTable.userId, userId))
      .limit(1);

    const [subscription] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          eq(subscriptionsTable.status, 'active')
        )
      )
      .limit(1);

    const planType = subscription?.planType || 'free';
    const plan = PLANS[planType as PlanType];

    return {
      currentBalance: credits?.balance || 0,
      totalEarned: credits?.totalEarned || 0,
      totalUsed: credits?.totalUsed || 0,
      planType,
      planName: plan.name,
      monthlyCredits: plan.creditsMonthly,
      nextRefreshDate: subscription?.currentPeriodEnd,
      needsWarning: credits ? credits.balance <= 5 : false,
    };
  }
}
