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
  trial:    { type: 'plan',   minutes: 15,   price: 59900,  label: 'Trial — 15 Mins', validityDays: 7 },
  starter:  { type: 'plan',   minutes: 200,  price: 299900, label: 'Starter — 200 Mins', validityDays: 30 },
  growth:   { type: 'plan',   minutes: 500,  price: 499900, label: 'Growth — 500 Mins', validityDays: 30 },
  pro:      { type: 'plan',   minutes: 1000, price: 799900, label: 'Pro — 1,000 Mins', validityDays: 30 },
  scale:    { type: 'plan',   minutes: 2000, price: 999900, label: 'Scale — 2,000 Mins', validityDays: 30 },
  
  // Annual Subscriptions (Base Plans — 2 Months Free!)
  starter_annual:   { type: 'plan', minutes: 2400,  price: 2999000, label: 'Starter Annual (2,400 Mins)', validityDays: 365 },
  growth_annual:     { type: 'plan', minutes: 6000,  price: 4999000, label: 'Growth Annual (6,000 Mins)', validityDays: 365 },
  pro_annual:        { type: 'plan', minutes: 12000, price: 7999000, label: 'Pro Annual (12,000 Mins)', validityDays: 365 },
  scale_annual:      { type: 'plan', minutes: 24000, price: 9999000, label: 'Scale Annual (24,000 Mins)', validityDays: 365 },

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

    // Fetch active wallet balance
    const balanceRes = await db.query(
      "SELECT COALESCE(SUM(remaining_amount_inr), 0) as balance FROM wallet_credits WHERE client_id = $1 AND expires_at > NOW()",
      [req.user.id]
    );
    const walletBalance = parseFloat(balanceRes.rows[0].balance);
    const originalPriceInInr = planConfig.price / 100;
    
    const creditsUsed = Math.min(walletBalance, originalPriceInInr);
    const finalAmountInr = originalPriceInInr - creditsUsed;
    const finalPriceInPaise = Math.round(finalAmountInr * 100);

    // If fully covered by wallet credits, bypass Razorpay!
    if (finalPriceInPaise === 0) {
      const mockOrderId = `free_order_${Date.now()}`;
      await db.query(
        `INSERT INTO transactions (client_id, razorpay_order_id, amount_inr, minutes_purchased, plan_name, status, credits_used_inr)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [req.user.id, mockOrderId, 0, planConfig.minutes, plan, creditsUsed]
      );

      return res.json({
        order_id: mockOrderId,
        amount: 0,
        isFullyCredited: true,
        currency: 'INR',
        plan: planConfig.label,
        key_id: null,
      });
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
        amount: finalPriceInPaise,
        currency: 'INR',
        receipt: `tp_${req.user.id}_${Date.now()}`,
        notes: { user_id: req.user.id, plan, isUpgrade: isUpgrade ? 'true' : 'false', credits_used: creditsUsed.toString() },
      });
    } else {
      // Mock order for development
      order = {
        id: `order_mock_${Date.now()}`,
        amount: finalPriceInPaise,
        currency: 'INR',
      };
    }

    // Record pending transaction with credits_used_inr
    await db.query(
      `INSERT INTO transactions (client_id, razorpay_order_id, amount_inr, minutes_purchased, plan_name, status, credits_used_inr)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
      [req.user.id, order.id, finalAmountInr, planConfig.minutes, plan, creditsUsed]
    );

    res.json({
      order_id: order.id,
      amount: finalPriceInPaise,
      currency: 'INR',
      plan: planConfig.label,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/complete-free-order — Complete ₹0 orders using wallet credits
router.post('/complete-free-order', auth, async (req, res) => {
  try {
    const { plan, orderId } = req.body;

    // Find the pending transaction
    const txResult = await db.query(
      'SELECT * FROM transactions WHERE client_id = $1 AND razorpay_order_id = $2 AND status = $3',
      [req.user.id, orderId, 'pending']
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or already processed' });
    }

    const tx = txResult.rows[0];
    const creditsUsed = parseFloat(tx.credits_used_inr || 0);

    // Atomically activate subscription and consume wallet credits
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Update transaction status
      await client.query(
        `UPDATE transactions SET status = 'captured', razorpay_payment_id = $1 WHERE id = $2`,
        [`wallet_funded_${Date.now()}`, tx.id]
      );

      // Consume the wallet credits using the FIFO manager
      if (creditsUsed > 0) {
        await consumeWalletCredits(client, tx.client_id, creditsUsed, tx.id);
      }

      // Update subscription
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
        // Check if this is the first payment
        const paymentCount = await client.query("SELECT COUNT(*) FROM transactions WHERE client_id = $1 AND status = 'captured'", [tx.client_id]);
        if (parseInt(paymentCount.rows[0].count) === 1) {
          const rewardRes = await client.query(
            'INSERT INTO referral_rewards (referrer_id, referee_id, reward_amount_inr, is_claimed) VALUES ($1, $2, 500.00, true) RETURNING id',
            [referredBy, tx.client_id]
          );
          const rewardId = rewardRes.rows[0].id;

          await client.query(
            `INSERT INTO wallet_credits (client_id, amount_inr, remaining_amount_inr, source_type, referral_reward_id, expires_at)
             VALUES ($1, 500.00, 500.00, 'referral_bonus', $2, NOW() + INTERVAL '1 year')`,
            [referredBy, rewardId]
          );
          await client.query(
            `INSERT INTO wallet_ledger (client_id, amount_inr, type, description)
             VALUES ($1, 500.00, 'credit', 'Referral reward for inviting a business partner')`,
            [referredBy]
          );

          await client.query(
            `INSERT INTO wallet_credits (client_id, amount_inr, remaining_amount_inr, source_type, referral_reward_id, expires_at)
             VALUES ($1, 500.00, 500.00, 'referral_bonus', $2, NOW() + INTERVAL '1 year')`,
            [tx.client_id, rewardId]
          );
          await client.query(
            `INSERT INTO wallet_ledger (client_id, amount_inr, type, description)
             VALUES ($1, 500.00, 'credit', 'Referral signup onboarding reward')`,
            [tx.client_id]
          );
        }
      }

      // --- Zero-Touch Provisioning ---
      if (!isTopup && process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
        try {
          const hasNumber = await client.query('SELECT id FROM phone_numbers WHERE client_id = $1', [tx.client_id]);
          if (hasNumber.rows.length === 0) {
            const plivo = require('plivo');
            const plivoClient = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
            const numbers = await plivoClient.numbers.search('IN', { limit: 1 });
            if (numbers.length > 0) {
              const numberToBuy = numbers[0].number;
              await plivoClient.numbers.buy(numberToBuy, {
                app_id: process.env.PLIVO_APP_ID || ''
              });
              await client.query(
                'INSERT INTO phone_numbers (client_id, plivo_number, is_active) VALUES ($1, $2, true)',
                [tx.client_id, numberToBuy]
              );
              await client.query(
                "UPDATE client_profiles SET onboarding_status = 'active' WHERE user_id = $1",
                [tx.client_id]
              );
            }
          }
        } catch (provisionErr) {
          console.error('Zero-touch provisioning failed:', provisionErr.message);
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Plan activated successfully using wallet credits.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Free order completion failed:', err);
    res.status(500).json({ error: 'Failed to process wallet-funded order.' });
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

        // Consume wallet credits if they were used
        const creditsUsed = parseFloat(tx.credits_used_inr || 0);
        if (creditsUsed > 0) {
          await consumeWalletCredits(client, tx.client_id, creditsUsed, tx.id);
        }

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
          const paymentCount = await client.query("SELECT COUNT(*) FROM transactions WHERE client_id = $1 AND status = 'captured'", [tx.client_id]);
          if (parseInt(paymentCount.rows[0].count) === 1) {
            // 1. Record the referral reward in referral_rewards table
            const rewardRes = await client.query(
              'INSERT INTO referral_rewards (referrer_id, referee_id, reward_amount_inr, is_claimed) VALUES ($1, $2, 500.00, true) RETURNING id',
              [referredBy, tx.client_id]
            );
            const rewardId = rewardRes.rows[0].id;

            // 2. Grant ₹500 credits to the referrer
            await client.query(
              `INSERT INTO wallet_credits (client_id, amount_inr, remaining_amount_inr, source_type, referral_reward_id, expires_at)
               VALUES ($1, 500.00, 500.00, 'referral_bonus', $2, NOW() + INTERVAL '1 year')`,
              [referredBy, rewardId]
            );
            await client.query(
              `INSERT INTO wallet_ledger (client_id, amount_inr, type, description)
               VALUES ($1, 500.00, 'credit', 'Referral reward for inviting a business partner')`,
              [referredBy]
            );

            // 3. Grant ₹500 credits to the referee (the one who just paid)
            await client.query(
              `INSERT INTO wallet_credits (client_id, amount_inr, remaining_amount_inr, source_type, referral_reward_id, expires_at)
               VALUES ($1, 500.00, 500.00, 'referral_bonus', $2, NOW() + INTERVAL '1 year')`,
              [tx.client_id, rewardId]
            );
            await client.query(
              `INSERT INTO wallet_ledger (client_id, amount_inr, type, description)
               VALUES ($1, 500.00, 'credit', 'Referral signup onboarding reward')`,
              [tx.client_id]
            );

            console.log(`🎁 Referral reward granted: Rs. 500 wallet credits to referrer ${referredBy} and referee ${tx.client_id}`);
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

// FIFO Wallet Credit Consumption Engine
async function consumeWalletCredits(client, clientId, amountInr, transactionId) {
  let remainingToDeduct = parseFloat(amountInr);
  if (remainingToDeduct <= 0) return;

  const creditsResult = await client.query(
    `SELECT * FROM wallet_credits 
     WHERE client_id = $1 AND remaining_amount_inr > 0 AND expires_at > NOW() 
     ORDER BY expires_at ASC`,
    [clientId]
  );

  for (const credit of creditsResult.rows) {
    const creditAmt = parseFloat(credit.remaining_amount_inr);
    if (creditAmt >= remainingToDeduct) {
      // Deduct partially or fully from this credit block
      await client.query(
        'UPDATE wallet_credits SET remaining_amount_inr = remaining_amount_inr - $1 WHERE id = $2',
        [remainingToDeduct, credit.id]
      );
      remainingToDeduct = 0;
      break;
    } else {
      // Consume this credit block entirely
      await client.query(
        'UPDATE wallet_credits SET remaining_amount_inr = 0 WHERE id = $2',
        [credit.id]
      );
      remainingToDeduct -= creditAmt;
    }
  }

  // Record debit in customer-facing wallet ledger
  await client.query(
    `INSERT INTO wallet_ledger (client_id, amount_inr, type, description, transaction_id)
     VALUES ($1, $2, 'debit', $3, $4)`,
    [clientId, -amountInr, 'debit', `Applied credits to purchase`, transactionId]
  );
}

module.exports = router;
