/**
 * Hash Utility - Cryptographic hashing for document integrity
 */
const crypto = require('crypto');

const hashDocument = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const hashString = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

const verifyHash = (data, hash) => {
  const computed = crypto.createHash('sha256').update(data).digest('hex');
  return computed === hash;
};

module.exports = { hashDocument, hashString, generateResetToken, verifyHash };
