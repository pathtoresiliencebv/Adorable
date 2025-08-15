-- Migration: Stripe Integration Tables
-- Created: 2024-12-18

-- Create enums
CREATE TYPE IF NOT EXISTS plan_type AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE IF NOT EXISTS subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid');
CREATE TYPE IF NOT EXISTS billing_event_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_type plan_type NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  app_id UUID NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  message_length INTEGER,
  operation_type TEXT NOT NULL DEFAULT 'chat_message',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing events table
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  amount INTEGER, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'EUR',
  status billing_event_status NOT NULL DEFAULT 'pending',
  metadata JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan configurations table
CREATE TABLE IF NOT EXISTS plan_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type plan_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL, -- Price in cents
  credits_monthly INTEGER NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_balance ON credits(balance);
CREATE INDEX IF NOT EXISTS idx_credits_low_balance ON credits(user_id) WHERE balance < 10;

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_app_id ON usage_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_operation_type ON usage_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_id ON billing_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_type ON billing_events(user_id, event_type);

-- Insert default plan configurations
INSERT INTO plan_configurations (plan_type, name, price_monthly, credits_monthly, stripe_product_id, stripe_price_id, features) VALUES
('free', 'Free Plan', 0, 5, NULL, NULL, '{"ai_builder": true, "basic_support": false}'),
('pro', 'Pro Plan', 2000, 100, 'prod_SeQcDaKIsNyqND', 'price_1Rj7lWRv5cVaeSzxWDOvwU0E', '{"ai_builder": true, "priority_support": true, "advanced_features": true}'),
('team', 'Team Plan', 5000, 400, 'prod_SeQcqHUMMoVaSv', 'price_1Rj7leRv5cVaeSzx4kAEEI5t', '{"ai_builder": true, "priority_support": true, "advanced_features": true, "team_collaboration": true}'),
('enterprise', 'Enterprise Plan', 20000, 2000, 'prod_SeQduXvVSzMI8g', 'price_1Rj7loRv5cVaeSzx59JS9yY8', '{"ai_builder": true, "dedicated_support": true, "advanced_features": true, "team_collaboration": true, "custom_integrations": true}')
ON CONFLICT (plan_type) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  credits_monthly = EXCLUDED.credits_monthly,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  features = EXCLUDED.features,
  updated_at = NOW();
