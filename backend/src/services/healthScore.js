const db = require('../db/pool');

/**
 * Computes a health score for each active client.
 * Score factors:
 *  - Recency: last call within 7 days (+30), 14 days (+15), 30 days (+5)
 *  - Volume: calls this month (>10: +20, >5: +10, >0: +5)
 *  - Balance: minutes remaining (>100: +20, >50: +10, <10: -10)
 *  - Engagement: has KB configured (+10), has active number (+10)
 *  - Subscription: active sub (+10), expired (-20)
 */
async function computeAllHealthScores() {
  try {
    const clients = await db.query(`
      SELECT 
        u.id,
        s.available_minutes,
        s.status as sub_status,
        pn.plivo_number,
        kb.primary_services,
        (SELECT MAX(call_timestamp) FROM call_leads cl WHERE cl.client_id = u.id) as last_call,
        (SELECT COUNT(*) FROM call_leads cl WHERE cl.client_id = u.id AND cl.call_timestamp >= date_trunc('month', CURRENT_DATE)) as calls_this_month
      FROM users u
      LEFT JOIN subscriptions s ON s.client_id = u.id
      LEFT JOIN phone_numbers pn ON pn.client_id = u.id AND pn.is_active = true
      LEFT JOIN knowledge_base kb ON kb.client_id = u.id
      WHERE u.role = 'client'
    `);

    let computed = 0;
    for (const c of clients.rows) {
      const factors = {};
      let score = 0;

      // Recency factor
      if (c.last_call) {
        const daysSince = Math.floor((Date.now() - new Date(c.last_call).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince <= 7) { score += 30; factors.recency = { points: 30, detail: `Last call ${daysSince}d ago` }; }
        else if (daysSince <= 14) { score += 15; factors.recency = { points: 15, detail: `Last call ${daysSince}d ago` }; }
        else if (daysSince <= 30) { score += 5; factors.recency = { points: 5, detail: `Last call ${daysSince}d ago` }; }
        else { factors.recency = { points: 0, detail: `Inactive for ${daysSince}d` }; }
      } else {
        factors.recency = { points: 0, detail: 'No calls yet' };
      }

      // Volume factor
      const monthCalls = parseInt(c.calls_this_month) || 0;
      if (monthCalls > 10) { score += 20; factors.volume = { points: 20, detail: `${monthCalls} calls this month` }; }
      else if (monthCalls > 5) { score += 10; factors.volume = { points: 10, detail: `${monthCalls} calls this month` }; }
      else if (monthCalls > 0) { score += 5; factors.volume = { points: 5, detail: `${monthCalls} calls this month` }; }
      else { factors.volume = { points: 0, detail: 'No calls this month' }; }

      // Balance factor
      const mins = parseInt(c.available_minutes) || 0;
      if (mins > 100) { score += 20; factors.balance = { points: 20, detail: `${mins} mins remaining` }; }
      else if (mins > 50) { score += 10; factors.balance = { points: 10, detail: `${mins} mins remaining` }; }
      else if (mins < 10) { score -= 10; factors.balance = { points: -10, detail: `Critical: ${mins} mins` }; }
      else { factors.balance = { points: 0, detail: `${mins} mins remaining` }; }

      // Engagement factor
      if (c.plivo_number) { score += 10; factors.phone = { points: 10, detail: 'Active number assigned' }; }
      else { factors.phone = { points: 0, detail: 'No number assigned' }; }

      if (c.primary_services) { score += 10; factors.kb = { points: 10, detail: 'KB configured' }; }
      else { factors.kb = { points: 0, detail: 'KB not configured' }; }

      // Subscription factor
      if (c.sub_status === 'active') { score += 10; factors.subscription = { points: 10, detail: 'Active subscription' }; }
      else if (c.sub_status === 'expired') { score -= 20; factors.subscription = { points: -20, detail: 'Subscription expired' }; }
      else { factors.subscription = { points: 0, detail: c.sub_status || 'Unknown' }; }

      // Clamp
      score = Math.max(0, Math.min(100, score));

      // Grade
      let grade = 'F';
      if (score >= 80) grade = 'A';
      else if (score >= 60) grade = 'B';
      else if (score >= 40) grade = 'C';
      else if (score >= 20) grade = 'D';

      await db.query(
        `INSERT INTO client_health_scores (client_id, score, grade, factors) VALUES ($1, $2, $3, $4)`,
        [c.id, score, grade, JSON.stringify(factors)]
      );
      computed++;
    }

    console.log(`[Health Scores] Computed for ${computed} clients`);
    return computed;
  } catch (err) {
    console.error('[Health Scores] Computation failed:', err);
    return 0;
  }
}

module.exports = { computeAllHealthScores };
