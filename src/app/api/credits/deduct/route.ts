import { NextRequest, NextResponse } from 'next/server';
import { CreditsService } from '@/lib/services/credits-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, appId, creditsToDeduct = 1, messageLength, metadata } = await request.json();

    if (!userId || !appId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const hasEnoughCredits = await CreditsService.hasEnoughCredits(userId, creditsToDeduct);
    
    if (!hasEnoughCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS'
        },
        { status: 402 }
      );
    }

    // Deduct credits
    const success = await CreditsService.deductCredits(
      userId,
      appId,
      creditsToDeduct,
      messageLength,
      metadata
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    // Get updated credits summary
    const creditsSummary = await CreditsService.getCreditsSummary(userId);

    return NextResponse.json({
      success: true,
      creditsDeducted: creditsToDeduct,
      remainingCredits: creditsSummary.currentBalance,
      needsWarning: creditsSummary.needsWarning,
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}
