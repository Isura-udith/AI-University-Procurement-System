const reportService = require('../services/report.service');
const { success } = require('../utils/response');

const generateReport = async (req, res, next) => {
  try {
    const report = await reportService.generateReport(req.tenantId, req.body, req.user);
    return success(res, report, 'Report generated successfully', 201);
  } catch (err) { next(err); }
};

const getAllReports = async (req, res, next) => {
  try { return success(res, await reportService.getAll(req.query, req.tenantId)); } catch (err) { next(err); }
};

const getReport = async (req, res, next) => {
  try { return success(res, await reportService.getById(req.params.id, req.tenantId)); } catch (err) { next(err); }
};

const getSpendAnalysis = async (req, res, next) => {
  try { return success(res, await reportService.getSpendAnalysis(req.tenantId)); } catch (err) { next(err); }
};

const getVendorPerformance = async (req, res, next) => {
  try { return success(res, await reportService.getVendorPerformance(req.tenantId)); } catch (err) { next(err); }
};

const getComplianceAudit = async (req, res, next) => {
  try { return success(res, await reportService.getComplianceAudit(req.tenantId)); } catch (err) { next(err); }
};

const exportReport = async (req, res, next) => {
  try {
    const format = req.query.format || 'csv';
    const exported = await reportService.exportReportDocument(req.params.id, req.tenantId, format);
    res.setHeader('Content-Type', exported.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    return res.send(exported.content);
  } catch (err) { next(err); }
};

const updateReport = async (req, res, next) => {
  try {
    const updated = await reportService.updateReport(req.params.id, req.tenantId, req.body);
    return success(res, updated, 'Report updated successfully');
  } catch (err) { next(err); }
};

const deleteReport = async (req, res, next) => {
  try {
    await reportService.deleteReport(req.params.id, req.tenantId);
    return success(res, null, 'Report deleted successfully');
  } catch (err) { next(err); }
};

const getPublicAnalytics = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'uwu-main';
    return success(res, await reportService.getPublicAnalytics(tenantId));
  } catch (err) { next(err); }
};

module.exports = {
  generateReport,
  getAllReports,
  getReport,
  updateReport,
  getSpendAnalysis,
  getVendorPerformance,
  getComplianceAudit,
  exportReport,
  deleteReport,
  getPublicAnalytics,
};

