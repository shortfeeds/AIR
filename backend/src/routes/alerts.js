const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts — Fetch active alerts for a client
router.get('/', auth, async (req, res) => {
  try {
    // We check subscription balance
    const sub = await db.query(
      'SELECT available_minutes, plan_name FROM subscriptions WHERE client_id = $1',
      [req.user.id]
    );

    const alerts = [];
    if (sub.rows.length > 0) {
      const { available_minutes, plan_name } = sub.rows[0];
      
      if (available_minutes <= 0) {
        alerts.push({
          id: 'balance_exhausted',
          type: 'danger',
          title: 'Minutes Exhausted',
          message: 'Your AI receptionist is inactive. Please recharge to resume service.',
          action_label: 'Recharge Now',
          action_link: '/dashboard/usage'
        });
      } else if (available_minutes < 20) {
        alerts.push({
          id: 'balance_critical',
          type: 'warning',
          title: 'Balance Critical',
          message: `Only ${available_minutes} minutes remaining. Service will stop soon.`,
          action_label: 'Top Up',
          action_link: '/dashboard/usage'
        });
      } else if (available_minutes < 50) {
        alerts.push({
          id: 'balance_low',
          type: 'info',
          title: 'Low Balance',
          message: `You have ${available_minutes} minutes left. Consider a top-up soon.`,
          action_label: 'View Plans',
          action_link: '/dashboard/usage'
        });
      }
    }

    res.json({ alerts });
  } catch (err) {
    console.error('Fetch alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
