const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { validateUUID, validateCreateClient, validateAddMinutes, validateChangePlan, validatePasswordReset } = require('../middleware/validate');
const router = express.Router();
router.use(auth, adminOnly);

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='client') as total_clients,
        (SELECT COALESCE(SUM(call_duration_seconds),0) FROM call_leads WHERE call_timestamp >= date_trunc('month',CURRENT_DATE)) as minutes_this_month,
        (SELECT COALESCE(SUM(amount_inr),0) FROM transactions WHERE status='captured' AND created_at >= date_trunc('month',CURRENT_DATE)) as revenue_this_month,
        (SELECT COUNT(*) FROM call_leads WHERE call_timestamp >= CURRENT_DATE) as calls_today
    `);
    const lowMin = await db.query(`SELECT u.id,u.name,u.email,s.available_minutes,s.plan_name FROM subscriptions s JOIN users u ON u.id=s.client_id WHERE s.available_minutes<50 AND s.status='active' ORDER BY s.available_minutes`);
    const recent = await db.query(`SELECT u.id,u.name,u.email,u.created_at,cp.onboarding_status FROM users u JOIN client_profiles cp ON cp.user_id=u.id WHERE u.role='client' ORDER BY u.created_at DESC LIMIT 10`);
    const s = stats.rows[0];
    s.minutes_this_month = Math.ceil(parseInt(s.minutes_this_month)/60);
    res.json({ stats: s, low_minutes_alerts: lowMin.rows, recent_signups: recent.rows });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.get('/clients', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id,u.name,u.email,u.created_at,cp.business_name,cp.onboarding_status,s.plan_name,s.available_minutes,s.status as sub_status,pn.plivo_number,kb.prompt_b,kb.ab_split_active,
      (SELECT MAX(call_timestamp) FROM call_leads cl WHERE cl.client_id=u.id) as last_call 
      FROM users u 
      LEFT JOIN client_profiles cp ON cp.user_id=u.id 
      LEFT JOIN subscriptions s ON s.client_id=u.id 
      LEFT JOIN phone_numbers pn ON pn.client_id=u.id AND pn.is_active=true 
      LEFT JOIN knowledge_base kb ON kb.client_id=u.id
      WHERE u.role='client' 
      ORDER BY u.created_at DESC`);
    res.json({ clients: result.rows });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.get('/clients/:id', async (req, res) => {
  try {
    const u = await db.query(`SELECT u.*,cp.*,s.plan_name,s.available_minutes,s.total_minutes_purchased,pn.plivo_number,kb.primary_services,kb.top_faqs,kb.ai_goal,kb.update_notes,kb.update_status FROM users u LEFT JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN subscriptions s ON s.client_id=u.id LEFT JOIN phone_numbers pn ON pn.client_id=u.id LEFT JOIN knowledge_base kb ON kb.client_id=u.id WHERE u.id=$1`,[req.params.id]);
    if(!u.rows.length) return res.status(404).json({error:'Not found'});
    const leads = await db.query('SELECT * FROM call_leads WHERE client_id=$1 ORDER BY call_timestamp DESC LIMIT 50',[req.params.id]);
    const txns = await db.query('SELECT * FROM transactions WHERE client_id=$1 ORDER BY created_at DESC LIMIT 20',[req.params.id]);
    res.json({ client: u.rows[0], leads: leads.rows, transactions: txns.rows });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

// POST /api/admin/clients/:id/assign-number — Assign or Buy a Plivo number
router.post('/clients/:id/assign-number', async (req, res) => {
  const { plivo_number, buy = false } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    if (buy && process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
      const plivo = require('plivo');
      const plivoClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
      await plivoClient.numbers.buy(plivo_number, { app_id: process.env.PLIVO_APP_ID || '' });
    }

    await client.query(
      'INSERT INTO phone_numbers (client_id, plivo_number, is_active) VALUES ($1, $2, true) ON CONFLICT (plivo_number) DO UPDATE SET client_id = $1, is_active = true',
      [req.params.id, plivo_number]
    );

    await client.query(
      'UPDATE client_profiles SET onboarding_status = \'active\' WHERE user_id = $1',
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign number error:', err);
    res.status(500).json({ error: 'Failed to assign number' });
  } finally {
    client.release();
  }
});

router.post('/clients/:id/add-minutes', validateUUID, validateAddMinutes, async (req, res) => {
  try {
    const { minutes } = req.body;
    await db.query(`UPDATE subscriptions SET available_minutes=available_minutes+$1,total_minutes_purchased=total_minutes_purchased+$1 WHERE client_id=$2`,[minutes,req.params.id]);
    await db.query(`INSERT INTO transactions(client_id,amount_inr,minutes_purchased,plan_name,status) VALUES($1,0,$2,'bonus','captured')`,[req.params.id,minutes]);
    res.json({ message:`${minutes} bonus minutes added` });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.post('/clients/:id/change-plan', validateUUID, validateChangePlan, async (req, res) => {
  try {
    const { plan_name } = req.body;
    // Update the subscription's plan_name. Doesn't reset minutes, just changes tier label.
    await db.query(`UPDATE subscriptions SET plan_name=$1 WHERE client_id=$2`, [plan_name, req.params.id]);
    res.json({ message: `Plan changed to ${plan_name}` });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/onboarding', async (req, res) => {
  try {
    const result = await db.query(`SELECT u.id,u.name,u.email,u.created_at,cp.business_name,cp.city,cp.website_url,cp.transfer_number,cp.onboarding_status,cp.kyc_document_type,cp.kyc_document_number,cp.kyc_document_url,cp.terms_accepted,kb.primary_services,kb.top_faqs,kb.ai_goal FROM users u JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN knowledge_base kb ON kb.client_id=u.id WHERE cp.onboarding_status IN ('pending', 'pending_review') ORDER BY u.created_at`);
    res.json({ queue: result.rows });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.get('/knowledge-updates', async (req, res) => {
  try {
    const result = await db.query(`SELECT kb.*,u.name,u.email,cp.business_name FROM knowledge_base kb JOIN users u ON u.id=kb.client_id JOIN client_profiles cp ON cp.user_id=u.id WHERE kb.update_status='pending_review' ORDER BY kb.last_updated`);
    res.json({ updates: result.rows });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.patch('/knowledge-updates/:clientId/resolve', async (req, res) => {
  try {
    await db.query(`UPDATE knowledge_base SET update_status='current' WHERE client_id=$1`,[req.params.clientId]);
    res.json({ message:'Resolved' });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

// POST /api/admin/clients/:id/auto-configure — Scrape website and auto-fill KB
router.post('/clients/:id/auto-configure', validateUUID, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const client = await db.getClient();
  try {
    const { scrapeWebsite } = require('../services/scraper');
    const { generatePrompt, detectIndustry } = require('../services/promptGenerator');
    
    const scraped = await scrapeWebsite(url);
    const industry = detectIndustry(scraped);
    const result = await generatePrompt(scraped, { industry });

    await client.query('BEGIN');

    // Update profile
    await client.query(
      'UPDATE client_profiles SET business_name = COALESCE($1, business_name) WHERE user_id = $2',
      [scraped.business_name || '', req.params.id]
    );

    // Update Knowledge Base
    await client.query(
      `UPDATE knowledge_base SET 
        primary_services = $1, 
        top_faqs = $2, 
        ai_goal = $3,
        prompt_b = $4
       WHERE client_id = $5`,
      [
        (scraped.services || []).join(', '),
        JSON.stringify(scraped.faqs || []),
        result.ai_goal,
        result.prompt,
        req.params.id
      ]
    );

    await client.query('COMMIT');
    res.json({ message: 'Auto-configured successfully', scraped, prompt: result.prompt });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Auto-configure error:', err);
    res.status(500).json({ error: 'Failed to auto-configure client' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/clients/:id — Update client details
router.patch('/clients/:id', async (req, res) => {
  const { name, email, business_name, onboarding_status } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    if (email) {
      const emailCheck = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.params.id]);
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'A user with this email address already exists.' });
      }
    }

    if (name || email) {
      await client.query(
        'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3',
        [name, email, req.params.id]
      );
    }

    if (business_name || onboarding_status) {
      await client.query(
        'UPDATE client_profiles SET business_name = COALESCE($1, business_name), onboarding_status = COALESCE($2, onboarding_status) WHERE user_id = $3',
        [business_name, onboarding_status, req.params.id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Client updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/clients/:id — Delete a client account
router.delete('/clients/:id', async (req, res) => {
  try {
    // Note: CASCADE on foreign keys in schema handles related records
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// POST /api/admin/impersonate/:id — Login as client
router.post('/impersonate/:id', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = result.rows[0];
    const token = jwt.sign(
      { id: client.id, email: client.email, role: client.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_123',
      { expiresIn: '1h' }
    );

    res.json({ token, client });
  } catch (err) {
    console.error('Impersonation error:', err);
    res.status(500).json({ error: 'Failed to impersonate client' });
  }
});

// GET /api/admin/analytics/trends — Get monthly growth stats
router.get('/analytics/trends', async (req, res) => {
  try {
    const revenue = await db.query(`
      SELECT 
        to_char(created_at, 'Mon YYYY') as month,
        sum(amount_inr) as total_revenue
      FROM transactions 
      WHERE status = 'captured' 
      GROUP BY month, date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) DESC
      LIMIT 6
    `);

    const usage = await db.query(`
      SELECT 
        to_char(call_timestamp, 'Mon YYYY') as month,
        ceil(sum(call_duration_seconds)/60.0) as total_minutes
      FROM call_leads 
      GROUP BY month, date_trunc('month', call_timestamp)
      ORDER BY date_trunc('month', call_timestamp) DESC
      LIMIT 6
    `);

    res.json({
      revenue: revenue.rows.reverse(),
      usage: usage.rows.reverse()
    });
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// POST /api/admin/clients — Create a new client manually
router.post('/clients', validateCreateClient, async (req, res) => {
  const { name, email, password, business_name, plan_name, initial_minutes, plivo_number } = req.body;

  // Prevent duplicate email creation
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }
  } catch (err) {
    console.error('Email duplicate check error:', err);
    return res.status(500).json({ error: 'Failed to verify email uniqueness' });
  }

  const client = await db.getClient();
  try {
    const bcrypt = require('bcryptjs');
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);
    
    const userRes = await client.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hash, 'client']
    );
    const userId = userRes.rows[0].id;

    await client.query(
      'INSERT INTO client_profiles (user_id, business_name, onboarding_status) VALUES ($1, $2, $3)',
      [userId, business_name, plivo_number ? 'active' : 'pending']
    );

    if (plivo_number) {
      await client.query(
        'INSERT INTO phone_numbers (client_id, plivo_number) VALUES ($1, $2)',
        [userId, plivo_number]
      );
    }

    // Assign initial plan with provided minutes
    await client.query(
      'INSERT INTO subscriptions (client_id, plan_name, available_minutes, total_minutes_purchased, status) VALUES ($1, $2, $3, $3, $4)',
      [userId, plan_name || 'starter', initial_minutes || 0, 'active']
    );

    // Initial system prompt setup
    await client.query(
      'INSERT INTO knowledge_base (client_id, ai_goal) VALUES ($1, $2)',
      [userId, 'Answer calls professionally and collect lead details.']
    );

    await client.query('COMMIT');
    
    // --- PHASE 4: Send Welcome Email ---
    const { sendWelcomeEmail } = require('../services/email');
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    sendWelcomeEmail(email, business_name || name, password, loginUrl).catch(console.error);
    // -----------------------------------

    res.json({ message: 'Client created successfully', userId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Manual client creation error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/clients/:id/password — Reset user password
router.patch('/clients/:id/password', validateUUID, validatePasswordReset, async (req, res) => {
  try {
    const { password } = req.body;
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// PATCH /api/admin/clients/:id/ab-test — Update A/B test settings
router.patch('/clients/:id/ab-test', async (req, res) => {
  try {
    const { prompt_b, ab_split_active } = req.body;
    await db.query(
      'UPDATE knowledge_base SET prompt_b = $1, ab_split_active = $2 WHERE client_id = $3',
      [prompt_b, ab_split_active, req.params.id]
    );
    res.json({ message: 'A/B test settings updated' });
  } catch (err) {
    console.error('A/B test update error:', err);
    res.status(500).json({ error: 'Failed to update A/B test' });
  }
});

// GET /api/admin/settings/plans — Fetch global plans
router.get('/settings/plans', async (req, res) => {
  try {
    const result = await db.query("SELECT value FROM global_settings WHERE key = 'plans'");
    res.json({ plans: result.rows[0]?.value || {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// PATCH /api/admin/settings/plans — Update global plans
router.patch('/settings/plans', async (req, res) => {
  try {
    const { plans } = req.body;
    await db.query("UPDATE global_settings SET value = $1, updated_at = NOW() WHERE key = 'plans'", [JSON.stringify(plans)]);
    res.json({ message: 'Plans updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plans' });
  }
});

// GET /api/admin/plivo/available-numbers — Fetch numbers available to rent from Plivo
router.get('/plivo/available-numbers', async (req, res) => {
  try {
    if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN) {
      return res.status(501).json({ error: 'Plivo not configured' });
    }
    const plivo = require('plivo');
    const client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
    const numbers = await client.numbers.search('IN', { limit: 20 });
    res.json({ numbers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available numbers' });
  }
});

// GET /api/admin/plivo/owned-numbers — Fetch numbers ALREADY PURCHASED in Plivo account
router.get('/plivo/owned-numbers', async (req, res) => {
  try {
    if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN) {
      return res.status(501).json({ error: 'Plivo not configured' });
    }
    const plivo = require('plivo');
    const client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
    
    // List numbers already rented in the account
    const numbers = await client.numbers.list({ limit: 50 });
    
    // We filter out numbers that are already assigned in our DB
    const assignedResult = await db.query('SELECT plivo_number FROM phone_numbers WHERE is_active = true');
    const assignedSet = new Set(assignedResult.rows.map(r => r.plivo_number));
    
    const availableOwned = numbers.map(n => ({
      number: n.number,
      alias: n.alias,
      is_assigned: assignedSet.has(n.number)
    }));

    res.json({ numbers: availableOwned });
  } catch (err) {
    console.error('Plivo owned list error:', err);
    res.status(500).json({ error: 'Failed to fetch owned numbers' });
  }
});

// POST /api/admin/clients/:id/sync-plivo — Sync historical calls from Plivo
router.post('/clients/:id/sync-plivo', async (req, res) => {
  try {
    const clientId = req.params.id;
    // 1. Get the client's phone number
    const pnRes = await db.query('SELECT plivo_number FROM phone_numbers WHERE client_id = $1 AND is_active = true', [clientId]);
    if (pnRes.rows.length === 0) return res.status(400).json({ error: 'No active number for this client' });
    const plivoNumber = pnRes.rows[0].plivo_number;

    // 2. Fetch logs from Plivo
    if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN) return res.status(501).json({ error: 'Plivo not configured' });
    const plivo = require('plivo');
    const plivoClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
    
    // Get last 50 calls for this number
    const calls = await plivoClient.calls.list({
      to_number: plivoNumber,
      limit: 50
    });

    let importedCount = 0;
    for (const call of calls) {
      // 3. Check if lead already exists by timestamp and number
      const rawTime = call.initiationTime || call.endTime || call.callTime;
      if (!rawTime || !call.fromNumber) continue;

      const callTime = new Date(rawTime).toISOString();
      const existing = await db.query(
        'SELECT id FROM call_leads WHERE client_id = $1 AND caller_number = $2 AND call_timestamp = $3',
        [clientId, call.fromNumber, callTime]
      );

      if (existing.rows.length === 0) {
        // 4. Insert missing lead
        const durationSecs = parseInt(call.callDuration || call.duration) || 0;
        await db.query(
          `INSERT INTO call_leads (client_id, caller_number, call_duration_seconds, ai_summary, status, call_timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [clientId, call.fromNumber, durationSecs, 'Imported from Telephony History', 'new', callTime]
        );
        importedCount++;
      }
    }

    res.json({ message: `Successfully synced. ${importedCount} new records imported.` });
  } catch (err) {
    console.error('Plivo sync error:', err);
    res.status(500).json({ error: 'Failed to sync with Plivo' });
  }
});

// GET /api/admin/prompts/:clientId — Fetch prompt version history
router.get('/prompts/:clientId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT pv.*, u.name as creator_name FROM prompt_versions pv LEFT JOIN users u ON u.id = pv.created_by WHERE pv.client_id = $1 ORDER BY pv.created_at DESC',
      [req.params.clientId]
    );
    res.json({ versions: result.rows });
  } catch (err) {
    console.error('Fetch prompts error:', err);
    res.status(500).json({ error: 'Failed to fetch prompt versions' });
  }
});

// POST /api/admin/prompts/:clientId — Create a new prompt version
router.post('/prompts/:clientId', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { prompt_text, variant = 'A', notes } = req.body;
    
    // Get next version number
    const vRes = await client.query('SELECT COALESCE(MAX(version), 0) + 1 as next_v FROM prompt_versions WHERE client_id = $1', [req.params.clientId]);
    const nextVersion = vRes.rows[0].next_v;

    // Insert new version
    const insertRes = await client.query(
      'INSERT INTO prompt_versions (client_id, version, prompt_text, variant, is_active, created_by, notes) VALUES ($1, $2, $3, $4, false, $5, $6) RETURNING *',
      [req.params.clientId, nextVersion, prompt_text, variant, req.user.id, notes]
    );

    await client.query('COMMIT');
    res.json({ message: 'Prompt version created', version: insertRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create prompt error:', err);
    res.status(500).json({ error: 'Failed to create prompt version' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/prompts/:clientId/:versionId/activate — Set a prompt version as active
router.patch('/prompts/:clientId/:versionId/activate', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    // Get the variant of the version we are activating
    const vRes = await client.query('SELECT variant, prompt_text FROM prompt_versions WHERE id = $1 AND client_id = $2', [req.params.versionId, req.params.clientId]);
    if (vRes.rows.length === 0) throw new Error('Version not found');
    const { variant, prompt_text } = vRes.rows[0];

    // Deactivate current active version for THIS variant
    await client.query(
      'UPDATE prompt_versions SET is_active = false WHERE client_id = $1 AND variant = $2',
      [req.params.clientId, variant]
    );

    // Activate the new one
    await client.query(
      'UPDATE prompt_versions SET is_active = true WHERE id = $1',
      [req.params.versionId]
    );

    // Also update the knowledge_base table for backwards compatibility and agent routes
    if (variant === 'A') {
      // In knowledge base, prompt_A is generated dynamically or stored as basic fields, but let's say we override it completely 
      // Actually, knowledge_base uses `primary_services`, `top_faqs`, etc. to build Prompt A dynamically.
      // But we can store a raw `prompt_a_override` or just let the agent.js route pull directly from `prompt_versions`.
      // We will pull from `prompt_versions` in agent.js!
    }

    await client.query('COMMIT');
    res.json({ message: `Prompt version activated for variant ${variant}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Activate prompt error:', err);
    res.status(500).json({ error: 'Failed to activate prompt version' });
  } finally {
    client.release();
  }
});
// --- PHASE 6: Admin Power Tools ---
const { logActivity } = require('../services/activityLog');

// GET /api/admin/health-scores
router.get('/health-scores', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT chs.*, u.name, u.email, cp.business_name 
      FROM client_health_scores chs
      JOIN users u ON u.id = chs.client_id
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE chs.id IN (
        SELECT MAX(id) FROM client_health_scores GROUP BY client_id
      )
      ORDER BY chs.score ASC
    `);
    res.json({ scores: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch health scores' });
  }
});

// GET /api/admin/activity
router.get('/activity', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT at.*, u.name as client_name, a.name as actor_name
      FROM activity_timeline at
      LEFT JOIN users u ON u.id = at.client_id
      LEFT JOIN users a ON a.id = at.actor_id
      ORDER BY at.created_at DESC
      LIMIT 100
    `);
    res.json({ timeline: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity timeline' });
  }
});

// GET /api/admin/templates
router.get('/templates', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM industry_templates ORDER BY name ASC`);
    res.json({ templates: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/admin/clients/:id/apply-template
router.post('/clients/:id/apply-template', async (req, res) => {
  const { templateId } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    
    const tRes = await client.query('SELECT * FROM industry_templates WHERE id = $1', [templateId]);
    if (tRes.rows.length === 0) throw new Error('Template not found');
    const t = tRes.rows[0];

    // Update Knowledge Base
    await client.query(
      `UPDATE knowledge_base SET 
        primary_services = $1, 
        top_faqs = $2, 
        ai_goal = $3,
        prompt_b = $4
       WHERE client_id = $5`,
      [t.sample_services, JSON.stringify(t.sample_faqs), t.ai_goal, t.system_prompt, req.params.id]
    );

    await client.query('UPDATE industry_templates SET usage_count = usage_count + 1 WHERE id = $1', [templateId]);

    await logActivity({
      clientId: req.params.id,
      actorId: req.user.id,
      eventType: 'onboarding',
      title: `Applied Industry Template: ${t.name}`
    });

    await client.query('COMMIT');
    res.json({ message: 'Template applied successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Template application error:', err);
    res.status(500).json({ error: 'Failed to apply template' });
  } finally {
    client.release();
  }
});

module.exports = router;
