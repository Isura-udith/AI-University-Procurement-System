const reportService = require('../services/report.service');
const { success } = require('../utils/response');

const generateReport = async (req, res, next) => {
  try { return success(res, await reportService.generateProcurementPerformance(req.tenantId, req.body)); } catch (err) { next(err); }
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
const getPublicAnalytics = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'uwu-main';
    return success(res, await reportService.getPublicAnalytics(tenantId));
  } catch (err) { next(err); }
};

module.exports = { generateReport, getAllReports, getReport, getSpendAnalysis, getPublicAnalytics };
