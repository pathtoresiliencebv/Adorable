import { NextRequest, NextResponse } from 'next/server';
import { stripe, PLANS, type StripeWebhookEvent } from '@/lib/stripe-config';
import { db } from '@/db/schema';
import { subscriptionsTable, billingEventsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreditsService } from '@/lib/services/credits-service';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleWebhookEvent(event: any) {
  const eventType = event.type as StripeWebhookEvent;
  const eventId = event.id;

  // Check if we've already processed this event
  const [existingEvent] = await db
    .select()
    .from(billingEventsTable)
    .where(eq(billingEventsTable.stripeEventId, eventId))
    .limit(1);

  if (existingEvent) {
    console.log(`Event ${eventId} already processed`);
    return;
  }

  switch (eventType) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }

  // Log the webhook event
  await db.insert(billingEventsTable).values({
    stripeEventId: eventId,
    eventType,
    status: 'completed',
    processedAt: new Date(),
    metadata: event.data.object,
  });
}

async function handleCheckoutSessionCompleted(session: any) {
  const { userId, planType } = session.metadata;
  
  if (!userId || !planType) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }

  const plan = PLANS[planType as keyof typeof PLANS];
  
  // Create or update subscription
  await db
    .insert(subscriptionsTable)
    .values({
      userId,
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      planType,
      status: 'active',
      currentPeriodStart: new Date(session.subscription_data?.current_period_start * 1000),
      currentPeriodEnd: new Date(session.subscription_data?.current_period_end * 1000),
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.userId,
      set: {
        stripeSubscriptionId: session.subscription,
        planType,
        status: 'active',
        currentPeriodStart: new Date(session.subscription_data?.current_period_start * 1000),
        currentPeriodEnd: new Date(session.subscription_data?.current_period_end * 1000),
        updatedAt: new Date(),
      },
    });

  // Add credits for the new subscription
  await CreditsService.addCredits(userId, plan.creditsMonthly, 'subscription_created');
}

async function handleSubscriptionCreated(subscription: any) {
  const { userId, planType } = subscription.metadata;
  
  if (!userId || !planType) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  const plan = PLANS[planType as keyof typeof PLANS];

  // Update subscription record
  await db
    .update(subscriptionsTable)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionUpdated(subscription: any) {
  const { userId, planType } = subscription.metadata;
  
  if (!userId || !planType) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  // Update subscription record
  await db
    .update(subscriptionsTable)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(subscription: any) {
  const { userId } = subscription.metadata;
  
  if (!userId) {
    console.error('Missing userId in subscription:', subscription.id);
    return;
  }

  // Update subscription status
  await db
    .update(subscriptionsTable)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId, planType } = subscription.metadata;
  
  if (!userId || !planType) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  const plan = PLANS[planType as keyof typeof PLANS];

  // Refresh credits for the user
  await CreditsService.addCredits(userId, plan.creditsMonthly, 'subscription_renewal');

  // Update subscription period
  await db
    .update(subscriptionsTable)
    .set({
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
}

async function handleInvoicePaymentFailed(invoice: any) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;
  
  if (!userId) {
    console.error('Missing userId in subscription:', subscription.id);
    return;
  }

  // Update subscription status
  await db
    .update(subscriptionsTable)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, subscription.id));
}
