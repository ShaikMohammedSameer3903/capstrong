const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function main() {
  const dbPath = process.env.DATABASE_PATH || '/app/server/data/cloudops.db';
  console.log('Connecting to SQLite at:', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.log('Database file does not exist at:', dbPath);
    return;
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // 1. Remove fake PORTFOLIO resources under AWS
  const delAws = await db.run("DELETE FROM resources WHERE UPPER(provider) = 'AWS' AND (name LIKE '%PORTFOLIO%' OR id LIKE '%cloudops-static%' OR id LIKE '%ecs:%' OR id LIKE '%portfolio%')");
  console.log('Deleted fake AWS resources:', delAws.changes);

  // 2. Remove sample mock deployments
  const delDeps = await db.run("DELETE FROM deployments WHERE id IN ('dep-001', 'dep-002', 'dep-003', 'dep-004', 'dep-005', 'dep-006', 'dep-007', 'dep-008')");
  console.log('Deleted mock sample deployments:', delDeps.changes);

  // 3. Update any broken URLs
  await db.run("UPDATE deployments SET endpoint_url = 'http://localhost:8080/api/preview/portfolio/' WHERE endpoint_url LIKE '%portfolio.ec2%'");

  // 4. Ensure cached_repos directory exists and is writable
  const cachedDir = '/app/server/data/cached_repos';
  try {
    if (!fs.existsSync(cachedDir)) {
      fs.mkdirSync(cachedDir, { recursive: true, mode: 0o777 });
    }
  } catch (e) {
    console.warn('cached_repos mkdir notice:', e.message);
  }

  const remaining = await db.all("SELECT id, name, type, provider, status FROM resources WHERE UPPER(provider) = 'AWS'");
  console.log('Remaining AWS resources in DB (' + remaining.length + '):', remaining.map(r => r.name + ' (' + r.type + ')'));

  await db.close();
  console.log('Database cleanup completed successfully!');
}

main().catch(console.error);
