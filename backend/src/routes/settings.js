const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — Get all client settings
router.get('/', auth, async (req, res) => {
  try {
    const profileResult = await db.query(
      'SELECT transfer_number, transfer_mode, operating_hours FROM client_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const kbResult = await db.query(
      'SELECT primary_services, top_faqs, ai_goal, last_updated, update_notes, update_status FROM knowledge_base WHERE client_id = $1',
      [req.user.id]
    );

    res.json({
      settings: {
        ...profileResult.rows[0],
        knowledge: kbResult.rows[0] || {},
      },
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PATCH /api/settings/transfer — Update transfer number
router.patch('/transfer', auth, async (req, res) => {
  try {
    const { transfer_number, transfer_mode } = req.body;

    await db.query(
      `UPDATE client_profiles
       SET transfer_number = COALESCE($1, transfer_number),
           transfer_mode = COALESCE($2, transfer_mode)
       WHERE user_id = $3`,
      [transfer_number, transfer_mode, req.user.id]
    );

    // TODO: Trigger n8n to notify admin to update Plivo config
    res.json({ message: 'Transfer settings updated. Our team will verify the change shortly.' });
  } catch (err) {
    console.error('Update transfer error:', err);
    res.status(500).json({ error: 'Failed to update transfer settings' });
  }
});

// PATCH /api/settings/hours — Update operating hours
router.patch('/hours', auth, async (req, res) => {
  try {
    const { operating_hours } = req.body;

    await db.query(
      'UPDATE client_profiles SET operating_hours = $1 WHERE user_id = $2',
      [JSON.stringify(operating_hours), req.user.id]
    );

    res.json({ message: 'Operating hours updated' });
  } catch (err) {
    console.error('Update hours error:', err);
    res.status(500).json({ error: 'Failed to update operating hours' });
  }
});

// POST /api/settings/knowledge-update — Submit AI knowledge update request
router.post('/knowledge-update', auth, async (req, res) => {
  try {
    const { update_notes } = req.body;

    await db.query(
      `UPDATE knowledge_base
       SET update_notes = $1, update_status = 'pending_review', last_updated = NOW()
       WHERE client_id = $2`,
      [update_notes, req.user.id]
    );

    // TODO: Trigger n8n email/Slack alert to admin team
    res.json({ message: "Thanks! We'll update your AI within a few hours." });
  } catch (err) {
    console.error('Knowledge update error:', err);
    res.status(500).json({ error: 'Failed to submit update request' });
  }
});

module.exports = router;
