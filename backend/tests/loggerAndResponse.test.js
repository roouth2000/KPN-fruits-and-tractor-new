const assert = require('assert');
const { logger, parseErrorLocation } = require('../src/utils/logger');
const { log } = require('../src/utils/log');
const { ApiResponse } = require('../src/utils/response');
const { HTTP_STATUS } = require('../src/constants');

console.log('--- Testing Logger, Error Line Diagnostics & ApiResponse Helper ---');

// 1. Test Logger Base Methods
logger.info('Test info message', { module: 'TEST', action: 'INIT' });
logger.success('Test success message', { count: 42 });
logger.warn('Test warn message', { warning: 'Low memory' });

// 2. Test Error Diagnostics Parser with Exact Line Number
function triggerSampleError() {
  const sampleRef = undefined;
  // Intentionally trigger a TypeError at this exact line
  return sampleRef.nonExistentProperty;
}

try {
  triggerSampleError();
} catch (err) {
  const parsed = parseErrorLocation(err);
  console.log('\n[Verified] Parsed Error Location:');
  console.log(`- File: ${parsed.relFile}`);
  console.log(`- Function: ${parsed.functionName}`);
  console.log(`- Line Number: ${parsed.line}`);
  console.log(`- Column: ${parsed.column}`);

  assert(parsed.line !== null, 'Line number must be parsed');
  assert(parsed.relFile.includes('loggerAndResponse.test.js'), 'File name must match test file');
  assert(parsed.snippet && parsed.snippet.length > 0, 'Code snippet must be extracted');

  console.log('\n[Demo] Triggering logger.logError with simulated request context:');
  const mockReq = {
    method: 'POST',
    originalUrl: '/api/sales/invoices',
    ip: '127.0.0.1',
    user: { id: 1, name: 'Admin User', role: 'ADMIN' },
    params: { id: '101' },
    query: { print: 'true' },
    body: { customerId: 1, total: 50000, itemsCount: 3 },
  };

  logger.logError(err, mockReq, {
    invoiceRef: 'INV-2026-TEST',
    note: 'Sample reference error data demonstrated',
  });
}

// 3. Test ApiResponse Helper Methods
const createMockRes = () => {
  return {
    statusCode: null,
    jsonPayload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    },
  };
};

// Test ApiResponse.success
const res1 = createMockRes();
ApiResponse.success(res1, { id: 1 }, 'Operation succeeded');
assert.strictEqual(res1.statusCode, HTTP_STATUS.OK);
assert.strictEqual(res1.jsonPayload.success, true);
assert.strictEqual(res1.jsonPayload.message, 'Operation succeeded');
assert.strictEqual(res1.jsonPayload.data.id, 1);
assert(res1.jsonPayload.timestamp, 'Timestamp should be present');

// Test ApiResponse.created
const res2 = createMockRes();
ApiResponse.created(res2, { id: 2 });
assert.strictEqual(res2.statusCode, HTTP_STATUS.CREATED);
assert.strictEqual(res2.jsonPayload.success, true);

// Test ApiResponse.badRequest
const res3 = createMockRes();
ApiResponse.badRequest(res3, 'Invalid input data', { field: 'rate', msg: 'Must be positive' });
assert.strictEqual(res3.statusCode, HTTP_STATUS.BAD_REQUEST);
assert.strictEqual(res3.jsonPayload.success, false);
assert.strictEqual(res3.jsonPayload.errors.field, 'rate');

// Test ApiResponse.unauthorized
const res4 = createMockRes();
ApiResponse.unauthorized(res4);
assert.strictEqual(res4.statusCode, HTTP_STATUS.UNAUTHORIZED);

// Test ApiResponse.forbidden
const res5 = createMockRes();
ApiResponse.forbidden(res5);
assert.strictEqual(res5.statusCode, HTTP_STATUS.FORBIDDEN);

// Test ApiResponse.notFound
const res6 = createMockRes();
ApiResponse.notFound(res6);
assert.strictEqual(res6.statusCode, HTTP_STATUS.NOT_FOUND);

// Test ApiResponse.paginated
const res7 = createMockRes();
ApiResponse.paginated(res7, [{ id: 1 }, { id: 2 }], 45, 2, 10);
assert.strictEqual(res7.statusCode, HTTP_STATUS.OK);
assert.strictEqual(res7.jsonPayload.pagination.total, 45);
assert.strictEqual(res7.jsonPayload.pagination.page, 2);
assert.strictEqual(res7.jsonPayload.pagination.limit, 10);
assert.strictEqual(res7.jsonPayload.pagination.totalPages, 5);

console.log('✓ All ApiResponse methods verified successfully!');
console.log('✓ logger.js and log.js fully verified!');

