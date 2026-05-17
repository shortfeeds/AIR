-- =============================================
-- Trinity Pixels — Wallet Credits & Ledger System
-- =============================================

-- Add check constraints on subscriptions for rebranded and annual plans
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_name_check CHECK (
  plan_name IN (
    'free_trial', 'trial', 
    'starter', 'growth', 'pro', 'scale', 
    'starter_annual', 'growth_annual', 'pro_annual', 'scale_annual', 
    'enterprise'
  )
);

-- Modify referral_rewards to track INR rewards instead of minutes
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS reward_amount_inr NUMERIC(10, 2) DEFAULT 500.00;

-- Track credits used on transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credits_used_inr NUMERIC(10, 2) DEFAULT 0.00;

-- Wallet Credits Table: Tracks earned credits and their remaining unspent amount + expiration date (FIFO)
CREATE TABLE IF NOT EXISTS wallet_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_inr NUMERIC(10, 2) NOT NULL CHECK (amount_inr >= 0),
  remaining_amount_inr NUMERIC(10, 2) NOT NULL CHECK (remaining_amount_inr >= 0),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('referral_bonus', 'admin_addition', 'refund', 'other')),
  referral_reward_id UUID REFERENCES referral_rewards(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Ledger Table: Customer-facing log of credit deposits and debits
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_inr NUMERIC(10, 2) NOT NULL, -- Negative for debits, Positive for credits
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
  description VARCHAR(255) NOT NULL,
  transaction_id UUID, -- Optional: links to transactions(id) if spent on plan/topup
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_credits_client ON wallet_credits(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_client ON wallet_ledger(client_id);
