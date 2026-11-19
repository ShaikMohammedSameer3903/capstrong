require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testS3() {
  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    const res = await client.send(new ListBucketsCommand({}));
    console.log('S3 SUCCESS. Buckets count:', res.Buckets?.length);
    console.log('Buckets:', res.Buckets?.map(b => b.Name));
  } catch (err) {
    console.error('S3 ERROR:', err.name, err.message);
  }
}

testS3();
