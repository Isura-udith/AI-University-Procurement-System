/** Reminder Jobs */
const sendDeadlineReminders = async () => {
  const Tender = require('../models/tender.model');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return Tender.find({ status: 'published', bidSubmissionDeadline: { $lte: tomorrow, $gt: new Date() } });
};
module.exports = { sendDeadlineReminders };
