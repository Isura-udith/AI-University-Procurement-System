/**
 * Email Service
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({ from: `"UWU Smart Procurement" <${env.SMTP_USER}>`, to, subject, html, text });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Email failed', { error: error.message, to, subject });
    throw error;
  }
};

const sendPasswordReset = async (email, resetToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  return sendEmail({ to: email, subject: 'Password Reset - UWU Smart Procurement', html: `<h2>Password Reset</h2><p>Click the link below to reset your password:</p><a href="${resetUrl}">Reset Password</a><p>This link expires in 1 hour.</p>` });
};

const sendTenderNotification = async (email, tenderTitle, tenderNumber) => {
  return sendEmail({ to: email, subject: `New Tender Published - ${tenderNumber}`, html: `<h2>New Tender Opportunity</h2><p>A new tender has been published: <strong>${tenderTitle}</strong> (${tenderNumber})</p><p>Visit the UWU e-Procurement portal to view details.</p>` });
};

module.exports = { sendEmail, sendPasswordReset, sendTenderNotification };
