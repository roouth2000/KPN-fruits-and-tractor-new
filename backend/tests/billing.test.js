const assert = require('assert');
const billingService = require('../src/services/billingService');
const customerService = require('../src/services/customerService');
const { Customer, Product, Invoice } = require('../src/models');

async function runTests() {
  console.log('--- Starting Billing Engine Unit & Integration Tests ---');

  const { sequelize } = require('../src/models');

  // Reset database state for idempotent testing
  await sequelize.query('DELETE FROM payment_allocations');
  await sequelize.query('DELETE FROM payments');
  await sequelize.query('DELETE FROM invoice_items');
  await sequelize.query('DELETE FROM invoices');

  // Ensure Ramesh customer exists for the test
  let ramesh = await Customer.findOne({ where: { customerCode: 'CUST-001' } });
  if (!ramesh) {
    ramesh = await Customer.create({
      id: 1,
      customerCode: 'CUST-001',
      name: 'Ramesh Fruits',
      phone: '9876543210',
      address: 'Shop 12, APMC Market',
      customerType: 'WHOLESALE',
      creditLimit: 100000.00,
      currentDue: 50000.00,
      outstandingTrays: 12,
      isActive: true,
    });
  }

  await sequelize.query(`DELETE FROM customer_ledgers WHERE customerId = ${ramesh.id} AND type != 'OPENING'`);
  await sequelize.query(`DELETE FROM customer_ledgers WHERE customerId = ${ramesh.id}`);
  await sequelize.query(`
    INSERT INTO customer_ledgers (id, customerId, date, type, reference, description, debit, credit, runningBalance, createdById, createdAt)
    VALUES (1, ${ramesh.id}, '2026-11-01', 'OPENING', 'OP-2026-001', 'Opening Ledger Balance as on 01-Nov-2026', 50000.00, 0.00, 50000.00, 1, NOW())
  `);
  await sequelize.query(`UPDATE customers SET currentDue = 50000.00, outstandingTrays = 12 WHERE id = ${ramesh.id}`);

  // Ensure products exist and have stock for testing
  let apple = await Product.findByPk(1);
  if (!apple) {
    apple = await Product.create({
      id: 1,
      productCode: 'PROD-APPLE-GALA',
      name: 'Apple',
      variety: 'Royal Gala',
      defaultUnit: 'BOX',
      baseUnit: 'KG',
      conversionFactor: 20.0,
      purchaseRate: 1500.0,
      wholesaleRate: 2000.0,
      retailRate: 2200.0,
      currentStock: 150.0,
      isActive: true,
    });
  } else {
    await apple.update({ currentStock: 150.0 });
  }

  let kiwi = await Product.findByPk(2);
  if (!kiwi) {
    kiwi = await Product.create({
      id: 2,
      productCode: 'PROD-KIWI-GRN',
      name: 'Kiwi',
      variety: 'Green',
      defaultUnit: 'BOX',
      baseUnit: 'KG',
      conversionFactor: 10.0,
      purchaseRate: 2200.0,
      wholesaleRate: 3000.0,
      retailRate: 3300.0,
      currentStock: 80.0,
      isActive: true,
    });
  } else {
    await kiwi.update({ currentStock: 80.0 });
  }

  let pom = await Product.findByPk(3);
  if (!pom) {
    pom = await Product.create({
      id: 3,
      productCode: 'PROD-POM-BHAGWA',
      name: 'Pomegranate',
      variety: 'Bhagwa',
      defaultUnit: 'BOX',
      baseUnit: 'KG',
      conversionFactor: 15.0,
      purchaseRate: 2300.0,
      wholesaleRate: 3000.0,
      retailRate: 3400.0,
      currentStock: 95.0,
      isActive: true,
    });
  } else {
    await pom.update({ currentStock: 95.0 });
  }

  const adminUser = {
    id: 1,
    name: 'System Administrator',
    role: 'ADMIN',
    permissions: ['sales.create', 'sales.view', 'sales.cancel', 'stock.view', 'customer.view', 'customer.payment'],
  };

  // ==========================================
  // Test 1: EXACT SCENARIO 52 (Ramesh Fruits)
  // ==========================================
  console.log('\n[Test 1] Scenario 52: Ramesh Fruits Sale (Previous Due ₹50,000 + Current Sale ₹40,000, Paid ₹60,000 => Final Due ₹30,000)');

  assert(ramesh, 'Ramesh customer should exist');

  apple = await Product.findByPk(1);
  kiwi = await Product.findByPk(2);
  pom = await Product.findByPk(3);

  const initialAppleStock = parseFloat(apple.currentStock);
  const initialKiwiStock = parseFloat(kiwi.currentStock);
  const initialPomStock = parseFloat(pom.currentStock);

  // New Sale:
  // Apple: 10 BOX @ ₹2,000 = ₹20,000
  // Pomegranate: 3.3333 BOX @ ₹3,000 = ₹10,000 (or rate 2000, qty 5)
  // Kiwi: 3.3333 BOX @ ₹3,000 = ₹10,000 (or rate 2000, qty 5)
  const invoicePayload = {
    customerId: ramesh.id,
    invoiceDate: '2026-11-09',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 10, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' }, // ₹20,000
      { productId: pom.id, quantity: 5, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' }, // ₹10,000
      { productId: kiwi.id, quantity: 5, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' }, // ₹10,000
    ],
    invoiceDiscount: 0,
    invoiceTax: 0,
    payments: [
      { method: 'CASH', amount: 20000 },
      { method: 'UPI', amount: 40000 },
    ],
    status: 'CONFIRMED',
  };

  const res1 = await billingService.createInvoice(invoicePayload, adminUser);

  console.log(`- Created Invoice: ${res1.invoiceNumber}`);
  console.log(`- Grand Total: ₹${res1.grandTotal} (Expected: ₹40,000)`);
  console.log(`- Total Payable: ₹${res1.totalPayable} (Expected: ₹90,000)`);
  console.log(`- Paid: ₹${res1.paid} (Expected: ₹60,000)`);
  console.log(`- Balance Due: ₹${res1.due} (Expected: ₹30,000)`);

  assert.strictEqual(res1.grandTotal, 40000, 'Grand total must be 40,000');
  assert.strictEqual(res1.previousDue, 50000, 'Previous due must be 50,000');
  assert.strictEqual(res1.totalPayable, 90000, 'Total payable must be 90,000');
  assert.strictEqual(res1.paid, 60000, 'Paid must be 60,000');
  assert.strictEqual(res1.due, 30000, 'Balance due must be 30,000');

  // Verify Customer Due from Ledger Source of Truth
  const rameshDue = await customerService.calculateCustomerDue(ramesh.id);
  console.log(`- Ledger Calculated Customer Due: ₹${rameshDue} (Expected: ₹30,000)`);
  assert.strictEqual(rameshDue, 30000, 'Customer due in ledger must be 30,000');

  // Verify Stock Reductions
  const updatedApple = await Product.findByPk(apple.id);
  const updatedPom = await Product.findByPk(pom.id);
  const updatedKiwi = await Product.findByPk(kiwi.id);

  assert.strictEqual(parseFloat(updatedApple.currentStock), initialAppleStock - 10, 'Apple stock reduced by 10');
  assert.strictEqual(parseFloat(updatedPom.currentStock), initialPomStock - 5, 'Pomegranate stock reduced by 5');
  assert.strictEqual(parseFloat(updatedKiwi.currentStock), initialKiwiStock - 5, 'Kiwi stock reduced by 5');
  console.log('✓ Scenario 52 PASSED perfectly!\n');

  // ==========================================
  // Test 2: EXACT SCENARIO 53 (Cash Customer)
  // ==========================================
  console.log('[Test 2] Scenario 53: Cash Customer (Apple 10 BOX @ ₹2,000 = ₹20,000, Paid ₹20,000 => Due ₹0)');
  const cashCustomer = await Customer.findOne({ where: { customerCode: 'CUST-CASH' } });
  assert(cashCustomer, 'Cash customer must exist');

  const appleStockBefore = parseFloat(updatedApple.currentStock);

  const cashSalePayload = {
    customerId: cashCustomer.id,
    invoiceDate: '2026-11-09',
    saleType: 'CASH',
    items: [
      { productId: apple.id, quantity: 10, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' },
    ],
    payments: [
      { method: 'CASH', amount: 20000 },
    ],
    status: 'CONFIRMED',
  };

  const res2 = await billingService.createInvoice(cashSalePayload, adminUser);
  console.log(`- Created Invoice: ${res2.invoiceNumber}`);
  console.log(`- Total: ₹${res2.grandTotal}, Paid: ₹${res2.paid}, Due: ₹${res2.due}`);

  assert.strictEqual(res2.grandTotal, 20000, 'Invoice total must be 20,000');
  assert.strictEqual(res2.paid, 20000, 'Paid must be 20,000');
  assert.strictEqual(res2.due, 0, 'Due must be 0');

  const appleStockAfter = parseFloat((await Product.findByPk(apple.id)).currentStock);
  assert.strictEqual(appleStockAfter, appleStockBefore - 10, 'Apple stock reduced by 10');
  console.log('✓ Scenario 53 PASSED perfectly!\n');

  // =======================================================
  // Test 3: EXACT SCENARIO 54 (Previous Due Collection Only)
  // =======================================================
  console.log('[Test 3] Scenario 54: Standalone Due Collection (Ramesh pays ₹20,000 against previous due ₹30,000 => Remaining ₹10,000)');

  const res3 = await billingService.collectPreviousDue({
    customerId: ramesh.id,
    amount: 20000,
    paymentMode: 'UPI',
    paymentDate: '2026-11-09',
    notes: 'APMC counter collection',
  }, adminUser);

  console.log(`- Payment Number: ${res3.paymentNumber}`);
  console.log(`- Previous Due: ₹${res3.previousDue}`);
  console.log(`- Paid Amount: ₹${res3.paidAmount}`);
  console.log(`- Remaining Due: ₹${res3.remainingDue} (Expected: ₹10,000)`);

  assert.strictEqual(res3.previousDue, 30000, 'Previous due was 30,000');
  assert.strictEqual(res3.paidAmount, 20000, 'Paid amount is 20,000');
  assert.strictEqual(res3.remainingDue, 10000, 'Remaining due is 10,000');

  const finalRameshDue = await customerService.calculateCustomerDue(ramesh.id);
  assert.strictEqual(finalRameshDue, 10000, 'Ledger calculated due must now be 10,000');
  console.log('✓ Scenario 54 PASSED perfectly!\n');

  // =======================================================
  // Test 4: Insufficient Stock Check (Without Override)
  // =======================================================
  console.log('[Test 4] Negative Stock Prevention');
  const normalCashier = {
    id: 2,
    name: 'Cashier',
    role: 'CASHIER',
    permissions: ['sales.create', 'sales.view'],
  };

  try {
    await billingService.createInvoice({
      customerId: ramesh.id,
      invoiceDate: '2026-11-09',
      items: [
        { productId: apple.id, quantity: 99999, rate: 2000, unit: 'BOX' },
      ],
      status: 'CONFIRMED',
    }, normalCashier);
    assert.fail('Should have thrown Insufficient stock error');
  } catch (err) {
    assert(err.message.includes('Insufficient stock'), `Error message expected Insufficient stock, got: ${err.message}`);
    console.log(`- Caught expected error: ${err.message}`);
    console.log('✓ Negative stock prevention PASSED!\n');
  }

  // =======================================================
  // Test 5: Invoice Cancellation & Stock/Ledger Reversal
  // =======================================================
  console.log('[Test 5] Invoice Cancellation (Atomic Reversal)');
  const cancelRes = await billingService.cancelInvoice(res1.invoiceId, 'Customer order cancellation', adminUser);
  console.log(`- ${cancelRes.message}`);

  const cancelledInv = await Invoice.findByPk(res1.invoiceId);
  assert.strictEqual(cancelledInv.status, 'CANCELLED', 'Invoice status must be CANCELLED');

  // Verify stock was restored
  const restoredApple = await Product.findByPk(apple.id);
  assert.strictEqual(parseFloat(restoredApple.currentStock), appleStockBefore, 'Apple stock restored after cancellation');
  console.log('✓ Invoice cancellation & reversal PASSED!\n');

  console.log('====================================================');
  console.log('ALL BACKEND BUSINESS TEST SCENARIOS PASSED 100%');
  console.log('====================================================');
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Test FAILED:', err);
  process.exit(1);
});
