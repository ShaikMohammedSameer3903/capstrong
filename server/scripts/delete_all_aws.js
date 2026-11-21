const {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand
} = require('@aws-sdk/client-s3');
const {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand
} = require('@aws-sdk/client-cloudformation');

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

async function cleanAws() {
  const s3 = new S3Client(clientConfig);
  const cf = new CloudFormationClient(clientConfig);

  console.log('[1/2] Scanning S3 buckets to delete...');
  const bucketsRes = await s3.send(new ListBucketsCommand({}));
  const buckets = bucketsRes.Buckets || [];

  for (const b of buckets) {
    if (b.Name.includes('portfolio') || b.Name.includes('cloudops') || b.Name.includes('test') || b.Name.includes('cement') || b.Name.includes('shaik')) {
      console.log(`Emptying and deleting S3 bucket: ${b.Name}...`);
      try {
        // List all objects in bucket
        const listObjs = await s3.send(new ListObjectsV2Command({ Bucket: b.Name }));
        if (listObjs.Contents && listObjs.Contents.length > 0) {
          const deleteParams = {
            Bucket: b.Name,
            Delete: {
              Objects: listObjs.Contents.map(obj => ({ Key: obj.Key }))
            }
          };
          await s3.send(new DeleteObjectsCommand(deleteParams));
          console.log(` Deleted ${listObjs.Contents.length} objects from ${b.Name}`);
        }
        // Delete bucket
        await s3.send(new DeleteBucketCommand({ Bucket: b.Name }));
        console.log(` Successfully deleted bucket ${b.Name}`);
      } catch (err) {
        console.error(` Error deleting bucket ${b.Name}:`, err.message);
      }
    }
  }

  console.log('\n[2/2] Scanning CloudFormation stacks to delete...');
  const stacksRes = await cf.send(new ListStacksCommand({
    StackStatusFilter: ['CREATE_COMPLETE', 'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED', 'UPDATE_COMPLETE']
  }));
  const stacks = stacksRes.StackSummaries || [];

  for (const s of stacks) {
    if (s.StackName.startsWith('platform-portfolio') || s.StackName.includes('cloudops')) {
      console.log(`Deleting CloudFormation stack: ${s.StackName}...`);
      try {
        await cf.send(new DeleteStackCommand({ StackName: s.StackName }));
        console.log(` Successfully requested deletion for stack ${s.StackName}`);
      } catch (err) {
        console.error(` Error deleting stack ${s.StackName}:`, err.message);
      }
    }
  }

  console.log('\nAWS CLEANUP FINISHED.');
}

cleanAws().catch(console.error);
