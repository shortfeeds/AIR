const express = require('express');
const db = require('../db/pool');
const router = express.Router();

// GET /api/plivo/verify — Pre-call verification (must respond < 500ms)
router.get('/verify', async (req, res) => {
  try {
    const toNumber = req.query.to_number || req.query.To;
    if (!toNumber) return res.status(400).send('<Response><Speak>Invalid request.</Speak></Response>');

    // Check if this is the demo number
    if (toNumber === process.env.DEMO_PLIVO_NUMBER) {
      return res.type('text/xml').send(`
        <Response>
          <GetDigits action="${process.env.BACKEND_URL}/api/plivo/demo-verify-pin" method="POST" numDigits="4" timeout="10" retries="2">
            <Speak>Welcome to the Trinity Pixels AI preview. Please enter your 4 digit demo PIN.</Speak>
          </GetDigits>
          <Speak>No input received. Goodbye.</Speak>
        </Response>
      `);
    }


    // Look up which client owns this number
    const pn = await db.query(
      `SELECT pn.client_id, kb.language, kb.voice_id 
       FROM phone_numbers pn 
       LEFT JOIN knowledge_base kb ON kb.client_id = pn.client_id
       WHERE pn.plivo_number = $1 AND pn.is_active = true`,
      [toNumber]
    );
    if (pn.rows.length === 0) {
      return res.type('text/xml').send('<Response><Speak>This number is not configured. Please try again later.</Speak></Response>');
    }

    const { client_id: clientId, language, voice_id: voiceId } = pn.rows[0];

    // Check available minutes (Allow a 15-minute grace period)
    const sub = await db.query(
      'SELECT available_minutes FROM subscriptions WHERE client_id = $1',
      [clientId]
    );
    if (!sub.rows.length || sub.rows[0].available_minutes <= -15) {
      return res.type('text/xml').send(`<Response><Speak language="${language || 'en-IN'}" voice="${voiceId || 'Polly.Aditi'}">This service is temporarily unavailable. Please call back later.</Speak></Response>`);
    }

    // Minutes available — proceed with AI agent
    // NOTE: If using SIP trunk to LiveKit, append <Dial><Sip> here
    res.type('text/xml').send(`<Response><Speak language="${language || 'en-IN'}" voice="${voiceId || 'Polly.Aditi'}">Connecting you to the AI assistant.</Speak></Response>`);
  } catch (err) {
    console.error('Pre-call verify error:', err);
    res.type('text/xml').send('<Response><Speak>We are experiencing issues. Please try again later.</Speak></Response>');
  }
});

// POST /api/plivo/demo-verify-pin — Handle DTMF input for demo calls
router.post('/demo-verify-pin', async (req, res) => {
  try {
    const digits = req.body.Digits;
    const fromNumber = req.body.From;

    if (!digits || digits.length !== 4) {
      return res.type('text/xml').send('<Response><Speak>Invalid PIN. Goodbye.</Speak></Response>');
    }

    const result = await db.query(
      `SELECT id, business_name FROM demo_sessions WHERE demo_pin = $1 AND expires_at > NOW() LIMIT 1`,
      [digits]
    );

    if (result.rows.length === 0) {
      return res.type('text/xml').send('<Response><Speak>Invalid or expired PIN. Goodbye.</Speak></Response>');
    }

    // Record the caller's phone number
    if (fromNumber) {
      await db.query(`UPDATE demo_sessions SET caller_phone = $1 WHERE demo_pin = $2`, [fromNumber, digits]);
    }

    // Proceed to connect to the AI Agent
    res.type('text/xml').send(`
      <Response>
        <Speak>Connecting you to the AI assistant for ${result.rows[0].business_name}.</Speak>
      </Response>
    `);
  } catch (err) {
    console.error('Demo PIN verify error:', err);
    res.type('text/xml').send('<Response><Speak>An error occurred. Please try again.</Speak></Response>');
  }
});

// POST /api/plivo/post-call — Post-call logging (called by n8n)
router.post('/post-call', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { plivo_number, caller_number, duration_seconds, transcript, ai_summary, action_taken, recording_url } = req.body;

    // Find client by Plivo number
    const pn = await client.query(
      `SELECT pn.client_id, cp.n8n_webhook_url, cp.business_name, cp.crm_type, cp.crm_webhook_url 
       FROM phone_numbers pn 
       JOIN client_profiles cp ON cp.user_id = pn.client_id
       WHERE pn.plivo_number = $1`,
      [plivo_number]
    );
    if (pn.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unknown Plivo number' });
    }

    const { client_id: clientId, n8n_webhook_url: webhookUrl, business_name: businessName, crm_type: crmType, crm_webhook_url: crmWebhookUrl } = pn.rows[0];
    const minutesToDeduct = Math.ceil(duration_seconds / 60);
    // --- PHASE 2: Intelligent Lead Scoring & Sentiment ---
    let leadScore = 0;
    let sentiment = 'neutral';
    const text = (transcript + ' ' + ai_summary + ' ' + action_taken).toLowerCase();
    
    // Scoring logic
    if (duration_seconds > 60) leadScore += 30;
    if (duration_seconds > 180) leadScore += 20;
    const hotKeywords = ['book', 'appointment', 'price', 'cost', 'visit', 'buy', 'address', 'location'];
    if (hotKeywords.some(k => text.includes(k))) leadScore += 40;
    if (action_taken && action_taken !== 'None') leadScore += 10;
    leadScore = Math.min(leadScore, 100);

    // Sentiment logic
    const pos = ['thanks', 'great', 'good', 'helpful', 'perfect', 'awesome', 'yes'];
    const neg = ['bad', 'angry', 'complaint', 'worst', 'useless', 'no', 'stop'];
    if (pos.some(k => text.includes(k))) sentiment = 'positive';
    if (neg.some(k => text.includes(k))) sentiment = 'negative';
    // -----------------------------------------------------

    // Insert call lead
    const leadInsert = await client.query(
      `INSERT INTO call_leads (client_id, caller_number, call_duration_seconds, ai_summary, transcript_raw, action_taken, recording_url, lead_score, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [clientId, caller_number, duration_seconds, ai_summary || '', transcript || '', action_taken || '', recording_url || '', leadScore, sentiment]
    );
    const callLeadId = leadInsert.rows[0].id;

    // --- PHASE 5: Background Cloud Storage Offload ---
    if (recording_url && process.env.S3_BUCKET_NAME) {
      setTimeout(async () => {
        try {
          const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
          const s3 = new S3Client({
            region: process.env.S3_REGION || 'auto',
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY,
              secretAccessKey: process.env.S3_SECRET_KEY,
            }
          });

          // Fetch the recording from the temporary URL
          const response = await fetch(recording_url);
          if (!response.ok) throw new Error(`Failed to fetch recording: ${response.statusText}`);
          const buffer = await response.arrayBuffer();

          // Upload to S3/R2
          const key = `recordings/${clientId}/${callLeadId}-${Date.now()}.mp3`;
          await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: Buffer.from(buffer),
            ContentType: 'audio/mpeg',
            ACL: 'public-read'
          }));

          // The public URL assuming typical S3 or custom domain setup
          const finalUrl = process.env.S3_PUBLIC_URL 
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

          // Update database with the permanent URL
          await db.query(`UPDATE call_leads SET recording_url = $1 WHERE id = $2`, [finalUrl, callLeadId]);
          console.log(`Successfully offloaded recording to S3 for call lead ${callLeadId}`);
        } catch (e) {
          console.error(`S3 Upload worker failed for call lead ${callLeadId}:`, e);
        }
      }, 0);
    }
    // ------------------------------------------------

    // Deduct minutes (Allow negative balance for grace period)
    await client.query(
      `UPDATE subscriptions SET available_minutes = available_minutes - $1 WHERE client_id = $2`,
      [minutesToDeduct, clientId]
    );

    await client.query('COMMIT');

    // Trigger WhatsApp Notification for BUSINESS (New Lead)
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'new_lead',
          business_name: businessName,
          caller: caller_number,
          summary: ai_summary,
          action: action_taken,
          recording: recording_url,
          lead_score: leadScore,
          sentiment: sentiment
        })
      }).catch(e => console.error('n8n business notification failed:', e.message));

      // --- PHASE 2: Trigger WhatsApp Follow-up for CALLER ---
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'post_call_followup_caller',
          business_name: businessName,
          caller: caller_number,
          summary: ai_summary,
          action: action_taken
        })
      }).catch(e => console.error('n8n caller follow-up failed:', e.message));
    }

    // Trigger CRM Sync if configured
    if (crmType !== 'none' && crmWebhookUrl) {
      fetch(crmWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Trinity Pixels AI',
          client_id: clientId,
          business_name: businessName,
          caller: caller_number,
          summary: ai_summary,
          transcript: transcript,
          duration: duration_seconds,
          action: action_taken,
          recording: recording_url,
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.error('CRM sync failed:', e.message));
    }

    // Check if below threshold
    const subCheck = await db.query('SELECT available_minutes FROM subscriptions WHERE client_id = $1', [clientId]);
    const remaining = subCheck.rows[0]?.available_minutes || 0;

    res.json({ success: true, minutes_remaining: remaining, low_balance: remaining < 50 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Post-call log error:', err);
    res.status(500).json({ error: 'Failed to log call' });
  } finally {
    client.release();
  }
});
// POST /api/plivo/fallback — SMS text-back if AI fails or call is missed
router.post('/fallback', async (req, res) => {
  try {
    const { From, To } = req.body; 

    const biz = await db.query(
      `SELECT cp.business_name, cp.n8n_webhook_url FROM phone_numbers pn 
       JOIN client_profiles cp ON cp.user_id = pn.client_id 
       WHERE pn.plivo_number = $1`, [To]
    );

    const businessName = biz.rows[0]?.business_name || "us";
    const webhookUrl = biz.rows[0]?.n8n_webhook_url;

    // Trigger Missed Call Alert for Business
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'missed_call_alert',
          business_name: businessName,
          caller: From
        })
      }).catch(e => console.error('Missed call alert failed:', e.message));
    }

    // Plivo XML to send SMS to Caller
    res.type('text/xml').send(`
      <Response>
        <Message from="${To}" to="${From}">
          Hi, you just called ${businessName}. Our AI lines are currently busy, but we've logged your call and will get back to you shortly!
        </Message>
      </Response>
    `);
  } catch (err) {
    console.error('Fallback webhook error:', err);
    res.status(500).send('<Response></Response>');
  }
});

const auth = require('../middleware/auth');

// GET /api/plivo/live-calls — Fetch active calls for a client
router.get('/live-calls', auth, async (req, res) => {
  try {
    const clientId = req.query.client_id; // For admin use
    const authId = req.user?.id; // For client use (from auth middleware if added)
    
    const targetId = clientId || authId;
    if (!targetId) return res.status(401).json({ error: 'Unauthorized' });

    // Find the Plivo number for this client
    const pn = await db.query('SELECT plivo_number FROM phone_numbers WHERE client_id = $1 AND is_active = true', [targetId]);
    if (pn.rows.length === 0) return res.json({ calls: [] });

    const plivoNumber = pn.rows[0].plivo_number;

    if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
      const plivo = require('plivo');
      const client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
      
      const calls = await client.calls.list({
        status: 'in-progress',
        to_number: plivoNumber
      });

      return res.json({ 
        calls: calls.map(c => ({
          call_uuid: c.callUuid,
          from: c.from,
          to: c.to,
          duration: c.duration,
          direction: c.direction
        }))
      });
    }

    // Mock for dev
    res.json({ 
      calls: [
        // { call_uuid: 'mock-1', from: '+919876543210', to: plivoNumber, duration: '45', direction: 'inbound' }
      ] 
    });
  } catch (err) {
    console.error('Live calls error:', err);
    res.status(500).json({ error: 'Failed to fetch live calls' });
  }
});

// POST /api/plivo/intercept — Bridge the client into a live call
router.post('/intercept', auth, async (req, res) => {
  try {
    const { call_uuid } = req.body;
    if (!call_uuid) return res.status(400).json({ error: 'Missing call_uuid' });

    const client_id = req.user.id;

    // Fetch the client's transfer number
    const profile = await db.query('SELECT transfer_number FROM client_profiles WHERE user_id = $1', [client_id]);
    const transferNumber = profile.rows[0]?.transfer_number;

    if (!transferNumber) return res.status(400).json({ error: 'No transfer number configured' });

    if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
      const plivo = require('plivo');
      const client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
      
      const conferenceName = `intercept_${call_uuid}`;

      // 1. Transfer the current call to a conference
      await client.calls.transfer(call_uuid, {
        legs: 'aleg',
        aleg_url: `${process.env.BACKEND_URL}/api/plivo/conference-xml?name=${conferenceName}`
      });

      // 2. Call the client and put them in the same conference
      await client.calls.create(
        process.env.PLIVO_SENDER_ID || 'TrinityAI',
        transferNumber,
        `${process.env.BACKEND_URL}/api/plivo/conference-xml?name=${conferenceName}`
      );

      return res.json({ success: true, message: 'Interception started. Your phone will ring shortly.' });
    }

    res.status(501).json({ error: 'Plivo not configured' });
  } catch (err) {
    console.error('Intercept error:', err);
    res.status(500).json({ error: 'Failed to intercept call' });
  }
});

// Helper: XML for conference bridging
router.all('/conference-xml', (req, res) => {
  const name = req.query.name || 'default_conf';
  res.type('text/xml').send(`
    <Response>
      <Conference callbackUrl="${process.env.BACKEND_URL}/api/plivo/conference-callback">${name}</Conference>
    </Response>
  `);
});

module.exports = router;
