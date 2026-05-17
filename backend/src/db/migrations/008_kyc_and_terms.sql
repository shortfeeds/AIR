-- Migration 008: Add KYC and Terms of Service columns to client_profiles

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kyc_document_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS kyc_document_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
