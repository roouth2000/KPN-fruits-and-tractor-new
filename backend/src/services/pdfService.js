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

    // Calculate totals according to canonical 7-field billing formula
    const grossAmount = Number(invoice.subtotal || invoice.grandTotal || 0);
    const discount = Number(invoice.discount || 0);
    const netAmount = Number(invoice.grandTotal || 0);
    const openingBalance = Number(invoice.previousDueSnapshot || invoice.previousDue || 0);
    const totalOutstanding = Math.round((openingBalance + netAmount) * 100) / 100;
    const amountPaid = Number(invoice.paidAmount || 0);
    const closingBalance = Math.round((totalOutstanding - amountPaid) * 100) / 100;
    const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    // Legacy aliases
    const grandTotal = netAmount;
    const subtotal = grossAmount;
    const paidAmount = amountPaid;
    const balanceDue = closingBalance;
    const previousDue = openingBalance;
    const totalPayable = totalOutstanding;

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

    // 9. Financial Summary (All 7 Canonical Billing Fields)
    doc.font('Courier').fontSize(7.5).fillColor('#000000');
    doc.text('Gross Amount :', 10, y);
    doc.text(`Rs ${grossAmount.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.text('Discount :', 10, y);
    doc.text(`${discount > 0 ? '-Rs ' : 'Rs '}${discount.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.text('Net Amount :', 10, y);
    doc.font('Courier-Bold').text(`Rs ${netAmount.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.font('Courier').text('Previous / Opening Balance :', 10, y);
    doc.text(`Rs ${openingBalance.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.font('Courier-Bold').text('Total Outstanding :', 10, y);
    doc.text(`Rs ${totalOutstanding.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    doc.font('Courier').text('Amount Paid :', 10, y);
    doc.text(`${amountPaid > 0 ? '-Rs ' : 'Rs '}${amountPaid.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
    y += 11;

    // Divider before Closing Balance
    doc.text('------------------------------------------', 0, y, { align: 'center', width: 226 });
    y += 10;

    doc.font('Courier-Bold').fontSize(8.5);
    doc.text('Closing / Remaining Balance :', 10, y);
    doc.text(`Rs ${closingBalance.toFixed(2)}`, 100, y, { align: 'right', width: 115 });
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

  /**
   * Generates a formal A4 Customer Ledger & Account Statement PDF.
   * Clean standard accounting format: Shop Header, Customer Details Box,
   * followed directly by the normal ledger table without colored styles/cards.
   */
  async generateCustomerLedgerPdf(ledgerData, res) {
    const customer = ledgerData.customer || {};
    const entries = ledgerData.entries || [];

    // Shop settings
    let shopName = 'KBN FRUITS';
    let addressLine1 = 'T/A-18, T/E-25, ANNA FRUITS MARKET,';
    let addressLine2 = 'KOYAMBEDU, CHENNAI-600092';
    let phone = '8778219770';
    let gstin = '';

    try {
      const settings = await Setting.findAll({ where: { category: 'MANDI' } });
      const map = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      if (map['mandi.businessName']) shopName = map['mandi.businessName'];
      if (map['mandi.phone']) phone = map['mandi.phone'];
      if (map['mandi.gstin']) gstin = map['mandi.gstin'];
      const yard = map['mandi.yardBay'] || 'T/A-18, T/E-25, ANNA FRUITS MARKET';
      const city = map['mandi.city'] || 'KOYAMBEDU, CHENNAI';
      const pin = map['mandi.pincode'] || '600092';
      addressLine1 = `${yard},`;
      addressLine2 = `${city}-${pin}`;
    } catch {
      // Fallback
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, bottom: 40, left: 36, right: 36 },
      bufferPages: true,
    });

    doc.pipe(res);

    // Helpers
    const formatCurrency = (val) => {
      const num = parseFloat(val) || 0;
      return 'Rs ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    let y = 36;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - 72; // 523.28 pt

    // 1. Business Header (Clean standard professional black & slate)
    doc.font('Helvetica-Bold').fontSize(15).fillColor('#000000').text(shopName, 36, y, { width: contentWidth, align: 'center' });
    y += 18;
    doc.font('Helvetica').fontSize(8.5).fillColor('#333333').text('Wholesale Commission Agents & APMC Fruit Merchants', 36, y, { width: contentWidth, align: 'center' });
    y += 12;
    doc.fontSize(8).fillColor('#555555').text(`${addressLine1} ${addressLine2} | Phone: ${phone}${gstin ? ` | GSTIN: ${gstin}` : ''}`, 36, y, { width: contentWidth, align: 'center' });
    y += 15;

    // Divider Line
    doc.strokeColor('#333333').lineWidth(1).moveTo(36, y).lineTo(36 + contentWidth, y).stroke();
    y += 10;

    // 2. Statement Title
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('CUSTOMER ACCOUNT STATEMENT (LEDGER)', 36, y, { width: contentWidth, align: 'center' });
    y += 15;

    // 3. Customer Details Box (Clean normal table box)
    const boxHeight = 60;
    doc.rect(36, y, contentWidth, boxHeight).stroke('#444444');

    const openingVal = parseFloat(customer.openingBalance) || 0;
    const debitVal = parseFloat(customer.totalDebit) || 0;
    const creditVal = parseFloat(customer.totalCredit) || 0;
    const closingVal = parseFloat(customer.closingBalance !== undefined ? customer.closingBalance : customer.currentDue) || 0;

    // Left Column
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000000').text(customer.name || 'Valued Customer', 44, y + 8);
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text(`Customer Code: ${customer.customerCode || '-'}  |  Type: ${customer.customerType || 'WHOLESALE'}`, 44, y + 23);
    doc.text(`Phone: ${customer.phone || '-'}  |  City: ${customer.city || 'APMC Mandi'}`, 44, y + 35);
    doc.text(`Address: ${customer.address || 'APMC Bay / Stall'}`, 44, y + 46, { width: 280, ellipsis: true });

    // Right Column
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text('Statement Date:', 340, y + 8);
    doc.font('Helvetica-Bold').text(
      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      430,
      y + 8,
      { align: 'right', width: 120 }
    );

    doc.font('Helvetica').text('Credit Limit:', 340, y + 21);
    doc.font('Helvetica-Bold').text(formatCurrency(customer.creditLimit || 0), 430, y + 21, { align: 'right', width: 120 });

    doc.font('Helvetica').text('Opening Balance:', 340, y + 34);
    doc.font('Helvetica-Bold').text(formatCurrency(openingVal), 430, y + 34, { align: 'right', width: 120 });

    doc.font('Helvetica').text('Closing Balance Due:', 340, y + 47);
    doc.font('Helvetica-Bold').fillColor('#000000').text(formatCurrency(closingVal), 430, y + 47, { align: 'right', width: 120 });

    y += boxHeight + 12;

    // 4. Normal Accounting Ledger Table
    // Column widths total 523.28 pt
    const colWidths = { date: 58, type: 48, ref: 80, desc: 165, debit: 55, credit: 55, bal: 62 };
    const colX = {
      date: 36,
      type: 36 + 58,
      ref: 36 + 58 + 48,
      desc: 36 + 58 + 48 + 80,
      debit: 36 + 58 + 48 + 80 + 165,
      credit: 36 + 58 + 48 + 80 + 165 + 55,
      bal: 36 + 58 + 48 + 80 + 165 + 55 + 55,
    };

    // Draw header function for initial table & page breaks
    const drawTableHeader = (currentY) => {
      doc.rect(36, currentY, contentWidth, 20).fillAndStroke('#f8fafc', '#444444');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000');
      doc.text('DATE', colX.date + 4, currentY + 6, { width: colWidths.date - 8 });
      doc.text('TYPE', colX.type + 4, currentY + 6, { width: colWidths.type - 8 });
      doc.text('REF / VOUCHER', colX.ref + 4, currentY + 6, { width: colWidths.ref - 8 });
      doc.text('PARTICULARS / BREAKDOWN', colX.desc + 4, currentY + 6, { width: colWidths.desc - 8 });
      doc.text('DEBIT (Rs)', colX.debit, currentY + 6, { width: colWidths.debit - 4, align: 'right' });
      doc.text('CREDIT (Rs)', colX.credit, currentY + 6, { width: colWidths.credit - 4, align: 'right' });
      doc.text('BALANCE (Rs)', colX.bal, currentY + 6, { width: colWidths.bal - 6, align: 'right' });
      return currentY + 20;
    };

    y = drawTableHeader(y);

    entries.forEach((entry) => {
      // Calculate dynamic row height based on text wrapping
      doc.font('Helvetica').fontSize(7.5);
      const descText = entry.description || '-';
      const descHeight = doc.heightOfString(descText, { width: colWidths.desc - 8 });

      const items = entry.invoice?.items || [];
      const hasItems = items.length > 0;
      const itemsHeight = hasItems ? items.length * 9.5 + 4 : 0;
      const rowHeight = Math.max(20, Math.ceil(descHeight + itemsHeight + 8));

      // Page break check: advance to new page cleanly if table exceeds page
      if (y + rowHeight > 750) {
        doc.addPage();
        y = 36;
        y = drawTableHeader(y);
      }

      // Outer row border
      doc.rect(36, y, contentWidth, rowHeight).stroke('#cbd5e1');

      // Vertical column divider lines
      doc.strokeColor('#e2e8f0').lineWidth(0.5);
      [colX.type, colX.ref, colX.desc, colX.debit, colX.credit, colX.bal].forEach((cx) => {
        doc.moveTo(cx, y).lineTo(cx, y + rowHeight).stroke();
      });

      // 1. Date
      doc.font('Helvetica').fontSize(7.5).fillColor('#000000').text(entry.date || '-', colX.date + 4, y + 5, { width: colWidths.date - 8 });

      // 2. Type (clean bold black)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text(entry.type || '-', colX.type + 4, y + 5, { width: colWidths.type - 8 });

      // 3. Reference
      doc.font('Helvetica').fontSize(7.5).fillColor('#000000').text(entry.reference || '-', colX.ref + 4, y + 5, { width: colWidths.ref - 8 });

      // 4. Description & Produce breakdown (clean text, no overlapping)
      doc.font('Helvetica').fontSize(7.5).fillColor('#000000').text(descText, colX.desc + 4, y + 5, { width: colWidths.desc - 8 });

      if (hasItems) {
        let itemY = y + 5 + descHeight + 3;
        items.forEach((it) => {
          doc.font('Helvetica').fontSize(6.5).fillColor('#444444').text(
            `• ${it.productName || 'Produce'} (${it.quantity} ${it.unit || 'BOX'} @ Rs ${Number(it.rate || 0).toFixed(2)}) = Rs ${Number(it.totalAmount || 0).toFixed(2)}`,
            colX.desc + 8,
            itemY,
            { width: colWidths.desc - 12 }
          );
          itemY += 9.5;
        });
      }

      // 5. Debit (right aligned)
      const debitNum = parseFloat(entry.debit) || 0;
      doc.font('Helvetica').fontSize(7.5).fillColor('#000000').text(
        debitNum > 0 ? debitNum.toFixed(2) : '-',
        colX.debit,
        y + 5,
        { width: colWidths.debit - 4, align: 'right' }
      );

      // 6. Credit (right aligned)
      const creditNum = parseFloat(entry.credit) || 0;
      doc.font('Helvetica').fontSize(7.5).fillColor('#000000').text(
        creditNum > 0 ? creditNum.toFixed(2) : '-',
        colX.credit,
        y + 5,
        { width: colWidths.credit - 4, align: 'right' }
      );

      // 7. Balance (right aligned, bold)
      const balNum = parseFloat(entry.runningBalance !== undefined ? entry.runningBalance : 0);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000000').text(
        balNum.toFixed(2),
        colX.bal,
        y + 5,
        { width: colWidths.bal - 6, align: 'right' }
      );

      y += rowHeight;
    });

    // 5. Totals & Closing Balance Row
    if (y + 24 > 750) {
      doc.addPage();
      y = 36;
      y = drawTableHeader(y);
    }

    doc.rect(36, y, contentWidth, 22).fillAndStroke('#f8fafc', '#444444');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text('TOTALS & CLOSING BALANCE DUE', colX.date + 4, y + 6);
    doc.text(debitVal.toFixed(2), colX.debit, y + 6, { width: colWidths.debit - 4, align: 'right' });
    doc.text(creditVal.toFixed(2), colX.credit, y + 6, { width: colWidths.credit - 4, align: 'right' });
    doc.text(closingVal.toFixed(2), colX.bal, y + 6, { width: colWidths.bal - 6, align: 'right' });
    y += 22;

    // Classic accounting double rule under totals
    doc.strokeColor('#000000').lineWidth(0.75).moveTo(36, y + 1).lineTo(36 + contentWidth, y + 1).stroke();
    doc.strokeColor('#000000').lineWidth(0.75).moveTo(36, y + 3).lineTo(36 + contentWidth, y + 3).stroke();
    y += 14;

    // 6. Signatures & Notes
    if (y + 60 > 750) {
      doc.addPage();
      y = 36;
    }

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000').text(`Net Closing Balance Due: ${formatCurrency(closingVal)}`, 36, y);
    y += 12;

    doc.font('Helvetica').fontSize(7).fillColor('#555555').text(
      'Notes: 1. Please check all entries. Any discrepancy must be reported within 7 business days.\n2. Cheques & electronic transfers subject to realization.\n3. This is a computer generated accounting statement and serves as a valid trade record.',
      36,
      y,
      { width: 310 }
    );

    doc.strokeColor('#444444').lineWidth(0.75).moveTo(395, y + 25).lineTo(540, y + 25).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000').text(`For ${shopName}`, 395, y + 29, { width: 145, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#555555').text('Authorized Signatory', 395, y + 39, { width: 145, align: 'center' });

    // Global Footer: Page numbers on all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(7).fillColor('#777777').text(
        `Page ${i + 1} of ${range.count}  ·  ${customer.name || 'Customer'} Statement  ·  Finovore Mandi Billing`,
        36,
        810,
        { width: contentWidth, align: 'center' }
      );
    }

    doc.end();
  }
}

module.exports = new PdfService();
