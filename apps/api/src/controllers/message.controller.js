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

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const createMessage = async (req, res, next) => {
  try {
    const { recipient, recipientRole, type, subject, body, category, referenceType, referenceId, replyTo } = req.body;
    
    if (!subject || !body) {
      return badRequest(res, 'Subject and body are required.');
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        const ext = f.originalname.split('.').pop().toLowerCase();
        let fType = 'other';
        if (ext === 'pdf') fType = 'pdf';
        else if (['doc', 'docx'].includes(ext)) fType = 'word';
        else if (['xls', 'xlsx'].includes(ext)) fType = 'excel';
        else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) fType = 'image';

        attachments.push({
          name: f.originalname,
          filePath: `/uploads/${f.filename}`,
          size: formatBytes(f.size),
          type: fType,
        });
      });
    } else if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      let fType = 'other';
      if (ext === 'pdf') fType = 'pdf';
      else if (['doc', 'docx'].includes(ext)) fType = 'word';
      else if (['xls', 'xlsx'].includes(ext)) fType = 'excel';
      else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) fType = 'image';

      attachments.push({
        name: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        size: formatBytes(req.file.size),
        type: fType,
      });
    }

    // If attachments passed in body as JSON string
    if (req.body.attachments && typeof req.body.attachments === 'string') {
      try {
        const parsed = JSON.parse(req.body.attachments);
        if (Array.isArray(parsed)) attachments.push(...parsed);
      } catch { /* skip invalid JSON */ }
    } else if (Array.isArray(req.body.attachments)) {
      attachments.push(...req.body.attachments);
    }

    const messageData = {
      tenantId: req.tenantId,
      sender: req.effectiveUser ? req.effectiveUser._id : req.user._id,
      recipient: recipient || undefined,
      recipientRole: recipientRole || undefined,
      type,
      subject,
      body,
      category,
      referenceType: referenceType || undefined,
      referenceId: referenceId || undefined,
      replyTo: replyTo || undefined,
      attachments,
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

