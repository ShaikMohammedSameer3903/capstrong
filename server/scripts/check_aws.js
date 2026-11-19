const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const secretsManager = require('../services/secretsManager');

async function main() {
  const dbPath = process.env.DATABASE_PATH || '/app/server/data/cloudops.db';
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const awsAcct = await db.get("SELECT * FROM cloud_accounts WHERE id = 'aws-783493260935'");
  console.log('Account:', awsAcct);
  console.log('Decrypted access_key_id:', secretsManager.decryptSecret(awsAcct.access_key_id));
  console.log('Decrypted secret_access_key:', secretsManager.decryptSecret(awsAcct.secret_access_key));

  await db.close();
}

main().catch(console.error);
