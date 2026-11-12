const assert = require('assert');
const billingService = require('../src/services/billingService');
const authService = require('../src/services/authService');
const roleService = require('../src/services/roleService');
const userService = require('../src/services/userService');
const { User, Role, Customer, Product, Invoice } = require('../src/models');

async function runRBACTests() {
  console.log('--- Starting RBAC & Permission Gate Integration Tests ---');

  // 1. Test fetching roles & permissions
  const roles = await roleService.getAllRoles();
  assert(roles.length >= 4, 'Must have at least 4 roles');

  const superadminRole = roles.find((r) => r.slug === 'SUPERADMIN');
  const adminRole = roles.find((r) => r.slug === 'ADMIN');
  const cashierRole = roles.find((r) => r.slug === 'CASHIER');
  const salespersonRole = roles.find((r) => r.slug === 'SALESPERSON');

  assert(superadminRole, 'SUPERADMIN role must exist');
  assert(adminRole, 'ADMIN role must exist');
  assert(cashierRole, 'CASHIER role must exist');
  assert(salespersonRole, 'SALESPERSON role must exist');

  console.log(`- Roles verified: SUPERADMIN (${superadminRole.permissionsCount} perms), ADMIN (${adminRole.permissionsCount} perms), CASHIER (${cashierRole.permissionsCount} perms), SALESPERSON (${salespersonRole.permissionsCount} perms)`);

  // Verify permission differences:
  assert(superadminRole.permissions.includes('sales.edit'), 'Superadmin must have sales.edit');
  assert(adminRole.permissions.includes('sales.edit'), 'Admin must have sales.edit');
  assert(!cashierRole.permissions.includes('sales.edit'), 'Cashier must NOT have sales.edit');
  assert(!salespersonRole.permissions.includes('sales.edit'), 'Salesperson must NOT have sales.edit');

  assert(adminRole.permissions.includes('sales.cancel'), 'Admin must have sales.cancel');
  assert(!cashierRole.permissions.includes('sales.cancel'), 'Cashier must NOT have sales.cancel');
  assert(!salespersonRole.permissions.includes('sales.cancel'), 'Salesperson must NOT have sales.cancel');

  assert(cashierRole.permissions.includes('sales.create'), 'Cashier must have sales.create');
  assert(salespersonRole.permissions.includes('sales.create'), 'Salesperson must have sales.create');
  assert(salespersonRole.permissions.includes('sales.view'), 'Salesperson must have sales.view');

  console.log('✓ Permission matrix boundaries verified correctly!');

  // 2. Test Login & Profile retrieval
  const adminLogin = await authService.login('admin@finovore.com', 'Admin@123');
  assert(adminLogin.token, 'Admin login must return a JWT token');
  assert.strictEqual(adminLogin.user.role, 'ADMIN', 'Admin role must match');
  assert(adminLogin.user.permissions.includes('sales.edit'), 'Admin permissions must include sales.edit');

  const salesLogin = await authService.login('salesperson@finovore.com', 'Sales@123');
  assert(salesLogin.token, 'Salesperson login must return a JWT token');
  assert.strictEqual(salesLogin.user.role, 'SALESPERSON', 'Salesperson role must match');
  assert(!salesLogin.user.permissions.includes('sales.edit'), 'Salesperson must NOT have sales.edit');

  console.log('✓ Authentication & JWT generation verified for Admin & Salesperson!');

  // 3. Test Role Switching Simulation
  const switchedToSales = await authService.switchRole('SALESPERSON');
  assert.strictEqual(switchedToSales.user.role, 'SALESPERSON');
  assert.deepStrictEqual(switchedToSales.user.permissions, salespersonRole.permissions);
  console.log('✓ Dynamic role switching simulation verified!');

  // 4. Test Invoice Edit logic
  const ramesh = await Customer.findOne({ where: { customerCode: 'CUST-001' } });
  const apple = await Product.findByPk(1);

  // Create an invoice with Salesperson credentials
  const invoice = await billingService.createInvoice({
    customerId: ramesh.id,
    invoiceDate: '2026-11-10',
    saleType: 'WHOLESALE',
    items: [
      { productId: apple.id, quantity: 2, rate: 2000, unit: 'BOX' },
    ],
    status: 'CONFIRMED',
  }, salesLogin.user);

  console.log(`- Created Invoice #${invoice.invoiceNumber} by Salesperson (Grand Total: ₹${invoice.grandTotal})`);

  // Admin edits the invoice
  const updatedInvoice = await billingService.updateInvoice(invoice.invoiceId, {
    notes: 'Admin updated invoice terms: 15 days credit extended',
    invoiceDiscount: 500, // ₹500 discount
  }, adminLogin.user);

  assert.strictEqual(parseFloat(updatedInvoice.discount), 500, 'Discount must be updated to 500');
  assert.strictEqual(parseFloat(updatedInvoice.grandTotal), 3500, 'Grand total must be recalculated to 3500 (4000 - 500)');
  console.log(`- Admin successfully edited Invoice #${invoice.invoiceNumber}: New Total ₹${updatedInvoice.grandTotal}, Notes: "${updatedInvoice.notes}"`);
  console.log('✓ Invoice Edit logic verified!');

  console.log('\n====================================================');
  console.log('ALL RBAC & ROLE PERMISSION TESTS PASSED 100%');
  console.log('====================================================\n');
}

runRBACTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('RBAC Test FAILED:', err);
  process.exit(1);
});
