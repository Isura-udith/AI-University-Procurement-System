/**
 * Message Controller
 */
const messageService = require('../services/message.service');
const { success, created, badRequest } = require('../utils/response');

const getMessages = async (req, res, next) => {
  try {
    const result = await messageService.getForUser(
      req.effectiveUser ? req.effectiveUser._id : req.user._id,
      req.user.role,
      req.tenantId,
      req.query
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const { recipient, recipientRole, type, subject, body, category, referenceType, referenceId, replyTo } = req.body;
    
    if (!subject || !body) {
      return badRequest(res, 'Subject and body are required.');
    }

    const messageData = {
      tenantId: req.tenantId,
      sender: req.effectiveUser ? req.effectiveUser._id : req.user._id,
      recipient,
      recipientRole,
      type,
      subject,
      body,
      category,
      referenceType,
      referenceId,
      replyTo,
    };

    const newMessage = await messageService.create(messageData);
    return created(res, newMessage, 'Message sent successfully.');
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const result = await messageService.markRead(
      req.params.id,
      req.effectiveUser ? req.effectiveUser._id : req.user._id
    );
    return success(res, result, 'Message marked as read.');
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await messageService.getUnreadCount(
      req.effectiveUser ? req.effectiveUser._id : req.user._id,
      req.user.role,
      req.tenantId
    );
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const result = await messageService.deleteMessage(
      req.params.id,
      req.effectiveUser ? req.effectiveUser._id : req.user._id
    );
    if (!result) {
      return badRequest(res, 'Message not found or you are not authorized to delete it.');
    }
    return success(res, null, 'Message deleted successfully.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMessages,
  createMessage,
  markRead,
  getUnreadCount,
  deleteMessage,
};

