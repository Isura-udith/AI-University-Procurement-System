/** Email Provider - Nodemailer integration */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const createTransporter = () => nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
module.exports = { createTransporter };
