const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { validateTransferSettings, validateAISettings, validateBrandSettings, validateCRMSettings } = require('../middleware/validate');

const router = express.Router();

// GET /api/settings — Get all client settings
router.get('/', auth, async (req, res) => {
  try {
    const profileResult = await db.query(
      'SELECT business_name, transfer_number, transfer_mode, operating_hours, avg_lead_value, logo_url, n8n_webhook_url, website_url, gstin, crm_type, crm_webhook_url FROM client_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const kbResult = await db.query(
      'SELECT primary_services, top_faqs, ai_goal, booking_link, language, last_updated, update_notes, update_status FROM knowledge_base WHERE client_id = $1',
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

// PATCH /api/settings/ai — Update AI preferences (Language, Booking Link, KB, Website URL)
router.patch('/ai', auth, validateAISettings, async (req, res) => {
  try {
    const { language, booking_link, primary_services, top_faqs, ai_goal, website_url } = req.body;

    await db.query(
      `UPDATE knowledge_base
       SET language = COALESCE($1, language),
           booking_link = COALESCE($2, booking_link),
           primary_services = COALESCE($3, primary_services),
           top_faqs = COALESCE($4, top_faqs),
           ai_goal = COALESCE($5, ai_goal)
       WHERE client_id = $6`,
      [language, booking_link, primary_services, JSON.stringify(top_faqs), ai_goal, req.user.id]
    );

    if (website_url !== undefined) {
      await db.query(
        `UPDATE client_profiles
         SET website_url = $1
         WHERE user_id = $2`,
        [website_url, req.user.id]
      );
    }

    res.json({ message: 'AI preferences and knowledge base updated' });
  } catch (err) {
    console.error('Update AI settings error:', err);
    res.status(500).json({ error: 'Failed to update AI preferences' });
  }
});

// PATCH /api/settings/transfer — Update transfer number
router.patch('/transfer', auth, validateTransferSettings, async (req, res) => {
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

// PATCH /api/settings/brand — Update Brand & Notifications
router.patch('/brand', auth, validateBrandSettings, async (req, res) => {
  try {
    const { business_name, avg_lead_value, logo_url, n8n_webhook_url, gstin } = req.body;

    await db.query(
      `UPDATE client_profiles
       SET business_name = COALESCE($1, business_name),
           avg_lead_value = COALESCE($2, avg_lead_value),
           logo_url = COALESCE($3, logo_url),
           n8n_webhook_url = COALESCE($4, n8n_webhook_url),
           gstin = COALESCE($5, gstin)
       WHERE user_id = $6`,
      [business_name, avg_lead_value, logo_url, n8n_webhook_url, gstin, req.user.id]
    );

    res.json({ message: 'Brand and notification settings updated' });
  } catch (err) {
    console.error('Update brand error:', err);
    res.status(500).json({ error: 'Failed to update brand settings' });
  }
});

// PATCH /api/settings/crm — Update CRM Integrations
router.patch('/crm', auth, validateCRMSettings, async (req, res) => {
  try {
    const { crm_type, crm_webhook_url } = req.body;

    await db.query(
      `UPDATE client_profiles
       SET crm_type = COALESCE($1, crm_type),
           crm_webhook_url = COALESCE($2, crm_webhook_url)
       WHERE user_id = $3`,
      [crm_type, crm_webhook_url, req.user.id]
    );

    res.json({ message: 'CRM integration settings updated' });
  } catch (err) {
    console.error('Update crm error:', err);
    res.status(500).json({ error: 'Failed to update CRM settings' });
  }
});

// POST /api/settings/onboarding/complete
router.post('/onboarding/complete', auth, async (req, res) => {
  try {
    const { kyc_document_type, kyc_document_number, kyc_document_url, terms_accepted } = req.body;

    if (!terms_accepted) {
      return res.status(400).json({ error: 'You must accept the terms of service and safe usage guidelines.' });
    }

    if (!kyc_document_type || !kyc_document_number || !kyc_document_url) {
      return res.status(400).json({ error: 'Identity verification details (KYC) are required.' });
    }

    await db.query(
      `UPDATE client_profiles 
       SET onboarding_status = 'pending_review',
           kyc_document_type = $1,
           kyc_document_number = $2,
           kyc_document_url = $3,
           terms_accepted = true,
           terms_accepted_at = NOW()
       WHERE user_id = $4`,
      [kyc_document_type, kyc_document_number, kyc_document_url, req.user.id]
    );

    res.json({ message: 'Onboarding completed, pending admin review' });
  } catch (err) {
    console.error('Complete onboarding error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

module.exports = router;
