const fs = require('fs');
const path = require('path');

const envFilePath = 'c:\\Users\\Isura Udith\\OneDrive\\Desktop\\smart-procurement-system\\.env';
let FLOWISE_API_URL = 'http://localhost:3000/api/v1';
let FLOWISE_CHATFLOW_ID = 'e09a9b3b-0e76-4bb6-ba2a-4f1878d7eacb';
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
      } else if (key === 'FLOWISE_CHATFLOW_ID') {
        FLOWISE_CHATFLOW_ID = val;
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
    console.log(`Fetching chatflow ${FLOWISE_CHATFLOW_ID} from ${FLOWISE_API_URL}...`);
    const getUrl = `${FLOWISE_API_URL}/chatflows/${FLOWISE_CHATFLOW_ID}`;
    const getRes = await fetch(getUrl, { headers });
    
    if (!getRes.ok) {
      throw new Error(`Failed to fetch chatflow: ${getRes.status} ${getRes.statusText}`);
    }
    
    const chatflow = await getRes.json();
    const flowData = JSON.parse(chatflow.flowData);
    
    console.log('\n--- CHATFLOW NODES ---');
    flowData.nodes.forEach(n => {
      console.log(`ID: "${n.id}", Name: "${n.data.name}", Label: "${n.data.label}"`);
      if (n.data.inputs) {
        console.log(`  Inputs:`, JSON.stringify(n.data.inputs, null, 2));
      }
    });
    
    console.log('\n--- CHATFLOW EDGES ---');
    flowData.edges.forEach(e => {
      console.log(`Source: "${e.source}" (Handle: "${e.sourceHandle}") ➔ Target: "${e.target}" (Handle: "${e.targetHandle}")`);
    });
    
  } catch (error) {
    console.error('Error fetching chatflow:', error);
  }
}

run();
