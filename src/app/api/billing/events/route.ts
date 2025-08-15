import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/schema';
import { billingEventsTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get billing events for the user
    const events = await db
      .select({
        id: billingEventsTable.id,
        eventType: billingEventsTable.eventType,
        status: billingEventsTable.status,
        amount: billingEventsTable.amount,
        currency: billingEventsTable.currency,
        createdAt: billingEventsTable.createdAt,
        metadata: billingEventsTable.metadata,
      })
      .from(billingEventsTable)
      .where(eq(billingEventsTable.userId, userId))
      .orderBy(desc(billingEventsTable.createdAt))
      .limit(limit);

    return NextResponse.json(events);

  } catch (error) {
    console.error('Error fetching billing events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing events' },
      { status: 500 }
    );
  }
}
