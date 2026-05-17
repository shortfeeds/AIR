-- Alter client_profiles check constraint to allow 'pending_review'

ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_onboarding_status_check;

ALTER TABLE client_profiles 
  ADD CONSTRAINT client_profiles_onboarding_status_check 
  CHECK (onboarding_status IN ('pending', 'pending_review', 'active', 'suspended'));
