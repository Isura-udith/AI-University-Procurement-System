/**
 * Notification Controller
 */
const notificationService = require('../services/notification.service');
const { success } = require('../utils/response');

const getMyNotifications = async (req, res, next) => {
  try { return success(res, await notificationService.getForUser(req.user._id, req.tenantId, req.query)); } catch (err) { next(err); }
};
const markRead = async (req, res, next) => {
  try { return success(res, await notificationService.markRead(req.params.id, req.user._id)); } catch (err) { next(err); }
};
const markAllRead = async (req, res, next) => {
  try { return success(res, await notificationService.markAllRead(req.user._id, req.tenantId)); } catch (err) { next(err); }
};
const getUnreadCount = async (req, res, next) => {
  try { return success(res, { count: await notificationService.getUnreadCount(req.user._id, req.tenantId) }); } catch (err) { next(err); }
};

module.exports = { getMyNotifications, markRead, markAllRead, getUnreadCount };
