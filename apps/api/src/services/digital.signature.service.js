
const crypto = require('crypto');
const logger = require('../config/logger');

class DigitalSignatureService {
  /**
   * Generate a digital signature hash for a document.
   * (Mock — uses SHA-256 as placeholder for production PKI)
   *
   * @param {string|object} documentContent – the content to sign
   * @param {string} signerId – the user ID of the signer
   * @returns {object} signature metadata
   */
  async signDocument(documentContent, signerId) {
    const content = typeof documentContent === 'string'
      ? documentContent
      : JSON.stringify(documentContent);

    const timestamp = new Date().toISOString();
    const hash = crypto
      .createHash('sha256')
      .update(content + signerId + timestamp)
      .digest('hex');

    const signature = {
      signatureHash: hash,
      algorithm: 'SHA-256',
      signerId,
      signedAt: timestamp,
      provider: 'DigitalSign-STUB',
      isProduction: false,
      legalNotice: 'This is a development stub. Production signatures require PKI API integration per Electronic Transactions Act No. 19 of 2006.',
      documentHash: crypto.createHash('sha256').update(content).digest('hex'),
    };

    logger.info('Digital signature generated (stub)', {
      signatureHash: hash.substring(0, 16) + '...',
      signerId,
    });

    return signature;
  }

  /**
   * Verify a digital signature.
   *
   * @param {string|object} documentContent – the original content
   * @param {object} signature – the signature metadata
   * @returns {object} verification result
   */
  async verifySignature(documentContent, signature) {
    const content = typeof documentContent === 'string'
      ? documentContent
      : JSON.stringify(documentContent);

    const documentHash = crypto.createHash('sha256').update(content).digest('hex');
    const isValid = documentHash === signature.documentHash;

    return {
      isValid,
      documentIntegrity: isValid ? 'intact' : 'tampered',
      provider: signature.provider,
      signedAt: signature.signedAt,
      signerId: signature.signerId,
      verifiedAt: new Date().toISOString(),
    };
  }
}

module.exports = new DigitalSignatureService();
