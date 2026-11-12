const {
  sequelize,
  Customer,
  Supplier,
  Product,
  Unit,
  TaxConfig,
} = require('../../models');

/**
 * Clean Master Data Seeder
 * Seeds ONLY essential system configurations and master catalog with 0 stock.
 * No dummy invoices, no fake stock movements, and no mock customer/supplier dues.
 */
async function seedMasterData() {
  console.log('--- Initializing Fresh Mandi Master Configuration ---');

  const transaction = await sequelize.transaction();

  try {
    // 1. Seed Packaging Units
    const unitsData = [
      { code: 'KG', name: 'Kilogram', symbol: 'kg', isBaseUnit: true, conversionFactor: 1.000 },
      { code: 'BOX', name: 'Corrugated Box', symbol: 'box', isBaseUnit: false, conversionFactor: 20.000 },
      { code: 'CRATE', name: 'Plastic Crate', symbol: 'crate', isBaseUnit: false, conversionFactor: 22.000 },
      { code: 'DOZEN', name: 'Dozen Units', symbol: 'doz', isBaseUnit: false, conversionFactor: 12.000 },
    ];
    for (const u of unitsData) {
      await Unit.findOrCreate({ where: { code: u.code }, defaults: u, transaction });
    }

    // 2. Seed Tax Config
    await TaxConfig.findOrCreate({
      where: { name: 'APMC Market Cess' },
      defaults: { name: 'APMC Market Cess', ratePercentage: 0.00, isInclusive: false, isExempt: true, isActive: true },
      transaction,
    });

    // 3. Seed Default Cash Customer (Required for Walk-In POS / Cash Sales)
    await Customer.findOrCreate({
      where: { customerCode: 'CUST-CASH' },
      defaults: {
        customerCode: 'CUST-CASH',
        name: 'Cash Customer',
        phone: '9999999999',
        city: 'Mumbai',
        address: 'APMC Counter Sale',
        creditLimit: 0.00,
        currentDue: 0.00,
        outstandingTrays: 0,
        customerType: 'WALK_IN',
      },
      transaction,
    });

    // 3b. Seed Standard APMC Fruit Suppliers / Grower Cooperatives
    const initialSuppliers = [
      {
        supplierCode: 'SUPP-SHIMLA-01',
        name: 'Himachal Apple Growers Cooperative',
        phone: '9816012345',
        city: 'Shimla',
        address: 'APMC Yard, Theog Road, Shimla, HP',
        openingBalance: 0.00,
        currentDue: 0.00,
      },
      {
        supplierCode: 'SUPP-NASHIK-02',
        name: 'Sahyadri Farmers Producer Co',
        phone: '9822023456',
        city: 'Nashik',
        address: 'Mohadi, Dindori Road, Nashik, MH',
        openingBalance: 0.00,
        currentDue: 0.00,
      },
      {
        supplierCode: 'SUPP-KASHMIR-03',
        name: 'Kashmir Valley Fruit Exporters',
        phone: '9419034567',
        city: 'Sopore',
        address: 'Fruit Mandi Yard #4, Sopore, J&K',
        openingBalance: 0.00,
        currentDue: 0.00,
      },
      {
        supplierCode: 'SUPP-NAGPUR-04',
        name: 'Vidarbha Citrus Grower Collective',
        phone: '9765045678',
        city: 'Nagpur',
        address: 'Cotton Market / APMC Yard, Nagpur, MH',
        openingBalance: 0.00,
        currentDue: 0.00,
      },
    ];
    for (const s of initialSuppliers) {
      await Supplier.findOrCreate({ where: { supplierCode: s.supplierCode }, defaults: s, transaction });
    }

    // 4. Seed Standard Fruit Master Catalog (Initialized with 0 stock for live production entry)
    const initialProducts = [
      {
        productCode: 'PROD-APPLE-GALA',
        name: 'Apple',
        variety: 'Royal Gala',
        grade: 'A',
        batchNumber: 'BATCH-2026-001',
        defaultUnit: 'BOX',
        baseUnit: 'KG',
        conversionFactor: 20.000,
        purchaseRate: 1500.00,
        wholesaleRate: 2000.00,
        retailRate: 2200.00,
        currentStock: 0.00,
        minStockLevel: 25.00,
        isActive: true,
      },
      {
        productCode: 'PROD-KIWI-GRN',
        name: 'Kiwi',
        variety: 'Green',
        grade: 'A',
        batchNumber: 'BATCH-2026-002',
        defaultUnit: 'BOX',
        baseUnit: 'KG',
        conversionFactor: 10.000,
        purchaseRate: 2200.00,
        wholesaleRate: 3000.00,
        retailRate: 3300.00,
        currentStock: 0.00,
        minStockLevel: 20.00,
        isActive: true,
      },
      {
        productCode: 'PROD-POM-BHAGWA',
        name: 'Pomegranate',
        variety: 'Bhagwa',
        grade: 'A',
        batchNumber: 'BATCH-2026-003',
        defaultUnit: 'BOX',
        baseUnit: 'KG',
        conversionFactor: 15.000,
        purchaseRate: 2300.00,
        wholesaleRate: 3000.00,
        retailRate: 3400.00,
        currentStock: 0.00,
        minStockLevel: 15.00,
        isActive: true,
      },
      {
        productCode: 'PROD-MANGO-ALPH',
        name: 'Mango',
        variety: 'Alphonso Ratnagiri',
        grade: 'A+',
        batchNumber: 'BATCH-2026-004',
        defaultUnit: 'BOX',
        baseUnit: 'KG',
        conversionFactor: 18.000,
        purchaseRate: 1800.00,
        wholesaleRate: 2500.00,
        retailRate: 2800.00,
        currentStock: 0.00,
        minStockLevel: 20.00,
        isActive: true,
      },
      {
        productCode: 'PROD-ORANGE-NAG',
        name: 'Orange',
        variety: 'Nagpur Mandarin',
        grade: 'A',
        batchNumber: 'BATCH-2026-005',
        defaultUnit: 'BOX',
        baseUnit: 'KG',
        conversionFactor: 20.000,
        purchaseRate: 950.00,
        wholesaleRate: 1400.00,
        retailRate: 1600.00,
        currentStock: 0.00,
        minStockLevel: 30.00,
        isActive: true,
      },
      {
        productCode: 'PROD-BANANA-ROB',
        name: 'Banana',
        variety: 'Robusta Golden',
        grade: 'A',
        batchNumber: 'BATCH-2026-006',
        defaultUnit: 'CRATE',
        baseUnit: 'KG',
        conversionFactor: 22.000,
        purchaseRate: 420.00,
        wholesaleRate: 600.00,
        retailRate: 750.00,
        currentStock: 0.00,
        minStockLevel: 25.00,
        isActive: true,
      },
    ];

    for (const p of initialProducts) {
      await Product.findOrCreate({ where: { productCode: p.productCode }, defaults: p, transaction });
    }

    await transaction.commit();
    console.log('✓ Fresh master configuration initialized successfully.');
  } catch (err) {
    await transaction.rollback();
    console.error('Error seeding fresh master data:', err);
    throw err;
  }
}

if (require.main === module) {
  seedMasterData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedMasterData };
