const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/subscriptions — Get own subscription & usage
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, 
              ROUND(
                CASE WHEN s.total_minutes_purchased > 0
                  THEN (s.available_minutes::DECIMAL / s.total_minutes_purchased * 100)
                  ELSE 0
                END, 1
              ) as usage_percentage,
              COALESCE(
                (SELECT SUM(remaining_amount_inr) 
                 FROM wallet_credits 
                 WHERE client_id = s.client_id AND expires_at > NOW()), 
                0
              )::FLOAT as active_wallet_balance
       FROM subscriptions s
       WHERE s.client_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription: result.rows[0] });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// GET /api/subscriptions/transactions — Get transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM transactions
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
