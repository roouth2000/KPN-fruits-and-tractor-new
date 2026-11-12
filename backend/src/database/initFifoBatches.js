const { sequelize, Product, Supplier, Batch, StockMovement } = require('../models');

async function initFifoBatches() {
  console.log('=== Initializing FIFO Batches & Standard Suppliers ===');

  await sequelize.sync();
  console.log('✓ Tables synced with Sequelize.');

  // 1. Seed Standard Suppliers if none exist
  const supplierCount = await Supplier.count();
  console.log(`Current suppliers in database: ${supplierCount}`);

  let suppliers = [];
  if (supplierCount === 0) {
    console.log('Seeding standard Mandi fruit suppliers...');
    suppliers = await Supplier.bulkCreate([
      {
        supplierCode: 'SUPP-SHIMLA-01',
        name: 'Himachal Apple Growers Cooperative',
        phone: '9816012345',
        city: 'Shimla',
        address: 'APMC Yard, Theog Road, Shimla, HP',
        openingBalance: 0.00,
        currentDue: 0.00,
        isActive: true,
      },
      {
        supplierCode: 'SUPP-NASHIK-02',
        name: 'Sahyadri Farmers Producer Co',
        phone: '9822023456',
        city: 'Nashik',
        address: 'Mohadi, Dindori Road, Nashik, MH',
        openingBalance: 0.00,
        currentDue: 0.00,
        isActive: true,
      },
      {
        supplierCode: 'SUPP-KASHMIR-03',
        name: 'Kashmir Valley Fruit Exporters',
        phone: '9419034567',
        city: 'Sopore',
        address: 'Fruit Mandi Yard #4, Sopore, J&K',
        openingBalance: 0.00,
        currentDue: 0.00,
        isActive: true,
      },
      {
        supplierCode: 'SUPP-NAGPUR-04',
        name: 'Vidarbha Citrus Grower Collective',
        phone: '9765045678',
        city: 'Nagpur',
        address: 'Cotton Market / APMC Yard, Nagpur, MH',
        openingBalance: 0.00,
        currentDue: 0.00,
        isActive: true,
      },
      {
        supplierCode: 'SUPP-RATNAGIRI-05',
        name: 'Konkan Alphonso Mango Growers',
        phone: '9823056789',
        city: 'Ratnagiri',
        address: 'APMC Yard, Pawas Road, Ratnagiri, MH',
        openingBalance: 0.00,
        currentDue: 0.00,
        isActive: true,
      },
    ]);
    console.log(`✓ Seeded ${suppliers.length} standard APMC fruit suppliers.`);
  } else {
    suppliers = await Supplier.findAll();
  }

  // 2. Initialize batches for existing products with stock
  const products = await Product.findAll();
  for (const p of products) {
    const stock = parseFloat(p.currentStock) || 0;
    const existingBatchesCount = await Batch.count({ where: { productId: p.id } });

    if (stock > 0 && existingBatchesCount === 0) {
      console.log(`Initializing FIFO supplier batches for ${p.name} (${stock} ${p.defaultUnit})...`);

      // Split stock into 2 realistic supplier batches with different purchase dates (Rule 1 & Rule 3)
      const supp1 = suppliers[0] || null;
      const supp2 = suppliers[1] || suppliers[0] || null;

      const qty1 = Math.ceil(stock * 0.6);
      const qty2 = stock - qty1;

      // Oldest batch (3 days ago)
      const d1 = new Date();
      d1.setDate(d1.getDate() - 3);
      const date1Str = d1.toISOString().slice(0, 10);

      // Newer batch (yesterday)
      const d2 = new Date();
      d2.setDate(d2.getDate() - 1);
      const date2Str = d2.toISOString().slice(0, 10);

      const batchNum1 = `BATCH-${date1Str.replace(/-/g, '')}-S${supp1 ? supp1.id : 1}-${p.productCode.slice(-4)}-001`;
      const batchNum2 = `BATCH-${date2Str.replace(/-/g, '')}-S${supp2 ? supp2.id : 2}-${p.productCode.slice(-4)}-002`;

      await Batch.create({
        batchNumber: batchNum1,
        productId: p.id,
        supplierId: supp1 ? supp1.id : null,
        purchaseDate: date1Str,
        initialQuantity: qty1,
        currentQuantity: qty1,
        unit: p.defaultUnit,
        purchaseRate: p.purchaseRate || 1400.00,
        status: 'ACTIVE',
        notes: `Opening batch from ${supp1 ? supp1.name : 'Grower'}`,
      });

      if (qty2 > 0) {
        await Batch.create({
          batchNumber: batchNum2,
          productId: p.id,
          supplierId: supp2 ? supp2.id : null,
          purchaseDate: date2Str,
          initialQuantity: qty2,
          currentQuantity: qty2,
          unit: p.defaultUnit,
          purchaseRate: p.purchaseRate || 1450.00,
          status: 'ACTIVE',
          notes: `Opening batch from ${supp2 ? supp2.name : 'Grower'}`,
        });
      }

      console.log(`✓ Created 2 batches for ${p.name}: ${batchNum1} (${qty1}) & ${batchNum2} (${qty2})`);
    }
  }

  console.log('=== FIFO Initialization Finished Successfully ===');
}

if (require.main === module) {
  initFifoBatches()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to init FIFO batches:', err);
      process.exit(1);
    });
}

module.exports = { initFifoBatches };

