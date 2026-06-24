/** Vendor Validator */
const validateVendor = (data) => {
  const errors = [];
  if (!data.companyName?.trim()) errors.push({ field: 'companyName', message: 'Company name is required' });
  if (!data.registrationNumber?.trim()) errors.push({ field: 'registrationNumber', message: 'Registration number is required' });
  if (!data.contactPerson?.trim()) errors.push({ field: 'contactPerson', message: 'Contact person is required' });
  if (!data.email?.trim()) errors.push({ field: 'email', message: 'Email is required' });
  return { isValid: errors.length === 0, errors };
};
module.exports = { validateVendor };
