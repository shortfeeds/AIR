const express = require('express');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { validateLeadStatus, validateLeadQuery, validateUUID } = require('../middleware/validate');

const router = express.Router();

const { getPagination, formatPaginated } = require('../utils/pagination');

// GET /api/leads — Get leads for the authenticated client
router.get('/', auth, validateLeadQuery, async (req, res) => {
  try {
    const { status } = req.query;
    const { limit, offset, page } = getPagination(req.query);
    
    let query = `SELECT * FROM call_leads WHERE client_id = $1 AND deleted_at IS NULL`;
    const params = [req.user.id];
    let paramIndex = 2;

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY call_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM call_leads WHERE client_id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json(formatPaginated(result.rows, total, page, limit));
  } catch (err) {
    console.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/roi — Get ROI metrics for the authenticated client
router.get('/roi', auth, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(call_duration_seconds) as total_seconds,
        COUNT(*) FILTER (WHERE status = 'followed_up' OR lead_score > 70) as leads_captured,
        COUNT(*) FILTER (WHERE status = 'transferred') as calls_transferred
      FROM call_leads
      WHERE client_id = $1 AND deleted_at IS NULL
    `, [req.user.id]);

    const profile = await db.query('SELECT avg_lead_value FROM client_profiles WHERE user_id = $1', [req.user.id]);
    const avgLeadValue = profile.rows[0]?.avg_lead_value || 1000;

    const data = stats.rows[0];
    const totalMinutes = Math.ceil(data.total_seconds / 60);
    const hoursSaved = (totalMinutes / 60).toFixed(1);
    const revenuePreserved = data.leads_captured * avgLeadValue;

    res.json({
      totalCalls: parseInt(data.total_calls),
      leadsCaptured: parseInt(data.leads_captured),
      hoursSaved: parseFloat(hoursSaved),
      revenuePreserved: parseInt(revenuePreserved),
      callsTransferred: parseInt(data.calls_transferred)
    });
  } catch (err) {
    console.error('ROI calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate ROI' });
  }
});

// PATCH /api/leads/:id/status — Update lead status
router.patch('/:id/status', auth, validateUUID, validateLeadStatus, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['new', 'followed_up', 'transferred'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE call_leads SET status = $1
       WHERE id = $2 AND client_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead: result.rows[0] });
  } catch (err) {
    console.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id — Soft delete a lead
router.delete('/:id', auth, validateUUID, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE call_leads SET deleted_at = NOW() WHERE id = $1 AND client_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Delete lead error:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET /api/leads/stats — Get today's stats for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE call_timestamp >= CURRENT_DATE) as calls_today,
        COALESCE(SUM(call_duration_seconds) FILTER (WHERE call_timestamp >= CURRENT_DATE), 0) as minutes_today,
        COUNT(*) FILTER (WHERE status = 'followed_up' AND call_timestamp >= CURRENT_DATE) as followed_up_today,
        COUNT(*) FILTER (WHERE status = 'new') as total_new_leads,
        COUNT(*) as total_leads,
        (SELECT avg_lead_value FROM client_profiles WHERE user_id = $1) as avg_lead_value,
        chs.score as health_score,
        chs.grade as health_grade
       FROM call_leads cl
       LEFT JOIN client_health_scores chs ON chs.client_id = $1
       WHERE cl.client_id = $1
       ORDER BY chs.computed_at DESC LIMIT 1`,
      [req.user.id]
    );

    const stats = result.rows[0];
    if (stats) {
      stats.minutes_today = Math.ceil(parseInt(stats.minutes_today) / 60);
      stats.total_revenue_saved = stats.total_leads * (stats.avg_lead_value || 1000);
    }

    res.json({ stats: stats || {} });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/leads/analytics — Get historical trends for charts
router.get('/analytics', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // 1. Daily call volume for trends chart
    const dailyVolume = await db.query(
      `SELECT 
        DATE(call_timestamp) as date,
        COUNT(*) as count,
        CEIL(SUM(call_duration_seconds)::float / 60) as minutes
       FROM call_leads
       WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(call_timestamp)
       ORDER BY DATE(call_timestamp) ASC`,
      [req.user.id, days]
    );

    // 2. Hourly distribution for peak hours heatmap
    const hourlyDistribution = await db.query(
      `SELECT 
        EXTRACT(HOUR FROM call_timestamp) as hour,
        COUNT(*) as count
       FROM call_leads
       WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '1 day' * $2
       GROUP BY hour
       ORDER BY hour ASC`,
      [req.user.id, days]
    );

    // 3. Status breakdown for conversion funnel
    const statusBreakdown = await db.query(
      `SELECT status, COUNT(*) as count
       FROM call_leads
       WHERE client_id = $1 AND call_timestamp > NOW() - INTERVAL '1 day' * $2
       GROUP BY status`,
      [req.user.id, days]
    );

    res.json({
      daily: dailyVolume.rows,
      hourly: hourlyDistribution.rows,
      status: statusBreakdown.rows
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
