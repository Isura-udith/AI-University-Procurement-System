const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const headers = { 'Content-Type': 'application/json' };
if (process.env.FLOWISE_API_KEY) {
  headers['Authorization'] = `Bearer ${process.env.FLOWISE_API_KEY}`;
}

fetch('http://localhost:3000/api/v1/tools', { headers })
  .then(res => res.json())
  .then(tools => console.log(JSON.stringify(tools, null, 2)))
  .catch(err => console.error(err));
