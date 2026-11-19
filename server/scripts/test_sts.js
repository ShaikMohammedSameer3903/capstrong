require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testCreds() {
  const client = new STSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    const res = await client.send(new GetCallerIdentityCommand({}));
    console.log('STS SUCCESS:', res);
  } catch (err) {
    console.error('STS ERROR:', err.name, err.message);
  }
}

testCreds();
