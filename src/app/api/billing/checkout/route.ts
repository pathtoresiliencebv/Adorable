import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, getPlanByStripePriceId } from '@/lib/stripe-config';
import { db } from '@/db/schema';
import { subscriptionsTable, billingEventsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, successUrl, cancelUrl } = await request.json();

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate price ID and get plan
    const planType = getPlanByStripePriceId(priceId);
    if (!planType) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    const plan = PLANS[planType];

    // Check if user already has an active subscription
    const [existingSubscription] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1);

    let customerId = existingSubscription?.stripeCustomerId;

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
      metadata: {
        userId,
        planType,
      },
      subscription_data: {
        metadata: {
          userId,
          planType,
        },
      },
    });

    // Log billing event
    await db.insert(billingEventsTable).values({
      userId,
      eventType: 'checkout_session_created',
      amount: plan.priceMonthly,
      currency: 'EUR',
      status: 'pending',
      metadata: {
        sessionId: session.id,
        planType,
        priceId,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
