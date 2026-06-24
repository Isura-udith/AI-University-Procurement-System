const auditLogService = require('../services/audit.log.service');
const { success, paginated } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await auditLogService.query(req.query, req.tenantId);
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};

const getAuditStats = async (req, res, next) => {
  try {
    const stats = await auditLogService.getStats(req.tenantId);
    return success(res, stats);
  } catch (err) { next(err); }
};

const getUserTimeline = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await auditLogService.getUserTimeline(
      req.params.userId, req.tenantId, req.query
    );
    return paginated(res, data, total, page, limit);
  } catch (err) { next(err); }
};

module.exports = { getAuditLogs, getAuditStats, getUserTimeline };
