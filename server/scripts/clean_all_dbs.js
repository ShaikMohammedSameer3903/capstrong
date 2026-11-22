const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', 'cloudops.db'),
  path.join(__dirname, '..', 'database.sqlite'),
  path.join(__dirname, '..', 'data', 'cloudops.db'),
  path.join(__dirname, '..', 'data', 'database.sqlite')
];

async function clean() {
  for (const dbPath of candidates) {
    if (fs.existsSync(dbPath)) {
      console.log('Cleaning DB file at:', dbPath);
      try {
        const db = await open({ filename: dbPath, driver: sqlite3.Database });
        
        // Find matching fake resources
        const matching = await db.all("SELECT id, name, type, provider, status FROM resources WHERE name LIKE '%PORTFOLIO%' OR name LIKE '%rg-cloudops-shaiksameer3909sam-portfolio%' OR id LIKE '%portfolio%'");
        console.log(`Found ${matching.length} matching rows in ${dbPath}:`);
        matching.forEach(r => console.log(`  - ${r.name} (${r.type}) [${r.provider}]`));

        // Delete fake resources
        const delRes = await db.run("DELETE FROM resources WHERE name LIKE '%PORTFOLIO%' OR name LIKE '%rg-cloudops-shaiksameer3909sam-portfolio%' OR id LIKE '%portfolio%'");
        console.log(`Deleted ${delRes.changes} rows from resources table.`);

        // Also clean up any matching fake deployments
        const delDep = await db.run("DELETE FROM deployments WHERE application_id LIKE '%portfolio%' OR id LIKE '%dep-00%'");
        console.log(`Deleted ${delDep.changes} rows from deployments table.`);

        await db.close();
      } catch (err) {
        console.error(`Error cleaning ${dbPath}:`, err.message);
      }
    }
  }
  console.log('ALL LOCAL DB FILES CLEANED!');
}

clean().catch(console.error);
