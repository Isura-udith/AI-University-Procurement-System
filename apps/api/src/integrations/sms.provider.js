/** SMS Provider - Placeholder */
const sendSMS = async (phone, message) => { console.log(`SMS to ${phone}: ${message}`); return { success: true }; };
module.exports = { sendSMS };
