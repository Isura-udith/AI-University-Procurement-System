/**
 * Vendor Service
 */
const Vendor = require('../models/vendor.model');
const { calculateVendorScore } = require('../ai/vendor.scoring');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

class VendorService {
  async register(data, tenantId) {
    const vendor = await Vendor.create({ ...data, tenantId, status: 'pending' });
    logger.audit('VENDOR_REGISTERED', data.userId || 'self', { vendorId: vendor._id });
    return vendor;
  }

  async getAll(query, tenantId) {
    const { page, limit, skip, sort } = getPagination(query);
    const filters = { tenantId };
    if (query.status) filters.status = query.status;
    if (query.category) filters.supplierCategories = { $in: [query.category] };
    if (query.search) filters.$or = [{ companyName: { $regex: query.search, $options: 'i' } }, { contactPerson: { $regex: query.search, $options: 'i' } }];
    const [data, total] = await Promise.all([
      Vendor.find(filters).sort(sort).skip(skip).limit(limit),
      Vendor.countDocuments(filters),
    ]);
    return { data, total, page, limit };
  }

  async getById(id, tenantId) {
    const vendor = await Vendor.findOne({ _id: id, tenantId }).populate('userId', 'firstName lastName email');
    if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
    return vendor;
  }

  async getByUserId(userId, tenantId) {
    const vendor = await Vendor.findOne({ userId, tenantId }).populate('userId', 'firstName lastName email');
    if (!vendor) throw Object.assign(new Error('Vendor profile not found for this user'), { statusCode: 404 });
    return vendor;
  }

  async verify(id, userId, tenantId) {
    const vendor = await Vendor.findOne({ _id: id, tenantId });
    if (!vendor) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    vendor.status = 'verified';
    vendor.verifiedAt = new Date();
    vendor.verifiedBy = userId;
    vendor.performanceScore = calculateVendorScore(vendor);
    await vendor.save();
    logger.audit('VENDOR_VERIFIED', userId, { vendorId: vendor._id });
    return vendor;
  }

  async blacklist(id, reason, userId, tenantId) {
    const vendor = await Vendor.findOne({ _id: id, tenantId });
    if (!vendor) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    vendor.status = 'blacklisted';
    vendor.isDebarred = true;
    vendor.debarmentDetails = { reason, debarredFrom: new Date(), authority: 'UWU Procurement Division' };
    await vendor.save();
    logger.audit('VENDOR_BLACKLISTED', userId, { vendorId: vendor._id, reason });
    return vendor;
  }

  async updatePerformance(id, metrics, tenantId) {
    const vendor = await Vendor.findOne({ _id: id, tenantId });
    if (!vendor) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    Object.assign(vendor.metrics, metrics);
    vendor.performanceScore = calculateVendorScore(vendor);
    await vendor.save();
    return vendor;
  }

  async reject(id, reason, userId, tenantId) {
    const vendor = await Vendor.findOne({ _id: id, tenantId });
    if (!vendor) throw Object.assign(new Error('Not found'), { statusCode: 404 });
    vendor.status = 'rejected';
    vendor.internalNotes.push({ note: `Rejected: ${reason}`, createdBy: userId });
    await vendor.save();
    logger.audit('VENDOR_REJECTED', userId, { vendorId: vendor._id, reason });
    return vendor;
  }

  async approveAndSendSetupLink(id, userId, tenantId) {
    const crypto = require('crypto');
    const notificationService = require('./notification.service');
    const vendor = await Vendor.findOne({ _id: id, tenantId });
    if (!vendor) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });

    const setupToken = crypto.randomBytes(32).toString('hex');
    vendor.status = 'verified';
    vendor.verifiedAt = new Date();
    vendor.verifiedBy = userId;
    vendor.accountSetupToken = setupToken;
    vendor.accountSetupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    vendor.accountSetupEmailSentAt = new Date();
    vendor.performanceScore = calculateVendorScore(vendor);
    await vendor.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const setupUrl = `${frontendUrl}/supplier/setup-account?token=${setupToken}`;

    // Send email notification template
    await notificationService.sendNotification({
      tenantId: vendor.tenantId,
      recipientId: vendor._id,
      recipientEmail: vendor.email,
      recipientRole: 'supplier',
      title: 'Vendor Registration Approved — Setup Login Account',
      message: `Your vendor registration has been approved by Supplies Division. Please click the setup link to create your email and password login account.`,
      type: 'email',
      metadata: {
        templateType: 'vendor_account_setup',
        companyName: vendor.companyName,
        registrationNumber: vendor.registrationNumber,
        setupUrl,
      },
    }).catch(err => logger.error('Failed to send vendor setup email:', err));

    logger.audit('VENDOR_APPROVED_SETUP_LINK_SENT', userId, { vendorId: vendor._id, setupToken });
    return { vendor, setupUrl, setupToken };
  }

  async getSetupAccountInfo(token) {
    if (!token) throw Object.assign(new Error('Setup token is required'), { statusCode: 400 });
    const vendor = await Vendor.findOne({
      accountSetupToken: token,
      accountSetupExpires: { $gt: new Date() }
    });
    if (!vendor) throw Object.assign(new Error('Invalid or expired account setup link'), { statusCode: 404 });

    return {
      vendorId: vendor._id,
      companyName: vendor.companyName,
      registrationNumber: vendor.registrationNumber,
      email: vendor.email,
      contactPerson: vendor.contactPerson,
      status: vendor.status,
    };
  }

  async completeSetupAccount(token, { email, password, firstName, lastName }) {
    const authService = require('./auth.service');
    if (!token) throw Object.assign(new Error('Setup token is required'), { statusCode: 400 });

    const vendor = await Vendor.findOne({
      accountSetupToken: token,
      accountSetupExpires: { $gt: new Date() }
    });
    if (!vendor) throw Object.assign(new Error('Invalid or expired account setup link'), { statusCode: 404 });

    const userEmail = email || vendor.email;
    const userFirstName = firstName || vendor.contactPerson?.split(' ')[0] || vendor.companyName;
    const userLastName = lastName || vendor.contactPerson?.split(' ').slice(1).join(' ') || 'Supplier';

    // Register supplier user
    const { user, accessToken, refreshToken } = await authService.register({
      email: userEmail.toLowerCase().trim(),
      password,
      firstName: userFirstName,
      lastName: userLastName,
      role: 'supplier',
      tenantId: vendor.tenantId,
      department: 'Supplies Division',
      phone: vendor.phone,
    });

    // Link user to vendor and clear setup token
    vendor.userId = user._id || user.id;
    vendor.accountSetupToken = undefined;
    vendor.accountSetupExpires = undefined;
    await vendor.save();

    logger.audit('VENDOR_ACCOUNT_SETUP_COMPLETED', user._id || user.id, { vendorId: vendor._id });
    return { vendor, user, accessToken, refreshToken };
  }
}

module.exports = new VendorService();
