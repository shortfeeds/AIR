const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/referrals — Fetch referral stats, active wallet balance, and full transaction history ledger
router.get('/', auth, async (req, res) => {
  try {
    const clientId = req.user.id;

    // 1. Fetch user's referral code
    const userRes = await db.query('SELECT referral_code FROM users WHERE id = $1', [clientId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const referralCode = userRes.rows[0].referral_code;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const referralLink = `${frontendUrl}/signup?ref=${referralCode}`;

    // 2. Fetch active wallet credit balance (FIFO sum of remaining unexpired credits)
    const balanceRes = await db.query(
      "SELECT COALESCE(SUM(remaining_amount_inr), 0) as balance FROM wallet_credits WHERE client_id = $1 AND expires_at > NOW()",
      [clientId]
    );
    const activeBalance = parseFloat(balanceRes.rows[0].balance);

    // 3. Fetch total earned credits (all-time sum)
    const earnedRes = await db.query(
      "SELECT COALESCE(SUM(amount_inr), 0) as earned FROM wallet_credits WHERE client_id = $1",
      [clientId]
    );
    const totalEarned = parseFloat(earnedRes.rows[0].earned);

    // 4. Fetch referred users count
    const countRes = await db.query(
      "SELECT COUNT(*) FROM users WHERE referred_by = $1",
      [clientId]
    );
    const referredUsersCount = parseInt(countRes.rows[0].count);

    // 5. Fetch successful activations count (referees referred by user who made at least 1 captured transaction)
    const activationsRes = await db.query(
      `SELECT COUNT(DISTINCT u.id) 
       FROM users u
       JOIN transactions t ON t.client_id = u.id
       WHERE u.referred_by = $1 AND t.status = 'captured'`,
      [clientId]
    );
    const successfulReferralsCount = parseInt(activationsRes.rows[0].count);

    // 6. Fetch wallet ledger logs (deposits and spends)
    const ledgerRes = await db.query(
      `SELECT id, amount_inr, type, description, created_at 
       FROM wallet_ledger 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    );
    const ledger = ledgerRes.rows.map(row => ({
      ...row,
      amount_inr: parseFloat(row.amount_inr),
      amount_display: `${row.type === 'credit' ? '+' : ''}₹${parseFloat(row.amount_inr).toLocaleString('en-IN')}`
    }));

    // 7. Fetch invites list showing status (joined vs activated)
    const invitesRes = await db.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              EXISTS(SELECT 1 FROM transactions t WHERE t.client_id = u.id AND t.status = 'captured') as is_activated
       FROM users u
       WHERE u.referred_by = $1
       ORDER BY u.created_at DESC`,
      [clientId]
    );
    const invites = invitesRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*'), // Mask email for privacy
      joined_at: row.created_at,
      status: row.is_activated ? 'Activated (₹500 Granted)' : 'Joined (Pending First Payment)'
    }));

    res.json({
      referralCode,
      referralLink,
      activeBalance,
      totalEarned,
      referredUsersCount,
      successfulReferralsCount,
      ledger,
      invites
    });
  } catch (err) {
    console.error('Fetch referrals error:', err);
    res.status(500).json({ error: 'Failed to retrieve referral dashboard data' });
  }
});

module.exports = router;
