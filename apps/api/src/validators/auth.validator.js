/** Auth Validator */
const validateRegister = (data) => {
  const errors = [];
  if (!data.firstName?.trim()) errors.push({ field: 'firstName', message: 'First name is required' });
  if (!data.lastName?.trim()) errors.push({ field: 'lastName', message: 'Last name is required' });
  if (!data.email?.trim() || !/\S+@\S+\.\S+/.test(data.email)) errors.push({ field: 'email', message: 'Valid email is required' });
  if (!data.password || data.password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  return { isValid: errors.length === 0, errors };
};
const validateLogin = (data) => {
  const errors = [];
  if (!data.email) errors.push({ field: 'email', message: 'Email is required' });
  if (!data.password) errors.push({ field: 'password', message: 'Password is required' });
  return { isValid: errors.length === 0, errors };
};
module.exports = { validateRegister, validateLogin };
