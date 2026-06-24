/** Payment Gateway - Placeholder for GOSL payment integration */
const processPayment = async (paymentData) => {
  // Placeholder: In production, integrate with Sri Lankan government payment gateway
  return { success: true, transactionRef: `TXN-${Date.now()}`, processedAt: new Date() };
};
module.exports = { processPayment };
