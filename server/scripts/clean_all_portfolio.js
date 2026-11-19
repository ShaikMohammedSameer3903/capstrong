const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

async function main() {
  const dbPath = process.env.DATABASE_PATH || '/app/server/data/cloudops.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  // Delete any remaining fake portfolio or fake resource group rows across ALL providers
  const del = await db.run("DELETE FROM resources WHERE name LIKE '%portfolio%' OR name LIKE '%shaiksameer3909sam%' OR id LIKE '%portfolio%'");
  console.log('DELETED_REMAINING_FAKE_ROWS:', del.changes);

  const remaining = await db.all("SELECT id, name, type, provider, status FROM resources WHERE name LIKE '%portfolio%' OR name LIKE '%shaiksameer3909sam%'");
  console.log('REMAINING_ROWS_COUNT:', remaining.length);

  await db.close();
}

main().catch(console.error);
