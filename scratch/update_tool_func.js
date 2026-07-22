const sqlite3 = require('C:\\Users\\Isura Udith\\AppData\\Roaming\\npm\\node_modules\\flowise\\node_modules\\sqlite3');
const dbPath = 'C:\\Users\\Isura Udith\\.flowise\\database.sqlite';

const newFunc = `const axios = require('axios');
const url = 'http://localhost:5000/api/v1/ai/internal-query';
const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Key': 'uwu-flowise-secret-key-2026-gosl-compliant'
};
const body = {
    model: typeof $model !== 'undefined' ? $model : '',
    queryText: typeof $queryText !== 'undefined' ? $queryText : ''
};

try {
    const response = await axios.post(url, body, { headers });
    return JSON.stringify(response.data.data || response.data);
} catch (error) {
    return \`Error connecting to backend: \${error.message}\`;
}`;

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.run(
  "UPDATE tool SET func = ? WHERE id = ?;",
  [newFunc, 'tool-procurement-db-123'],
  function (err) {
    if (err) {
      console.error('Failed to update tool func:', err);
    } else {
      console.log(`Updated tool func successfully. Changes: ${this.changes}`);
    }
    db.close();
  }
);
