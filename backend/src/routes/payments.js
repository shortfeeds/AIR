const express = require('express');
const crypto = require('crypto');
const db = require('../db/pool');
const auth = require('../middleware/auth');
const { sendInvoiceEmail } = require('../services/email');
const htmlPdf = require('html-pdf-node');

const router = express.Router();

// Plan, Top-up, and Add-on configuration
const PLANS = {
  // Monthly Subscriptions (Base Plans)
  trial:    { type: 'plan',   minutes: 15,   price: 59900,  label: 'Trial — 15 mins', validityDays: 7 },
  silver:   { type: 'plan',   minutes: 200,  price: 299900, label: 'Silver — 200 mins', validityDays: 30 },
  gold:     { type: 'plan',   minutes: 500,  price: 499900, label: 'Gold — 500 mins', validityDays: 30 },
  diamond:  { type: 'plan',   minutes: 1000, price: 799900, label: 'Diamond — 1,000 mins', validityDays: 30 },
  platinum: { type: 'plan',   minutes: 2000, price: 999900, label: 'Platinum — 2,000 mins', validityDays: 30 },
  
  // Annual Subscriptions (Base Plans — 20% Discount)
  silver_annual:   { type: 'plan', minutes: 2400,  price: 2879000, label: 'Silver Annual (2400 mins)', validityDays: 365 },
  gold_annual:     { type: 'plan', minutes: 6000,  price: 4799000, label: 'Gold Annual (6000 mins)', validityDays: 365 },
  diamond_annual:  { type: 'plan', minutes: 12000, price: 7679000, label: 'Diamond Annual (12000 mins)', validityDays: 365 },

  // Minute Top-up Packs (One-time)
  topup_50:   { type: 'topup',  minutes: 50,   price: 50000,   label: 'Mini (50 Mins)' },
  topup_100:  { type: 'topup',  minutes: 100,  price: 100000,  label: 'Starter (100 Mins)' },
  topup_200:  { type: 'topup',  minutes: 200,  price: 200000,  label: 'Value (200 Mins)' },
  topup_500:  { type: 'topup',  minutes: 500,  price: 500000,  label: 'Pro (500 Mins)' },
  topup_1000: { type: 'topup',  minutes: 1000, price: 900000,  label: 'Enterprise (1,000 Mins)' },

  // Feature Add-ons (Monthly Recurring)
  addon_number:      { type: 'addon', minutes: 0, price: 150000, label: 'Extra AI Number' },
  addon_intercept:   { type: 'addon', minutes: 0, price: 250000, label: 'Live Interception Pack' },
};

// POST /api/payments/calculate-upgrade — Calculate pro-rated upgrade cost
router.post('/calculate-upgrade', auth, async (req, res) => {
  try {
    const { targetPlan } = req.body;
    if (!PLANS[targetPlan] || PLANS[targetPlan].type !== 'plan') {
      return res.status(400).json({ error: 'Invalid upgrade target' });
    }

    const subResult = await db.query('SELECT plan_name, billing_cycle_end FROM subscriptions WHERE client_id = $1', [req.user.id]);
    if (subResult.rows.length === 0) return res.status(404).json({ error: 'No subscription' });

    const sub = subResult.rows[0];
    const currentPlan = PLANS[sub.plan_name] || { price: 0 };
    const targetPlanConfig = PLANS[targetPlan];

    // If current plan is more expensive or same, it's not a simple upgrade calculation here
    if (targetPlanConfig.price <= currentPlan.price) {
      return res.json({ 
        proRatedAmount: targetPlanConfig.price, 
        message: 'New plan price applied (Cycle will reset)' 
      });
    }

    // Calculate remaining days
    const end = new Date(sub.billing_cycle_end);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const remainingDays = Math.max(1, Math.min(30, diffDays));
    
    // Pro-rata: (Target - Current) * (Remaining / 30)
    const priceDiff = targetPlanConfig.price - currentPlan.price;
    const proRated = Math.round(priceDiff * (remainingDays / 30));
    
    // Minimum charge of 500 INR to cover processing
    const finalAmount = Math.max(50000, proRated);

    res.json({
      currentPlan: sub.plan_name,
      targetPlan,
      remainingDays,
      originalPrice: targetPlanConfig.price,
      proRatedAmount: finalAmount,
      savings: targetPlanConfig.price - finalAmount
    });
  } catch (err) {
    res.status(500).json({ error: 'Calculation failed' });
  }
});

// POST /api/payments/create-order — Create a Razorpay order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { plan, isUpgrade } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    let planConfig = { ...PLANS[plan] };
    
    // Handle Smart Upgrade Pro-rating
    if (isUpgrade && planConfig.type === 'plan') {
      const subResult = await db.query('SELECT plan_name, billing_cycle_end FROM subscriptions WHERE client_id = $1', [req.user.id]);
      if (subResult.rows.length > 0) {
        const sub = subResult.rows[0];
        const currentPrice = (PLANS[sub.plan_name] || { price: 0 }).price;
        
        if (planConfig.price > currentPrice) {
          const end = new Date(sub.billing_cycle_end);
          const diffDays = Math.ceil((end.getTime() - Date.now()) / (1000 * 3600 * 24));
          const remainingDays = Math.max(1, Math.min(30, diffDays));
          const proRated = Math.round((planConfig.price - currentPrice) * (remainingDays / 30));
          planConfig.price = Math.max(50000, proRated);
        }
      }
    }

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
        notes: { user_id: req.user.id, plan, isUpgrade: isUpgrade ? 'true' : 'false' },
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

      // Find the pending transaction (idempotency: check if already processed)
      const alreadyProcessed = await db.query(
        'SELECT id FROM transactions WHERE razorpay_payment_id = $1 AND status = $2',
        [paymentId, 'captured']
      );
      if (alreadyProcessed.rows.length > 0) {
        console.log(`⚠️ Payment ${paymentId} already processed, skipping duplicate webhook.`);
        return res.status(200).json({ status: 'ok', message: 'Already processed' });
      }

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
        const planConfig = PLANS[tx.plan_name];
        const isTopup = tx.plan_name.startsWith('topup');
        
        let updatePlanSql;
        let params;

        if (isTopup) {
          updatePlanSql = `
            UPDATE subscriptions 
            SET available_minutes = available_minutes + $1, 
                total_minutes_purchased = total_minutes_purchased + $1, 
                status = 'active' 
            WHERE client_id = $2`;
          params = [tx.minutes_purchased, tx.client_id];
        } else {
          const validity = planConfig.validityDays || 30;
          updatePlanSql = `
            UPDATE subscriptions 
            SET available_minutes = available_minutes + $1, 
                total_minutes_purchased = total_minutes_purchased + $1, 
                plan_name = $2, 
                status = 'active',
                billing_cycle_start = CURRENT_DATE,
                billing_cycle_end = CURRENT_DATE + (INTERVAL '1 day' * $3)
            WHERE client_id = $4`;
          params = [tx.minutes_purchased, tx.plan_name, validity, tx.client_id];
        }

        await client.query(updatePlanSql, params);

        // --- Referral Reward Logic ---
        const userRes = await client.query('SELECT referred_by FROM users WHERE id = $1', [tx.client_id]);
        const referredBy = userRes.rows[0]?.referred_by;

        if (referredBy) {
          // Check if this is the first payment (to avoid multi-claiming)
          const paymentCount = await client.query('SELECT COUNT(*) FROM transactions WHERE client_id = $1 AND status = \'captured\'', [tx.client_id]);
          if (parseInt(paymentCount.rows[0].count) === 1) {
            const rewardMinutes = 50;
            // 1. Grant 50 mins to the referrer
            await client.query(
              'UPDATE subscriptions SET available_minutes = available_minutes + $1, total_minutes_purchased = total_minutes_purchased + $1 WHERE client_id = $2',
              [rewardMinutes, referredBy]
            );
            // 2. Grant 50 mins to the referee (the one who just paid)
            await client.query(
              'UPDATE subscriptions SET available_minutes = available_minutes + $1, total_minutes_purchased = total_minutes_purchased + $1 WHERE client_id = $2',
              [rewardMinutes, tx.client_id]
            );
            // 3. Record the reward
            await client.query(
              'INSERT INTO referral_rewards (referrer_id, referee_id, reward_minutes, is_claimed) VALUES ($1, $2, $3, true)',
              [referredBy, tx.client_id, rewardMinutes]
            );
            console.log(`🎁 Referral reward granted: 50 mins to ${referredBy} and ${tx.client_id}`);
          }
        }
        // -----------------------------

        // --- Zero-Touch Provisioning ---
        // If this is a new subscription (not a top-up) and user doesn't have a number yet, try to buy one
        if (!isTopup && process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
          try {
            const hasNumber = await client.query('SELECT id FROM phone_numbers WHERE client_id = $1', [tx.client_id]);
            if (hasNumber.rows.length === 0) {
              const plivo = require('plivo');
              const plivoClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
              
              // Search for available numbers (Prefix for India +91)
              const numbers = await plivoClient.numbers.search('IN', { limit: 1 });
              if (numbers.length > 0) {
                const numberToBuy = numbers[0].number;
                await plivoClient.numbers.buy(numberToBuy, {
                  app_id: process.env.PLIVO_APP_ID || '' // Default app ID for AI handling
                });
                
                await client.query(
                  'INSERT INTO phone_numbers (client_id, plivo_number, is_active) VALUES ($1, $2, true)',
                  [tx.client_id, numberToBuy]
                );
                
                // Update onboarding status to active since number is assigned
                await client.query(
                  'UPDATE client_profiles SET onboarding_status = \'active\' WHERE user_id = $1',
                  [tx.client_id]
                );
                
                console.log(`✅ Auto-provisioned Plivo number ${numberToBuy} for client ${tx.client_id}`);
              }
            }
          } catch (provisionErr) {
            console.error('❌ Zero-touch provisioning failed:', provisionErr.message);
            // Don't fail the whole payment if provisioning fails, admin can do it manually
          }
        }

        console.log(`✅ Payment captured: ${paymentId}, ${tx.minutes_purchased} minutes added for client ${tx.client_id}`);

        // --- Phase 4: Automated PDF Invoice Email ---
        try {
          const clientDetails = await db.query('SELECT u.email, cp.business_name FROM users u JOIN client_profiles cp ON cp.user_id = u.id WHERE u.id = $1', [tx.client_id]);
          if (clientDetails.rows.length > 0) {
            const clientEmail = clientDetails.rows[0].email;
            const businessName = clientDetails.rows[0].business_name || 'Customer';
            
            // Generate HTML for PDF
            const invoiceHtml = generateInvoiceHtml({ ...tx, razorpay_payment_id: paymentId, business_name: businessName, client_email: clientEmail }, clientDetails.rows[0].name);
            
            // Convert to PDF
            const options = { format: 'A4', margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } };
            const pdfBuffer = await htmlPdf.generatePdf({ content: invoiceHtml }, options);
            
            // Send Email
            await sendInvoiceEmail(clientEmail, businessName, paymentId, tx.amount_inr, pdfBuffer);
          }
        } catch (emailErr) {
          console.error('❌ Failed to send invoice email:', emailErr.message);
        }

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

// GET /api/payments/invoice/:id — Get a printable HTML invoice
router.get('/invoice/:id', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, u.name as client_name, u.email as client_email, cp.business_name 
       FROM transactions t 
       JOIN users u ON u.id = t.client_id 
       JOIN client_profiles cp ON cp.user_id = u.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Invoice not found');
    }

    const tx = result.rows[0];
    const html = generateInvoiceHtml(tx, tx.client_name);

    if (req.query.pdf === 'true') {
      const options = { format: 'A4', margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } };
      const pdfBuffer = await htmlPdf.generatePdf({ content: html }, options);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${tx.razorpay_payment_id || tx.id}.pdf`);
      return res.send(pdfBuffer);
    }

    res.send(html);
  } catch (err) {
    console.error('Invoice error:', err);
    res.status(500).send('Failed to generate invoice');
  }
});

// Helper function to generate Invoice HTML
function generateInvoiceHtml(tx, clientName) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${tx.razorpay_payment_id || tx.id}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
          .details { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 40px; }
          th { text-align: left; background: #f9fafb; padding: 12px; border-bottom: 1px solid #eee; }
          td { padding: 12px; border-bottom: 1px solid #eee; }
          .total { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; }
          .footer { margin-top: 60px; font-size: 12px; color: #999; text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()">Print Invoice</button>
        </div>
        <div class="header">
          <div>
            <div class="logo">TRINITY PIXELS</div>
            <p>AI Voice Receptionist Solutions</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Invoice #:</strong> ${tx.razorpay_payment_id || 'TEMP-'+tx.id.slice(0,8)}</p>
            <p><strong>Date:</strong> ${new Date(tx.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="details">
          <div>
            <p><strong>Billed To:</strong></p>
            <p>${tx.business_name || tx.client_name}</p>
            <p>${tx.client_email}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Provider:</strong></p>
            <p>Trinity Pixels AI Pvt Ltd</p>
            <p>support@trinitypixels.in</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Trinity Pixels AI Subscription - ${tx.plan_name.toUpperCase()}</td>
              <td>${tx.minutes_purchased} Minutes</td>
              <td>₹${tx.amount_inr.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">Total: ₹${tx.amount_inr.toLocaleString('en-IN')}</div>
        <div class="footer">
          <p>This is a computer-generated invoice. No signature required.</p>
          <p>Thank you for choosing Trinity Pixels!</p>
        </div>
      </body>
      </html>
  `;
}

module.exports = router;
