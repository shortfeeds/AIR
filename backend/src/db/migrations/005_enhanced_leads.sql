-- Add caller contact data and appointment fields to call_leads
ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS caller_name VARCHAR(255);
ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS caller_query TEXT;
ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE call_leads ADD COLUMN IF NOT EXISTS appointment_time TIME;

-- Rename plans in subscriptions
UPDATE subscriptions SET plan_name = 'starter' WHERE plan_name = 'silver';
UPDATE subscriptions SET plan_name = 'growth' WHERE plan_name = 'gold';
UPDATE subscriptions SET plan_name = 'pro' WHERE plan_name = 'diamond';
UPDATE subscriptions SET plan_name = 'scale' WHERE plan_name = 'platinum';

-- Update plan_name constraint on subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_name_check 
  CHECK (plan_name IN ('free_trial', 'trial', 'starter', 'growth', 'pro', 'scale', 'enterprise'));

-- Update global_settings plans to rebranded names
UPDATE global_settings SET value = '{
  "starter": {"minutes": 200, "price": 299900, "label": "Starter"},
  "growth": {"minutes": 500, "price": 499900, "label": "Growth"},
  "pro": {"minutes": 1000, "price": 799900, "label": "Pro"},
  "scale": {"minutes": 1500, "price": 999900, "label": "Scale"},
  "trial": {"minutes": 30, "price": 99900, "label": "Trial (30 Mins)"}
}' WHERE key = 'plans';
