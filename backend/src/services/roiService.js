const db = require('../db/pool');
const { sendEmail } = require('./email');

async function sendWeeklyROIReports() {
  console.log('📊 Starting Weekly ROI Report generation...');
  
  const client = await db.getClient();
  try {
    // Get all active clients with some activity in the last 7 days
    const activeClients = await client.query(`
      SELECT u.id, u.email, u.name, cp.business_name, cp.avg_lead_value
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      JOIN subscriptions s ON s.client_id = u.id
      WHERE u.role = 'client' AND s.status = 'active'
    `);

    for (const user of activeClients.rows) {
      // Fetch stats for the last 7 days
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_calls,
          SUM(call_duration_seconds) as total_seconds,
          COUNT(*) FILTER (WHERE status = 'followed_up') as leads_captured,
          COUNT(*) FILTER (WHERE status = 'transferred') as calls_transferred
        FROM call_leads
        WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '7 days'
      `, [user.id]);

      const data = stats.rows[0];
      if (data.total_calls == 0) continue; // Skip if no calls

      const totalMinutes = Math.ceil(data.total_seconds / 60);
      const hoursSaved = (totalMinutes / 60).toFixed(1);
      const revenueSaved = (data.leads_captured * user.avg_lead_value).toLocaleString('en-IN');

      // Get top inquiry (simple summary extraction)
      const topInquiry = await client.query(`
        SELECT ai_summary FROM call_leads 
        WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '7 days'
        LIMIT 1
      `, [user.id]);

      await sendEmail({
        to: user.email,
        subject: `Weekly Performance Report: ${user.business_name}`,
        template: 'weekly_roi',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: #4f46e5; padding: 32px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Weekly Performance Report</h1>
              <p style="margin: 8px 0 0; opacity: 0.9;">Your AI Assistant is working hard for you!</p>
            </div>
            
            <div style="padding: 32px; background: white;">
              <h2 style="font-size: 18px; margin-top: 0;">Summary for ${user.business_name}</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Calls Handled</p>
                  <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #111827;">${data.total_calls}</p>
                </div>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Staff Hours Saved</p>
                  <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #111827;">${hoursSaved}h</p>
                </div>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Leads Captured</p>
                  <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #10b981;">${data.leads_captured}</p>
                </div>
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Est. Revenue Saved</p>
                  <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #4f46e5;">₹${revenueSaved}</p>
                </div>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="margin: 0; font-weight: 600; color: #374151;">Recent Inquiry Highlight:</p>
                <p style="margin: 8px 0; color: #6b7280; font-style: italic;">"${topInquiry.rows[0]?.ai_summary || 'Managing routine inquiries and bookings.'}"</p>
              </div>

              <div style="margin-top: 32px; text-align: center;">
                <a href="https://trinitypixels.com/dashboard" style="background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; display: inline-block;">View Detailed Analytics</a>
              </div>
            </div>

            <div style="background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">Trinity Pixels — 24/7 AI Voice Receptionist</p>
              <p style="margin: 4px 0;">You are receiving this because you are an active Trinity Pixels subscriber.</p>
            </div>
          </div>
        `
      });
      console.log(`[ROI] Report sent to ${user.email}`);
    }
  } catch (err) {
    console.error('[ROI] Report generation failed:', err);
  } finally {
    client.release();
  }
}

module.exports = { sendWeeklyROIReports };
