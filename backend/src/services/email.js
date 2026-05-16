const { Resend } = require('resend');
const db = require('../db/pool');

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const FROM_EMAIL = 'Trinity Pixels <support@trinitypixels.com>';

/**
 * Sends a standard email and logs it to the database
 */
async function sendEmail({ to, subject, html, template }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
      return true;
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    // Log the email
    await db.query(
      `INSERT INTO email_log (recipient_email, template, subject, status) VALUES ($1, $2, $3, 'sent')`,
      [to, template, subject]
    );

    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    await db.query(
      `INSERT INTO email_log (recipient_email, template, subject, status) VALUES ($1, $2, $3, 'failed')`,
      [to, template, subject]
    ).catch(() => {}); // Ignore db log error if it fails
    return false;
  }
}

/**
 * Automated Usage Alert - 50 minutes remaining
 */
async function sendLowBalanceAlert(to, businessName, minutes) {
  const subject = `Action Required: AI Receptionist balance running low (${minutes} mins left)`;
  const html = `
    <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #6366f1;">Trinity Pixels AI</h2>
      <p>Hi ${businessName},</p>
      <p>Your AI Receptionist is doing great, but your account balance is running low.</p>
      <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Warning:</strong> You only have <strong>${minutes} minutes</strong> remaining in your current plan.
      </div>
      <p>To ensure your AI continues to answer calls and capture leads, please recharge your account.</p>
      <a href="https://trinitypixels.com/dashboard/usage" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin-top: 10px;">Recharge Now</a>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">If you run out of minutes, your AI will politely inform callers that you are temporarily unavailable.</p>
    </div>
  `;
  return sendEmail({ to, subject, html, template: 'low_balance' });
}

/**
 * Send an invoice email with attached PDF buffer
 */
async function sendInvoiceEmail(to, businessName, invoiceId, amount, pdfBuffer) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[MOCK INVOICE] To: ${to} | Invoice: ${invoiceId}`);
      return true;
    }

    const subject = `Invoice ${invoiceId} from Trinity Pixels`;
    const html = `
      <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #6366f1;">Trinity Pixels AI</h2>
        <p>Hi ${businessName},</p>
        <p>Thank you for your recent payment of <strong>₹${amount}</strong>. Your account has been credited.</p>
        <p>Please find your invoice attached to this email.</p>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">Thank you for trusting Trinity Pixels with your business.</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice_${invoiceId}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    if (error) throw error;
    
    await db.query(
      `INSERT INTO email_log (recipient_email, template, subject, status) VALUES ($1, $2, $3, 'sent')`,
      [to, 'invoice', subject]
    );

    return true;
  } catch (err) {
    console.error('Invoice email failed:', err);
    return false;
  }
}

/**
 * Send Welcome Email with credentials
 */
async function sendWelcomeEmail(to, businessName, password, loginUrl) {
  const subject = `Welcome to Trinity Pixels AI Receptionist!`;
  const html = `
    <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #6366f1;">Welcome to Trinity Pixels, ${businessName}!</h2>
      <p>Your AI Receptionist account has been created. Our team will handle the setup process for your dedicated phone line and AI training.</p>
      <p>You can access your client dashboard using the following credentials:</p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${password}</p>
      </div>
      <a href="${loginUrl}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">For security reasons, we recommend changing your password after your first login.</p>
    </div>
  `;
  return sendEmail({ to, subject, html, template: 'welcome' });
}

/**
 * Send Password Reset Link
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const subject = `Password Reset Request - Trinity Pixels`;
  const html = `
    <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #6366f1;">Password Reset Request</h2>
      <p>We received a request to reset the password for your Trinity Pixels account.</p>
      <p>Click the button below to choose a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin: 20px 0;">Reset Password</a>
      <p style="font-size: 14px; color: #555;">If you did not request this, please ignore this email. The link will expire in 1 hour.</p>
    </div>
  `;
  return sendEmail({ to, subject, html, template: 'password_reset' });
}

module.exports = {
  sendEmail,
  sendLowBalanceAlert,
  sendInvoiceEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
