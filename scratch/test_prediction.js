const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const url = `${process.env.FLOWISE_API_URL || 'http://localhost:3000/api/v1'}/prediction/${process.env.FLOWISE_CHATFLOW_ID || 'e09a9b3b-0e76-4bb6-ba2a-4f1878d7eacb'}`;
const headers = { 'Content-Type': 'application/json' };
if (process.env.FLOWISE_API_KEY) {
  headers['Authorization'] = `Bearer ${process.env.FLOWISE_API_KEY}`;
}

async function testPrediction(question) {
  console.log('\n====================================');
  console.log('Sending question:', question);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        sessionId: 'test-session-2'
      })
    });
    const data = await response.json();
    console.log('Answer:\n', data.text);
    if (data.usedTools && data.usedTools.length > 0) {
      console.log('Tools Used:', JSON.stringify(data.usedTools, null, 2));
    }
  } catch (err) {
    console.error('Prediction call failed:', err);
  }
}

async function run() {
  await testPrediction('List registered vendors');
  await testPrediction('What are the active procurements?');
}

run();
