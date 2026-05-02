const express = require('express');
const db = require('../db/pool');
const router = express.Router();

// GET /api/plivo/verify — Pre-call verification (must respond < 500ms)
router.get('/verify', async (req, res) => {
  try {
    const toNumber = req.query.to_number;
    if (!toNumber) return res.status(400).send('<Response><Speak>Invalid request.</Speak></Response>');

    // Look up which client owns this number
    const pn = await db.query(
      'SELECT client_id FROM phone_numbers WHERE plivo_number = $1 AND is_active = true',
      [toNumber]
    );
    if (pn.rows.length === 0) {
      return res.type('text/xml').send('<Response><Speak>This number is not configured. Please try again later.</Speak></Response>');
    }

    // Check available minutes
    const sub = await db.query(
      'SELECT available_minutes FROM subscriptions WHERE client_id = $1',
      [pn.rows[0].client_id]
    );
    if (!sub.rows.length || sub.rows[0].available_minutes <= 0) {
      return res.type('text/xml').send('<Response><Speak>This service is temporarily unavailable. Please call back later.</Speak></Response>');
    }

    // Minutes available — proceed with AI agent
    res.type('text/xml').send('<Response><Speak>Connecting you to the AI assistant.</Speak></Response>');
  } catch (err) {
    console.error('Pre-call verify error:', err);
    res.type('text/xml').send('<Response><Speak>We are experiencing issues. Please try again later.</Speak></Response>');
  }
});

// POST /api/plivo/post-call — Post-call logging (called by n8n)
router.post('/post-call', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { plivo_number, caller_number, duration_seconds, transcript, ai_summary, action_taken } = req.body;

    // Find client by Plivo number
    const pn = await client.query(
      'SELECT client_id FROM phone_numbers WHERE plivo_number = $1',
      [plivo_number]
    );
    if (pn.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unknown Plivo number' });
    }

    const clientId = pn.rows[0].client_id;
    const minutesToDeduct = Math.ceil(duration_seconds / 60);

    // Insert call lead
    await client.query(
      `INSERT INTO call_leads (client_id, caller_number, call_duration_seconds, ai_summary, transcript_raw, action_taken)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, caller_number, duration_seconds, ai_summary || '', transcript || '', action_taken || '']
    );

    // Deduct minutes
    await client.query(
      `UPDATE subscriptions SET available_minutes = GREATEST(available_minutes - $1, 0) WHERE client_id = $2`,
      [minutesToDeduct, clientId]
    );

    await client.query('COMMIT');

    // Check if below threshold
    const subCheck = await db.query('SELECT available_minutes FROM subscriptions WHERE client_id = $1', [clientId]);
    const remaining = subCheck.rows[0]?.available_minutes || 0;

    res.json({ success: true, minutes_remaining: remaining, low_balance: remaining < 50 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Post-call log error:', err);
    res.status(500).json({ error: 'Failed to log call' });
  } finally {
    client.release();
  }
// POST /api/plivo/fallback — SMS text-back if AI fails or call is missed
router.post('/fallback', async (req, res) => {
  try {
    const { From, To } = req.body; // Plivo sends From (caller) and To (business number)

    // Find the business name to make the SMS personal
    const biz = await db.query(
      `SELECT cp.business_name FROM phone_numbers pn 
       JOIN client_profiles cp ON cp.user_id = pn.client_id 
       WHERE pn.plivo_number = $1`, [To]
    );

    const businessName = biz.rows[0]?.business_name || "us";

    // Plivo XML to send SMS
    res.type('text/xml').send(`
      <Response>
        <Message from="${To}" to="${From}">
          Hi, you just called ${businessName}. Our AI lines are currently busy, but how can we help you via text?
        </Message>
      </Response>
    `);
  } catch (err) {
    console.error('Fallback webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

module.exports = router;
