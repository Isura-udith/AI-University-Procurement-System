const axios = require('axios');
const mongoose = require('mongoose');

async function testApi() {
  try {
    // 1. Get user directly from DB to verify password or create a token manually
    await mongoose.connect('mongodb://127.0.0.1:27017/uwu_procurement');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const bursar = await User.findOne({ role: 'bursar' });
    if (!bursar) {
      console.log('No bursar found');
      process.exit(1);
    }
    
    // We can generate a token directly using the same logic as auth.controller.js
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: bursar._id }, 'uwu-smart-procurement-jwt-secret-2026-gosl-compliant', { expiresIn: '1h' });
    
    console.log('Token generated for:', bursar.email);
    
    // 2. Call the API
    const response = await axios.get('http://localhost:5000/api/v1/procurements/pending-approvals', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': 'uwu-main'
      }
    });
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
    process.exit(0);
  }
}

testApi();
