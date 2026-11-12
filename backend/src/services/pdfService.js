const PDFDocument = require('pdfkit');
const { Setting } = require('../models');

class PdfService {
  async generateInvoicePdf(invoice, res) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.pipe(res);

    // Dynamic Shop Details
    let shopName = 'KBN FRUITS';
    let address = 'T/A-18,T/E-25,ANNA FRUITS MARKET, KOYAMBEDU,CHENNAI-600092';
    let phone = '9677157688';
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
      const yard = map['mandi.yardBay'] || 'T/A-18,T/E-25,ANNA FRUITS MARKET';
      const city = map['mandi.city'] || 'KOYAMBEDU, CHENNAI';
      const pin = map['mandi.pincode'] || '600092';
      address = `${yard}, ${city}-${pin}`;
    } catch {
      // Fallback to default
    }

    // Company Header
    doc
      .fillColor('#0f172a')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(shopName.toUpperCase(), 40, 40)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Wholesale Produce & Cold Chain | ${address}`, 40, 65)
      .text(`Phone: ${phone}${gstin ? ` | GSTIN: ${gstin}` : ''}`, 40, 78);

    doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#cbd5e1').lineWidth(1).stroke();

    // Invoice Meta
    doc
      .fillColor('#0f172a')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('TAX INVOICE', 40, 105)
      .fontSize(9)
      .font('Helvetica')
      .text(`Invoice No: ${invoice.invoiceNumber}`, 40, 125)
      .text(`Invoice Date: ${invoice.invoiceDate}`, 40, 138)
      .text(`Sale Type: ${invoice.saleType}`, 40, 151)
      .text(`Status: ${invoice.status}`, 40, 164);

    // Customer Info Box
    doc
      .rect(340, 105, 215, 75)
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Billed To:', 348, 112)
      .font('Helvetica-Bold')
      .text(invoice.customerName, 348, 125)
      .font('Helvetica')
      .fillColor('#475569')
      .text(`Phone: ${invoice.customerPhone || 'N/A'}`, 348, 138)
      .text(`Address: ${invoice.customer?.address || 'Counter / APMC Mandi'}`, 348, 151, { width: 200 })
      .text(`Outstanding Trays: ${invoice.customer?.outstandingTrays || 0}`, 348, 164);

    // Items Table Header
    const tableTop = 200;
    doc
      .rect(40, tableTop, 515, 20)
      .fillColor('#f1f5f9')
      .fill();

    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('#', 45, tableTop + 6)
      .text('Item / Variety', 65, tableTop + 6)
      .text('Grade', 220, tableTop + 6)
      .text('Unit', 260, tableTop + 6)
      .text('Qty', 300, tableTop + 6)
      .text('Rate (Rs)', 340, tableTop + 6)
      .text('Disc (Rs)', 400, tableTop + 6)
      .text('Tax (Rs)', 450, tableTop + 6)
      .text('Amount (Rs)', 495, tableTop + 6);

    // Items List
    let y = tableTop + 24;
    const items = invoice.items || [];

    doc.font('Helvetica').fontSize(8).fillColor('#1e293b');

    items.forEach((item, index) => {
      doc
        .text(String(index + 1), 45, y)
        .text(`${item.productName} - ${item.variety}`, 65, y, { width: 150 })
        .text(item.grade || 'A', 220, y)
        .text(item.unit, 260, y)
        .text(String(item.quantity), 300, y)
        .text(Number(item.rate).toLocaleString('en-IN'), 340, y)
        .text(Number(item.discount || 0).toLocaleString('en-IN'), 400, y)
        .text(Number(item.taxAmount || 0).toLocaleString('en-IN'), 450, y)
        .text(Number(item.totalAmount).toLocaleString('en-IN'), 495, y);

      y += 18;
      doc.moveTo(40, y - 2).lineTo(555, y - 2).strokeColor('#f1f5f9').stroke();
    });

    // Summary Box
    const summaryTop = Math.max(y + 15, 340);
    doc.moveTo(40, summaryTop).lineTo(555, summaryTop).strokeColor('#cbd5e1').stroke();

    const rightCol = 380;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#475569')
      .text('Subtotal:', rightCol, summaryTop + 8)
      .text('Invoice Discount:', rightCol, summaryTop + 22)
      .text('Tax (GST):', rightCol, summaryTop + 36)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Current Sale Total:', rightCol, summaryTop + 50)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Previous Due (Ledger):', rightCol, summaryTop + 66)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('Total Payable:', rightCol, summaryTop + 82)
      .font('Helvetica')
      .fillColor('#059669')
      .text('Payment Received:', rightCol, summaryTop + 98)
      .font('Helvetica-Bold')
      .fillColor(Number(invoice.balanceDue) > 0 ? '#b91c1c' : '#059669')
      .text('Remaining Balance Due:', rightCol, summaryTop + 114);

    const valCol = 485;
    doc
      .font('Helvetica')
      .fillColor('#1e293b')
      .text(`Rs ${Number(invoice.subtotal).toLocaleString('en-IN')}`, valCol, summaryTop + 8, { align: 'right' })
      .text(`Rs ${Number(invoice.discount).toLocaleString('en-IN')}`, valCol, summaryTop + 22, { align: 'right' })
      .text(`Rs ${Number(invoice.tax).toLocaleString('en-IN')}`, valCol, summaryTop + 36, { align: 'right' })
      .font('Helvetica-Bold')
      .text(`Rs ${Number(invoice.grandTotal).toLocaleString('en-IN')}`, valCol, summaryTop + 50, { align: 'right' })
      .font('Helvetica')
      .text(`Rs ${Number(invoice.previousDueSnapshot || 0).toLocaleString('en-IN')}`, valCol, summaryTop + 66, { align: 'right' })
      .font('Helvetica-Bold')
      .text(`Rs ${Number(invoice.totalPayableSnapshot || invoice.grandTotal).toLocaleString('en-IN')}`, valCol, summaryTop + 82, { align: 'right' })
      .font('Helvetica-Bold')
      .fillColor('#059669')
      .text(`Rs ${Number(invoice.paidAmount).toLocaleString('en-IN')}`, valCol, summaryTop + 98, { align: 'right' })
      .fillColor(Number(invoice.balanceDue) > 0 ? '#b91c1c' : '#059669')
      .text(`Rs ${Number(invoice.balanceDue).toLocaleString('en-IN')}`, valCol, summaryTop + 114, { align: 'right' });

    // Tray details & signature
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Trays Issued: ${invoice.trayIssued || 0} | Trays Returned: ${invoice.trayReturned || 0}`, 40, summaryTop + 8)
      .text('Terms: All fruit goods inspected and accepted at dock. Claims valid within 24 hrs.', 40, summaryTop + 25)
      .text('Thank you for your business!', 40, summaryTop + 40);

    doc
      .moveTo(40, 520)
      .lineTo(160, 520)
      .strokeColor('#94a3b8')
      .stroke();
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Authorized Signatory', 40, 525);

    doc.end();
  }
}

module.exports = new PdfService();

