const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
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

router.post('/clients/:id/assign-number', async (req, res) => {
  try {
    const { plivo_number } = req.body;
    await db.query(`INSERT INTO phone_numbers(client_id,plivo_number) VALUES($1,$2) ON CONFLICT(plivo_number) DO UPDATE SET client_id=$1,is_active=true,assigned_at=NOW()`,[req.params.id,plivo_number]);
    await db.query(`UPDATE client_profiles SET onboarding_status='active' WHERE user_id=$1`,[req.params.id]);
    res.json({ message:'Number assigned, client activated' });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.post('/clients/:id/add-minutes', async (req, res) => {
  try {
    const { minutes } = req.body;
    await db.query(`UPDATE subscriptions SET available_minutes=available_minutes+$1,total_minutes_purchased=total_minutes_purchased+$1 WHERE client_id=$2`,[minutes,req.params.id]);
    await db.query(`INSERT INTO transactions(client_id,amount_inr,minutes_purchased,plan_name,status) VALUES($1,0,$2,'bonus','captured')`,[req.params.id,minutes]);
    res.json({ message:`${minutes} bonus minutes added` });
  } catch(err) { console.error(err); res.status(500).json({ error:'Failed' }); }
});

router.post('/clients/:id/change-plan', async (req, res) => {
  try {
    const { plan_name } = req.body;
    // Update the subscription's plan_name. Doesn't reset minutes, just changes tier label.
    await db.query(`UPDATE subscriptions SET plan_name=$1 WHERE client_id=$2`, [plan_name, req.params.id]);
    res.json({ message: `Plan changed to ${plan_name}` });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

router.get('/onboarding', async (req, res) => {
  try {
    const result = await db.query(`SELECT u.id,u.name,u.email,u.created_at,cp.business_name,cp.city,cp.transfer_number,cp.onboarding_status,kb.primary_services,kb.top_faqs,kb.ai_goal FROM users u JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN knowledge_base kb ON kb.client_id=u.id WHERE cp.onboarding_status='pending' ORDER BY u.created_at`);
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
router.post('/clients', async (req, res) => {
  const { name, email, password, business_name, plan_name, initial_minutes, plivo_number } = req.body;
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

    await client.query(
      'INSERT INTO subscriptions (client_id, plan_name, available_minutes, total_minutes_purchased) VALUES ($1, $2, $3, $3)',
      [userId, plan_name || 'silver', initial_minutes || 0]
    );

    await client.query(
      'INSERT INTO knowledge_base (client_id) VALUES ($1)',
      [userId]
    );

    await client.query('COMMIT');
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
router.patch('/clients/:id/password', async (req, res) => {
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

module.exports = router;
