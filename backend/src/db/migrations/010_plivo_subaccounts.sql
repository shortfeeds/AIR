-- Create plivo_subaccounts table for credentials isolation
CREATE TABLE IF NOT EXISTS plivo_subaccounts (
  client_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plivo_sub_auth_id VARCHAR(255) NOT NULL,
  plivo_sub_auth_token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
