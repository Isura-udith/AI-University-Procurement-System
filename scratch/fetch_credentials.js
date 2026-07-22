const fs = require('fs');
const path = require('path');

const envFilePath = 'c:\\Users\\Isura Udith\\OneDrive\\Desktop\\smart-procurement-system\\.env';
let FLOWISE_API_URL = 'http://localhost:3000/api/v1';
let FLOWISE_API_KEY = '';

if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'FLOWISE_API_URL') {
        FLOWISE_API_URL = val;
      } else if (key === 'FLOWISE_API_KEY') {
        FLOWISE_API_KEY = val;
      }
    }
  }
}

const headers = {
  'Content-Type': 'application/json',
};
if (FLOWISE_API_KEY) {
  headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;
}

async function run() {
  try {
    console.log(`Fetching credentials from ${FLOWISE_API_URL}/credentials ...`);
    const res = await fetch(`${FLOWISE_API_URL}/credentials`, { headers });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
    }
    const credentials = await res.json();
    console.log('Credentials list:');
    credentials.forEach(c => {
      console.log(`- ID: "${c.id}", Name: "${c.name}", CredentialName: "${c.credentialName}"`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
