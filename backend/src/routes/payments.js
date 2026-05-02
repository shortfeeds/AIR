const express = require('express');
const crypto = require('crypto');
const db = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Plan and Top-up configuration
const PLANS = {
  // Monthly Subscriptions (Upgrades)
  silver:   { type: 'plan',   minutes: 200,  price: 299900, label: 'Silver — 200 mins' },
  gold:     { type: 'plan',   minutes: 500,  price: 499900, label: 'Gold — 500 mins' },
  diamond:  { type: 'plan',   minutes: 1000, price: 799900, label: 'Diamond — 1,000 mins' },
  platinum: { type: 'plan',   minutes: 2000, price: 999900, label: 'Platinum — 2,000 mins' },
  // Top-up Packs (Recharge)
  topup_100: { type: 'topup',  minutes: 100,  price: 150000, label: '100 Min Pack' },
  topup_500: { type: 'topup',  minutes: 500,  price: 600000, label: '500 Min Pack' },
};

// POST /api/payments/create-order — Create a Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const planConfig = PLANS[plan];

    // Lazy-load Razorpay (only when credentials exist)
    let order;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_xxxxxxxxxxxx') {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      order = await razorpay.orders.create({
        amount: planConfig.price,
        currency: 'INR',
        receipt: `tp_${req.user.id}_${Date.now()}`,
        notes: { user_id: req.user.id, plan },
      });
    } else {
      // Mock order for development
      order = {
        id: `order_mock_${Date.now()}`,
        amount: planConfig.price,
        currency: 'INR',
      };
    }

    // Record pending transaction
    await db.query(
      `INSERT INTO transactions (client_id, razorpay_order_id, amount_inr, minutes_purchased, plan_name, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [req.user.id, order.id, planConfig.price / 100, planConfig.minutes, plan]
    );

    res.json({
      order_id: order.id,
      amount: planConfig.price,
      currency: 'INR',
      plan: planConfig.label,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/webhook — Razorpay webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // This is raw Buffer due to express.raw()

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(body.toString());

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Find the pending transaction
      const txResult = await db.query(
        'SELECT * FROM transactions WHERE razorpay_order_id = $1 AND status = $2',
        [orderId, 'pending']
      );

      if (txResult.rows.length === 0) {
        console.warn('No pending transaction found for order:', orderId);
        return res.status(200).json({ status: 'ok' });
      }

      const tx = txResult.rows[0];

      // Begin transaction to update minutes and payment status atomically
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Update transaction status
        await client.query(
          `UPDATE transactions SET razorpay_payment_id = $1, status = 'captured' WHERE id = $2`,
          [paymentId, tx.id]
        );

        // Add minutes to subscription
        // Only update plan_name if the item purchased was a base plan, not a top-up
        const updatePlanSql = tx.plan_name.startsWith('topup') 
          ? `UPDATE subscriptions SET available_minutes = available_minutes + $1, total_minutes_purchased = total_minutes_purchased + $1, status = 'active' WHERE client_id = $2`
          : `UPDATE subscriptions SET available_minutes = available_minutes + $1, total_minutes_purchased = total_minutes_purchased + $1, plan_name = $2, status = 'active' WHERE client_id = $3`;
        
        const params = tx.plan_name.startsWith('topup')
          ? [tx.minutes_purchased, tx.client_id]
          : [tx.minutes_purchased, tx.plan_name, tx.client_id];

        await client.query(updatePlanSql, params);

        await client.query('COMMIT');
        console.log(`✅ Payment captured: ${paymentId}, ${tx.minutes_purchased} minutes added for client ${tx.client_id}`);
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// GET /api/payments/plans — Get available plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, val]) => ({
    id: key,
    ...val,
    price_display: `₹${(val.price / 100).toLocaleString('en-IN')}`,
  }));
  res.json({ plans });
});

module.exports = router;
