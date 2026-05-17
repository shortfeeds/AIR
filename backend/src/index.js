require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const leadsRoutes = require('./routes/leads');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const plivoRoutes = require('./routes/plivo');
const agentRoutes = require('./routes/agent');
const alertsRoutes = require('./routes/alerts');
const referralRoutes = require('./routes/referrals');
const demoRoutes = require('./routes/demo');
const uploadRoutes = require('./routes/upload');
const cron = require('node-cron');
const db = require('./db/pool');
const pinoHttp = require('pino-http');
const logger = require('./utils/logger');
const os = require('os');

require('./cron/weeklyReport');
require('./cron/billing');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Request logging via pino-http
app.use(pinoHttp({ logger }));

// Global rate limit: 100 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Auth rate limit: 5 requests per minute
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Payment rate limit: 10 requests per minute
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many payment requests, please try again later.' },
});

// Raw body for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json({ limit: '10mb' }));

// Root and Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Trinity Pixels Backend API is running.', 
    version: '1.0.0', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/health', async (req, res) => {
  const healthData = {
    status: 'ok',
    service: 'Trinity Pixels API',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    system: {
      loadavg: os.loadavg(),
      freeMem: os.freemem(),
      totalMem: os.totalmem()
    },
    timestamp: new Date().toISOString()
  };

  try {
    await db.query('SELECT 1');
    healthData.database = 'connected';
    res.json(healthData);
  } catch (err) {
    logger.error('Health check database error:', err);
    healthData.status = 'degraded';
    healthData.database = 'disconnected';
    res.status(503).json(healthData);
  }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plivo', plivoRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/upload', uploadRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled request error');
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  logger.info(`✅ Trinity Pixels API listening on port ${PORT}`);
});

// Real-time: Initialize Socket.io
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'New real-time client connected');
  
  socket.on('join', (room) => {
    socket.join(room);
    logger.info({ socketId: socket.id, room }, 'Client joined room');
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

// Make io accessible to routes
app.set('io', io);

// Graceful shutdown
const shutdown = async (signal) => {
  logger.warn(`🛑 ${signal} received. Initiating graceful shutdown...`);
  
  // Stop receiving new requests
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await db.end();
      logger.info('Database pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful close hangs
  setTimeout(() => {
    logger.fatal('Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
