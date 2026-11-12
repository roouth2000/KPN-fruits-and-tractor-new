const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { ensureDatabaseExists, sequelize } = require('../src/config/db');
const { seedMasterData } = require('../src/database/seeders/masterDataSeeder');
const { seedRolesAndPermissions } = require('../src/database/seeders/rolesAndPermissionsSeeder');

async function runLoginAndRoleGateTests() {
  console.log('--- Starting Login & Role-Based Middleware Integration Tests ---');

  await ensureDatabaseExists();
  await sequelize.authenticate();
  await seedRolesAndPermissions();
  await seedMasterData();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // Test 1: Salesperson login
    console.log('\n[Test 1] Salesperson Login (salesperson@finovore.com / Sales@123)');
    const salesLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'salesperson@finovore.com', password: 'Sales@123' }),
    });

    assert.strictEqual(salesLoginRes.status, 200, `Expected 200 OK, got ${salesLoginRes.status}`);
    const salesLoginBody = await salesLoginRes.json();
    assert.strictEqual(salesLoginBody.success, true);
    assert.ok(salesLoginBody.data.token, 'Must return JWT token');
    assert.strictEqual(salesLoginBody.data.user.role, 'SALESPERSON');
    assert.ok(Array.isArray(salesLoginBody.data.user.permissions), 'Must have permissions array');
    assert.ok(salesLoginBody.data.user.permissions.includes('sales.create'));
    assert.ok(!salesLoginBody.data.user.permissions.includes('reports.view'), 'Salesperson must NOT have reports.view');
    assert.ok(!salesLoginBody.data.user.permissions.includes('roles.manage'), 'Salesperson must NOT have roles.manage');

    const salesToken = salesLoginBody.data.token;
    console.log(`✓ Salesperson logged in successfully. Role: ${salesLoginBody.data.user.role}, Permissions count: ${salesLoginBody.data.user.permissions.length}`);

    // Test 2: Admin login
    console.log('\n[Test 2] Admin Login (admin@finovore.com / Admin@123)');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@finovore.com', password: 'Admin@123' }),
    });

    assert.strictEqual(adminLoginRes.status, 200);
    const adminLoginBody = await adminLoginRes.json();
    assert.strictEqual(adminLoginBody.data.user.role, 'ADMIN');
    assert.ok(adminLoginBody.data.user.permissions.includes('reports.view'));
    assert.ok(adminLoginBody.data.user.permissions.includes('sales.edit'));
    const adminToken = adminLoginBody.data.token;
    console.log(`✓ Admin logged in successfully. Role: ${adminLoginBody.data.user.role}`);

    // Test 3: Invalid login credentials
    console.log('\n[Test 3] Invalid Password Rejection');
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'salesperson@finovore.com', password: 'WrongPassword999' }),
    });

    assert.strictEqual(badLoginRes.status, 401, 'Invalid password must return 401');
    const badLoginBody = await badLoginRes.json();
    assert.strictEqual(badLoginBody.success, false);
    console.log('✓ Invalid login correctly returned 401 Unauthorized');

    // Test 4: Salesperson access to Billing Invoices (Allowed)
    console.log('\n[Test 4] Salesperson accesses Sales Invoices (/api/sales/invoices)');
    const salesInvoicesRes = await fetch(`${baseUrl}/sales/invoices`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
    });

    assert.strictEqual(salesInvoicesRes.status, 200, 'Salesperson must be allowed to view invoices');
    console.log('✓ Salesperson successfully accessed /api/sales/invoices (200 OK)');

    // Test 5: Salesperson access to Daily Sales Report (Restricted / 403 Forbidden)
    console.log('\n[Test 5] Salesperson attempts to access Management Report (/api/reports/daily-sales)');
    const salesReportRes = await fetch(`${baseUrl}/reports/daily-sales`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
    });

    assert.strictEqual(salesReportRes.status, 403, `Salesperson must receive 403 Forbidden, got ${salesReportRes.status}`);
    const salesReportBody = await salesReportRes.json();
    assert.strictEqual(salesReportBody.success, false);
    console.log(`✓ Salesperson correctly blocked with 403 Forbidden: "${salesReportBody.message}"`);

    // Test 6: Salesperson access to Roles Management (Restricted / 403 Forbidden)
    console.log('\n[Test 6] Salesperson attempts to access Roles & Permissions (/api/roles)');
    const salesRolesRes = await fetch(`${baseUrl}/roles`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
    });

    assert.strictEqual(salesRolesRes.status, 403, `Salesperson must receive 403 Forbidden, got ${salesRolesRes.status}`);
    const salesRolesBody = await salesRolesRes.json();
    console.log(`✓ Salesperson correctly blocked from /api/roles with 403 Forbidden: "${salesRolesBody.message}"`);

    // Test 7: Admin access to Daily Sales Report (Allowed / 200 OK)
    console.log('\n[Test 7] Admin accesses Daily Sales Report (/api/reports/daily-sales)');
    const adminReportRes = await fetch(`${baseUrl}/reports/daily-sales`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(adminReportRes.status, 200, `Admin must have access to reports, got ${adminReportRes.status}`);
    console.log('✓ Admin successfully accessed /api/reports/daily-sales (200 OK)');

    // Test 8: Admin access to Roles List (Allowed / 200 OK)
    console.log('\n[Test 8] Admin accesses Roles & Permissions (/api/roles)');
    const adminRolesRes = await fetch(`${baseUrl}/roles`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(adminRolesRes.status, 200, `Admin must have access to roles, got ${adminRolesRes.status}`);
    console.log('✓ Admin successfully accessed /api/roles (200 OK)');

    // Test 9: Superadmin login and full access
    console.log('\n[Test 9] Superadmin Login (superadmin@finovore.com / Admin@123)');
    const superLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'superadmin@finovore.com', password: 'Admin@123' }),
    });

    assert.strictEqual(superLoginRes.status, 200);
    const superLoginBody = await superLoginRes.json();
    assert.strictEqual(superLoginBody.data.user.role, 'SUPERADMIN');
    assert.strictEqual(superLoginBody.data.user.permissions.length, 28, 'Superadmin has all 28 permissions');
    console.log('✓ Superadmin logged in successfully with all 28 permissions');

    console.log('\n=============================================================');
    console.log('ALL LOGIN, MIDDLEWARE & ROLE-BASED ACCESS GATE TESTS PASSED!');
    console.log('=============================================================');
  } finally {
    server.close();
  }
}

runLoginAndRoleGateTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
