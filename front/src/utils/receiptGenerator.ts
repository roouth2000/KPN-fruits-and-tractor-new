import type { PrinterSettings } from '../types/printer';

// Helper to format date as DD/MM/YYYY
function formatReceiptDate(d?: string | Date | null): string {
  if (!d) d = new Date();
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return new Date().toLocaleDateString('en-GB');
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to format time as hh: mm AM/PM
function formatReceiptTime(d?: string | Date | null): string {
  const dt = d ? new Date(d) : new Date();
  const safeDt = isNaN(dt.getTime()) ? new Date() : dt;
  let hours = safeDt.getHours();
  const minutes = String(safeDt.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}: ${minutes} ${ampm}`;
}

export const receiptGenerator = {
  /**
   * Generates a thermal receipt matching the real Koyambedu Mandi template (80mm / 58mm).
   */
  generateReceiptHtml(invoiceData: any, settings: PrinterSettings): string {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const is58mm = settings.paperSize === '58mm';
    const contentWidth = is58mm ? '48mm' : '72mm';
    const paperWidth = is58mm ? '58mm' : '80mm';

    // Monogram initials & Shop details (Logo is completely non-mandatory)
    const shopName = (settings.shopName || 'KBN FRUITS').trim().toUpperCase();
    const initials = (settings.shopInitials || '').trim().toUpperCase();
    const shouldPrintLogo = settings.printLogo !== false && (Boolean(settings.logoUrl) || Boolean(initials));

    const shopAddressLines = (settings.shopAddress || '')
      .split('\n')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    // Bill Type: CREDITBILL / CASHBILL
    let billType = 'CREDITBILL';
    const rawSaleType = String(inv.saleType || '').toUpperCase();
    const balanceDue = Number(inv.balanceDue || 0);
    const paidAmount = Number(inv.paidAmount || 0);
    const grandTotal = Number(inv.grandTotal || 0);

    if (rawSaleType === 'CASH') {
      billType = 'CASHBILL';
    } else if (rawSaleType === 'CREDIT') {
      billType = 'CREDITBILL';
    } else if (balanceDue <= 0 && paidAmount >= grandTotal && grandTotal > 0) {
      billType = 'CASHBILL';
    } else {
      billType = 'CREDITBILL';
    }

    // Customer
    const customerName = (
      inv.customerName ||
      (inv.customer ? inv.customer.name : 'Walk-in Customer')
    ).toUpperCase();
    const customerPhone = inv.customerPhone || (inv.customer ? inv.customer.phone : '');

    // Metadata
    const invNumber = inv.invoiceNumber || '1453';
    const cashierName =
      inv.createdBy?.name ||
      inv.createdBy?.username ||
      inv.creator?.name ||
      inv.creator?.username ||
      inv.cashier ||
      'admin';
    const invDate = formatReceiptDate(inv.invoiceDate || inv.createdAt);
    const invTime = formatReceiptTime(inv.createdAt || inv.invoiceDate);

    // Math & Totals
    const subtotal = Number(inv.subtotal || grandTotal || 0);
    const discount = Number(inv.discount || 0);
    const tax = Number(inv.tax || 0);
    const previousDue = Number(inv.previousDueSnapshot || inv.previousDue || 0);
    const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;

    const trayIssued = Number(inv.trayIssued || 0);
    const trayReturned = Number(inv.trayReturned || 0);

    const totalQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

    // Payments breakdown
    let paymentRows: { label: string; amount: number }[] = [];
    if (Array.isArray(payments) && payments.length > 0) {
      paymentRows = payments
        .filter((p: any) => Number(p.amount || 0) > 0)
        .map((p: any) => {
          const mode = String(p.paymentMode || p.method || 'CASH').toUpperCase();
          const modeLabel =
            mode === 'CASH'
              ? 'Cash Received'
              : mode === 'GPAY' || mode === 'UPI' || mode === 'PHONEPE'
              ? 'Gpay Received'
              : `${mode} Received`;
          return {
            label: modeLabel,
            amount: Number(p.amount || 0),
          };
        });
    }

    if (paymentRows.length === 0) {
      if (paidAmount > 0) {
        paymentRows.push({ label: 'Cash Received', amount: paidAmount });
      } else {
        paymentRows.push({ label: 'Cash Received', amount: 0 });
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill #${invNumber}</title>
  <style>
    @page {
      margin: 0;
      size: ${paperWidth} auto;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '2mm 1mm' : '4mm 2mm'};
      background-color: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
      font-size: ${is58mm ? '10px' : '11px'};
      line-height: 1.25;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
    }
    .receipt {
      width: ${contentWidth};
      max-width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    
    /* Header */
    .logo-image {
      max-width: ${is58mm ? '36mm' : '45mm'};
      max-height: 25mm;
      object-fit: contain;
      margin: 0 auto 3px auto;
      display: block;
      filter: grayscale(100%) contrast(140%);
    }
    .logo-monogram {
      font-size: ${is58mm ? '20px' : '26px'};
      font-weight: 900;
      letter-spacing: 2px;
      text-align: center;
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .shop-title {
      font-size: ${is58mm ? '12px' : '14px'};
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .shop-address {
      font-size: ${is58mm ? '8.5px' : '9.5px'};
      text-align: center;
      line-height: 1.25;
      color: #111;
    }
    .shop-gst {
      font-size: ${is58mm ? '8px' : '9px'};
      text-align: center;
      margin-top: 1px;
    }
    
    /* Bill Type & Customer */
    .bill-type-tag {
      font-size: ${is58mm ? '11px' : '12px'};
      font-weight: 800;
      text-align: right;
      letter-spacing: 0.5px;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .customer-box {
      margin: 2px 0 3px 0;
    }
    .customer-name {
      font-size: ${is58mm ? '11px' : '12px'};
      font-weight: bold;
      letter-spacing: 0.3px;
    }
    .customer-phone {
      font-size: ${is58mm ? '10px' : '11px'};
      margin-top: 1px;
    }

    /* Dividers */
    .divider {
      border-top: 1px dashed #000000;
      margin: 3px 0;
      width: 100%;
    }
    .divider-solid {
      border-top: 1px solid #000000;
      margin: 3px 0;
      width: 100%;
    }

    /* Meta Grid */
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${is58mm ? '9px' : '10.5px'};
      line-height: 1.35;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0;
    }
    .items-table th {
      padding: 3px 0;
      font-size: ${is58mm ? '9px' : '10.5px'};
      font-weight: bold;
      border-bottom: 1px dashed #000;
    }
    .items-table td {
      padding: 2px 0;
      vertical-align: top;
      font-size: ${is58mm ? '9.5px' : '10.5px'};
      line-height: 1.25;
    }
    .col-desc {
      text-align: left;
      width: ${is58mm ? '42%' : '46%'};
      word-break: break-word;
    }
    .col-qty {
      text-align: right;
      width: ${is58mm ? '16%' : '14%'};
      padding-right: 2px;
    }
    .col-rate {
      text-align: right;
      width: ${is58mm ? '20%' : '18%'};
      padding-right: 2px;
    }
    .col-amt {
      text-align: right;
      width: ${is58mm ? '22%' : '22%'};
    }
    .lot-trace {
      font-size: ${is58mm ? '7.5px' : '8.5px'};
      font-style: italic;
      color: #333;
      padding-left: 4px;
      line-height: 1.2;
    }

    /* Totals Block */
    .totals-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }
    .totals-table {
      width: ${is58mm ? '100%' : '78%'};
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 1px 0;
      font-size: ${is58mm ? '9.5px' : '10.5px'};
      line-height: 1.35;
    }
    .total-line .t-label {
      text-align: right;
      flex: 1;
      padding-right: 8px;
    }
    .total-line .t-val {
      text-align: right;
      min-width: 60px;
    }
    .totals-subline {
      border-top: 1px dashed #000;
      margin: 2px 0;
    }
    .closing-balance-row {
      font-size: ${is58mm ? '11px' : '12.5px'};
      font-weight: 900;
      margin-top: 2px;
      padding-top: 1px;
    }

    /* Summary Line */
    .summary-bar {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? '9.5px' : '10.5px'};
      font-weight: bold;
      padding: 1px 0;
    }

    /* Footer */
    .footer-box {
      text-align: center;
      margin-top: 5px;
      font-size: ${is58mm ? '8.5px' : '9.5px'};
      line-height: 1.35;
    }
    .footer-tagline {
      font-size: ${is58mm ? '8px' : '9px'};
      margin-top: 2px;
      font-weight: bold;
    }
    .cut-spacing {
      height: 12mm;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="text-center">
      ${
        shouldPrintLogo
          ? settings.logoUrl
            ? `<img src="${settings.logoUrl}" class="logo-image" alt="Shop Logo" onerror="this.style.display='none'" />`
            : initials
            ? `<div class="logo-monogram">${initials}</div>`
            : ''
          : ''
      }
      <div class="shop-title">${shopName}</div>
      ${shopAddressLines.map((line) => `<div class="shop-address">${line}</div>`).join('')}
      ${settings.shopGst ? `<div class="shop-gst">GSTIN: ${settings.shopGst}</div>` : ''}
    </div>

    <!-- Bill Type -->
    <div class="bill-type-tag">${billType}</div>

    <!-- Customer -->
    <div class="customer-box">
      <div class="customer-name">${customerName}</div>
      ${customerPhone ? `<div class="customer-phone">${customerPhone}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Meta Info -->
    <div class="meta-row">
      <span>Bill No : ${invNumber}</span>
      <span>Date : ${invDate}</span>
    </div>
    <div class="meta-row">
      <span>Cashier : ${cashierName}</span>
      <span>Time : ${invTime}</span>
    </div>

    <div class="divider"></div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-desc">Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-rate">Rate</th>
          <th class="col-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item: any) => {
            const pName = (
              item.productName ||
              (item.product ? item.product.name : 'Produce')
            ).toUpperCase();
            const variety = item.variety || (item.product ? item.product.variety : '');
            const itemTitle = variety ? `${pName} (${variety})` : pName;
            const qty = Number(item.quantity || 0);
            const rate = Number(item.rate || 0);
            const amt = Number(item.totalAmount || qty * rate);

            return `
        <tr>
          <td class="col-desc font-bold">${itemTitle}</td>
          <td class="col-qty">${qty}</td>
          <td class="col-rate">${rate.toFixed(2)}</td>
          <td class="col-amt font-bold">${amt.toFixed(2)}</td>
        </tr>`;
          })
          .join('')}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-container">
      <div class="totals-table">
        <div class="total-line">
          <span class="t-label">Gross Amount :</span>
          <span class="t-val">${subtotal.toFixed(2)}</span>
        </div>

        ${
          discount > 0
            ? `
        <div class="total-line">
          <span class="t-label">Discount :</span>
          <span class="t-val">-${discount.toFixed(2)}</span>
        </div>
        `
            : ''
        }

        ${
          tax > 0
            ? `
        <div class="total-line">
          <span class="t-label">Tax / GST :</span>
          <span class="t-val">${tax.toFixed(2)}</span>
        </div>
        `
            : ''
        }

        <div class="total-line font-bold">
          <span class="t-label">Net Amount :</span>
          <span class="t-val">${grandTotal.toFixed(2)}</span>
        </div>

        ${
          previousDue > 0
            ? `
        <div class="total-line">
          <span class="t-label">Opening Balance :</span>
          <span class="t-val">${previousDue.toFixed(2)}</span>
        </div>
        <div class="totals-subline"></div>
        <div class="total-line font-bold">
          <span class="t-label">Total Amt:</span>
          <span class="t-val">${totalPayable.toFixed(2)}</span>
        </div>
        `
            : ''
        }

        ${paymentRows
          .map(
            (p) => `
        <div class="total-line">
          <span class="t-label">${p.label} :</span>
          <span class="t-val">${p.amount.toFixed(2)}</span>
        </div>
        `
          )
          .join('')}

        <div class="total-line font-bold closing-balance-row">
          <span class="t-label">Closing Balance :</span>
          <span class="t-val">${balanceDue.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Summary of Items & Qty -->
    <div class="summary-bar">
      <span>No.Of.Items : ${items.length}</span>
      <span>Total Qty : ${totalQty % 1 === 0 ? totalQty : totalQty.toFixed(2)}</span>
    </div>

    ${
      trayIssued > 0 || trayReturned > 0
        ? `
    <div class="meta-row" style="margin-top: 1px; font-size: ${is58mm ? '8.5px' : '9.5px'};">
      <span>Trays Issued: ${trayIssued}</span>
      <span>Returned: ${trayReturned}</span>
      <span>Net: ${trayIssued - trayReturned}</span>
    </div>
    `
        : ''
    }

    <div class="divider"></div>

    <!-- Footer -->
    <div class="footer-box">
      <div>${settings.footerTerms || 'No Return,No Exchange'}</div>
      <div>${settings.footerMessage || 'Thank you!!!.Visit Again.!!!.'}</div>
      ${
        settings.footerTagline
          ? `<div class="footer-tagline">${settings.footerTagline}</div>`
          : ''
      }
    </div>

    <!-- Paper cut spacing for thermal printers -->
    <div class="cut-spacing"></div>
  </div>
</body>
</html>`;
  },

  /**
   * Generates a diagnostic test receipt based exactly on the reference image (Koyambedu Mandi format).
   */
  generateTestReceiptHtml(settings: PrinterSettings, printerName?: string): string {
    const targetPrinter = printerName || settings.printerName || 'Default System Printer';

    // Sample data matching the real Koyambedu receipt image
    const sampleInvoice = {
      invoiceNumber: '1453',
      saleType: 'CREDIT',
      invoiceDate: '2026-11-05',
      customerName: 'RM BHAI',
      customerPhone: '8778219770',
      cashier: 'admin',
      subtotal: 14900.0,
      discount: 0,
      tax: 0,
      grandTotal: 14900.0,
      paidAmount: 10000.0,
      previousDueSnapshot: 102725.0,
      balanceDue: 107625.0,
      trayIssued: 0,
      trayReturned: 0,
      payments: [
        { paymentMode: 'CASH', amount: 0.0 },
        { paymentMode: 'GPAY', amount: 10000.0 },
      ],
      items: [
        {
          productName: 'SS',
          quantity: 20,
          rate: 170.0,
          totalAmount: 3400.0,
        },
        {
          productName: 'KINNAUAR 200',
          quantity: 1,
          rate: 3300.0,
          totalAmount: 3300.0,
        },
        {
          productName: 'KINNAUAR 150',
          quantity: 1,
          rate: 4300.0,
          totalAmount: 4300.0,
        },
        {
          productName: 'KIWI',
          quantity: 1,
          rate: 1700.0,
          totalAmount: 1700.0,
        },
        {
          productName: 'BABY ORANGE',
          quantity: 1,
          rate: 2200.0,
          totalAmount: 2200.0,
        },
      ],
    };

    return this.generateReceiptHtml(sampleInvoice, {
      ...settings,
      printerName: targetPrinter,
    });
  },

  /**
   * Generates raw ESC/POS command bytes for high-speed thermal printers (matching image format).
   */
  generateEscPosCommands(invoiceData: any, settings: PrinterSettings): Uint8Array {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const cols = settings.paperSize === '58mm' ? 32 : 48;

    const ESC = 0x1b;
    const GS = 0x1d;

    const bytes: number[] = [];

    const text = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xff);
      }
    };

    const line = (str: string) => {
      text(str);
      bytes.push(0x0a); // LF
    };

    const padRow = (left: string, right: string, maxLen: number) => {
      const sp = Math.max(1, maxLen - left.length - right.length);
      return left + ' '.repeat(sp) + right;
    };

    // 1. Initialize: ESC @
    bytes.push(ESC, 0x40);

    // 2. Open Cash Drawer if enabled
    if (settings.openCashDrawer) {
      bytes.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    }

    // 3. Monogram / Header (Center aligned)
    bytes.push(ESC, 0x61, 0x01); // Center

    const shopName = (settings.shopName || 'KBN FRUITS').toUpperCase();
    const initials = (settings.shopInitials || '').trim().toUpperCase();

    // Initials (Non-mandatory logo monogram)
    if (settings.printLogo !== false && initials) {
      bytes.push(ESC, 0x21, 0x30); // Double width & Double height
      line(initials);
    }

    // Shop Title: Double width
    bytes.push(ESC, 0x21, 0x20);
    line(shopName);

    // Normal font
    bytes.push(ESC, 0x21, 0x00);
    const addressLines = (settings.shopAddress || '').split('\n').filter(Boolean);
    addressLines.forEach((addr) => line(addr.toUpperCase()));
    if (settings.shopGst) line(`GSTIN: ${settings.shopGst}`);

    // Bill Type: Right aligned
    bytes.push(ESC, 0x61, 0x02); // Right
    const billType =
      String(inv.saleType || '').toUpperCase() === 'CASH' ? 'CASHBILL' : 'CREDITBILL';
    bytes.push(ESC, 0x45, 0x01); // Bold ON
    line(billType);
    bytes.push(ESC, 0x45, 0x00); // Bold OFF

    // Customer: Left aligned
    bytes.push(ESC, 0x61, 0x00); // Left
    const custName = (
      inv.customerName ||
      (inv.customer ? inv.customer.name : 'Walk-in Customer')
    ).toUpperCase();
    line(custName);
    const custPhone = inv.customerPhone || (inv.customer ? inv.customer.phone : '');
    if (custPhone) line(custPhone);

    line('-'.repeat(cols));

    // Meta: Bill No & Date / Cashier & Time
    const invNumber = inv.invoiceNumber || '1453';
    const invDate = formatReceiptDate(inv.invoiceDate || inv.createdAt);
    const invTime = formatReceiptTime(inv.createdAt || inv.invoiceDate);
    const cashier =
      inv.createdBy?.name ||
      inv.createdBy?.username ||
      inv.cashier ||
      'admin';

    line(padRow(`Bill No : ${invNumber}`, `Date : ${invDate}`, cols));
    line(padRow(`Cashier : ${cashier}`, `Time : ${invTime}`, cols));

    line('-'.repeat(cols));

    // Table Header
    line(padRow('Description', 'Qty   Rate    Amount', cols));
    line('-'.repeat(cols));

    // Items
    let totalQty = 0;
    for (const item of items) {
      const pName = (
        item.productName ||
        (item.product ? item.product.name : 'Produce')
      ).toUpperCase();
      const qty = Number(item.quantity || 0);
      totalQty += qty;
      const rate = Number(item.rate || 0).toFixed(2);
      const amt = Number(item.totalAmount || qty * Number(item.rate || 0)).toFixed(2);

      const rightCols = `${qty}  ${rate}  ${amt}`;
      line(padRow(pName, rightCols, cols));
    }

    line('-'.repeat(cols));

    // Totals Section (Right-aligned)
    bytes.push(ESC, 0x61, 0x02); // Right
    const subtotal = Number(inv.subtotal || inv.grandTotal || 0).toFixed(2);
    const grandTotal = Number(inv.grandTotal || 0).toFixed(2);
    const previousDue = Number(inv.previousDueSnapshot || 0).toFixed(2);
    const totalPayable = (Number(inv.previousDueSnapshot || 0) + Number(inv.grandTotal || 0)).toFixed(2);
    const balanceDue = Number(inv.balanceDue || 0).toFixed(2);

    line(`Gross Amount :  ${subtotal}`);
    line(`Net Amount :  ${grandTotal}`);
    if (Number(previousDue) > 0) {
      line(`Opening Balance :  ${previousDue}`);
      line('-'.repeat(Math.min(28, cols)));
      line(`Total Amt:  ${totalPayable}`);
    }

    if (Array.isArray(payments) && payments.length > 0) {
      for (const p of payments) {
        const mode = String(p.paymentMode || p.method || 'CASH').toUpperCase();
        const pLabel = mode === 'GPAY' || mode === 'UPI' ? 'Gpay Received' : 'Cash Received';
        line(`${pLabel} :  ${Number(p.amount || 0).toFixed(2)}`);
      }
    } else {
      line(`Cash Received :  0.00`);
    }

    bytes.push(ESC, 0x45, 0x01); // Bold ON
    line(`Closing Balance :  ${balanceDue}`);
    bytes.push(ESC, 0x45, 0x00); // Bold OFF

    // Left align for summary
    bytes.push(ESC, 0x61, 0x00);
    line('-'.repeat(cols));
    line(padRow(`No.Of.Items : ${items.length}`, `Total Qty : ${totalQty}`, cols));
    line('-'.repeat(cols));

    // Footer (Center)
    bytes.push(ESC, 0x61, 0x01);
    line(settings.footerTerms || 'No Return,No Exchange');
    line(settings.footerMessage || 'Thank you!!!.Visit Again.!!!.');
    if (settings.footerTagline) line(settings.footerTagline);

    // Spacing before cut
    bytes.push(0x0a, 0x0a, 0x0a, 0x0a);

    // Paper Cut: GS V 66 0 (Partial Cut with feed)
    if (settings.cutPaper) {
      bytes.push(GS, 0x56, 0x42, 0x00);
    }

    return new Uint8Array(bytes);
  },
};
