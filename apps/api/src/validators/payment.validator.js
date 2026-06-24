/** Payment Validator */
const validatePayment = (data) => {
  const errors = [];
  if (!data.contractId) errors.push({ field: 'contractId', message: 'Contract reference is required' });
  if (!data.vendorId) errors.push({ field: 'vendorId', message: 'Vendor is required' });
  if (!data.amount || data.amount <= 0) errors.push({ field: 'amount', message: 'Valid amount is required' });
  return { isValid: errors.length === 0, errors };
};
module.exports = { validatePayment };
