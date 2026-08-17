// ============================================================
// Automated Authentication & Security Middleware Test Suite
// Verifies 401, 403, Expired Token, Wrong Tenant, Missing Role, Disabled User
// ============================================================

const jwt = require('jsonwebtoken');
const validateJwt = require('./middleware/validateJwt');
const { authorizeRoles } = require('./middleware/rbac');
const { getDatabase } = require('./db/database');

async function runAuthSecurityTests() {
  console.log('===========================================================');
  console.log('▶ Starting Automated Auth & Security Middleware Tests');
  console.log('===========================================================');

  let passed = 0;
  let total = 0;

  const assert = (condition, title, details = '') => {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${title}`);
    } else {
      console.error(`  ✗ [FAIL] ${title}: ${details}`);
    }
  };

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonBody: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.jsonBody = body;
        return this;
      }
    };
    return res;
  };

  try {
    const db = await getDatabase();
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-tests';
    process.env.JWT_SECRET = JWT_SECRET;

    const tenantId = 'demo-org-001';
    await db.run('INSERT OR IGNORE INTO tenants (id, name) VALUES (?, ?)', [tenantId, 'Demo Organization']);

    // Test 1: 401 on Missing Authorization Header
    const req1 = { headers: {}, query: {} };
    const res1 = createMockRes();
    await validateJwt(req1, res1, () => {});
    assert(res1.statusCode === 401 && res1.jsonBody.code === 'UNAUTHORIZED', '401 on Missing Token Header');

    // Test 2: 401 on Invalid Token Format
    const req2 = { headers: { authorization: 'Bearer invalid-token-string' }, query: {} };
    const res2 = createMockRes();
    await validateJwt(req2, res2, () => {});
    assert(res2.statusCode === 401 && res2.jsonBody.code === 'UNAUTHORIZED', '401 on Invalid Token Format');

    // Test 3: 401 on Expired Token
    const expiredToken = jwt.sign(
      { id: 'user-001', email: 'expired@cloudops.local', sessionId: 'sess-expired' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const req3 = { headers: { authorization: `Bearer ${expiredToken}` }, query: {} };
    const res3 = createMockRes();
    await validateJwt(req3, res3, () => {});
    assert(res3.statusCode === 401 && res3.jsonBody.code === 'TOKEN_EXPIRED', '401 on Expired Token');

    // Test 4: 403 on Disabled User Account
    const disabledUserId = 'user-disabled-test';
    await db.run("INSERT OR REPLACE INTO users (id, email, role, tenant_id, status) VALUES (?, 'disabled@cloudops.local', 'Viewer', ?, 'Disabled')", [disabledUserId, tenantId]);
    await db.run("INSERT OR REPLACE INTO sessions (session_id, user_id, email, provider, revoked, last_active) VALUES ('sess-disabled', ?, 'disabled@cloudops.local', 'Local', 0, datetime('now'))", [disabledUserId]);

    const disabledUserToken = jwt.sign(
      { id: disabledUserId, email: 'disabled@cloudops.local', sessionId: 'sess-disabled' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req4 = { headers: { authorization: `Bearer ${disabledUserToken}` }, query: {} };
    const res4 = createMockRes();
    await validateJwt(req4, res4, () => {});
    assert(res4.statusCode === 403 && res4.jsonBody?.code === 'ACCOUNT_DISABLED', '403 on Disabled User Account', `Got status ${res4.statusCode}, body: ${JSON.stringify(res4.jsonBody)}`);

    // Test 5: 403 on Revoked Session
    const revokedUserId = 'user-revoked-test';
    await db.run("INSERT OR REPLACE INTO users (id, email, role, tenant_id, status) VALUES (?, 'revoked@cloudops.local', 'Viewer', ?, 'Approved')", [revokedUserId, tenantId]);
    await db.run("INSERT OR REPLACE INTO sessions (session_id, user_id, email, provider, revoked, last_active) VALUES ('sess-revoked', ?, 'revoked@cloudops.local', 'Local', 1, datetime('now'))", [revokedUserId]);

    const revokedUserToken = jwt.sign(
      { id: revokedUserId, email: 'revoked@cloudops.local', sessionId: 'sess-revoked' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req5 = { headers: { authorization: `Bearer ${revokedUserToken}` }, query: {} };
    const res5 = createMockRes();
    await validateJwt(req5, res5, () => {});
    assert(res5.statusCode === 403 && res5.jsonBody?.code === 'SESSION_REVOKED', '403 on Revoked Session', `Got status ${res5.statusCode}, body: ${JSON.stringify(res5.jsonBody)}`);

    // Test 6: 403 on Missing Required Role (RBAC)
    const rbacMiddleware = authorizeRoles('ADMIN', 'SUPERADMIN');
    const req6 = { userRole: 'Viewer' };
    const res6 = createMockRes();
    rbacMiddleware(req6, res6, () => {});
    assert(res6.statusCode === 403 && res6.jsonBody.error.includes('Required role(s)'), '403 on Insufficient RBAC Role');

    // Test 7: 403 on Tenant Isolation Violation
    const { validateSubscriptionAccess } = require('./middleware/subscriptionAccess');
    await db.run("INSERT OR IGNORE INTO tenants (id, name) VALUES ('tenant-B', 'Tenant B')");
    await db.run("INSERT OR REPLACE INTO cloud_accounts (id, tenant_id, account_name, provider) VALUES ('ca-tenant-b', 'tenant-B', 'AWS Account B', 'aws')");

    const req7 = {
      userRole: 'Admin',
      tenantId: 'tenant-A',
      headers: { 'x-subscription-id': 'ca-tenant-b' },
      query: {},
      body: {}
    };
    const res7 = createMockRes();
    await validateSubscriptionAccess(req7, res7, () => {});
    assert(res7.statusCode === 403 && res7.jsonBody.error.includes('Tenant Isolation Violation'), '403 on Multi-Tenant Isolation Violation');

    console.log('===========================================================');
    console.log(`▶ Auth Security Tests Completed: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
    console.log('===========================================================');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Fatal Auth Security Test Error:', err);
    process.exit(1);
  }
}

runAuthSecurityTests();
