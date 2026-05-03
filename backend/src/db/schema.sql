-- =============================================
-- Trinity Pixels — AI Voice Receptionist Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Users (Authentication & Roles)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- =============================================
-- 2. Client Profiles (Business Info from Intake)
-- =============================================
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  city VARCHAR(100),
  operating_hours JSONB DEFAULT '{}',
  website_url VARCHAR(500),
  transfer_number VARCHAR(20),
  transfer_mode VARCHAR(50) DEFAULT 'on_request' CHECK (transfer_mode IN ('all_calls', 'on_request')),
  onboarding_status VARCHAR(20) DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'active', 'suspended')),
  avg_lead_value INTEGER DEFAULT 1000,
  logo_url VARCHAR(500),
  n8n_webhook_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_status ON client_profiles(onboarding_status);

-- =============================================
-- 3. Phone Numbers (Plivo Assignments)
-- =============================================
CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plivo_number VARCHAR(20) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_phone_numbers_client ON phone_numbers(client_id);
CREATE INDEX idx_phone_numbers_plivo ON phone_numbers(plivo_number);

-- =============================================
-- 4. Subscriptions (Plan & Minute Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL DEFAULT 'silver' CHECK (plan_name IN ('silver', 'gold', 'diamond', 'platinum', 'enterprise')),
  available_minutes INTEGER NOT NULL DEFAULT 0,
  total_minutes_purchased INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  UNIQUE(client_id)
);

CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =============================================
-- 5. Call Leads (AI Call Records)
-- =============================================
CREATE TABLE IF NOT EXISTS call_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caller_number VARCHAR(20) NOT NULL,
  call_duration_seconds INTEGER DEFAULT 0,
  ai_summary TEXT,
  call_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'followed_up', 'transferred')),
  transcript_raw TEXT,
  action_taken VARCHAR(100),
  recording_url VARCHAR(500)
);

CREATE INDEX idx_call_leads_client ON call_leads(client_id);
CREATE INDEX idx_call_leads_timestamp ON call_leads(call_timestamp DESC);
CREATE INDEX idx_call_leads_status ON call_leads(status);

-- =============================================
-- 6. Transactions (Payment History)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  amount_inr INTEGER NOT NULL,
  minutes_purchased INTEGER NOT NULL DEFAULT 0,
  plan_name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_client ON transactions(client_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- =============================================
-- 7. Knowledge Base (Per-Client AI Config)
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  primary_services TEXT,
  top_faqs JSONB DEFAULT '[]',
  ai_goal VARCHAR(100) DEFAULT 'answer_faqs' CHECK (ai_goal IN ('book_appointment', 'take_message', 'answer_faqs', 'qualify_leads')),
  booking_link VARCHAR(500),
  language VARCHAR(50) DEFAULT 'English',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  update_notes TEXT,
  update_status VARCHAR(20) DEFAULT 'current' CHECK (update_status IN ('current', 'pending_review', 'updating')),
  UNIQUE(client_id)
);

CREATE INDEX idx_knowledge_base_client ON knowledge_base(client_id);

-- =============================================
-- 8. Global Settings (Plans & System Config)
-- =============================================
CREATE TABLE IF NOT EXISTS global_settings (
  key VARCHAR(50) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default plans
INSERT INTO global_settings (key, value) VALUES 
('plans', '{
  "silver": {"minutes": 200, "price": 299900, "label": "Silver"},
  "gold": {"minutes": 500, "price": 499900, "label": "Gold"},
  "diamond": {"minutes": 1000, "price": 799900, "label": "Diamond"},
  "platinum": {"minutes": 2000, "price": 999900, "label": "Platinum"}
}') ON CONFLICT (key) DO NOTHING;
