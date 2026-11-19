const { getDatabase } = require('../db/database');

async function clean() {
  const db = await getDatabase();

  // 1. Fix old dead ec2 url
  await db.run(
    'UPDATE deployments SET endpoint_url = ? WHERE endpoint_url LIKE ?',
    ['http://localhost:8080/api/preview/portfolio-1/', '%portfolio.ec2%']
  );

  // 2. Remove bogus Azure resource group from AWS
  await db.run("DELETE FROM resources WHERE name LIKE 'rg-cloudops%portfolio%'");

  // 3. Ensure cloud_accounts has user's AWS account record for 783493260935
  const existingAws = await db.get("SELECT * FROM cloud_accounts WHERE provider = 'aws'");
  if (!existingAws) {
    await db.run(
      `INSERT INTO cloud_accounts (id, tenant_id, user_id, provider, account_name, subscription_id, account_id, region, status, created_at)
       VALUES ('acc-aws-783493260935', '808cc83e-a546-47e7-a03f-73a1ebba24f3', '5d52f86d-b709-40d7-9855-be8223ac9b93', 'aws', 'AWS Account (783493260935)', '783493260935', '783493260935', 'us-east-1', 'Active', CURRENT_TIMESTAMP)`
    );
    console.log('Added AWS Account 783493260935 to cloud_accounts');
  }

  // 4. Update any AWS resource that was mapped to Azure subscription
  await db.run(
    "UPDATE resources SET subscription_id = '783493260935', resource_group = 'AWS CloudOps (us-east-1)' WHERE provider = 'AWS'"
  );

  console.log('Database cleanup completed!');
}

clean().catch(console.error);
