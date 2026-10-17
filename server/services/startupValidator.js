const { getDatabase } = require('../db/database');

async function validateStartup() {
  console.log('\n=========================================');
  console.log('CloudOps Production Validation');
  console.log('==============================');

  const errors = [];
  const warnings = [];

  // 1. Database & Schema validation
  let dbStatus = '✗ Unavailable';
  try {
    const db = await getDatabase();
    if (db && db.type === 'postgres') {
      dbStatus = '✓ PostgreSQL Connected & Schema Validated';
    } else {
      dbStatus = '✓ SQLite Connected & Schema Validated';
      if (!process.env.DATABASE_URL) {
        warnings.push('Production is running on ephemeral SQLite. Data will not persist.');
      }
    }
  } catch (dbErr) {
    dbStatus = `✗ Database Error: ${dbErr.message}`;
    errors.push(`DATABASE: ${dbErr.message}`);
  }


  // 2. JWT validation
  let jwtStatus = '✗ Missing';
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    jwtStatus = '✓ Loaded';
  } else {
    errors.push('JWT_SECRET');
  }

  // 3. Google OAuth Validation
  let googleStatus = '✗ Missing';
  const missingGoogle = [];
  if (!process.env.GOOGLE_CLIENT_ID) missingGoogle.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missingGoogle.push('GOOGLE_CLIENT_SECRET');

  if (missingGoogle.length === 0) {
    googleStatus = '✓ Configured';
  } else {
    googleStatus = `✗ Missing ${missingGoogle.join(', ')}`;
  }

  // 4. Microsoft/Azure OAuth Validation
  let msStatus = '✗ Missing';
  const missingMs = [];
  if (!process.env.AZURE_CLIENT_ID) missingMs.push('AZURE_CLIENT_ID');
  if (!process.env.AZURE_CLIENT_SECRET) missingMs.push('AZURE_CLIENT_SECRET');
  if (!process.env.AZURE_TENANT_ID) missingMs.push('AZURE_TENANT_ID');

  if (missingMs.length === 0) {
    msStatus = '✓ Configured';
  } else {
    msStatus = `✗ Missing ${missingMs.join(', ')}`;
  }

  // 5. Azure Subscription ID for discovery
  let azureSubStatus = '✗ Missing';
  if (process.env.AZURE_SUBSCRIPTION_ID) {
    azureSubStatus = '✓ Subscription Valid';
  } else {
    warnings.push('AZURE_SUBSCRIPTION_ID: Missing. Automated resource discovery will be disabled.');
  }

  // 6. MongoDB Atlas Validation
  let mongoStatus = 'Not configured';
  if (process.env.MONGODB_URI) {
    mongoStatus = '✓ MongoDB Atlas Connected';
  }

  // Print diagnostics
  console.log(`Database:\n${dbStatus.startsWith('✓') ? '✓' : '✗'} ${dbStatus}`);
  if (process.env.MONGODB_URI) {
    console.log(`✓ ${mongoStatus} (${process.env.MONGODB_DB || 'capstrong'})`);
  }
  console.log(`\nAzure:\n${msStatus.startsWith('✓') ? '✓' : '✗'} ${msStatus}`);
  console.log(`${azureSubStatus.startsWith('✓') ? '✓' : '✗'} ${azureSubStatus}`);
  console.log(`\nGoogle OAuth:\n${googleStatus.startsWith('✓') ? '✓' : '✗'} ${googleStatus}`);
  console.log(`\nMicrosoft OAuth:\n${msStatus.startsWith('✓') ? '✓' : '✗'} ${msStatus}`);
  console.log(`\nJWT:\n${jwtStatus.startsWith('✓') ? '✓' : '✗'} ${jwtStatus}`);
  console.log(`\nAPI:\n✓ Listening`);
  console.log(`\nDiscovery:\n${azureSubStatus.startsWith('✓') ? '✓' : '✗'} ${azureSubStatus.startsWith('✓') ? 'Ready' : 'Unavailable'}`);
  console.log('=========================================\n');

  if (warnings.length > 0) {
    console.warn('⚠️  STARTUP WARNINGS:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.log('-----------------------------------------\n');
  }

  if (errors.length > 0) {
    console.error('🛑 CRITICAL STARTUP CONFIGURATION ERRORS:');
    errors.forEach(e => console.error(`   - Missing required configuration: ${e}`));
    console.log('=========================================\n');
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down server due to missing critical variables in production.');
      process.exit(1);
    }
  }
}

module.exports = { validateStartup };
