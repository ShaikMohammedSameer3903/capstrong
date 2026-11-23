const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { ClientSecretCredential } = require('@azure/identity');
const { WebSiteManagementClient } = require('@azure/arm-appservice');
const { execSync } = require('child_process');

async function deployToAzureSWA() {
  const rgName = 'rg-cloudops-2300031607-shaik-ahmad-cement-poles-6';
  const swaName = 'shaik-ahmad-cement-poles-6-23000316-d10b-c623fc';
  const deployDir = path.resolve(__dirname, '../temp_repos/repo-f45900dc');

  console.log(`[1/3] Getting deployment token for ${swaName}...`);
  const cred = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );
  const client = new WebSiteManagementClient(cred, process.env.AZURE_SUBSCRIPTION_ID);

  const secrets = await client.staticSites.listStaticSiteSecrets(rgName, swaName);
  const apiKey = secrets?.properties?.apiKey || secrets?.apiKey;

  if (!apiKey) {
    throw new Error('Failed to retrieve Azure SWA deployment token');
  }
  console.log('[1/3] Deployment token retrieved successfully.');

  console.log(`[2/3] Uploading static files from ${deployDir} via SWA CLI...`);
  const cmd = `npx --yes @azure/static-web-apps-cli deploy "${deployDir}" --deployment-token "${apiKey}" --env production --no-use-keychain`;
  
  const out = execSync(cmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DOTNET_SYSTEM_GLOBALIZATION_INVARIANT: '1'
    }
  });

  console.log('[3/3] Deployment complete! Probing site...');
}

deployToAzureSWA().catch(err => {
  console.error('[DEPLOY ERROR]:', err);
  process.exit(1);
});
