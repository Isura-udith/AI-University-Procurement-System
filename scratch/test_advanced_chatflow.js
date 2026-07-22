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
  console.log('Sending Question:', question);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question,
        sessionId: `test-session-${Date.now()}`
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Error ${response.status}:`, errText);
      return;
    }

    const data = await response.json();
    console.log('\n🤖 Answer:\n', data.text);
    if (data.agentReasoning) {
      console.log('\n🧠 Agent Reasoning Steps:', data.agentReasoning.length);
    }
  } catch (err) {
    console.error('Prediction call failed:', err);
  }
}

async function run() {
  await testPrediction('We plan to purchase laboratory equipment estimated at LKR 15,000,000 using Shopping method. Is this compliant under GOSL guidelines?');
  await testPrediction('Show active procurements and top rated suppliers.');
}

run();
