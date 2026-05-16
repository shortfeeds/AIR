const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { name, email, password, referral_code } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if referral code is valid
    let referredBy = null;
    if (referral_code) {
      const referrer = await db.query('SELECT id FROM users WHERE referral_code = $1', [referral_code]);
      if (referrer.rows.length > 0) {
        referredBy = referrer.rows[0].id;
      }
    }

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password and create user
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, referred_by)
       VALUES ($1, $2, $3, 'client', $4)
       RETURNING id, name, email, role, created_at, referral_code`,
      [name, email, hash, referredBy]
    );

    const user = result.rows[0];

    // Create empty related records
    await db.query(
      'INSERT INTO client_profiles (user_id) VALUES ($1)',
      [user.id]
    );
    await db.query(
      `INSERT INTO subscriptions (client_id, plan_name, available_minutes, total_minutes_purchased)
       VALUES ($1, 'silver', 0, 0)`,
      [user.id]
    );
    await db.query(
      'INSERT INTO knowledge_base (client_id) VALUES ($1)',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              cp.business_name, cp.onboarding_status,
              s.plan_name, s.available_minutes, s.total_minutes_purchased, s.status as sub_status,
              pn.plivo_number
       FROM users u
       LEFT JOIN client_profiles cp ON cp.user_id = u.id
       LEFT JOIN subscriptions s ON s.client_id = u.id
       LEFT JOIN phone_numbers pn ON pn.client_id = u.id AND pn.is_active = true
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't leak whether user exists, return success
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    // Stateless token using secret + current hash (invalidated on password change)
    const secret = process.env.JWT_SECRET + user.password_hash;
    const token = jwt.sign({ email: user.email, id: user.id }, secret, { expiresIn: '1h' });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&id=${user.id}`;
    
    const { sendPasswordResetEmail } = require('../services/email');
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { id, token, password } = req.body;
    if (!id || !token || !password) return res.status(400).json({ error: 'Missing required fields' });

    const result = await db.query('SELECT id, email, password_hash FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid link' });

    const user = result.rows[0];
    const secret = process.env.JWT_SECRET + user.password_hash;

    try {
      jwt.verify(token, secret);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
