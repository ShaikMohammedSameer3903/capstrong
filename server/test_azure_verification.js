const { ClientSecretCredential } = require('@azure/identity');
const { ResourceManagementClient } = require('@azure/arm-resources');
const { WebSiteManagementClient } = require('@azure/arm-appservice');
require('dotenv').config({ path: './.env' });

const subId = process.env.AZURE_SUBSCRIPTION_ID;
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

const loggingPolicy = {
  name: 'AzureLoggerPolicy',
  async sendRequest(request, next) {
    const startTime = Date.now();
    const reqId = request.headers.get('x-ms-client-request-id') || request.requestId;
    console.log(`\n[AZURE SDK REQUEST] ${request.method} ${request.url}`);
    
    try {
      const response = await next(request);
      const durationMs = Date.now() - startTime;
      const azureReqId = response.headers.get('x-ms-request-id') || response.headers.get('x-ms-correlation-request-id') || reqId;
      const armOperationId = response.headers.get('azure-asyncoperation') || response.headers.get('location') || response.headers.get('x-ms-request-id') || 'N/A';

      console.log(`[AZURE SDK RESPONSE] Status: ${response.status} (${durationMs}ms)`);
      console.log(`  Azure Request ID: ${azureReqId}`);
      console.log(`  ARM Operation ID: ${armOperationId}`);
      return response;
    } catch (err) {
      console.error(`[AZURE REST ERROR] ${request.method} ${request.url}`);
      console.error(`  Status: ${err.statusCode || err.status || 'N/A'}`);
      console.error(`  Error Code: ${err.code || err.name}`);
      console.error(`  Error Message: ${err.message}`);
      if (err.response?.headers) {
        console.error(`  Azure Request ID: ${err.response.headers.get('x-ms-request-id')}`);
      }
      throw err;
    }
  }
};

async function testAzureCreate() {
  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const clientOptions = {
    additionalPolicies: [
      {
        policy: loggingPolicy,
        position: 'perCall'
      }
    ]
  };

  const rmClient = new ResourceManagementClient(credential, subId, clientOptions);
  const rgName = 'rg-cloudops-test-verif';

  try {
    console.log(`--- Step 1: Create Resource Group ${rgName} ---`);
    const rgRes = await rmClient.resourceGroups.createOrUpdate(rgName, { location: 'eastus' });
    console.log('RG Create Result:', rgRes.name, rgRes.properties?.provisioningState);

    console.log(`--- Step 2: GET Resource Group ${rgName} ---`);
    const verifiedRg = await rmClient.resourceGroups.get(rgName);
    console.log('RG GET Verified:', verifiedRg.name, verifiedRg.properties?.provisioningState);

    // Clean up test RG
    console.log(`--- Step 3: Clean up RG ${rgName} ---`);
    await rmClient.resourceGroups.beginDeleteAndWait(rgName);
    console.log('RG Deleted successfully.');

  } catch (err) {
    console.error('Operation failed:', err);
  }
}

testAzureCreate();
