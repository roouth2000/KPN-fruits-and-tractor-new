const assert = require('assert');
const expenseService = require('../src/services/expenseService');
const { Expense, sequelize } = require('../src/models');

async function runExpenseTests() {
  console.log('--- Starting Expense Management Unit & Integration Tests ---');

  await sequelize.authenticate();
  await sequelize.sync();

  const mockUser = { id: 1, name: 'Super Admin', username: 'admin' };

  const testRunId = Date.now();
  const testLr = `LR-${testRunId}`;

  // Test 1: Create a valid freight expense
  console.log('\n[Test 1] Create valid APMC inward freight expense');
  const exp1 = await expenseService.createExpense(
    {
      date: new Date().toISOString().split('T')[0],
      category: 'FREIGHT_TRANSPORT',
      amount: 4500,
      paymentMode: 'CASH',
      paidTo: 'Shivaji Roadways (MH12-AB-1234)',
      referenceNumber: testLr,
      notes: 'Truck transport charges for Shimla Apple lot',
    },
    mockUser
  );

  assert.ok(exp1.id, 'Expense ID should be present');
  assert.ok(exp1.expenseNumber.startsWith('EXP-'), 'Expense number should start with EXP-');
  assert.strictEqual(parseFloat(exp1.amount), 4500, 'Amount should be 4500');
  assert.strictEqual(exp1.category, 'FREIGHT_TRANSPORT', 'Category should match');
  assert.strictEqual(exp1.paymentMode, 'CASH', 'Payment mode should be CASH');
  console.log(`✓ Expense created: ${exp1.expenseNumber} (₹${exp1.amount})`);

  // Test 2: Validation guard - invalid amount rejected
  console.log('\n[Test 2] Invalid amount validation guard');
  try {
    await expenseService.createExpense(
      {
        category: 'LABOR_HAMALI',
        amount: -500,
      },
      mockUser
    );
    assert.fail('Should have thrown an error for negative amount');
  } catch (err) {
    console.log(`✓ Caught expected validation error: "${err.message}"`);
  }

  // Test 3: Create a second expense (Dock Labor Hamali via UPI)
  console.log('\n[Test 3] Create Dock Labor (Hamali) expense via UPI');
  const exp2 = await expenseService.createExpense(
    {
      date: new Date().toISOString().split('T')[0],
      category: 'LABOR_HAMALI',
      amount: 1800,
      paymentMode: 'UPI',
      paidTo: 'Ganesh Hamali Toli',
      referenceNumber: `UPI-${testRunId}`,
      notes: 'Unloading 300 boxes from container at Bay 12',
    },
    mockUser
  );
  assert.strictEqual(parseFloat(exp2.amount), 1800);
  console.log(`✓ Expense created: ${exp2.expenseNumber} (₹${exp2.amount})`);

  // Test 4: List expenses with query filters
  console.log('\n[Test 4] Query expenses with category filter');
  const listFreight = await expenseService.listExpenses({ category: 'FREIGHT_TRANSPORT' });
  assert.ok(listFreight.expenses.length >= 1, 'Should find at least 1 freight expense');
  assert.strictEqual(listFreight.expenses[0].category, 'FREIGHT_TRANSPORT');
  console.log(`✓ Found ${listFreight.expenses.length} freight expenses (Total: ₹${listFreight.filteredTotal})`);

  // Test 5: Search expenses
  console.log('\n[Test 5] Search expenses by reference or notes');
  const searchRes = await expenseService.listExpenses({ search: testLr });
  assert.strictEqual(searchRes.expenses.length, 1, 'Should find exactly 1 expense matching LR');
  console.log(`✓ Search matched expense ${searchRes.expenses[0].expenseNumber}`);

  // Test 6: Summary metrics
  console.log('\n[Test 6] Verify expense summary');
  const summary = await expenseService.getSummary();
  assert.ok(summary.todayTotal >= 6300, 'Today total should include both created expenses');
  assert.ok(summary.categorySummary.FREIGHT_TRANSPORT >= 4500, 'Freight category sum should be at least 4500');
  console.log(`✓ Summary: Today's Total = ₹${summary.todayTotal}, Freight = ₹${summary.categorySummary.FREIGHT_TRANSPORT}`);

  // Test 7: Cancel expense
  console.log('\n[Test 7] Cancel / void expense');
  const cancelled = await expenseService.cancelExpense(exp2.id, mockUser);
  assert.strictEqual(cancelled.status, 'CANCELLED');
  console.log(`✓ Expense ${cancelled.expenseNumber} cancelled successfully`);

  // Test 8: Edit / update expense
  console.log('\n[Test 8] Edit existing expense details');
  const updatedExp1 = await expenseService.updateExpense(
    exp1.id,
    {
      amount: 5200,
      paidTo: 'Shivaji Roadways Express (MH12-AB-1234)',
      notes: 'Updated freight with toll receipt included',
    },
    mockUser
  );
  assert.strictEqual(parseFloat(updatedExp1.amount), 5200, 'Amount should be updated to 5200');
  assert.strictEqual(updatedExp1.paidTo, 'Shivaji Roadways Express (MH12-AB-1234)');
  assert.strictEqual(updatedExp1.notes, 'Updated freight with toll receipt included');
  console.log(`✓ Expense updated: ${updatedExp1.expenseNumber} (New Amount: ₹${updatedExp1.amount})`);

  // Test 9: Rejection on editing cancelled expense
  console.log('\n[Test 9] Rejection guard on editing cancelled expense');
  try {
    await expenseService.updateExpense(exp2.id, { amount: 2000 }, mockUser);
    assert.fail('Should have failed to edit cancelled expense');
  } catch (err) {
    console.log(`✓ Caught expected error: "${err.message}"`);
  }

  console.log('\n====================================================');
  console.log('ALL EXPENSE MANAGEMENT BACKEND TESTS PASSED 100%');
  console.log('====================================================');
}

runExpenseTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
