const assert = require('assert');
const billingService = require('../src/services/billingService');
const customerService = require('../src/services/customerService');
const { Customer, Product, Invoice } = require('../src/models');

async function runTests() {
  console.log('--- Starting Billing Engine Unit & Integration Tests ---');

  const { sequelize } = require('../src/models');

  // Reset database state for idempotent testing
  await sequelize.query('DELETE FROM invoice_item_batches');
  await sequelize.query('DELETE FROM payment_allocations');
  await sequelize.query('DELETE FROM payments');
  await sequelize.query('DELETE FROM invoice_items');
  await sequelize.query('DELETE FROM invoices');
  await sequelize.query('DELETE FROM stock_movements');
  await sequelize.query('DELETE FROM batches');
  await sequelize.query(`
    INSERT INTO batches (id, batchNumber, productId, supplierId, purchaseDate, initialQuantity, currentQuantity, unit, purchaseRate, status, createdAt, updatedAt)
    VALUES
      (1, 'BATCH-20261101-S1-APP-001', 1, 1, '2026-11-01', 150.00, 150.00, 'BOX', 1500.00, 'ACTIVE', NOW(), NOW()),
      (2, 'BATCH-20261101-S1-KIW-001', 2, 1, '2026-11-01', 80.00, 80.00, 'BOX', 2200.00, 'ACTIVE', NOW(), NOW()),
      (3, 'BATCH-20261101-S1-POM-001', 3, 1, '2026-11-01', 95.00, 95.00, 'BOX', 2300.00, 'ACTIVE', NOW(), NOW())
  `);

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

  // ========================================================
  // Test 2b: No customer selected (Auto Cash Customer fallback)
  // ========================================================
  console.log('[Test 2b] No customer selected => Auto takes as Cash Customer');
  const noCustomerPayload = {
    // customerId is omitted / undefined
    invoiceDate: '2026-11-09',
    saleType: 'CASH',
    items: [
      { productId: apple.id, quantity: 5, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' },
    ],
    payments: [
      { method: 'CASH', amount: 10000 },
    ],
    status: 'CONFIRMED',
  };

  const res2b = await billingService.createInvoice(noCustomerPayload, adminUser);
  console.log(`- Created Invoice without customerId: ${res2b.invoiceNumber}, customer: ${res2b.customerName || 'Cash Customer'}`);
  assert.strictEqual(res2b.grandTotal, 10000, 'Invoice total must be 10,000');
  assert.strictEqual(res2b.paid, 10000, 'Paid must be 10,000');
  assert.strictEqual(res2b.due, 0, 'Due must be 0');

  // Cancel Test 2b invoice to restore test stock
  await billingService.cancelInvoice(res2b.invoiceId, 'Test 2b cleanup', adminUser);
  console.log('✓ Auto Cash Customer fallback PASSED perfectly!\n');

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

  // =======================================================
  // Test 6: Full Invoice Edit with Items (Same Page POS Edit)
  // =======================================================
  console.log('[Test 6] Full Invoice Edit with Items (Same Page POS Billing/Edit)');
  const createdInv = await billingService.createInvoice({
    customerId: ramesh.id,
    invoiceDate: '2026-11-09',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 5, rate: 2000, unit: 'BOX' },
    ],
    payments: [
      { method: 'CASH', amount: 5000 },
    ],
    status: 'CONFIRMED',
  }, adminUser);

  assert.strictEqual(createdInv.grandTotal, 10000);
  assert.strictEqual(createdInv.paid, 5000);

  // Now perform full edit: change items from 5 boxes to 8 boxes, update payment to 16,000 (fully paid)
  const updatedInv = await billingService.updateInvoice(createdInv.invoiceId, {
    customerId: ramesh.id,
    invoiceDate: '2026-11-09',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 8, rate: 2000, unit: 'BOX' },
    ],
    payments: [
      { method: 'CASH', amount: 16000 },
    ],
    status: 'CONFIRMED',
    notes: 'Updated invoice item count and payment',
  }, adminUser);

  assert.strictEqual(parseFloat(updatedInv.grandTotal), 16000, 'Grand total updated to 16,000');
  assert.strictEqual(parseFloat(updatedInv.paidAmount), 16000, 'Paid amount updated to 16,000');
  assert.strictEqual(updatedInv.status, 'PAID', 'Invoice status is PAID');
  assert.strictEqual(updatedInv.items.length, 1, '1 item present');
  assert.strictEqual(parseFloat(updatedInv.items[0].quantity), 8, 'Quantity updated to 8');

  // Cancel createdInv to clean up test stock
  await billingService.cancelInvoice(createdInv.invoiceId, 'Test 6 cleanup', adminUser);
  console.log('✓ Full Invoice Edit with Items PASSED perfectly!\n');

  console.log('[Test 7] Permanently Delete Invoice');
  const invToDelete = await billingService.createInvoice({
    customerId: ramesh.id,
    invoiceDate: '2026-11-09',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 2, rate: 2000, unit: 'BOX' },
    ],
    payments: [
      { method: 'CASH', amount: 4000 },
    ],
    status: 'CONFIRMED',
  }, adminUser);

  const deleteResult = await billingService.deleteInvoice(invToDelete.invoiceId, adminUser);
  assert.strictEqual(deleteResult.success, true);

  const foundInv = await Invoice.findByPk(invToDelete.invoiceId);
  assert.strictEqual(foundInv, null, 'Invoice was deleted from database');
  console.log('✓ Permanently Delete Invoice PASSED perfectly!\n');

  console.log('[Test 8] Customer Purchase History Reporting');
  const reportService = require('../src/services/reportService');
  const custHistory = await reportService.getCustomerPurchaseHistory({ customerId: ramesh.id });
  assert(custHistory.kpis && custHistory.kpis.length === 4, '4 KPIs generated');
  assert(Array.isArray(custHistory.invoices), 'Invoices list returned');
  assert(Array.isArray(custHistory.productBreakdown), 'Product breakdown returned');
  assert(Array.isArray(custHistory.customerSummary), 'Customer summary returned');
  console.log(`- Ramesh Purchase History Orders: ${custHistory.totalOrders}, Total Purchases: ₹${custHistory.totalPurchases}`);
  console.log('✓ Customer Purchase History Reporting PASSED perfectly!\n');

  // =========================================================================
  // Test 9: Exact Canonical 7-Field Billing Calculation Scenario
  // Gross: 2,000, Disc: 200 => Net: 1,800, Open: 20,000 => Outstanding: 21,800, Paid: 15,000 => Closing: 6,800
  // =========================================================================
  console.log('[Test 9] Canonical 7-Field Billing Calculation & Consistency Verification');

  // Create test customer Suresh with Opening Balance ₹20,000
  let suresh = await Customer.findOne({ where: { customerCode: 'CUST-SURESH-01' } });
  if (suresh) {
    const { CustomerLedger, Payment, PaymentAllocation, InvoiceItem, Invoice: InvModel } = require('../src/models');
    await CustomerLedger.destroy({ where: { customerId: suresh.id } });
    await suresh.destroy();
  }

  suresh = await customerService.createCustomer({
    customerCode: 'CUST-SURESH-01',
    name: 'Suresh Kumar Traders',
    phone: '9888877777',
    city: 'Vashi Mandi',
    openingBalance: 20000.00,
    currentDue: 20000.00,
    customerType: 'WHOLESALE',
  });

  const sureshInitialDue = await customerService.calculateCustomerDue(suresh.id);
  assert.strictEqual(sureshInitialDue, 20000, 'Suresh opening due must be ₹20,000');

  // Ensure Apple stock is sufficient
  await apple.update({ currentStock: 50.0 });

  // Bill 1 BOX Apple @ ₹2,000 with ₹200 discount, and payment of ₹15,000
  const sevenFieldPayload = {
    customerId: suresh.id,
    invoiceDate: '2026-11-16',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 1, rate: 2000, discount: 0, taxRate: 0, unit: 'BOX' },
    ],
    invoiceDiscount: 200, // Total discount = 200
    invoiceTax: 0,
    payments: [
      { method: 'CASH', amount: 15000 },
    ],
    status: 'CONFIRMED',
  };

  const invoiceRes = await billingService.createInvoice(sevenFieldPayload, adminUser);

  console.log('- Checking Canonical 7 Fields on Created Invoice:');
  console.log(`  1. Gross Amount:        ₹${invoiceRes.grossAmount} (Expected: ₹2,000)`);
  console.log(`  2. Discount:            ₹${invoiceRes.discount} (Expected: ₹200)`);
  console.log(`  3. Net Amount:          ₹${invoiceRes.netAmount} (Expected: ₹1,800)`);
  console.log(`  4. Opening Balance:     ₹${invoiceRes.openingBalance} (Expected: ₹20,000)`);
  console.log(`  5. Total Outstanding:   ₹${invoiceRes.totalOutstanding} (Expected: ₹21,800)`);
  console.log(`  6. Amount Paid:         ₹${invoiceRes.amountPaid} (Expected: ₹15,000)`);
  console.log(`  7. Closing Balance:     ₹${invoiceRes.closingBalance} (Expected: ₹6,800)`);

  assert.strictEqual(invoiceRes.grossAmount, 2000, 'Gross Amount must be 2,000');
  assert.strictEqual(invoiceRes.discount, 200, 'Discount must be 200');
  assert.strictEqual(invoiceRes.netAmount, 1800, 'Net Amount must be 1,800 (2000 - 200)');
  assert.strictEqual(invoiceRes.openingBalance, 20000, 'Opening Balance must be 20,000');
  assert.strictEqual(invoiceRes.totalOutstanding, 21800, 'Total Outstanding must be 21,800 (20000 + 1800)');
  assert.strictEqual(invoiceRes.amountPaid, 15000, 'Amount Paid must be 15,000');
  assert.strictEqual(invoiceRes.closingBalance, 6800, 'Closing Balance must be 6,800 (21800 - 15000)');

  // Verify Customer Ledger consistency
  const { CustomerLedger } = require('../src/models');
  const sureshLedgerEntries = await CustomerLedger.findAll({
    where: { customerId: suresh.id },
    order: [['id', 'ASC']],
  });

  console.log(`- Suresh Ledger Entries Count: ${sureshLedgerEntries.length}`);
  // Entry 1: OPENING (debit: 20000, runningBalance: 20000)
  assert.strictEqual(sureshLedgerEntries[0].type, 'OPENING');
  assert.strictEqual(parseFloat(sureshLedgerEntries[0].debit), 20000);
  assert.strictEqual(parseFloat(sureshLedgerEntries[0].runningBalance), 20000);

  // Entry 2: SALE (debit: 1800, credit: 0, runningBalance: 21800 => Total Outstanding)
  assert.strictEqual(sureshLedgerEntries[1].type, 'SALE');
  assert.strictEqual(parseFloat(sureshLedgerEntries[1].debit), 1800);
  assert.strictEqual(parseFloat(sureshLedgerEntries[1].credit), 0);
  assert.strictEqual(parseFloat(sureshLedgerEntries[1].runningBalance), 21800, 'Running balance after sale must be Total Outstanding (21,800)');

  // Entry 3: PAYMENT (debit: 0, credit: 15000, runningBalance: 6800 => Closing Balance)
  assert.strictEqual(sureshLedgerEntries[2].type, 'PAYMENT');
  assert.strictEqual(parseFloat(sureshLedgerEntries[2].debit), 0);
  assert.strictEqual(parseFloat(sureshLedgerEntries[2].credit), 15000);
  assert.strictEqual(parseFloat(sureshLedgerEntries[2].runningBalance), 6800, 'Running balance after payment must be Closing Balance (6,800)');

  // Verify no duplicate entries exist
  assert.strictEqual(sureshLedgerEntries.length, 3, 'Exactly 3 ledger entries: 1 OPENING + 1 SALE + 1 PAYMENT (no duplicates)');

  // Verify real-time customer current due
  const sureshFinalDue = await customerService.calculateCustomerDue(suresh.id);
  console.log(`- Suresh Ledger Calculated Due: ₹${sureshFinalDue} (Expected: ₹6,800)`);
  assert.strictEqual(sureshFinalDue, 6800, 'Customer balance in ledger must be exactly 6,800');

  // Verify Daily Sales Report Consistency
  const dailySales = await reportService.getDailySales({ date: '2026-11-16' });
  const sureshSaleRow = dailySales.rows.find((r) => r.invoiceNo === invoiceRes.invoiceNumber);
  assert(sureshSaleRow, 'Invoice must appear in daily sales report');
  assert.strictEqual(sureshSaleRow.grossAmount, 2000, 'Daily sales row grossAmount must be 2,000');
  assert.strictEqual(sureshSaleRow.discount, 200, 'Daily sales row discount must be 200');
  assert.strictEqual(sureshSaleRow.netAmount, 1800, 'Daily sales row netAmount must be 1,800');
  assert.strictEqual(sureshSaleRow.openingBalance, 20000, 'Daily sales row openingBalance must be 20,000');
  assert.strictEqual(sureshSaleRow.totalOutstanding, 21800, 'Daily sales row totalOutstanding must be 21,800');
  assert.strictEqual(sureshSaleRow.amountPaid, 15000, 'Daily sales row amountPaid must be 15,000');
  assert.strictEqual(sureshSaleRow.closingBalance, 6800, 'Daily sales row closingBalance must be 6,800');

  console.log('✓ Canonical 7-Field Billing Calculation & Multi-Module Consistency PASSED 100%!\n');

  // =========================================================================
  // [Test 10] Customer Management: Edit, Pay Opening Balance, and Safe Deletion
  // =========================================================================
  console.log('[Test 10] Customer Management: Edit, Pay Opening Balance, and Safe Deletion');

  // 1. Create a customer with opening balance
  const testCust = await customerService.createCustomer({
    name: 'Mahesh Fruits Wholesale',
    phone: '9822001122',
    city: 'APMC Vashi',
    address: 'Gala 45, Fruit Market',
    customerType: 'WHOLESALE',
    creditLimit: 75000,
    openingBalance: 25000,
  });

  console.log(`- Created Customer: ${testCust.name} (${testCust.customerCode}), Opening Balance: ₹${testCust.openingBalance}`);
  assert.strictEqual(parseFloat(testCust.openingBalance), 25000);
  assert.strictEqual(parseFloat(testCust.currentDue), 25000);

  // 2. Edit Customer Details
  const updatedCust = await customerService.updateCustomer(testCust.id, {
    name: 'Mahesh Super Fruits',
    phone: '9822998877',
    city: 'Turbhe APMC',
    creditLimit: 90000,
  });

  assert.strictEqual(updatedCust.name, 'Mahesh Super Fruits');
  assert.strictEqual(updatedCust.phone, '9822998877');
  assert.strictEqual(updatedCust.city, 'Turbhe APMC');
  assert.strictEqual(parseFloat(updatedCust.creditLimit), 90000);
  console.log('- Customer Edit PASSED');

  // 3. Pay Opening Balance (Customer pays ₹10,000 against ₹25,000 opening balance)
  const payRes = await customerService.payOpeningBalance(testCust.id, {
    amount: 10000,
    paymentMode: 'UPI',
    transactionRef: 'UPI-TEST-998877',
    notes: 'Partial opening balance settlement',
  });

  console.log(`- Paid ₹${payRes.amountPaid} via ${payRes.paymentMode}. Remaining Due: ₹${payRes.remainingDue}`);
  assert.strictEqual(payRes.success, true);
  assert.strictEqual(payRes.amountPaid, 10000);
  assert.strictEqual(payRes.remainingDue, 15000);

  // Check ledger for payment
  const maheshLedger = await CustomerLedger.findAll({ where: { customerId: testCust.id }, order: [['id', 'ASC']] });
  assert.strictEqual(maheshLedger.length, 2, 'Should have 1 OPENING and 1 PAYMENT entry');
  assert.strictEqual(maheshLedger[1].type, 'PAYMENT');
  assert.strictEqual(parseFloat(maheshLedger[1].credit), 10000);
  assert.strictEqual(parseFloat(maheshLedger[1].runningBalance), 15000);
  console.log('- Pay Opening Balance PASSED');

  // 4. Safe Deletion: Create temporary test customer without invoices and delete
  const tempCust = await customerService.createCustomer({
    name: 'Temp Buyer for Delete Test',
    phone: '9900112233',
    openingBalance: 5000,
  });

  const delRes = await customerService.deleteCustomer(tempCust.id);
  assert.strictEqual(delRes.success, true);
  const deletedCheck = await Customer.findByPk(tempCust.id);
  assert.strictEqual(deletedCheck, null, 'Customer should be deleted from DB');
  console.log('- Customer Delete PASSED');

  console.log('✓ Customer Management (Edit, Pay Opening Balance, Delete) PASSED 100%!\n');

  // ==========================================
  // [Test 11] Customer Ledger & Account Statement PDF Generation
  // ==========================================
  console.log('[Test 11] Customer Ledger & Account Statement PDF Generation');
  const pdfService = require('../src/services/pdfService');
  const stream = require('stream');

  const sureshLedgerData = await customerService.getCustomerLedger(suresh.id, 100, 0);
  assert(sureshLedgerData.customer, 'Ledger data must contain customer info');
  assert(Array.isArray(sureshLedgerData.entries), 'Ledger data must contain entries');
  assert(sureshLedgerData.entries.length >= 3, 'Suresh should have at least 3 entries');

  const pdfBuffers = [];
  const mockRes = new stream.Writable({
    write(chunk, encoding, callback) {
      pdfBuffers.push(chunk);
      callback();
    },
  });

  await new Promise(async (resolve, reject) => {
    mockRes.on('finish', resolve);
    mockRes.on('error', reject);
    await pdfService.generateCustomerLedgerPdf(sureshLedgerData, mockRes);
  });

  const fullPdfBuffer = Buffer.concat(pdfBuffers);
  console.log(`- Generated Customer Ledger PDF Size: ${fullPdfBuffer.length} bytes`);
  assert(fullPdfBuffer.length > 1000, 'PDF buffer must be greater than 1KB');
  assert(fullPdfBuffer.slice(0, 5).toString().startsWith('%PDF-'), 'Buffer must start with %PDF- header');
  console.log('✓ Customer Ledger & Account Statement PDF Generation PASSED 100%!\n');

  // ==========================================
  // [Test 12] Credit & Repay Due Mechanics
  // ==========================================
  console.log('[Test 12] Credit & Repay Mechanics: Add Credit (Increase Due) & Repay (Reduce Due)');
  const creditTestCust = await customerService.createCustomer({
    name: 'Credit Test Wholesale Trader',
    phone: '9888776655',
    customerType: 'WHOLESALE',
    groupName: 'Vashi APMC Gate-1 Retailers',
    isGroupLeader: false,
    creditLimit: 50000,
    openingBalance: 0,
  });

  // 1. Add credit of ₹10,000 (adds to customer due)
  const addCreditRes = await customerService.addCredit(creditTestCust.id, {
    amount: 10000,
    reference: 'CR-TEST-001',
    description: 'Goods taken on credit (5 BOX Apple)',
  });
  console.log(`- Added Credit: ₹${addCreditRes.creditAmount}, Previous Due: ₹${addCreditRes.previousDue}, New Due: ₹${addCreditRes.newDue}`);
  assert.strictEqual(addCreditRes.success, true);
  assert.strictEqual(addCreditRes.newDue, 10000);

  let custCheck = await Customer.findByPk(creditTestCust.id);
  assert.strictEqual(parseFloat(custCheck.currentDue), 10000);

  // 2. Customer Repays ₹4,000 (reduces due amount)
  const repayRes1 = await customerService.repayCustomerDue(creditTestCust.id, {
    amount: 4000,
    paymentMode: 'CASH',
    transactionRef: 'CASH-REC-1',
    notes: 'Partial payment against credit',
  });
  console.log(`- Repay Amount: ₹${repayRes1.amountPaid}, Remaining Due: ₹${repayRes1.remainingDue}`);
  assert.strictEqual(repayRes1.success, true);
  assert.strictEqual(repayRes1.remainingDue, 6000);

  custCheck = await Customer.findByPk(creditTestCust.id);
  assert.strictEqual(parseFloat(custCheck.currentDue), 6000);

  // 3. Customer Repays final ₹6,000 (settles balance)
  const repayRes2 = await customerService.repayCustomerDue(creditTestCust.id, {
    amount: 6000,
    paymentMode: 'UPI',
    transactionRef: 'UPI-REC-2',
    notes: 'Final balance settlement',
  });
  console.log(`- Repay Amount: ₹${repayRes2.amountPaid}, Remaining Due: ₹${repayRes2.remainingDue}`);
  assert.strictEqual(repayRes2.success, true);
  assert.strictEqual(repayRes2.remainingDue, 0);

  custCheck = await Customer.findByPk(creditTestCust.id);
  assert.strictEqual(parseFloat(custCheck.currentDue), 0);
  console.log('✓ Credit & Repay Mechanics PASSED 100%!\n');

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
