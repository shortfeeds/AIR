-- =============================================
-- Trinity Pixels — Phase 2 Migration
-- Demo Sessions + Audit Logs + Password Reset
-- =============================================

-- Demo Sessions (for AI Preview Call system)
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_url VARCHAR(500) NOT NULL,
  business_name VARCHAR(255),
  generated_prompt TEXT,
  scraped_data JSONB DEFAULT '{}',
  demo_pin VARCHAR(6) NOT NULL,
  demo_number VARCHAR(20),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  caller_phone VARCHAR(20),
  converted_to_signup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_pin ON demo_sessions(demo_pin);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

-- Prompt Versions (for admin prompt management)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  variant CHAR(1) DEFAULT 'A',
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_client ON prompt_versions(client_id);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_minutes INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Email Log
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_email VARCHAR(255) NOT NULL,
  template VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional composite indexes for performance (from Phase 2)
CREATE INDEX IF NOT EXISTS idx_call_leads_client_timestamp
ON call_leads(client_id, call_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_leads_status_created
ON call_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_status
ON subscriptions(client_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_order_status
ON transactions(razorpay_order_id, status);
