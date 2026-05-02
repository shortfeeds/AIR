const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/clients/profile — Get own client profile
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cp.*, u.name, u.email
       FROM client_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/clients/profile — Update own client profile (Onboarding Intake)
router.put('/profile', auth, async (req, res) => {
  try {
    const { business_name, city, operating_hours, website_url, transfer_number, transfer_mode } = req.body;

    const result = await db.query(
      `UPDATE client_profiles
       SET business_name = COALESCE($1, business_name),
           city = COALESCE($2, city),
           operating_hours = COALESCE($3, operating_hours),
           website_url = COALESCE($4, website_url),
           transfer_number = COALESCE($5, transfer_number),
           transfer_mode = COALESCE($6, transfer_mode)
       WHERE user_id = $7
       RETURNING *`,
      [business_name, city, operating_hours ? JSON.stringify(operating_hours) : null, website_url, transfer_number, transfer_mode, req.user.id]
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/clients/onboarding — Submit full intake form
router.post('/onboarding', auth, async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      business_name, city, operating_hours, website_url,
      transfer_number, transfer_mode,
      primary_services, top_faqs, ai_goal,
    } = req.body;

    // Update client profile
    await client.query(
      `UPDATE client_profiles
       SET business_name = $1, city = $2, operating_hours = $3,
           website_url = $4, transfer_number = $5, transfer_mode = $6,
           onboarding_status = 'pending'
       WHERE user_id = $7`,
      [business_name, city, JSON.stringify(operating_hours), website_url, transfer_number, transfer_mode, req.user.id]
    );

    // Update knowledge base
    await client.query(
      `UPDATE knowledge_base
       SET primary_services = $1, top_faqs = $2, ai_goal = $3, last_updated = NOW()
       WHERE client_id = $4`,
      [primary_services, JSON.stringify(top_faqs), ai_goal, req.user.id]
    );

    await client.query('COMMIT');

    // TODO: Trigger n8n webhook to notify admin team
    // fetch(process.env.N8N_ADMIN_ALERT_WEBHOOK, { method: 'POST', ... })

    res.json({ message: 'Onboarding submitted! Our team will activate your AI within 24 hours.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to submit onboarding' });
  } finally {
    client.release();
  }
});

module.exports = router;
