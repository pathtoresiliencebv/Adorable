import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Test webhook event data
const testWebhookEvents = [
  {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
        customer: 'cus_test_' + Math.random().toString(36).substr(2, 9),
        subscription: 'sub_test_' + Math.random().toString(36).substr(2, 9),
        amount_total: 2000, // €20.00
        currency: 'eur',
        metadata: {
          plan_type: 'pro',
          user_id: 'test-user-123'
        }
      }
    }
  },
  {
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test_' + Math.random().toString(36).substr(2, 9),
        customer: 'cus_test_' + Math.random().toString(36).substr(2, 9),
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        cancel_at_period_end: false,
        items: {
          data: [{
            price: {
              id: 'price_1Rj7lWRv5cVaeSzxWDOvwU0E',
              product: 'prod_SeQcDaKIsNyqND'
            }
          }]
        }
      }
    }
  },
  {
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_' + Math.random().toString(36).substr(2, 9),
        customer: 'cus_test_' + Math.random().toString(36).substr(2, 9),
        subscription: 'sub_test_' + Math.random().toString(36).substr(2, 9),
        amount_paid: 2000,
        currency: 'eur',
        status: 'paid'
      }
    }
  }
];

async function testWebhookProcessing() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    console.log('🧪 Testing webhook processing...');
    
    for (const event of testWebhookEvents) {
      console.log(`\n📝 Processing ${event.type}...`);
      
      // Simulate webhook processing
      const result = await client.query(`
        INSERT INTO billing_events (
          user_id, 
          stripe_event_id, 
          event_type, 
          status, 
          amount, 
          currency, 
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        event.data.object.metadata?.user_id || 'test-user-123',
        event.data.object.id,
        event.type,
        'completed',
        event.data.object.amount_total || event.data.object.amount_paid || 0,
        event.data.object.currency || 'eur',
        JSON.stringify(event.data)
      ]);
      
      console.log(`✅ ${event.type} processed successfully (ID: ${result.rows[0].id})`);
    }
    
    // Test credits allocation
    console.log('\n💰 Testing credits allocation...');
    const creditsResult = await client.query(`
      INSERT INTO credits (user_id, balance, total_earned, total_used)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = credits.balance + $2,
        total_earned = credits.total_earned + $3,
        updated_at = NOW()
      RETURNING *
    `, ['test-user-123', 100, 100, 0]);
    
    console.log(`✅ Credits allocated: ${creditsResult.rows[0].balance} credits`);
    
    // Test usage logging
    console.log('\n📊 Testing usage logging...');
    const usageResult = await client.query(`
      INSERT INTO usage_logs (user_id, app_id, credits_used, message_length, task_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['test-user-123', 'test-app-456', 1, 150, 'chat']);
    
    console.log(`✅ Usage logged (ID: ${usageResult.rows[0].id})`);
    
    // Verify data
    console.log('\n🔍 Verifying data...');
    const billingEvents = await client.query('SELECT COUNT(*) as count FROM billing_events');
    const credits = await client.query('SELECT * FROM credits WHERE user_id = $1', ['test-user-123']);
    const usage = await client.query('SELECT COUNT(*) as count FROM usage_logs WHERE user_id = $1', ['test-user-123']);
    
    console.log(`📊 Billing events: ${billingEvents.rows[0].count}`);
    console.log(`💰 Credits balance: ${credits.rows[0]?.balance || 0}`);
    console.log(`📈 Usage logs: ${usage.rows[0].count}`);
    
    await client.end();
    console.log('\n🎉 Webhook testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    await client.end();
  }
}

testWebhookProcessing();
