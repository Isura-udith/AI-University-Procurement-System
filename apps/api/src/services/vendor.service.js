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
}

module.exports = new VendorService();
