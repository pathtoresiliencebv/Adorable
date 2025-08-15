import { NextRequest, NextResponse } from 'next/server';
import { CreditsService } from '@/lib/services/credits-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const creditsSummary = await CreditsService.getCreditsSummary(userId);

    return NextResponse.json(creditsSummary);
  } catch (error) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { error: 'Failed to check credits' },
      { status: 500 }
    );
  }
}
