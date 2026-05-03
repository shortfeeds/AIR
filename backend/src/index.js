require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const leadsRoutes = require('./routes/leads');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const plivoRoutes = require('./routes/plivo');
const agentRoutes = require('./routes/agent');
const demoRoutes = require('./routes/demo');
const alertsRoutes = require('./routes/alerts');
const cron = require('node-cron');
const db = require('./db/pool');

require('./cron/weeklyReport');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Raw body for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Root and Health check
app.get('/', (req, res) => {
  res.json({ message: 'Trinity Pixels Backend API is running.', frontend: process.env.FRONTEND_URL || 'http://localhost:3000' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Trinity Pixels API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plivo', plivoRoutes);
app.use('/api/alerts', alertsRoutes);

// Proactive Monitoring Cron (Every 30 mins)
cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ Running low balance monitor...');
  try {
    const clients = await db.query(
      `SELECT s.client_id, s.available_minutes, u.email, cp.n8n_webhook_url, cp.business_name
       FROM subscriptions s
       JOIN users u ON u.id = s.client_id
       JOIN client_profiles cp ON cp.user_id = u.id
       WHERE s.available_minutes < 50 AND s.status = 'active'`
    );

    for (const client of clients.rows) {
      if (client.n8n_webhook_url) {
        // We only alert for specific thresholds to avoid spamming
        if ([49, 48, 20, 19, 5, 4, 0].includes(client.available_minutes)) {
           fetch(client.n8n_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'low_balance_alert',
              business_name: client.business_name,
              minutes_left: client.available_minutes,
              email: client.email
            })
          }).catch(e => console.error(`Alert failed for ${client.email}:`, e.message));
        }
      }
    }
  } catch (err) {
    console.error('Monitor error:', err);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Trinity Pixels API running on port ${PORT}`);
});
