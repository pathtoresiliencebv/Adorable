-- Stripe Integration Database Setup
-- Run this script to create all necessary tables for the Stripe integration

-- Create enums
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'team', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid');
CREATE TYPE billing_event_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

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

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_configurations_updated_at
  BEFORE UPDATE ON plan_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create views for analytics
CREATE OR REPLACE VIEW user_credits_summary AS
SELECT 
  u.id as user_id,
  u.email,
  s.plan_type,
  s.status as subscription_status,
  c.balance as current_credits,
  c.total_earned,
  c.total_used,
  c.last_refresh_date,
  s.current_period_end
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN credits c ON u.id = c.user_id;

CREATE OR REPLACE VIEW usage_analytics AS
SELECT 
  user_id,
  DATE_TRUNC('day', created_at) as usage_date,
  COUNT(*) as total_messages,
  SUM(credits_used) as total_credits_used,
  AVG(message_length) as avg_message_length
FROM usage_logs
WHERE operation_type = 'chat_message'
GROUP BY user_id, DATE_TRUNC('day', created_at);

CREATE OR REPLACE VIEW revenue_analytics AS
SELECT 
  DATE_TRUNC('month', created_at) as billing_month,
  event_type,
  COUNT(*) as event_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM billing_events
WHERE status = 'completed' AND amount > 0
GROUP BY DATE_TRUNC('month', created_at), event_type;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE subscriptions IS 'User subscription information from Stripe';
COMMENT ON TABLE credits IS 'User credits balance and usage tracking';
COMMENT ON TABLE usage_logs IS 'Detailed usage logging for analytics';
COMMENT ON TABLE billing_events IS 'Stripe webhook events and billing history';
COMMENT ON TABLE plan_configurations IS 'Available subscription plans and pricing';
