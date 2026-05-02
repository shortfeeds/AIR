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

// Health check
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Trinity Pixels API running on port ${PORT}`);
});
