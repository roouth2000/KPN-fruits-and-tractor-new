const { Setting } = require('../../models');

const DEFAULT_SETTINGS = [
  // Mandi & Business Details (Category: MANDI)
  {
    key: 'mandi.businessName',
    value: 'SR FRUITS',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Registered Trade Name of the Mandi commission agency / fruit shop',
    isPublic: true,
  },
  {
    key: 'mandi.logoMonogram',
    value: 'SR',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Monogram initials for POS thermal receipt header (e.g. SR)',
    isPublic: true,
  },
  {
    key: 'mandi.logoUrl',
    value: '',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Optional logo image URL or base64 data for thermal receipt header (non-mandatory)',
    isPublic: true,
  },
  {
    key: 'mandi.printLogo',
    value: 'true',
    category: 'MANDI',
    dataType: 'BOOLEAN',
    description: 'Whether to print logo image or monogram on receipt (non-mandatory)',
    isPublic: true,
  },
  {
    key: 'mandi.licenseNo',
    value: 'APMC/KOY/2026/8941',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'APMC Market Committee Trading License Number',
    isPublic: true,
  },
  {
    key: 'mandi.yardBay',
    value: 'T/A-18,T/E-25,ANNA FRUITS MARKET',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Physical trading bay and warehouse address',
    isPublic: true,
  },
  {
    key: 'mandi.city',
    value: 'KOYAMBEDU, CHENNAI',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'City of operation',
    isPublic: true,
  },
  {
    key: 'mandi.state',
    value: 'Tamil Nadu',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'State of operation',
    isPublic: true,
  },
  {
    key: 'mandi.pincode',
    value: '600092',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Postal Pin Code',
    isPublic: true,
  },
  {
    key: 'mandi.phone',
    value: '8778219770',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Trading desk phone number',
    isPublic: true,
  },
  {
    key: 'mandi.email',
    value: 'terminal.vashi@finovore.com',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'Business email address',
    isPublic: true,
  },
  {
    key: 'mandi.gstin',
    value: '27AABCF1234F1Z5',
    category: 'MANDI',
    dataType: 'STRING',
    description: 'GST Identification Number (GSTIN)',
    isPublic: true,
  },

  // Billing Preferences (Category: BILLING)
  {
    key: 'billing.invoicePrefix',
    value: 'INV-2026-',
    category: 'BILLING',
    dataType: 'STRING',
    description: 'Tax invoice numbering prefix',
    isPublic: true,
  },
  {
    key: 'billing.printLayout',
    value: 'THERMAL_80MM',
    category: 'BILLING',
    dataType: 'STRING',
    description: 'Default invoice print layout (THERMAL_80MM | A4_STANDARD)',
    isPublic: true,
  },
  {
    key: 'billing.autoPrintOnConfirm',
    value: 'true',
    category: 'BILLING',
    dataType: 'BOOLEAN',
    description: 'Automatically trigger thermal printer upon F9 Save & Print',
    isPublic: true,
  },
  {
    key: 'billing.roundOffCash',
    value: 'true',
    category: 'BILLING',
    dataType: 'BOOLEAN',
    description: 'Round off fractional rupee amounts on cash sales to nearest rupee',
    isPublic: true,
  },
  {
    key: 'billing.defaultPaymentMethod',
    value: 'CASH',
    category: 'BILLING',
    dataType: 'STRING',
    description: 'Default payment mode selected on POS sales counter',
    isPublic: true,
  },
  {
    key: 'billing.creditGraceDays',
    value: '15',
    category: 'BILLING',
    dataType: 'NUMBER',
    description: 'Allowed credit repayment period for retail buyers before overdue alert',
    isPublic: true,
  },
  {
    key: 'billing.notesFooter',
    value: 'Goods once sold cannot be returned after mandi gate dispatch.',
    category: 'BILLING',
    dataType: 'STRING',
    description: 'Custom legal disclaimer and policy footer printed on bills',
    isPublic: true,
  },

  // APMC Market Fees & Taxes (Category: APMC)
  {
    key: 'apmc.marketCessRate',
    value: '1.05',
    category: 'APMC',
    dataType: 'NUMBER',
    description: 'APMC regulatory market cess percentage (%)',
    isPublic: false,
  },
  {
    key: 'apmc.hamaliPerCrate',
    value: '5.00',
    category: 'APMC',
    dataType: 'NUMBER',
    description: 'Mandi porter / loading labour rate per crate/box (₹)',
    isPublic: false,
  },
  {
    key: 'apmc.weighingChargePerBatch',
    value: '10.00',
    category: 'APMC',
    dataType: 'NUMBER',
    description: 'Official APMC electronic weighbridge charge per consignment (₹)',
    isPublic: false,
  },
  {
    key: 'apmc.enableGst',
    value: 'false',
    category: 'APMC',
    dataType: 'BOOLEAN',
    description: 'Enable GST calculation on fresh unprocessed produce sales',
    isPublic: false,
  },
  {
    key: 'apmc.defaultGstRate',
    value: '0.00',
    category: 'APMC',
    dataType: 'NUMBER',
    description: 'Default GST percentage (%) if GST is enabled',
    isPublic: false,
  },

  // Inventory & Crates Settings (Category: INVENTORY)
  {
    key: 'inventory.lowStockThreshold',
    value: '25',
    category: 'INVENTORY',
    dataType: 'NUMBER',
    description: 'Safety stock alert threshold in boxes/crates',
    isPublic: false,
  },
  {
    key: 'inventory.traySecurityDeposit',
    value: '50',
    category: 'INVENTORY',
    dataType: 'NUMBER',
    description: 'Standard refundable cash deposit per plastic crate/tray (₹)',
    isPublic: false,
  },
  {
    key: 'inventory.allowNegativeStock',
    value: 'false',
    category: 'INVENTORY',
    dataType: 'BOOLEAN',
    description: 'Permit billing items beyond available warehouse batch stock',
    isPublic: false,
  },
  {
    key: 'inventory.autoAlertExpiry',
    value: 'true',
    category: 'INVENTORY',
    dataType: 'BOOLEAN',
    description: 'Flag lots in stock audit dashboard nearing fruit ripening shelf life',
    isPublic: false,
  },

  // Thermal Printer Preferences (Category: PRINTER)
  {
    key: 'printer.printerName',
    value: '',
    category: 'PRINTER',
    dataType: 'STRING',
    description: 'Configured hardware printer name for silent raw printing',
    isPublic: true,
  },
  {
    key: 'printer.paperSize',
    value: '80mm',
    category: 'PRINTER',
    dataType: 'STRING',
    description: 'Thermal receipt roll width (80mm | 58mm)',
    isPublic: true,
  },
  {
    key: 'printer.printMode',
    value: 'DIRECT_QZ',
    category: 'PRINTER',
    dataType: 'STRING',
    description: 'Print delivery pipeline (DIRECT_QZ | BROWSER_FALLBACK)',
    isPublic: true,
  },
  {
    key: 'printer.cutPaper',
    value: 'true',
    category: 'PRINTER',
    dataType: 'BOOLEAN',
    description: 'Send ESC/POS auto paper cut command after invoice receipt',
    isPublic: true,
  },
  {
    key: 'printer.openCashDrawer',
    value: 'false',
    category: 'PRINTER',
    dataType: 'BOOLEAN',
    description: 'Send electronic cash drawer pulse upon cash invoice completion',
    isPublic: true,
  },
  {
    key: 'printer.characterEncoding',
    value: 'CP437',
    category: 'PRINTER',
    dataType: 'STRING',
    description: 'Thermal print ESC/POS character code page',
    isPublic: true,
  },
];

async function seedSettings() {
  console.log('Seeding system settings...');
  let seededCount = 0;

  for (const item of DEFAULT_SETTINGS) {
    const existing = await Setting.findOne({ where: { key: item.key } });
    if (!existing) {
      await Setting.create(item);
      seededCount++;
    }
  }

  console.log(`✓ Settings seeded: ${seededCount} new, ${DEFAULT_SETTINGS.length - seededCount} already configured.`);
}

module.exports = {
  DEFAULT_SETTINGS,
  seedSettings,
};

