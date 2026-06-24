/** Tender Validator */
const validateTender = (data) => {
  const errors = [];
  if (!data.title?.trim()) errors.push({ field: 'title', message: 'Title is required' });
  if (!data.procurementId) errors.push({ field: 'procurementId', message: 'Procurement reference is required' });
  if (!data.bidSubmissionDeadline) errors.push({ field: 'bidSubmissionDeadline', message: 'Submission deadline is required' });
  return { isValid: errors.length === 0, errors };
};
module.exports = { validateTender };
