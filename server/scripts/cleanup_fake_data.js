const { getDatabase } = require('../db/database');

async function main() {
  const db = await getDatabase();

  console.log('--- Current AWS Resources ---');
  const awsRes = await db.all("SELECT id, name, type, provider, subscription_id, status FROM resources WHERE UPPER(provider) = 'AWS'");
  console.log(awsRes);

  console.log('--- Deleting Fake AWS Resources ---');
  // Delete fake portfolio resources that are not in AWS
  const deleteRes = await db.run("DELETE FROM resources WHERE UPPER(provider) = 'AWS' AND (name LIKE '%PORTFOLIO%' OR id LIKE '%cloudops-static%' OR id LIKE '%ecs:%' OR id LIKE '%portfolio%')");
  console.log('Deleted fake AWS resources count:', deleteRes.changes);

  // Also clean sample seed deployments if any
  const fakeDeps = await db.run("DELETE FROM deployments WHERE id IN ('dep-001', 'dep-002', 'dep-003', 'dep-004', 'dep-005', 'dep-006', 'dep-007', 'dep-008')");
  console.log('Deleted sample mock deployments count:', fakeDeps.changes);

  // Remaining AWS resources:
  const remaining = await db.all("SELECT id, name, type, provider, subscription_id, status FROM resources WHERE UPPER(provider) = 'AWS'");
  console.log('Remaining AWS Resources in DB:', remaining);

  console.log('Done!');
}

main().catch(console.error);
