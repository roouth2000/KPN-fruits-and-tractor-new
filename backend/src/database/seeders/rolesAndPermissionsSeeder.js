const bcrypt = require('bcryptjs');
const { sequelize, Role, Permission, RolePermission, User } = require('../../models');

const permissionsList = [
  // Sales Module
  { slug: 'sales.view', name: 'View Sales Invoices', module: 'SALES', description: 'View sales invoices, histories, and line items' },
  { slug: 'sales.create', name: 'Create Invoices', module: 'SALES', description: 'Create new sales bills and invoices' },
  { slug: 'sales.edit', name: 'Edit Invoices', module: 'SALES', description: 'Modify and update existing invoices (Admin only)' },
  { slug: 'sales.cancel', name: 'Cancel Invoices', module: 'SALES', description: 'Void and cancel confirmed invoices with stock reversal (Admin only)' },
  { slug: 'sales.return', name: 'Process Sales Return', module: 'SALES', description: 'Process customer fruit returns and issue credit notes' },
  { slug: 'sales.payment', name: 'Process Invoice Payment', module: 'SALES', description: 'Accept and allocate payments on sales invoices' },
  { slug: 'sales.discount', name: 'Apply Discounts', module: 'SALES', description: 'Apply line item or bill-level discounts' },
  { slug: 'sales.price_override', name: 'Price Override', module: 'SALES', description: 'Override configured fruit selling rates during billing' },
  { slug: 'invoice.print', name: 'Print Invoices & Receipts', module: 'SALES', description: 'Generate and print PDF / thermal bills' },

  // Payments & Dues Module
  { slug: 'payment.view', name: 'View Payments', module: 'PAYMENTS', description: 'View payment histories and transaction vouchers' },
  { slug: 'payment.collect', name: 'Collect Previous Dues', module: 'PAYMENTS', description: 'Collect standalone customer outstanding dues' },

  // Customers Module
  { slug: 'customer.view', name: 'View Customers', module: 'CUSTOMERS', description: 'Search and inspect customer balances and profiles' },
  { slug: 'customer.create', name: 'Create Customers', module: 'CUSTOMERS', description: 'Register new customer master profiles' },
  { slug: 'customer.edit', name: 'Edit Customers', module: 'CUSTOMERS', description: 'Update customer credit limits, addresses, and contacts' },

  // Suppliers Module
  { slug: 'supplier.view', name: 'View Suppliers', module: 'SUPPLIERS', description: 'Inspect fruit growers, suppliers, and vendor ledgers' },
  { slug: 'supplier.create', name: 'Create Suppliers', module: 'SUPPLIERS', description: 'Add new fruit suppliers and commission agents' },
  { slug: 'supplier.edit', name: 'Edit Suppliers', module: 'SUPPLIERS', description: 'Modify supplier profiles and terms' },

  // Inventory Module
  { slug: 'stock.view', name: 'View Inventory', module: 'INVENTORY', description: 'View fruit stock levels, batches, and dual unit conversions' },
  { slug: 'stock.adjust', name: 'Adjust Stock', module: 'INVENTORY', description: 'Perform physical count stock corrections and write-offs' },
  { slug: 'stock.override', name: 'Authorize Negative Stock', module: 'INVENTORY', description: 'Override stock depletion guards during urgent sales' },

  // Trays / Crates Module
  { slug: 'tray.view', name: 'View Tray Balances', module: 'TRAYS', description: 'View customer and supplier outstanding plastic crates/trays' },
  { slug: 'tray.manage', name: 'Manage Tray Movements', module: 'TRAYS', description: 'Issue and log returns of fruit crates' },

  // Reports Module
  { slug: 'reports.view', name: 'View Standard Reports', module: 'REPORTS', description: 'View Daily Sales, Stock, Purchase, and Due reports' },
  { slug: 'reports.financial', name: 'View Financial Reports', module: 'REPORTS', description: 'Access Profit, Loss, and sensitive APMC trading margin reports' },

  // Administration Module
  { slug: 'users.view', name: 'View Users', module: 'ADMINISTRATION', description: 'View staff members list and assigned roles' },
  { slug: 'users.manage', name: 'Manage Staff Accounts', module: 'ADMINISTRATION', description: 'Create, update, and deactivate staff user accounts' },
  { slug: 'roles.manage', name: 'Manage Roles & Permissions', module: 'ADMINISTRATION', description: 'Modify role permission matrices and access levels' },
  { slug: 'settings.manage', name: 'System Settings', module: 'ADMINISTRATION', description: 'Configure taxes, APMC parameters, and company profile' },
];

const rolesList = [
  {
    slug: 'SUPERADMIN',
    name: 'Super Administrator',
    description: 'Supreme access across all system modules, role assignments, financial audit, and settings.',
    permissions: permissionsList.map((p) => p.slug), // All permissions
  },
  {
    slug: 'ADMIN',
    name: 'Store Administrator',
    description: 'Full store operations: invoice creation, edit, cancel, customer/supplier ledgers, all reports, and staff management.',
    permissions: [
      'sales.view',
      'sales.create',
      'sales.edit',
      'sales.cancel',
      'sales.return',
      'sales.payment',
      'sales.discount',
      'sales.price_override',
      'invoice.print',
      'payment.view',
      'payment.collect',
      'customer.view',
      'customer.create',
      'customer.edit',
      'supplier.view',
      'supplier.create',
      'supplier.edit',
      'stock.view',
      'stock.adjust',
      'stock.override',
      'tray.view',
      'tray.manage',
      'reports.view',
      'reports.financial',
      'users.view',
      'users.manage',
      'roles.manage',
      'settings.manage',
    ],
  },
  {
    slug: 'CASHIER',
    name: 'Mandi Cashier',
    description: 'Billing counter operations: create bills, accept payments, collect previous dues, print receipts, and view stock. Cannot edit confirmed invoices or cancel without supervisor.',
    permissions: [
      'sales.view',
      'sales.create',
      'sales.payment',
      'invoice.print',
      'payment.view',
      'payment.collect',
      'customer.view',
      'customer.create',
      'stock.view',
      'tray.view',
      'reports.view',
    ],
  },
  {
    slug: 'SALESPERSON',
    name: 'Sales Person',
    description: 'Sales Person Billing Desk: Billing Page ONLY. Fast customer lookup, product entry, and bill generation. No invoice editing or management reports.',
    permissions: [
      'sales.create',
      'sales.view',
      'sales.print',
      'customer.view',
      'stock.view',
    ],
  },
];

async function seedRolesAndPermissions() {
  console.log('--- Seeding Roles, Permissions & Staff Accounts ---');
  const transaction = await sequelize.transaction();

  try {
    // 1. Seed Permissions
    console.log(`Seeding ${permissionsList.length} permissions...`);
    const permMap = new Map();
    for (const permData of permissionsList) {
      let [perm] = await Permission.findOrCreate({
        where: { slug: permData.slug },
        defaults: permData,
        transaction,
      });
      await perm.update(permData, { transaction });
      permMap.set(perm.slug, perm.id);
    }

    // 2. Seed Roles and Link RolePermissions
    console.log(`Seeding ${rolesList.length} roles...`);
    const roleMap = new Map();
    for (const roleData of rolesList) {
      let [role] = await Role.findOrCreate({
        where: { slug: roleData.slug },
        defaults: {
          slug: roleData.slug,
          name: roleData.name,
          description: roleData.description,
          isSystem: true,
        },
        transaction,
      });

      await role.update({
        name: roleData.name,
        description: roleData.description,
      }, { transaction });

      roleMap.set(role.slug, role);

      // Clear existing permissions for this role and reassign
      await RolePermission.destroy({ where: { roleId: role.id }, transaction });

      const rolePermRecords = roleData.permissions
        .map((pSlug) => permMap.get(pSlug))
        .filter(Boolean)
        .map((permId) => ({
          roleId: role.id,
          permissionId: permId,
        }));

      await RolePermission.bulkCreate(rolePermRecords, { transaction });
      console.log(`- Role "${role.name}" assigned ${rolePermRecords.length} permissions.`);
    }

    // 3. Seed Default Staff Accounts for each role
    const defaultPassword = await bcrypt.hash('Admin@123', 10);
    const cashierPassword = await bcrypt.hash('Cashier@123', 10);
    const salesPassword = await bcrypt.hash('Sales@123', 10);

    const usersToSeed = [
      {
        username: 'superadmin',
        name: 'Super Administrator',
        email: 'superadmin@finovore.com',
        passwordHash: defaultPassword,
        role: 'SUPERADMIN',
        roleId: roleMap.get('SUPERADMIN').id,
        permissions: JSON.stringify(rolesList.find((r) => r.slug === 'SUPERADMIN').permissions),
        isActive: true,
      },
      {
        username: 'admin',
        name: 'Ramesh Store Admin',
        email: 'admin@finovore.com',
        passwordHash: defaultPassword,
        role: 'ADMIN',
        roleId: roleMap.get('ADMIN').id,
        permissions: JSON.stringify(rolesList.find((r) => r.slug === 'ADMIN').permissions),
        isActive: true,
      },
      {
        username: 'cashier',
        name: 'Rohan Sharma (Cashier)',
        email: 'cashier@finovore.com',
        passwordHash: cashierPassword,
        role: 'CASHIER',
        roleId: roleMap.get('CASHIER').id,
        permissions: JSON.stringify(rolesList.find((r) => r.slug === 'CASHIER').permissions),
        isActive: true,
      },
      {
        username: 'salesperson',
        name: 'Amit Verma (Sales)',
        email: 'salesperson@finovore.com',
        passwordHash: salesPassword,
        role: 'SALESPERSON',
        roleId: roleMap.get('SALESPERSON').id,
        permissions: JSON.stringify(rolesList.find((r) => r.slug === 'SALESPERSON').permissions),
        isActive: true,
      },
    ];

    for (const u of usersToSeed) {
      const existing = await User.findOne({ where: { email: u.email }, transaction });
      if (existing) {
        await existing.update(u, { transaction });
        console.log(`- Updated staff account: ${u.name} [${u.role}] (${u.email})`);
      } else {
        await User.create(u, { transaction });
        console.log(`- Created staff account: ${u.name} [${u.role}] (${u.email})`);
      }
    }

    await transaction.commit();
    console.log('✓ Roles, Permissions & Default Users seeded successfully!\n');
  } catch (error) {
    await transaction.rollback();
    console.error('Seeder FAILED:', error);
    throw error;
  }
}

module.exports = {
  seedRolesAndPermissions,
  permissionsList,
  rolesList,
};

// Auto-run if executed directly
if (require.main === module) {
  seedRolesAndPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

