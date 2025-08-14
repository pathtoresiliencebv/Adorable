# Database Schema voor Stripe Integration

## 📊 **Database Tabellen**

### **1. Subscriptions Tabel**

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('free', 'pro', 'team', 'enterprise')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### **2. Credits Tabel**

```sql
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_balance ON credits(balance);
```

### **3. Usage Logs Tabel**

```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id UUID NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  message_length INTEGER,
  operation_type VARCHAR(50) NOT NULL DEFAULT 'chat_message',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_app_id ON usage_logs(app_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_operation_type ON usage_logs(operation_type);
```

### **4. Billing Events Tabel**

```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  amount INTEGER, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX idx_billing_events_subscription_id ON billing_events(subscription_id);
CREATE INDEX idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);
CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at);
```

### **5. Plan Configurations Tabel**

```sql
CREATE TABLE plan_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL, -- Price in cents
  credits_monthly INTEGER NOT NULL,
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plan_configurations (plan_type, name, price_monthly, credits_monthly, stripe_product_id, stripe_price_id, features) VALUES
('free', 'Free Plan', 0, 5, NULL, NULL, '{"ai_builder": true, "basic_support": false}'),
('pro', 'Pro Plan', 2000, 100, 'prod_SeQcDaKIsNyqND', 'price_1Rj7lWRv5cVaeSzxWDOvwU0E', '{"ai_builder": true, "priority_support": true, "advanced_features": true}'),
('team', 'Team Plan', 5000, 400, 'prod_SeQcqHUMMoVaSv', 'price_1Rj7leRv5cVaeSzx4kAEEI5t', '{"ai_builder": true, "priority_support": true, "advanced_features": true, "team_collaboration": true}'),
('enterprise', 'Enterprise Plan', 20000, 2000, 'prod_SeQduXvVSzMI8g', 'price_1Rj7loRv5cVaeSzx59JS9yY8', '{"ai_builder": true, "dedicated_support": true, "advanced_features": true, "team_collaboration": true, "custom_integrations": true}');
```

## 🔄 **Database Triggers**

### **1. Credits Update Trigger**

```sql
-- Function to update credits timestamp
CREATE OR REPLACE FUNCTION update_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for credits table
CREATE TRIGGER trigger_update_credits_updated_at
  BEFORE UPDATE ON credits
  FOR EACH ROW
  EXECUTE FUNCTION update_credits_updated_at();
```

### **2. Subscription Update Trigger**

```sql
-- Function to update subscription timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscriptions table
CREATE TRIGGER trigger_update_subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();
```

## 📈 **Views voor Analytics**

### **1. User Credits Summary View**

```sql
CREATE VIEW user_credits_summary AS
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
```

### **2. Usage Analytics View**

```sql
CREATE VIEW usage_analytics AS
SELECT 
  user_id,
  DATE_TRUNC('day', created_at) as usage_date,
  COUNT(*) as total_messages,
  SUM(credits_used) as total_credits_used,
  AVG(message_length) as avg_message_length
FROM usage_logs
WHERE operation_type = 'chat_message'
GROUP BY user_id, DATE_TRUNC('day', created_at);
```

### **3. Revenue Analytics View**

```sql
CREATE VIEW revenue_analytics AS
SELECT 
  DATE_TRUNC('month', created_at) as billing_month,
  event_type,
  COUNT(*) as event_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM billing_events
WHERE status = 'completed' AND amount > 0
GROUP BY DATE_TRUNC('month', created_at), event_type;
```

## 🔧 **Database Functions**

### **1. Deduct Credits Function**

```sql
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_credits_to_deduct INTEGER DEFAULT 1,
  p_app_id UUID DEFAULT NULL,
  p_message_length INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  success BOOLEAN := FALSE;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user has enough credits
  IF current_balance >= p_credits_to_deduct THEN
    -- Deduct credits
    UPDATE credits 
    SET 
      balance = balance - p_credits_to_deduct,
      total_used = total_used + p_credits_to_deduct,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log usage
    INSERT INTO usage_logs (user_id, app_id, credits_used, message_length, operation_type)
    VALUES (p_user_id, p_app_id, p_credits_to_deduct, p_message_length, 'chat_message');
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;
```

### **2. Refresh Credits Function**

```sql
CREATE OR REPLACE FUNCTION refresh_monthly_credits(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan VARCHAR(50);
  monthly_credits INTEGER;
  success BOOLEAN := FALSE;
BEGIN
  -- Get user's current plan
  SELECT plan_type INTO user_plan
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;
  
  -- Get credits for plan
  SELECT credits_monthly INTO monthly_credits
  FROM plan_configurations
  WHERE plan_type = user_plan;
  
  IF monthly_credits IS NOT NULL THEN
    -- Update credits
    INSERT INTO credits (user_id, balance, total_earned, last_refresh_date)
    VALUES (p_user_id, monthly_credits, monthly_credits, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      balance = monthly_credits,
      total_earned = credits.total_earned + monthly_credits,
      last_refresh_date = NOW(),
      updated_at = NOW();
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;
```

## 🛡️ **Database Constraints**

### **1. Check Constraints**

```sql
-- Ensure credits balance is never negative
ALTER TABLE credits ADD CONSTRAINT check_credits_balance_positive 
  CHECK (balance >= 0);

-- Ensure usage logs credits are positive
ALTER TABLE usage_logs ADD CONSTRAINT check_usage_credits_positive 
  CHECK (credits_used > 0);

-- Ensure billing amounts are positive
ALTER TABLE billing_events ADD CONSTRAINT check_billing_amount_positive 
  CHECK (amount >= 0);
```

### **2. Foreign Key Constraints**

```sql
-- All foreign keys are already defined in table creation
-- Additional constraints for data integrity
ALTER TABLE usage_logs ADD CONSTRAINT fk_usage_logs_subscription
  FOREIGN KEY (user_id) REFERENCES subscriptions(user_id) ON DELETE CASCADE;
```

## 📊 **Database Indexes voor Performance**

```sql
-- Composite indexes for common queries
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, created_at);
CREATE INDEX idx_billing_events_user_type ON billing_events(user_id, event_type);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Partial indexes for active subscriptions
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id) 
  WHERE status = 'active';

-- Index for low credits users
CREATE INDEX idx_credits_low_balance ON credits(user_id) 
  WHERE balance < 10;
```

---

**Volgende Stappen**: Implementeer Stripe setup en webhook handling
