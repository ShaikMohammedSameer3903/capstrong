// ============================================================
// Database Cleanup & Subscription Consolidation Script
// Consolidates duplicate MSAL subscription rows into primary credentialed subscription
// ============================================================

const { getDatabase } = require('../server/db/database');

async function runCleanup() {
  console.log('[CLEANUP] Starting subscription cleanup and consolidation...');
  const db = await getDatabase();

  // 1. Fetch all azure subscriptions
  const subs = await db.all('SELECT * FROM azure_subscriptions');
  console.log(`[CLEANUP] Found ${subs.length} total subscription records in DB.`);

  // Group by subscription_id and tenant_id
  const map = new Map();
  for (const s of subs) {
    const key = `${s.tenant_id}:${s.subscription_id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }

  for (const [key, group] of map.entries()) {
    if (group.length <= 1) continue;

    console.log(`[CLEANUP] Group "${key}" has ${group.length} duplicates:`);
    // Prefer subscription with client_id/credentials or auth_type = 'CREDENTIALS'
    let primary = group.find(s => s.auth_type === 'CREDENTIALS' || (s.client_id && s.client_id !== 'demo-client-id')) || group[0];

    console.log(`[CLEANUP] Primary chosen: ${primary.id} (${primary.name})`);

    for (const duplicate of group) {
      if (duplicate.id === primary.id) continue;
      console.log(`[CLEANUP] Consolidating duplicate ID: ${duplicate.id}`);

      // Reassign any resources attached to duplicate ID to primary ID
      const updateRes = await db.run(
        'UPDATE resources SET subscription_id = ? WHERE subscription_id = ?',
        [primary.id, duplicate.id]
      );
      console.log(`[CLEANUP] Reassigned ${updateRes.changes} resources to primary ${primary.id}`);

      // Delete duplicate subscription row
      await db.run('DELETE FROM azure_subscriptions WHERE id = ?', [duplicate.id]);
      await db.run('DELETE FROM cloud_accounts WHERE id = ?', [duplicate.id]);
      console.log(`[CLEANUP] Removed duplicate subscription row ${duplicate.id}`);
    }
  }

  // Ensure primary subscription has user_id or tenant access, and cloud_account exists
  const remainingSubs = await db.all('SELECT * FROM azure_subscriptions');
  for (const sub of remainingSubs) {
    const accountExists = await db.get('SELECT * FROM cloud_accounts WHERE id = ?', [sub.id]);
    if (!accountExists) {
      await db.run(
        `INSERT INTO cloud_accounts (id, tenant_id, user_id, provider, account_name, subscription_id, region, status)
         VALUES (?, ?, ?, 'azure', ?, ?, 'global', 'Active')`,
        [sub.id, sub.tenant_id, sub.user_id, sub.name, sub.subscription_id]
      );
      console.log(`[CLEANUP] Created missing cloud_account for ${sub.id}`);
    }
  }

  console.log('[CLEANUP] Subscription consolidation completed successfully.');
  process.exit(0);
}

runCleanup().catch(err => {
  console.error('[CLEANUP] Error during cleanup:', err);
  process.exit(1);
});
