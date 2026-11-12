const assert = require('assert');
const app = require('../src/app');
const http = require('http');

async function testAllApis() {
  console.log('--- Testing All Backend Page APIs ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': 'ADMIN',
  };

  const testEndpoints = [
    // Dashboard Endpoints
    { path: '/dashboard/summary', name: 'Dashboard Today Summary' },
    { path: '/dashboard/financial-metrics', name: 'Dashboard Financial Metrics' },
    { path: '/dashboard/fruit-health', name: 'Dashboard Fruit Health' },
    { path: '/dashboard/top-performers', name: 'Dashboard Top Performers' },
    { path: '/dashboard/pending-dues', name: 'Dashboard Pending Dues' },

    // 11 Reports Endpoints
    { path: '/reports/daily-sales', name: '1. Daily Sales Report' },
    { path: '/reports/monthly-sales', name: '2. Monthly Sales Report' },
    { path: '/reports/purchase', name: '3. Purchase Report' },
    { path: '/reports/stock', name: '4. Stock & Valuation Report' },
    { path: '/reports/profit', name: '5. Profit Report' },
    { path: '/reports/loss', name: '6. Loss & Spoilage Report' },
    { path: '/reports/damage', name: '7. Damage Report' },
    { path: '/reports/returns', name: '8. Customer Returns (RMA) Report' },
    { path: '/reports/customer-due', name: '9. Customer Due Report' },
    { path: '/reports/supplier-due', name: '10. Supplier Due Report' },
    { path: '/reports/tray', name: '11. Tray Asset Report' },

    // Suppliers & Stock & Trays Endpoints
    { path: '/suppliers', name: 'Suppliers List' },
    { path: '/stock/movements', name: 'Stock Movements' },
    { path: '/trays/summary', name: 'Trays Summary' },
    { path: '/sales/invoices', name: 'Sales Invoices List' },
    { path: '/customers', name: 'Customers Master' },
    { path: '/products', name: 'Products & Fruits' },
  ];

  for (const ep of testEndpoints) {
    const res = await fetch(`${baseUrl}${ep.path}`, { headers });
    assert.strictEqual(res.status, 200, `Expected 200 for ${ep.name} at ${ep.path}, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.success, true, `Expected success:true for ${ep.name}`);
    console.log(`✓ [200 OK] ${ep.name} (${ep.path})`);
  }

  server.close();
  console.log('\n=========================================');
  console.log('ALL BACKEND PAGE APIS TESTED & PASSED 100%');
  console.log('=========================================');
}

if (require.main === module) {
  testAllApis()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test failed:', err);
      process.exit(1);
    });
}

