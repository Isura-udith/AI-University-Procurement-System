/**
 * Vendor Controller
 */
const vendorService = require('../services/vendor.service');
const { success, created, paginated } = require('../utils/response');

const registerVendor = async (req, res, next) => {
  try { return created(res, await vendorService.register(req.body, req.tenantId || 'uwu-main')); } catch (err) { next(err); }
};
const getAllVendors = async (req, res, next) => {
  try { const { data, total, page, limit } = await vendorService.getAll(req.query, req.tenantId); return paginated(res, data, total, page, limit); } catch (err) { next(err); }
};
const getVendor = async (req, res, next) => {
  try { return success(res, await vendorService.getById(req.params.id, req.tenantId)); } catch (err) { next(err); }
};
const getMe = async (req, res, next) => {
  try { return success(res, await vendorService.getByUserId(req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const verifyVendor = async (req, res, next) => {
  try { return success(res, await vendorService.verify(req.params.id, req.user._id, req.tenantId), 'Verified'); } catch (err) { next(err); }
};
const blacklistVendor = async (req, res, next) => {
  try { return success(res, await vendorService.blacklist(req.params.id, req.body.reason, req.user._id, req.tenantId), 'Blacklisted'); } catch (err) { next(err); }
};
const updatePerformance = async (req, res, next) => {
  try { return success(res, await vendorService.updatePerformance(req.params.id, req.body, req.tenantId)); } catch (err) { next(err); }
};

const rejectVendor = async (req, res, next) => {
  try { return success(res, await vendorService.reject(req.params.id, req.body.reason, req.user._id, req.tenantId), 'Rejected'); } catch (err) { next(err); }
};

module.exports = { registerVendor, getAllVendors, getVendor, getMe, verifyVendor, blacklistVendor, updatePerformance, rejectVendor };
