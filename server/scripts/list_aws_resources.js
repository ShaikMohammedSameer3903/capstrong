const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { CloudFormationClient, ListStacksCommand } = require('@aws-sdk/client-cloudformation');

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

async function checkResources() {
  const s3 = new S3Client(clientConfig);
  const buckets = await s3.send(new ListBucketsCommand({}));
  console.log('--- S3 BUCKETS ---');
  console.log(buckets.Buckets?.map(b => b.Name));

  const cf = new CloudFormationClient(clientConfig);
  const stacks = await cf.send(new ListStacksCommand({
    StackStatusFilter: ['CREATE_COMPLETE', 'CREATE_IN_PROGRESS', 'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED', 'UPDATE_COMPLETE']
  }));
  console.log('--- CLOUDFORMATION STACKS ---');
  console.log(stacks.StackSummaries?.map(s => ({ name: s.StackName, status: s.StackStatus })));
}

checkResources().catch(console.error);
