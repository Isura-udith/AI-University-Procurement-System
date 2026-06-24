const axios = require('axios');

async function testApprove() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'procurement@uwu.ac.lk',
      password: 'Demo@1234'
    });
    console.log('Login Response:', JSON.stringify(loginRes.data));
    const token = loginRes.data.data.accessToken;
    console.log('Extracted Token:', token ? (token.substring(0, 15) + '...') : 'undefined');

    // Find the requisition ID from the database using mongoose
    const mongoose = require('mongoose');
    const Procurement = require('./src/models/procurement.model');
    require('dotenv').config();
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uwu_procurement';
    await mongoose.connect(uri);
    
    // Find a procurement in dean_approved status
    const reqItem = await Procurement.findOne({ status: 'dean_approved' });
    if (!reqItem) {
      console.log('No dean_approved requisition found to test.');
      process.exit(0);
    }
    console.log(`Found requisition ${reqItem.referenceNumber} with ID ${reqItem._id}`);

    // Call approve endpoint
    try {
      const approveRes = await axios.post(`http://localhost:5000/api/v1/procurements/${reqItem._id}/approve`, {
        stage: 'pmd',
        comments: 'Approve test'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Approve Success:', approveRes.data);
    } catch (err) {
      console.error('Approve Error Response Status:', err.response?.status);
      console.error('Approve Error Response Data:', err.response?.data);
    }
    process.exit(0);
  } catch (err) {
    console.error('Main Error:', err.message);
    process.exit(1);
  }
}

testApprove();
