import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/schema';
import { usageLogsTable } from '@/db/schema';
import { eq, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get usage data grouped by date
    const usageData = await db
      .select({
        date: sql<string>`DATE(${usageLogsTable.createdAt})`,
        creditsUsed: sql<number>`SUM(${usageLogsTable.creditsUsed})`,
        messageCount: sql<number>`COUNT(*)`,
      })
      .from(usageLogsTable)
      .where(
        sql`${usageLogsTable.userId} = ${userId} AND ${usageLogsTable.createdAt} >= ${startDate}`
      )
      .groupBy(sql`DATE(${usageLogsTable.createdAt})`)
      .orderBy(sql`DATE(${usageLogsTable.createdAt})`);

    // Fill in missing dates with zero values
    const filledData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = usageData.find(d => d.date === dateStr);
      
      filledData.push({
        date: dateStr,
        creditsUsed: existingData?.creditsUsed || 0,
        messageCount: existingData?.messageCount || 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(filledData);

  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
