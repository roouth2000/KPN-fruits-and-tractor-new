const assert = require('assert');
const http = require('http');

// Helper to make test HTTP requests
function request(app, method, url, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers: {
            'x-user-role': 'ADMIN',
            ...headers,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            server.close(() => resolve({ status: res.statusCode, headers: res.headers, body }));
          });
        }
      );
      req.on('error', (err) => {
        server.close(() => reject(err));
      });
      req.end();
    });
  });
}

async function runTests() {
  console.log('--- Testing Frontend Serving & Swagger Environment Behavior ---\n');

  // Test 1: Active Development with Swagger and Public Frontend
  const app = require('../src/app');

  const rootRes = await request(app, 'GET', '/');
  assert.strictEqual(rootRes.status, 200, 'Root path / must return 200 OK');
  assert.ok(
    rootRes.body.includes('<div id="root"></div>') || rootRes.body.includes('Finovore'),
    'Root path must deliver the React SPA index.html'
  );
  console.log('✓ [200 OK] Root path http://localhost:5000/ delivers Frontend UI view');

  const spaRes = await request(app, 'GET', '/sales/billing');
  assert.strictEqual(spaRes.status, 200, 'SPA route /sales/billing must return 200 OK');
  assert.ok(
    spaRes.body.includes('<div id="root"></div>'),
    'SPA route must return index.html for client-side navigation'
  );
  console.log('✓ [200 OK] Client-side SPA route /sales/billing returns index.html');

  const swaggerRes = await request(app, 'GET', '/api-docs/');
  assert.strictEqual(swaggerRes.status, 200, 'Swagger /api-docs/ must return 200 OK in development');
  assert.ok(
    swaggerRes.body.includes('swagger-ui'),
    'Swagger UI must be rendered at /api-docs/'
  );
  console.log('✓ [200 OK] http://localhost:5000/api-docs/ serves Swagger UI documentation');

  const apiRes = await request(app, 'GET', '/api/dashboard/summary');
  assert.strictEqual(apiRes.status, 200, 'API endpoint /api/dashboard/summary must remain accessible');
  console.log('✓ [200 OK] Backend API /api/dashboard/summary functions normally alongside frontend');

  // Test 2: Production / Disabled Swagger Behavior
  console.log('\n--- Testing Production Mode (Swagger Disabled) ---');
  
  // Set production environment variables
  process.env.NODE_ENV = 'production';
  process.env.ENABLE_SWAGGER = 'false';

  // Clear require cache for app, env, and routes to reload with production flags
  delete require.cache[require.resolve('../src/app')];
  delete require.cache[require.resolve('../src/config/env')];

  const prodApp = require('../src/app');

  const prodSwaggerRes = await request(prodApp, 'GET', '/api-docs');
  assert.strictEqual(prodSwaggerRes.status, 404, 'Swagger MUST return 404 in production mode');
  const parsedProdSwagger = JSON.parse(prodSwaggerRes.body);
  assert.strictEqual(parsedProdSwagger.success, false);
  console.log('✓ [404 Not Found] Swagger link http://localhost:5000/api-docs/ is blocked in production mode');

  // Restore development env
  process.env.NODE_ENV = 'development';
  process.env.ENABLE_SWAGGER = 'true';
  delete require.cache[require.resolve('../src/app')];
  delete require.cache[require.resolve('../src/config/env')];

  console.log('\n======================================================');
  console.log('ALL FRONTEND SERVING & SWAGGER TESTS PASSED 100%');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

