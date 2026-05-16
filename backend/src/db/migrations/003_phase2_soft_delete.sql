-- =============================================
-- Trinity Pixels — Phase 2 & 4 Migration
-- Soft Delete, Prompt Versioning, and A/B Tracking
-- =============================================

-- 1. Soft Delete: Add deleted_at to core tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Prompt Versioning: Store historical prompts and variants
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  variant CHAR(1) NOT NULL DEFAULT 'A' CHECK (variant IN ('A', 'B')),
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_client ON prompt_versions(client_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(client_id, variant, is_active);

-- 3. A/B Testing: Track which variant was used for each lead
-- Note: 'used_prompt' was added in init.js migration, but let's ensure it's here too
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_leads' AND column_name='used_prompt') THEN
        ALTER TABLE call_leads ADD COLUMN used_prompt CHAR(1) DEFAULT 'A';
    END IF;
END $$;

-- 4. Global Settings: For system-wide configurations
CREATE TABLE IF NOT EXISTS global_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans if not exists
INSERT INTO global_settings (key, value) VALUES
('plans', '{
  "silver": {"price": 1999, "minutes": 100, "features": ["AI Receptionist", "Email Alerts", "Dashboard"]},
  "gold": {"price": 3999, "minutes": 250, "features": ["Everything in Silver", "WhatsApp Alerts", "A/B Testing"]},
  "diamond": {"price": 7999, "minutes": 600, "features": ["Everything in Gold", "Priority Support", "Custom Prompting"]}
}')
ON CONFLICT (key) DO NOTHING;
