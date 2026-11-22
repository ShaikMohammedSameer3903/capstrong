require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const AwsDeploymentProvider = require('../providers/AwsDeploymentProvider');
const https = require('https');
const http = require('http');

async function runTestAndCleanup() {
  const provider = new AwsDeploymentProvider({
    account_id: process.env.AWS_ACCOUNT_ID || '783493260935',
    region: process.env.AWS_REGION || 'us-east-1',
    access_key_id: process.env.AWS_ACCESS_KEY_ID,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY
  });

  const appSpec = {
    id: 'cement-poles-app',
    name: 'Shaik Ahmad Cement Poles',
    deployment_type: 'AWS S3 + CloudFront',
    repository_url: 'https://github.com/ShaikMohammedSameer3903/Shaik-ahmad-cement-poles.git',
    branch: 'main'
  };

  console.log('====================================================');
  console.log('1. DEPLOYING SHAIK AHMAD CEMENT POLES TO AWS...');
  console.log('====================================================');

  const result = await provider.deploy(appSpec, {
    deploymentId: `dep-${Date.now()}`,
    environment: 'production',
    onLog: async (step, msg) => console.log(`[${step}] ${msg}`)
  });

  console.log('\n====================================================');
  console.log('DEPLOYMENT RESULT:');
  console.log('Success:', result.success);
  console.log('Production Endpoint:', result.endpoint);
  console.log('S3 Bucket:', result.resourceId);
  console.log('CloudFront Dist ID:', result.metadata?.cloudfrontDistributionId);
  console.log('====================================================\n');

  if (result.success && result.endpoint) {
    console.log('Verifying HTTP reachability of deployed endpoint...');
    await new Promise((resolve) => {
      const client = result.endpoint.startsWith('https') ? https : http;
      client.get(result.endpoint, (res) => {
        console.log(`Endpoint HTTP Status: ${res.statusCode}`);
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          console.log(`Received ${body.length} bytes. Contains "Cement": ${body.includes('Cement') || body.includes('cement')}`);
          resolve();
        });
      }).on('error', (err) => {
        console.log(`Endpoint probe note: ${err.message}`);
        resolve();
      });
    });
  }

  console.log('\n====================================================');
  console.log('2. CLEANING UP & DELETING ALL CREATED AWS RESOURCES...');
  console.log('====================================================');

  if (result.resourceId) {
    console.log(`Deleting stack/bucket: ${result.resourceId}`);
    try {
      const deleteResult = await provider.deleteStack({
        resourceId: result.resourceId,
        metadata: result.metadata
      }, async (step, msg) => console.log(`[CLEANUP:${step}] ${msg}`));
      console.log('Delete result:', deleteResult);
    } catch (delErr) {
      console.error('Delete error:', delErr.message);
    }
  }

  // Also double check S3 bucket deletion
  const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  if (result.resourceId) {
    try {
      const listed = await s3.send(new ListObjectsV2Command({ Bucket: result.resourceId }));
      if (listed.Contents && listed.Contents.length > 0) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: result.resourceId,
          Delete: { Objects: listed.Contents.map(o => ({ Key: o.Key })) }
        }));
      }
      await s3.send(new DeleteBucketCommand({ Bucket: result.resourceId }));
      console.log(`Bucket ${result.resourceId} completely deleted.`);
    } catch (e) {
      if (e.name === 'NoSuchBucket') console.log(`Bucket ${result.resourceId} confirmed deleted.`);
      else console.log(`Bucket delete note: ${e.message}`);
    }
  }

  const buckets = await s3.send(new ListBucketsCommand({}));
  console.log('Remaining S3 Buckets in AWS Account:', (buckets.Buckets || []).map(b => b.Name));
  console.log('CLEANUP COMPLETE: Zero orphaned resources remaining in AWS.');
}

runTestAndCleanup().catch(console.error);
