const cron = require('node-cron');
const db = require('../db/pool');

// Runs every Sunday at 11:59 PM
cron.schedule('59 23 * * 0', async () => {
  console.log('📊 Generating weekly ROI reports...');
  try {
    const clients = await db.query(
      `SELECT u.id, u.email, u.name, cp.business_name, cp.avg_lead_value, cp.n8n_webhook_url 
       FROM users u 
       JOIN client_profiles cp ON cp.user_id = u.id 
       WHERE u.role = 'client'`
    );

    for (const client of clients.rows) {
      const leads = await db.query(
        `SELECT COUNT(*) as total_leads, SUM(call_duration_seconds) as total_seconds 
         FROM call_leads 
         WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '7 days'`,
        [client.id]
      );

      const stats = {
        total_leads: parseInt(leads.rows[0].total_leads) || 0,
        total_minutes: Math.ceil((leads.rows[0].total_seconds || 0) / 60),
        estimated_roi: (parseInt(leads.rows[0].total_leads) || 0) * (client.avg_lead_value || 1000)
      };

      // Trigger n8n if webhook exists
      if (client.n8n_webhook_url) {
        fetch(client.n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'weekly_report',
            client_name: client.name,
            business_name: client.business_name,
            email: client.email,
            stats
          })
        }).catch(e => console.error(`Report failed for ${client.email}:`, e.message));
      }
    }
    console.log('✅ Weekly ROI reports dispatched');
  } catch (err) {
    console.error('Error generating weekly reports:', err);
  }
});
