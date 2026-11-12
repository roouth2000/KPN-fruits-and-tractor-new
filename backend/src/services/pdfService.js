const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Setting } = require('../models');

class PdfService {
  /**
   * Generates a thermal receipt PDF matching the 80mm roll POS layout
   * (Koyambedu Mandi standard, TVS RP-3200 thermal paper roll).
   */
  async generateInvoicePdf(invoice, res) {
    const items = invoice.items || [];
    const payments = invoice.payments || [];

    // Calculate totals
    const grandTotal = Number(invoice.grandTotal || 0);
    const subtotal = Number(invoice.subtotal || grandTotal || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    const balanceDue = Number(invoice.balanceDue || 0);
    const previousDue = Number(invoice.previousDueSnapshot || invoice.previousDue || 0);
    const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;
    const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    // Bill Type
    const rawSaleType = String(invoice.saleType || '').toUpperCase();
    let billType = 'CREDITBILL';
    if (rawSaleType === 'CASH' || (balanceDue <= 0 && paidAmount >= grandTotal && grandTotal > 0)) {
      billType = 'CASHBILL';
    } else if (rawSaleType === 'CREDIT') {
      billType = 'CREDITBILL';
    }

    // Dynamic Shop Details
    let shopName = 'KBN FRUITS';
    let addressLine1 = 'T/A-18,T/E-25,ANNA FRUITS MARKET,';
    let addressLine2 = 'KOYAMBEDU, CHENNAI-600092';
    let phone = '8778219770';
    let gstin = '';

    try {
      const settings = await Setting.findAll({ where: { category: 'MANDI' } });
      const map = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      if (map['mandi.businessName'] && !map['mandi.businessName'].includes('SR FRUITS')) {
        shopName = map['mandi.businessName'];
      }
      if (map['mandi.phone']) phone = map['mandi.phone'];
      if (map['mandi.gstin']) gstin = map['mandi.gstin'];
      const yard = map['mandi.yardBay'] || 'T/A-18,T/E-25,ANNA FRUITS MARKET';
      const city = map['mandi.city'] || 'KOYAMBEDU, CHENNAI';
      const pin = map['mandi.pincode'] || '600092';
      addressLine1 = `${yard},`;
      addressLine2 = `${city}-${pin}`;
    } catch {
      // Fallback
    }

    // Customer & Metadata
    const customerName = (
      invoice.customerName ||
      (invoice.customer ? invoice.customer.name : 'Cash Customer')
    ).toUpperCase();
    const customerPhone = invoice.customerPhone || (invoice.customer ? invoice.customer.phone : '') || '9999999999';

    const invNumber = invoice.invoiceNumber || 'INV-000001';
    const invDate = invoice.invoiceDate || new Date().toISOString().slice(0, 10);
    const cashierName =
      invoice.createdBy?.name ||
      invoice.createdBy?.username ||
      invoice.cashier ||
      'Super Administrator';

    const invTime = invoice.createdAt
      ? new Date(invoice.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '11:00 pm';

    // Calculate continuous thermal roll height (80mm width = 226 pt)
    const baseHeight = 350;
    const itemsHeight = items.length * 24;
    const dueExtraHeight = previousDue > 0 ? 24 : 0;
    const paidExtraHeight = paidAmount > 0 ? 14 : 0;
    const totalHeight = Math.max(380, baseHeight + itemsHeight + dueExtraHeight + paidExtraHeight);

    // 80mm roll width = 226 points (standard 3-1/8 inch thermal receipt)
    const doc = new PDFDocument({
      size: [226, totalHeight],
      margins: { top: 8, bottom: 8, left: 8, right: 8 },
    });

    doc.pipe(res);

    let y = 8;

    // 1. KBN Logo Image (centered)
    const logoPaths = [
      path.join(__dirname, '../../public/kbn-logo.jpeg'),
      path.join(__dirname, '../../../front/src/assets/kbn-logo.jpeg'),
    ];
    let logoPath = logoPaths.find((p) => fs.existsSync(p));
    if (logoPath) {
      const logoWidth = 46;
      doc.image(logoPath, (226 - logoWidth) / 2, y, { width: logoWidth });
      y += 50;
    }

    // 2. Monogram & Shop Header
    doc
      .font('Courier-Bold')
      .fontSize(9)
      .fillColor('#000000')
      .text('[KBN]', 0, y, { align: 'center', width: 226 });
    y += 12;

    doc
      .font('Courier-Bold')
      .fontSize(11)
      .text(shopName.toUpperCase(), 0, y, { align: 'center', width: 226 });
    y += 14;

    doc
      .font('Courier')
      .fontSize(7)
      .fillColor('#333333')
      .text(addressLine1, 0, y, { align: 'center', width: 226 });
    y += 9;

    doc.text(addressLine2, 0, y, { align: 'center', width: 226 });
    y += 9;

    doc.text(`Phone: ${phone}${gstin ? ` · GSTIN: ${gstin}` : ''}`, 0, y, { align: 'center', width: 226 });
    y += 12;

    // 3. Divider
    doc
      .font('Courier')
      .fontSize(7.5)
      .fillColor('#666666')
      .text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 10;

    // 4. Bill Type
    doc
      .font('Courier-Bold')
      .fontSize(8.5)
      .fillColor('#000000')
      .text(`*** ${billType} ***`, 0, y, { align: 'center', width: 226 });
    y += 11;

    // Divider
    doc
      .font('Courier')
      .fontSize(7.5)
      .fillColor('#666666')
      .text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 11;

    // 5. Customer Info
    doc.font('Courier').fontSize(7.5).fillColor('#000000');
    doc.text('Customer:', 10, y);
    doc.font('Courier-Bold').text(customerName.slice(0, 18), 75, y, { align: 'right', width: 140 });
    y += 11;

    doc.font('Courier').text('Mobile:', 10, y);
    doc.text(customerPhone, 75, y, { align: 'right', width: 140 });
    y += 12;

    // Divider
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 11;

    // 6. Bill Meta (Bill No, Date, Cashier, Time)
    doc.fontSize(7);
    doc.text(`Bill No: `, 10, y);
    doc.font('Courier-Bold').text(invNumber, 50, y);
    doc.font('Courier').text(`Date: ${invDate}`, 125, y, { align: 'right', width: 90 });
    y += 10;

    doc.text(`Cashier: ${cashierName.slice(0, 12)}`, 10, y);
    doc.text(`Time: ${invTime}`, 125, y, { align: 'right', width: 90 });
    y += 11;

    // Divider
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 11;

    // 7. Table Header
    doc.font('Courier-Bold').fontSize(7.5);
    doc.text('DESCRIPTION', 10, y);
    doc.text('QTY', 115, y, { align: 'right', width: 22 });
    doc.text('RATE', 142, y, { align: 'right', width: 32 });
    doc.text('AMOUNT', 178, y, { align: 'right', width: 38 });
    y += 10;

    // Divider
    doc.font('Courier').fontSize(7.5);
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 10;

    // 8. Line Items
    items.forEach((item) => {
      const prodName = (item.productName || item.product?.name || 'Produce').toUpperCase();
      const variety = item.variety || item.unit || 'BOX';
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0).toFixed(2);
      const amount = Number(item.totalAmount || qty * Number(item.rate || 0)).toFixed(2);

      // Line 1: Produce Name
      doc.font('Courier-Bold').fontSize(7.5).fillColor('#000000');
      doc.text(prodName.slice(0, 24), 10, y);
      y += 9;

      // Line 2: Variety, Qty, Rate, Amount
      doc.font('Courier').fontSize(7).fillColor('#444444');
      doc.text(variety.slice(0, 14), 10, y);
      doc.text(String(qty), 115, y, { align: 'right', width: 22 });
      doc.text(rate, 142, y, { align: 'right', width: 32 });
      doc.font('Courier-Bold').fillColor('#000000').text(amount, 178, y, { align: 'right', width: 38 });
      y += 11;
    });

    // Divider
    doc.font('Courier').fontSize(7.5).fillColor('#666666');
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 11;

    // 9. Financial Summary
    doc.font('Courier').fontSize(7.5).fillColor('#000000');
    doc.text('Gross Amount :', 10, y);
    doc.text(`Rs ${subtotal.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.text('Net Amount :', 10, y);
    doc.font('Courier-Bold').text(`Rs ${grandTotal.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    if (previousDue > 0) {
      doc.font('Courier').text('Opening Balance :', 10, y);
      doc.text(`+Rs ${previousDue.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
      y += 11;

      doc.font('Courier-Bold').text('Total Amt :', 10, y);
      doc.text(`Rs ${totalPayable.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
      y += 11;
    }

    if (paidAmount > 0) {
      doc.font('Courier').text('Paid Amount :', 10, y);
      doc.text(`-Rs ${paidAmount.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
      y += 11;
    }

    // Divider before Closing Balance
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 10;

    doc.font('Courier-Bold').fontSize(8.5);
    doc.text('Closing Balance :', 10, y);
    doc.text(`Rs ${balanceDue.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 13;

    // Divider
    doc.font('Courier').fontSize(7.5);
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 10;

    // 10. Counts
    doc.fontSize(7);
    doc.text(`No.Of.Items : ${items.length}`, 10, y);
    doc.text(`Total Qty : ${totalQty}`, 120, y, { align: 'right', width: 95 });
    y += 11;

    // Divider
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 11;

    // 11. Footer
    doc.font('Courier-Bold').fontSize(7.5);
    doc.text('*** THANK YOU VISIT AGAIN ***', 0, y, { align: 'center', width: 226 });
    y += 10;

    doc.font('Courier').fontSize(6.5).fillColor('#555555');
    doc.text('No Return,No Exchange', 0, y, { align: 'center', width: 226 });
    y += 9;

    doc.text('TVS RP-3200 · Direct ESC/POS', 0, y, { align: 'center', width: 226 });
    y += 10;

    // Serrated bottom tear line
    doc.text('- - - - - - - - - - - - - - - - - - - -', 0, y, { align: 'center', width: 226 });

    doc.end();
  }
}

module.exports = new PdfService();
