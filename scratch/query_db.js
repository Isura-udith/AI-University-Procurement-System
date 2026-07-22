const sqlite3 = require('C:\\Users\\Isura Udith\\AppData\\Roaming\\npm\\node_modules\\flowise\\node_modules\\sqlite3');
const dbPath = 'C:\\Users\\Isura Udith\\.flowise\\database.sqlite';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.all("SELECT * FROM tool;", [], (err, rows) => {
    if (err) {
      console.log('Error tool:', err.message);
    } else {
      console.log('\n--- TOOLS ---');
      rows.forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.name}`);
        console.log(`Description: ${r.description}`);
        console.log(`Schema: ${r.schema}`);
        console.log(`Func: ${r.func}`);
      });
    }
    db.close();
  });
});
