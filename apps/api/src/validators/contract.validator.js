/** Contract Validator */
const validateContract = (data) => {
  const errors = [];
  if (!data.title?.trim()) errors.push({ field: 'title', message: 'Title is required' });
  if (!data.procurementId) errors.push({ field: 'procurementId', message: 'Procurement reference is required' });
  if (!data.vendorId) errors.push({ field: 'vendorId', message: 'Vendor is required' });
  if (!data.contractValue || data.contractValue <= 0) errors.push({ field: 'contractValue', message: 'Valid contract value is required' });
  return { isValid: errors.length === 0, errors };
};
module.exports = { validateContract };
