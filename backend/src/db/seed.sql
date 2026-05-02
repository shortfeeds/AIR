-- =============================================
-- Seed: Default Admin User
-- Password: admin123 (bcrypt hash)
-- =============================================
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Trinity Admin',
  'admin@trinitypixels.in',
  '$2a$10$8KzANQK0VQXbMgGmZ5v5Iu7nNxC5wfK5L5X5X5X5X5X5X5X5X5X5u',
  'admin'
) ON CONFLICT (email) DO NOTHING;
