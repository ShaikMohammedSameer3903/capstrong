require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const secretsManager = require('../services/secretsManager');

async function syncDb(dbPath) {
  console.log('Syncing AWS account in:', dbPath);
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const encAccessKey = secretsManager.encryptSecret(process.env.AWS_ACCESS_KEY_ID || '');
  const encSecretKey = secretsManager.encryptSecret(process.env.AWS_SECRET_ACCESS_KEY || '');

  // Update existing AWS accounts
  await db.run(`
    UPDATE cloud_accounts 
    SET access_key_id = ?, secret_access_key = ?, status = 'Active', region = 'us-east-1', account_id = '783493260935'
    WHERE provider = 'aws'
  `, [encAccessKey, encSecretKey]);

  // Ensure account exists for tenant '808cc83e-a546-47e7-a03f-73a1ebba24f3'
  const acct = await db.get("SELECT id FROM cloud_accounts WHERE provider = 'aws' AND tenant_id = '808cc83e-a546-47e7-a03f-73a1ebba24f3'");
  if (!acct) {
    await db.run(`
      INSERT INTO cloud_accounts (id, tenant_id, user_id, provider, account_name, account_id, region, access_key_id, secret_access_key, status, created_at)
      VALUES ('acc-aws-783493260935', '808cc83e-a546-47e7-a03f-73a1ebba24f3', '5d52f86d-b709-40d7-9855-be8223ac9b93', 'aws', 'AWS Account (783493260935)', '783493260935', 'us-east-1', ?, ?, 'Active', datetime('now'))
    `, [encAccessKey, encSecretKey]);
  }

  const allAws = await db.all("SELECT id, tenant_id, provider, account_name, account_id, status, access_key_id FROM cloud_accounts WHERE provider = 'aws'");
  console.log('AWS Accounts now:', JSON.stringify(allAws, null, 2));

  await db.close();
}

async function main() {
  const hostDb = path.join(__dirname, '../cloudops.db');
  await syncDb(hostDb);
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH !== hostDb) {
    await syncDb(process.env.DATABASE_PATH);
  }
}

main().catch(console.error);
