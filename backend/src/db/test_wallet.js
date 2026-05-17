const fs = require('fs');
const path = require('path');

console.log("🔍 Starting syntax validation of edited backend routers...");

try {
  // Set mock environment variables
  process.env.JWT_SECRET = "test_secret_key_123456";
  process.env.RAZORPAY_KEY_ID = "rzp_test_123456";
  process.env.RAZORPAY_KEY_SECRET = "mock_secret";

  console.log("➡️ Loading payments router...");
  const payments = require('../routes/payments');
  console.log("✅ Payments router loaded successfully with zero syntax errors!");

  console.log("➡️ Loading referrals router...");
  const referrals = require('../routes/referrals');
  console.log("✅ Referrals router loaded successfully with zero syntax errors!");

  console.log("➡️ Loading subscriptions router...");
  const subscriptions = require('../routes/subscriptions');
  console.log("✅ Subscriptions router loaded successfully with zero syntax errors!");

  console.log("➡️ Loading auth router...");
  const auth = require('../routes/auth');
  console.log("✅ Auth router loaded successfully with zero syntax errors!");

  console.log("\n🎉 ALL EDITED ROUTERS LOADED PERFECTLY! NO SYNTAX ERRORS DETECTED!");
} catch (err) {
  console.error("❌ ROUTER LOAD FAILER DETECTED:");
  console.error(err);
  process.exit(1);
}
