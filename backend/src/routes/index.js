const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const roleRoutes = require('./roleRoutes');
const userRoutes = require('./userRoutes');
const billingRoutes = require('./billingRoutes');
const customerRoutes = require('./customerRoutes');
const productRoutes = require('./productRoutes');
const paymentRoutes = require('./paymentRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');
const supplierRoutes = require('./supplierRoutes');
const stockRoutes = require('./stockRoutes');
const trayRoutes = require('./trayRoutes');
const settingRoutes = require('./settingRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/sales/invoices', billingRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/customer-payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/stock', stockRoutes);
router.use('/trays', trayRoutes);
router.use('/settings', settingRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Finovore Fruit Wholesale Billing API',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
