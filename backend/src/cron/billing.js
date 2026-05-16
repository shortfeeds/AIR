const cron = require('node-cron');
const db = require('../db/pool');
const { sendLowBalanceAlert, sendEmail } = require('../services/email');

// Run every hour to check for low balance and expired subscriptions
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running billing & usage checks...');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Check for low balances (under 50 mins) and send alerts
    // We use a flag 'low_balance_alert_sent' in subscriptions table to avoid spamming
    // Let's assume we don't have that column yet, so we'll just check today's sent emails to avoid spam.
    const lowBalanceClients = await client.query(`
      SELECT s.client_id, s.available_minutes, u.email, cp.business_name 
      FROM subscriptions s
      JOIN users u ON u.id = s.client_id
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE s.available_minutes <= 50 AND s.available_minutes > 0 AND s.status = 'active'
    `);

    for (const sub of lowBalanceClients.rows) {
      // Check if we already sent an alert in the last 24 hours
      const recentlySent = await client.query(`
        SELECT id FROM email_log 
        WHERE recipient_email = $1 AND template = 'low_balance' 
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [sub.email]);

      if (recentlySent.rows.length === 0) {
        await sendLowBalanceAlert(sub.email, sub.business_name, sub.available_minutes);
        console.log(`[CRON] Sent low balance alert to ${sub.email}`);
      }
    }

    // 2. Process expired subscriptions (past billing_cycle_end)
    const expiredSubs = await client.query(`
      SELECT s.client_id, u.email, cp.business_name 
      FROM subscriptions s
      JOIN users u ON u.id = s.client_id
      JOIN client_profiles cp ON cp.user_id = u.id
      WHERE s.billing_cycle_end < CURRENT_DATE AND s.status = 'active'
    `);

    for (const sub of expiredSubs.rows) {
      // Mark as expired. The client will still keep any unused minutes if they top-up, 
      // but 'expired' status prevents calls from coming through until they renew.
      await client.query(`UPDATE subscriptions SET status = 'expired' WHERE client_id = $1`, [sub.client_id]);
      
      // Release the Plivo number if they don't renew within 7 days (Handled by a separate job or manually)
      // For now, just send them an email
      await sendEmail({
        to: sub.email,
        subject: 'Action Required: AI Receptionist Subscription Expired',
        template: 'subscription_expired',
        html: `
          <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #ef4444;">Subscription Expired</h2>
            <p>Hi ${sub.business_name},</p>
            <p>Your Trinity Pixels AI Receptionist subscription has expired.</p>
            <p>Your AI assistant is currently paused and cannot answer incoming calls. Please recharge your account immediately to resume service.</p>
            <a href="https://trinitypixels.com/dashboard/usage" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin-top: 10px;">Recharge Now</a>
          </div>
        `
      });
      console.log(`[CRON] Expired subscription for ${sub.email}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CRON] Billing check error:', err);
  } finally {
    client.release();
  }
});

// Run daily at midnight to compute health scores
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Computing client health scores...');
  const { computeAllHealthScores } = require('../services/healthScore');
  await computeAllHealthScores();
});

// Run every Monday at 9 AM to send weekly ROI reports
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Sending weekly ROI reports...');
  const { sendWeeklyROIReports } = require('../services/roiService');
  await sendWeeklyROIReports();
});
