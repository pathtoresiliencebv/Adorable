import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔗 Connected to database');
  
  // Create enums if they don't exist
  console.log('📝 Creating enums...');
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE plan_type AS ENUM ('free', 'pro', 'team', 'enterprise');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE billing_event_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  console.log('✅ Enums created');
  
  // Create credits table
  console.log('📝 Creating credits table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS credits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_used INTEGER NOT NULL DEFAULT 0,
      last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Create usage_logs table
  console.log('📝 Creating usage_logs table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      app_id TEXT,
      credits_used INTEGER NOT NULL,
      message_length INTEGER,
      task_type TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Create billing_events table
  console.log('📝 Creating billing_events table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS billing_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      stripe_event_id TEXT UNIQUE,
      event_type TEXT NOT NULL,
      status billing_event_status DEFAULT 'pending',
      amount INTEGER,
      currency TEXT DEFAULT 'EUR',
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE
    )
  `);
  
  // Create plan_configurations table
  console.log('📝 Creating plan_configurations table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS plan_configurations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_type plan_type NOT NULL,
      stripe_price_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      monthly_price INTEGER NOT NULL,
      yearly_price INTEGER,
      credits_per_month INTEGER NOT NULL,
      features JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  
  // Insert default plan configurations (one by one to avoid conflicts)
  console.log('📝 Inserting default plan configurations...');
  
  const plans = [
    { type: 'free', name: 'Free Plan', description: 'Perfect for getting started', price: 0, credits: 10, features: '["Basic AI features", "Limited usage"]' },
    { type: 'pro', name: 'Pro Plan', description: 'For power users and professionals', price: 999, credits: 100, features: '["Advanced AI features", "Priority support", "Higher usage limits"]' },
    { type: 'team', name: 'Team Plan', description: 'For teams and small businesses', price: 1999, credits: 250, features: '["Team collaboration", "Advanced analytics", "Custom integrations"]' },
    { type: 'enterprise', name: 'Enterprise Plan', description: 'For large organizations', price: 4999, credits: 1000, features: '["Custom solutions", "Dedicated support", "SLA guarantees"]' }
  ];
  
  for (const plan of plans) {
    try {
      await client.query(`
        INSERT INTO plan_configurations (plan_type, name, description, monthly_price, credits_per_month, features) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [plan.type, plan.name, plan.description, plan.price, plan.credits, plan.features]);
      console.log(`✅ Added ${plan.name}`);
    } catch (error) {
      if (error.message.includes('duplicate key')) {
        console.log(`ℹ️  ${plan.name} already exists`);
      } else {
        console.error(`❌ Error adding ${plan.name}:`, error.message);
      }
    }
  }
  
  // Create indexes
  console.log('📝 Creating indexes...');
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
    CREATE INDEX IF NOT EXISTS idx_plan_configurations_stripe_price_id ON plan_configurations(stripe_price_id);
  `);
  
  await client.end();
  console.log('\n🎉 Stripe tables created successfully!');
  console.log('📊 New tables: credits, usage_logs, billing_events, plan_configurations');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  await client.end();
}
