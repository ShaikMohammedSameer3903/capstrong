require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  DeleteBucketCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

async function testBucket() {
  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const bucketName = `test-verify-deploy-${Date.now()}`;
  console.log('Testing S3 with bucket:', bucketName);

  try {
    // 1. Create bucket
    await client.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log('1. Bucket created successfully.');

    // 2. Disable block public access
    await client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false
      }
    }));
    console.log('2. Public access block disabled.');

    // 3. Put public policy
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/*`
      }]
    };
    await client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    }));
    console.log('3. Public read bucket policy applied.');

    // 4. Configure website hosting
    await client.send(new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'index.html' }
      }
    }));
    console.log('4. Website hosting enabled.');

    // 5. Upload index.html
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'index.html',
      Body: '<h1>CloudOps Live on AWS!</h1>',
      ContentType: 'text/html'
    }));
    console.log('5. Uploaded index.html.');

    const url = `http://${bucketName}.s3-website-us-east-1.amazonaws.com`;
    console.log('TEST URL IS LIVE:', url);

    // Clean up test bucket
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: 'index.html' }));
    await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    console.log('6. Cleaned up test bucket.');

  } catch (err) {
    console.error('FAILED AT:', err.name, err.message);
  }
}

testBucket();
