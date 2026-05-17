const plivo = require('plivo');
const db = require('../db/pool');

/**
 * Get a client-specific Plivo instance, falling back to master credentials if no sub-account exists.
 * @param {number|string} clientId - The database ID of the client user.
 * @returns {Promise<plivo.Client>} An initialized Plivo client.
 */
async function getPlivoClient(clientId) {
  if (clientId) {
    try {
      const res = await db.query(
        'SELECT plivo_sub_auth_id, plivo_sub_auth_token FROM plivo_subaccounts WHERE client_id = $1',
        [clientId]
      );
      if (res.rows.length > 0) {
        return new plivo.Client(
          res.rows[0].plivo_sub_auth_id,
          res.rows[0].plivo_sub_auth_token
        );
      }
    } catch (err) {
      console.error('Error fetching plivo subaccount:', err);
    }
  }

  // Fallback to Master Account
  return new plivo.Client(
    process.env.PLIVO_AUTH_ID || '',
    process.env.PLIVO_AUTH_TOKEN || ''
  );
}

/**
 * Ensure a client has a Plivo sub-account, creating it programmatically if necessary.
 * @param {number|string} clientId - The database ID of the client user.
 * @param {string} clientName - The name of the client to label the subaccount.
 * @returns {Promise<{plivo_sub_auth_id: string, plivo_sub_auth_token: string}>} The sub-account credentials.
 */
async function ensurePlivoSubaccount(clientId, clientName) {
  // 1. Check if already exists in DB
  const existing = await db.query(
    'SELECT plivo_sub_auth_id, plivo_sub_auth_token FROM plivo_subaccounts WHERE client_id = $1',
    [clientId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // 2. Not in DB — verify Plivo master credentials
  if (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN) {
    throw new Error('Plivo master credentials not configured');
  }

  // 3. Create sub-account on Plivo
  const masterClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
  const cleanName = `${(clientName || 'Client').replace(/[^a-zA-Z0-9_]/g, '_')}_${clientId}`;
  
  console.log(`Creating Plivo Sub-account for Client ${clientId}: "${cleanName}"...`);
  const subaccount = await masterClient.subaccounts.create({
    name: cleanName,
    enabled: true
  });

  if (!subaccount.authId || !subaccount.authToken) {
    throw new Error('Failed to create Plivo sub-account');
  }

  // 4. Save to database
  await db.query(
    `INSERT INTO plivo_subaccounts (client_id, plivo_sub_auth_id, plivo_sub_auth_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (client_id) DO UPDATE SET plivo_sub_auth_id = $2, plivo_sub_auth_token = $3`,
    [clientId, subaccount.authId, subaccount.authToken]
  );

  return {
    plivo_sub_auth_id: subaccount.authId,
    plivo_sub_auth_token: subaccount.authToken
  };
}

module.exports = {
  getPlivoClient,
  ensurePlivoSubaccount
};
