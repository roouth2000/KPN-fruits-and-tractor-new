import type { PrinterSettings } from '../types/printer';

export const receiptGenerator = {
  /**
   * Generates a thermal receipt as formatted HTML for 80mm or 58mm layouts.
   */
  generateReceiptHtml(invoiceData: any, settings: PrinterSettings): string {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const is58mm = settings.paperSize === '58mm';
    const contentWidth = is58mm ? '48mm' : '72mm';
    const paperWidth = is58mm ? '58mm' : '80mm';

    const invNumber = inv.invoiceNumber || 'INV-DRAFT';
    const invDate = inv.invoiceDate
      ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN');
    const invTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const customerName = inv.customerName || (inv.customer ? inv.customer.name : 'Walk-in Customer');
    const customerPhone = inv.customerPhone || (inv.customer ? inv.customer.phone : '');
    const saleType = inv.saleType || 'WHOLESALE';

    const subtotal = Number(inv.subtotal || 0);
    const discount = Number(inv.discount || 0);
    const tax = Number(inv.tax || 0);
    const grandTotal = Number(inv.grandTotal || 0);
    const paidAmount = Number(inv.paidAmount || 0);
    const balanceDue = Number(inv.balanceDue || 0);
    const previousDue = Number(inv.previousDueSnapshot || 0);
    const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;

    const trayIssued = Number(inv.trayIssued || 0);
    const trayReturned = Number(inv.trayReturned || 0);

    const divider = is58mm
      ? '--------------------------------'
      : '------------------------------------------------';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${invNumber}</title>
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
      font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${is58mm ? '10px' : '11px'};
      line-height: 1.25;
      -webkit-font-smoothing: antialiased;
    }
    .receipt-container {
      width: ${contentWidth};
      max-width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .text-large { font-size: ${is58mm ? '12px' : '14px'}; font-weight: bold; }
    .text-title { font-size: ${is58mm ? '13px' : '15px'}; font-weight: 800; letter-spacing: 0.5px; }
    .text-small { font-size: ${is58mm ? '8.5px' : '9.5px'}; }
    .divider {
      white-space: pre;
      overflow: hidden;
      margin: 3px 0;
      font-size: 10px;
      line-height: 1;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 2px 0;
    }
    .items-table th {
      border-bottom: 1px dashed #000;
      padding: 3px 0;
      font-size: ${is58mm ? '9px' : '10px'};
      text-transform: uppercase;
    }
    .items-table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .batch-trace {
      font-size: ${is58mm ? '8px' : '9px'};
      color: #333;
      padding-left: 6px;
      font-style: italic;
    }
    .totals-box {
      margin-top: 4px;
      padding-top: 2px;
    }
    .grand-total-row {
      font-size: ${is58mm ? '12px' : '13px'};
      font-weight: 900;
      margin: 3px 0;
      padding: 2px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }
    .barcode-box {
      margin: 6px 0 3px 0;
      text-align: center;
    }
    .barcode-svg {
      max-width: 100%;
      height: 28px;
    }
    .footer-note {
      margin-top: 6px;
      font-size: ${is58mm ? '8.5px' : '9px'};
      text-align: center;
      line-height: 1.3;
    }
    .cut-spacing {
      height: 12mm;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="text-center">
      <div class="text-title">${settings.shopName}</div>
      <div class="text-small">${settings.shopAddress}</div>
      <div class="text-small">Tel: ${settings.shopPhone} · GSTIN: ${settings.shopGst}</div>
      <div class="text-small font-bold" style="margin-top: 2px;">*** APMC MANDI TAX INVOICE ***</div>
    </div>

    <div class="divider">${divider}</div>

    <!-- Metadata -->
    <div>
      <div class="flex-row">
        <span>BILL NO: <strong class="font-bold">${invNumber}</strong></span>
        <span>${saleType}</span>
      </div>
      <div class="flex-row text-small">
        <span>DATE: ${invDate}</span>
        <span>TIME: ${invTime}</span>
      </div>
      <div class="flex-row text-small">
        <span>CUSTOMER: <strong>${customerName}</strong></span>
        <span>${customerPhone ? customerPhone : ''}</span>
      </div>
    </div>

    <div class="divider">${divider}</div>

    <!-- Line Items Table -->
    ${
      is58mm
        ? `
    <!-- 58mm Compact 2-Line Items Layout -->
    <div class="font-bold text-small flex-row" style="border-bottom: 1px dashed #000; padding-bottom: 2px;">
      <span>ITEM / DETAILS</span>
      <span>AMOUNT</span>
    </div>
    ${items
      .map((item: any) => {
        const pName = item.productName || (item.product ? item.product.name : 'Produce');
        const variety = item.variety || (item.product ? item.product.variety : '');
        const qty = Number(item.quantity || 0);
        const unit = item.unit || 'BOX';
        const rate = Number(item.rate || 0);
        const amt = Number(item.totalAmount || qty * rate);

        return `
      <div style="margin: 3px 0;">
        <div class="font-bold">${pName} ${variety ? `(${variety})` : ''}</div>
        <div class="flex-row text-small">
          <span>${qty} ${unit} @ ₹${rate.toLocaleString('en-IN')}</span>
          <span class="font-bold">₹${amt.toLocaleString('en-IN')}</span>
        </div>
        ${
          settings.printSupplierBatchTrace && item.batchAllocations && item.batchAllocations.length > 0
            ? item.batchAllocations
                .map(
                  (a: any) => `
          <div class="batch-trace">↳ Lot: ${a.batch ? a.batch.batchNumber : `B#${a.batchId}`} [${a.supplier ? a.supplier.name : 'Supplier'}] (${a.quantity} ${a.unit || unit})</div>
        `
                )
                .join('')
            : ''
        }
      </div>
      `;
      })
      .join('')}
    `
        : `
    <!-- 80mm Standard Table Layout -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="text-left" style="width: 44%;">ITEM</th>
          <th class="text-right" style="width: 18%;">QTY</th>
          <th class="text-right" style="width: 18%;">RATE</th>
          <th class="text-right" style="width: 20%;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item: any) => {
            const pName = item.productName || (item.product ? item.product.name : 'Produce');
            const variety = item.variety || (item.product ? item.product.variety : '');
            const qty = Number(item.quantity || 0);
            const unit = item.unit || 'BOX';
            const rate = Number(item.rate || 0);
            const amt = Number(item.totalAmount || qty * rate);

            return `
          <tr>
            <td colspan="4" class="font-bold" style="padding-top: 3px;">
              ${pName} ${variety ? `(${variety})` : ''}
            </td>
          </tr>
          <tr>
            <td class="text-small" style="padding-left: 6px;">Grade ${item.grade || 'A'}</td>
            <td class="text-right text-small">${qty} ${unit}</td>
            <td class="text-right text-small">₹${rate.toLocaleString('en-IN')}</td>
            <td class="text-right font-bold">₹${amt.toLocaleString('en-IN')}</td>
          </tr>
          ${
            settings.printSupplierBatchTrace && item.batchAllocations && item.batchAllocations.length > 0
              ? item.batchAllocations
                  .map(
                    (a: any) => `
            <tr>
              <td colspan="4" class="batch-trace">
                ↳ FIFO Lot: ${a.batch ? a.batch.batchNumber : `Batch #${a.batchId}`} · ${a.supplier ? a.supplier.name : 'Direct Consignment'} (${a.quantity} ${a.unit || unit})
              </td>
            </tr>
          `
                  )
                  .join('')
              : ''
          }
        `;
          })
          .join('')}
      </tbody>
    </table>
    `
    }

    <div class="divider">${divider}</div>

    <!-- Totals Summary -->
    <div class="totals-box">
      <div class="flex-row">
        <span>SUBTOTAL:</span>
        <span>₹${subtotal.toLocaleString('en-IN')}</span>
      </div>

      ${
        discount > 0
          ? `
      <div class="flex-row">
        <span>DISCOUNT:</span>
        <span>-₹${discount.toLocaleString('en-IN')}</span>
      </div>
      `
          : ''
      }

      ${
        tax > 0
          ? `
      <div class="flex-row text-small">
        <span>TAX (CGST + SGST):</span>
        <span>₹${tax.toLocaleString('en-IN')}</span>
      </div>
      `
          : `
      <div class="flex-row text-small" style="color: #444;">
        <span>GST:</span>
        <span>₹0.00 (Fresh Produce Exempt)</span>
      </div>
      `
      }

      <div class="flex-row grand-total-row">
        <span>NET PAYABLE:</span>
        <span>₹${grandTotal.toLocaleString('en-IN')}</span>
      </div>

      <!-- Payment & Ledger Settlement -->
      <div style="margin-top: 3px;">
        ${
          payments.length > 0
            ? payments
                .map(
                  (p: any) => `
          <div class="flex-row text-small">
            <span>PAID (${p.paymentMode || p.method || 'CASH'}):</span>
            <span class="font-bold">₹${Number(p.amount || 0).toLocaleString('en-IN')}</span>
          </div>
        `
                )
                .join('')
            : `
          <div class="flex-row text-small">
            <span>TOTAL PAID:</span>
            <span class="font-bold">₹${paidAmount.toLocaleString('en-IN')}</span>
          </div>
        `
        }

        ${
          previousDue > 0
            ? `
        <div class="flex-row text-small" style="color: #333; margin-top: 1px;">
          <span>PREVIOUS DUE:</span>
          <span>₹${previousDue.toLocaleString('en-IN')}</span>
        </div>
        <div class="flex-row text-small" style="color: #333;">
          <span>TOTAL ACCOUNT DUE:</span>
          <span>₹${totalPayable.toLocaleString('en-IN')}</span>
        </div>
        `
            : ''
        }

        <div class="flex-row" style="font-weight: bold; margin-top: 2px;">
          <span>CURRENT BALANCE DUE:</span>
          <span style="${balanceDue > 0 ? 'text-decoration: underline;' : ''}">₹${balanceDue.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Mandi Trays Section -->
      ${
        trayIssued > 0 || trayReturned > 0
          ? `
      <div class="divider">${divider}</div>
      <div class="text-small">
        <div class="font-bold">MANDI TRAYS / CRATES RECORD:</div>
        <div class="flex-row">
          <span>Issued: <strong>${trayIssued}</strong></span>
          <span>Returned: <strong>${trayReturned}</strong></span>
          <span>Net: <strong>${trayIssued - trayReturned}</strong></span>
        </div>
      </div>
      `
          : ''
      }
    </div>

    <!-- Barcode / QR Code representation -->
    ${
      settings.printQrCode
        ? `
    <div class="barcode-box">
      <svg class="barcode-svg" viewBox="0 0 200 40">
        <rect width="200" height="40" fill="#fff"/>
        <g fill="#000">
          <!-- Stylized barcode lines -->
          <rect x="10" y="5" width="3" height="24"/>
          <rect x="16" y="5" width="2" height="24"/>
          <rect x="22" y="5" width="5" height="24"/>
          <rect x="30" y="5" width="2" height="24"/>
          <rect x="36" y="5" width="4" height="24"/>
          <rect x="44" y="5" width="1" height="24"/>
          <rect x="48" y="5" width="3" height="24"/>
          <rect x="54" y="5" width="6" height="24"/>
          <rect x="63" y="5" width="2" height="24"/>
          <rect x="68" y="5" width="4" height="24"/>
          <rect x="75" y="5" width="3" height="24"/>
          <rect x="81" y="5" width="1" height="24"/>
          <rect x="85" y="5" width="5" height="24"/>
          <rect x="93" y="5" width="2" height="24"/>
          <rect x="98" y="5" width="4" height="24"/>
          <rect x="105" y="5" width="3" height="24"/>
          <rect x="111" y="5" width="5" height="24"/>
          <rect x="119" y="5" width="2" height="24"/>
          <rect x="124" y="5" width="4" height="24"/>
          <rect x="131" y="5" width="1" height="24"/>
          <rect x="135" y="5" width="5" height="24"/>
          <rect x="143" y="5" width="3" height="24"/>
          <rect x="149" y="5" width="2" height="24"/>
          <rect x="154" y="5" width="4" height="24"/>
          <rect x="161" y="5" width="2" height="24"/>
          <rect x="166" y="5" width="5" height="24"/>
          <rect x="174" y="5" width="2" height="24"/>
          <rect x="179" y="5" width="4" height="24"/>
          <rect x="186" y="5" width="3" height="24"/>
        </g>
        <text x="100" y="37" font-size="8" font-family="monospace" text-anchor="middle" fill="#000">${invNumber}</text>
      </svg>
    </div>
    `
        : ''
    }

    <div class="divider">${divider}</div>

    <!-- Footer -->
    <div class="footer-note">
      <div>${settings.footerMessage}</div>
      <div style="margin-top: 3px; font-weight: bold;">Goods checked &amp; verified at dock. Thank you!</div>
      <div class="text-small" style="color: #555; margin-top: 2px;">*** KBN FRUITS AND TRADERS MANDI SYSTEM ***</div>
    </div>

    <!-- Paper cut spacing for thermal printers -->
    <div class="cut-spacing"></div>
  </div>
</body>
</html>
`;
  },

  /**
   * Generates a diagnostic test receipt to verify printer connection and alignment.
   */
  generateTestReceiptHtml(settings: PrinterSettings, printerName?: string): string {
    const is58mm = settings.paperSize === '58mm';
    const contentWidth = is58mm ? '48mm' : '72mm';
    const paperWidth = is58mm ? '58mm' : '80mm';
    const targetPrinter = printerName || settings.printerName || 'Default System Printer';
    const now = new Date();

    const ruler = is58mm
      ? '|-- 58mm Width Alignment --|'
      : '|-------- 80mm POS Thermal Width Alignment --------|';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Printer Diagnostic Test</title>
  <style>
    @page { margin: 0; size: ${paperWidth} auto; }
    body {
      margin: 0;
      padding: ${is58mm ? '2mm 1mm' : '4mm 2mm'};
      background-color: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '10px' : '11px'};
      line-height: 1.25;
    }
    .container { width: ${contentWidth}; margin: 0 auto; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 13px; font-weight: 800; }
    .divider { margin: 3px 0; font-size: 10px; }
    .box { border: 1px dashed #000; padding: 4px; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="center">
      <div class="title">*** PRINTER TEST TICKET ***</div>
      <div class="bold">${settings.shopName}</div>
      <div>QZ Tray Direct POS Communication</div>
    </div>

    <div class="divider">================================================</div>

    <div class="box">
      <div>PRINTER: <strong class="bold">${targetPrinter}</strong></div>
      <div>PAPER SIZE: <strong class="bold">${settings.paperSize.toUpperCase()} Thermal</strong></div>
      <div>PRINT MODE: <strong class="bold">${settings.printMode}</strong></div>
      <div>AUTO-CUT: <strong>${settings.cutPaper ? 'ENABLED' : 'DISABLED'}</strong></div>
      <div>DRAWER KICK: <strong>${settings.openCashDrawer ? 'ENABLED' : 'DISABLED'}</strong></div>
      <div>TIMESTAMP: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')}</div>
    </div>

    <div class="divider">------------------------------------------------</div>

    <div class="center bold" style="font-size: 9px;">${ruler}</div>

    <div style="margin: 4px 0;">
      <div class="bold">SAMPLE TEST PRODUCE ITEMS:</div>
      <div style="display:flex; justify-content:space-between;">
        <span>Apple (Royal Gala) 10 BOX</span>
        <span class="bold">₹20,000.00</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>Pomegranate (Bhagwa) 5 BOX</span>
        <span class="bold">₹10,000.00</span>
      </div>
    </div>

    <div class="divider">------------------------------------------------</div>

    <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 12px;">
      <span>TEST TOTAL:</span>
      <span>₹30,000.00</span>
    </div>

    <div class="divider">================================================</div>

    <div class="center" style="margin-top: 4px;">
      <div class="bold">✓ PRINTER TEST PASSED</div>
      <div style="font-size: 9px; color: #333;">If this text is sharp and aligned within margins, your thermal printer is ready for high-speed counter billing!</div>
    </div>

    <div style="height: 12mm;"></div>
  </div>
</body>
</html>
`;
  },

  /**
   * Generates raw ESC/POS command bytes for high-speed thermal printers.
   */
  generateEscPosCommands(invoiceData: any, settings: PrinterSettings): Uint8Array {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const is58mm = settings.paperSize === '58mm';
    const cols = is58mm ? 32 : 48;

    const ESC = 0x1b;
    const GS = 0x1d;

    const bytes: number[] = [];

    // Helper to push string in ASCII
    const text = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xff);
      }
    };

    const line = (str: string) => {
      text(str);
      bytes.push(0x0a); // LF
    };

    // 1. Initialize printer: ESC @
    bytes.push(ESC, 0x40);

    // 2. Open Cash Drawer if enabled (ESC p m t1 t2)
    if (settings.openCashDrawer) {
      bytes.push(ESC, 0x70, 0x00, 0x19, 0xfa);
    }

    // 3. Center alignment: ESC a 1
    bytes.push(ESC, 0x61, 0x01);

    // Double height + width for Shop Name: ESC ! 0x30
    bytes.push(ESC, 0x21, 0x30);
    line(settings.shopName);

    // Normal font: ESC ! 0x00
    bytes.push(ESC, 0x21, 0x00);
    line(settings.shopAddress);
    line(`Tel: ${settings.shopPhone} · GSTIN: ${settings.shopGst}`);
    line('*** APMC MANDI TAX INVOICE ***');

    // Divider
    line('-'.repeat(cols));

    // 4. Left alignment: ESC a 0
    bytes.push(ESC, 0x61, 0x00);
    line(`BILL NO: ${inv.invoiceNumber || 'INV-DRAFT'}`);
    line(`DATE: ${inv.invoiceDate || new Date().toISOString().slice(0, 10)}  TYPE: ${inv.saleType || 'WHOLESALE'}`);
    line(`CUSTOMER: ${inv.customerName || (inv.customer ? inv.customer.name : 'Walk-in')}`);
    line('-'.repeat(cols));

    // Items
    for (const item of items) {
      const pName = item.productName || (item.product ? item.product.name : 'Produce');
      const qty = Number(item.quantity || 0);
      const unit = item.unit || 'BOX';
      const rate = Number(item.rate || 0);
      const amt = Number(item.totalAmount || qty * rate);

      line(`${pName}`);
      const detailStr = `  ${qty} ${unit} @ Rs.${rate}`;
      const amtStr = `Rs.${amt}`;
      const spaces = Math.max(1, cols - detailStr.length - amtStr.length);
      line(detailStr + ' '.repeat(spaces) + amtStr);
    }

    line('-'.repeat(cols));

    // Grand Total (Bold)
    bytes.push(ESC, 0x45, 0x01); // Bold ON
    const totalLabel = 'GRAND TOTAL:';
    const totalVal = `Rs.${Number(inv.grandTotal || 0).toLocaleString('en-IN')}`;
    const totSpaces = Math.max(1, cols - totalLabel.length - totalVal.length);
    line(totalLabel + ' '.repeat(totSpaces) + totalVal);
    bytes.push(ESC, 0x45, 0x00); // Bold OFF

    // Balance Due
    const dueLabel = 'CURRENT DUE:';
    const dueVal = `Rs.${Number(inv.balanceDue || 0).toLocaleString('en-IN')}`;
    const dueSpaces = Math.max(1, cols - dueLabel.length - dueVal.length);
    line(dueLabel + ' '.repeat(dueSpaces) + dueVal);

    line('='.repeat(cols));

    // Center alignment for footer
    bytes.push(ESC, 0x61, 0x01);
    line(settings.footerMessage);
    line('Goods once sold checked at dock. Thank you!');

    // Line feeds
    bytes.push(0x0a, 0x0a, 0x0a, 0x0a);

    // 5. Paper Cut: GS V 66 0 (Partial Cut with feed)
    if (settings.cutPaper) {
      bytes.push(GS, 0x56, 0x42, 0x00);
    }

    return new Uint8Array(bytes);
  },
};
