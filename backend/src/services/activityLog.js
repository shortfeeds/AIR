const db = require('../db/pool');

/**
 * Logs an event to the activity timeline.
 * @param {Object} opts
 * @param {string} opts.clientId - The client this event relates to (optional)
 * @param {string} opts.actorId - Who performed the action (admin user, system, etc.)
 * @param {string} opts.eventType - Category: 'client', 'billing', 'call', 'system', 'onboarding', 'ai'
 * @param {string} opts.title - Short human-readable title
 * @param {string} opts.description - Longer description (optional)
 * @param {Object} opts.metadata - Extra JSON data (optional)
 */
async function logActivity({ clientId = null, actorId = null, eventType, title, description = null, metadata = {} }) {
  try {
    await db.query(
      `INSERT INTO activity_timeline (client_id, actor_id, event_type, title, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [clientId, actorId, eventType, title, description, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Activity logging should never crash the main flow
    console.error('[Activity Log] Failed to log:', err.message);
  }
}

module.exports = { logActivity };
