import {
  Printer,
  Text,
  Row,
  Line,
  Cut,
  Cashdraw,
  QRCode,
  Image,
  render,
} from 'react-thermal-printer';
import type { PrinterSettings } from './printerTypes';
import kbnLogo from '../../assets/kbn-logo.jpeg';

/**
 * Scales an image to target dot width on an offscreen canvas and converts to PNG data URL
 * so thermal rasterization is fast, crisp, and within printer head width (576/384 dots).
 */
function getScaledThermalLogo(src: string, targetWidth: number = 140): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(src);
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = targetWidth / img.width;
        const targetHeight = Math.round(img.height * scale);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        // Fill white background for clean B/W dot printing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

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

export const receiptRenderer = {
  /**
   * Builds and renders the ESC/POS receipt element using `react-thermal-printer`
   * matching the Koyambedu Mandi POS layout.
   */
  async renderInvoiceToEscPos(invoiceData: any, settings: PrinterSettings): Promise<Uint8Array> {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const is58mm = settings.paperSize === '58mm';
    const printerWidth = is58mm ? 32 : 48;

    // Monogram & Shop Details
    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName === 'SR FRUITS' || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const rawInitials = (settings.shopInitials || '').trim().toUpperCase();
    const initials = !rawInitials || rawInitials === 'SR' ? 'KBN' : rawInitials;
    const shouldPrintLogo = settings.printLogo !== false;
    const shouldPrintMonogram = shouldPrintLogo && Boolean(initials);

    let scaledLogoUrl = '';
    if (shouldPrintLogo) {
      try {
        scaledLogoUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
      } catch (err) {
        console.warn('Failed preparing logo for thermal print:', err);
      }
    }

    const addressLines = (settings.shopAddress || '')
      .split('\n')
      .map((l: string) => l.trim().toUpperCase())
      .filter(Boolean);

    // Bill Type
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

    // Totals & Quantities
    const subtotal = Number(inv.subtotal || grandTotal || 0);
    const previousDue = Number(inv.previousDueSnapshot || inv.previousDue || 0);
    const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;
    const totalQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

    // Payment rows
    let paymentRows: { label: string; amount: number }[] = [];
    if (Array.isArray(payments) && payments.length > 0) {
      paymentRows = payments.map((p: any) => {
        const mode = String(p.paymentMode || p.method || 'CASH').toUpperCase();
        const lbl = mode === 'GPAY' || mode === 'UPI' ? 'Gpay Received' : 'Cash Received';
        return { label: lbl, amount: Number(p.amount || 0) };
      });
    } else if (paidAmount > 0) {
      paymentRows = [{ label: 'Cash Received', amount: paidAmount }];
    } else {
      paymentRows = [{ label: 'Cash Received', amount: 0 }];
    }

    const receiptElement = (
      <Printer type="epson" width={printerWidth} initialize={true}>
        {/* 1. KBN Logo print if enabled, fallback to monogram */}
        {shouldPrintLogo && scaledLogoUrl ? (
          <Image align="center" src={scaledLogoUrl} />
        ) : shouldPrintMonogram ? (
          <Text align="center" bold={true} size={{ width: 2, height: 2 }}>
            {initials}
          </Text>
        ) : null}

        {/* 2. Shop Name centered bold */}
        <Text align="center" bold={true}>
          {shopName}
        </Text>

        {/* 3. Address lines centered */}
        {addressLines.map((line: string, idx: number) => (
          <Text key={`addr-${idx}`} align="center">
            {line}
          </Text>
        ))}

        {/* 4. Shop GST / Contact */}
        {settings.shopGst ? <Text align="center">{`GSTIN: ${settings.shopGst}`}</Text> : null}
        {settings.shopPhone ? <Text align="center">{`Ph: ${settings.shopPhone}`}</Text> : null}

        {/* 5. Bill Type right-aligned bold */}
        <Text align="right" bold={true}>
          {billType}
        </Text>

        {/* 6. Customer details */}
        <Text align="left" bold={true}>
          {customerName}
        </Text>
        {customerPhone ? <Text align="left">{customerPhone}</Text> : null}

        {/* 7. Divider */}
        <Line character="-" />

        {/* 8. Bill meta: 2-column Bill No & Date, Cashier & Time */}
        <Row left={`Bill No : ${invNumber}`} right={`Date : ${invDate}`} />
        <Row left={`Cashier : ${cashierName}`} right={`Time : ${invTime}`} />

        {/* 9. Table headers */}
        <Line character="-" />
        <Row
          left="Description"
          right={is58mm ? 'Qty  Rate   Amt' : 'Qty    Rate     Amount'}
        />
        <Line character="-" />

        {/* 10. Items list (FIFO lot removed as requested) */}
        {items.map((item: any, idx: number) => {
          const prodName = (
            item.productName ||
            item.product?.name ||
            'Produce'
          ).toUpperCase();
          const qty = Number(item.quantity || 0);
          const rate = Number(item.rate || 0).toFixed(2);
          const amount = Number(item.totalAmount || qty * Number(item.rate || 0)).toFixed(2);
          const rightCol = is58mm
            ? `${qty} ${rate} ${amount}`
            : `${qty.toString().padStart(3, ' ')}  ${rate.padStart(7, ' ')}  ${amount.padStart(9, ' ')}`;

          return <Row key={`item-${idx}`} left={prodName} right={rightCol} />;
        })}

        {/* 11. Divider */}
        <Line character="-" />

        {/* 12. Mandi Financial Summary */}
        <Row left="Gross Amount :" right={subtotal.toFixed(2)} />
        <Row left="Net Amount :" right={grandTotal.toFixed(2)} />

        {previousDue > 0 && <Row left="Opening Balance :" right={previousDue.toFixed(2)} />}
        {previousDue > 0 && <Row left="Total Amt :" right={totalPayable.toFixed(2)} />}

        {paymentRows.map((p, idx) => (
          <Row key={`pay-${idx}`} left={`${p.label} :`} right={p.amount.toFixed(2)} />
        ))}

        {/* Closing Balance bold */}
        <Row
          left={<Text bold={true}>Closing Balance :</Text>}
          right={<Text bold={true}>{balanceDue.toFixed(2)}</Text>}
        />

        {/* 13. Summary count & quantity */}
        <Line character="-" />
        <Row left={`No.Of.Items : ${items.length}`} right={`Total Qty : ${totalQty}`} />
        <Line character="-" />

        {/* 14. Optional UPI QR code */}
        {settings.printQrCode && (
          <QRCode
            content={`upi://pay?pa=8778219770@upi&pn=SR%20FRUITS&am=${balanceDue > 0 ? balanceDue : grandTotal}&cu=INR`}
            align="center"
          />
        )}

        {/* 15. Footer branding */}
        {settings.footerTerms && <Text align="center">{settings.footerTerms}</Text>}
        {settings.footerMessage && <Text align="center">{settings.footerMessage}</Text>}
        {settings.footerTagline && <Text align="center">{settings.footerTagline}</Text>}

        {/* 16. Optional cash drawer pulse */}
        {settings.openCashDrawer && rawSaleType === 'CASH' && <Cashdraw pin="2pin" />}

        {/* 17. Auto cut paper */}
        {settings.cutPaper && <Cut lineFeeds={4} partial={false} />}
      </Printer>
    );

    return await render(receiptElement);
  },

  /**
   * Builds and renders a Test Receipt to verify physical printer alignment & cutter.
   */
  async renderTestReceipt(settings: PrinterSettings): Promise<Uint8Array> {
    const is58mm = settings.paperSize === '58mm';
    const printerWidth = is58mm ? 32 : 48;
    const now = new Date();
    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName === 'SR FRUITS' || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const rawInitials = (settings.shopInitials || '').trim().toUpperCase();
    const initials = !rawInitials || rawInitials === 'SR' ? 'KBN' : rawInitials;

    let testLogoUrl = '';
    if (settings.printLogo !== false) {
      try {
        testLogoUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
      } catch {
        // fallback to text
      }
    }

    const testElement = (
      <Printer type="epson" width={printerWidth} initialize={true}>
        {testLogoUrl ? (
          <Image align="center" src={testLogoUrl} />
        ) : initials ? (
          <Text align="center" bold={true} size={{ width: 2, height: 2 }}>
            {initials}
          </Text>
        ) : null}
        <Text align="center" bold={true}>
          {shopName}
        </Text>
        <Text align="center">TVS RP-3200 HARDWARE TEST</Text>
        <Line character="=" />
        <Row
          left="Target Hardware:"
          right="TVS RP-3200"
        />
        <Row
          left="Width Mode:"
          right={is58mm ? '58mm (32 Col)' : '80mm (48 Col)'}
        />
        <Row left="Transport:" right={settings.transport} />
        <Row
          left="Serial Config:"
          right={`${settings.baudRate || 9600} ${settings.dataBits || 8}${settings.parity === 'even' ? 'E' : settings.parity === 'odd' ? 'O' : 'N'}${settings.stopBits || 1}`}
        />
        <Row left="Flow Control:" right={settings.flowControl || 'none'} />
        <Row
          left="Date / Time:"
          right={`${formatReceiptDate(now)} ${formatReceiptTime(now)}`}
        />
        <Line character="-" />
        <Row left="TVS TEST ITEM 1" right="1.00  100.00" />
        <Row left="TVS TEST ITEM 2" right="2.00  250.00" />
        <Line character="-" />
        <Row
          left={<Text bold={true}>TOTAL :</Text>}
          right={<Text bold={true}>600.00</Text>}
        />
        <Line character="=" />
        <Text align="center" bold={true}>
          PRINTER TEST SUCCESSFUL
        </Text>
        <Text align="center">TVS RP-3200 Web Serial ESC/POS</Text>
        {settings.cutPaper && <Cut lineFeeds={4} partial={false} />}
      </Printer>
    );

    return await render(testElement);
  },

  /**
   * Builds clean HTML formatted for 80mm / 58mm thermal receipts for standard browser printing.
   * Works on any USB thermal printer via Windows print spooler without special drivers.
   */
  renderInvoiceToHtml(invoiceData: any, settings: PrinterSettings): string {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const is58mm = settings.paperSize === '58mm';
    const paperWidthMm = is58mm ? '58mm' : '80mm';
    const contentWidthMm = is58mm ? '48mm' : '72mm';

    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName === 'SR FRUITS' || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const addressLines = (settings.shopAddress || '')
      .split('\n')
      .map((l: string) => l.trim().toUpperCase())
      .filter(Boolean);

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
    }

    const customerName = (
      inv.customerName ||
      (inv.customer ? inv.customer.name : 'Walk-in Customer')
    ).toUpperCase();
    const customerPhone = inv.customerPhone || (inv.customer ? inv.customer.phone : '');
    const invNumber = inv.invoiceNumber || '1453';
    const cashierName =
      inv.createdBy?.name ||
      inv.createdBy?.username ||
      inv.creator?.name ||
      inv.cashier ||
      'admin';
    const invDate = formatReceiptDate(inv.invoiceDate || inv.createdAt);
    const invTime = formatReceiptTime(inv.createdAt || inv.invoiceDate);

    const subtotal = Number(inv.subtotal || grandTotal || 0);
    const previousDue = Number(inv.previousDueSnapshot || inv.previousDue || 0);
    const totalPayable = previousDue > 0 ? previousDue + grandTotal : grandTotal;
    const totalQty = items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

    let paymentRows: { label: string; amount: number }[] = [];
    if (Array.isArray(payments) && payments.length > 0) {
      paymentRows = payments.map((p: any) => {
        const mode = String(p.paymentMode || p.method || 'CASH').toUpperCase();
        const lbl = mode === 'GPAY' || mode === 'UPI' ? 'Gpay Received' : 'Cash Received';
        return { label: lbl, amount: Number(p.amount || 0) };
      });
    } else if (paidAmount > 0) {
      paymentRows = [{ label: 'Cash Received', amount: paidAmount }];
    } else {
      paymentRows = [{ label: 'Cash Received', amount: 0 }];
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${invNumber}</title>
  <style>
    @page { size: ${paperWidthMm} auto; margin: 0; }
    @media print {
      html, body { width: ${contentWidthMm}; margin: 0 auto; padding: 0; }
    }
    body {
      width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      padding: 4px 0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .dashed-line { border-top: 1px dashed #000; margin: 4px 0; }
    .double-line { border-top: 2px double #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 1.5px 0; vertical-align: top; }
  </style>
</head>
<body>
  <div class="text-center bold" style="font-size: 14px;">${shopName}</div>
  ${addressLines.map((l: string) => `<div class="text-center">${l}</div>`).join('')}
  ${settings.shopPhone ? `<div class="text-center">Ph: ${settings.shopPhone}</div>` : ''}
  ${settings.shopGst ? `<div class="text-center">GSTIN: ${settings.shopGst}</div>` : ''}
  <div class="text-right bold" style="margin-top: 4px;">${billType}</div>
  <div class="bold">${customerName}</div>
  ${customerPhone ? `<div>${customerPhone}</div>` : ''}
  <div class="dashed-line"></div>
  <div class="row"><span>Bill No : ${invNumber}</span><span>Date : ${invDate}</span></div>
  <div class="row"><span>Cashier : ${cashierName}</span><span>Time : ${invTime}</span></div>
  <div class="dashed-line"></div>
  <table>
    <thead>
      <tr>
        <th align="left">Description</th>
        <th align="right">Qty</th>
        <th align="right">Rate</th>
        <th align="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((it: any) => {
          const pName = (it.productName || it.product?.name || 'Produce').toUpperCase();
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0).toFixed(2);
          const amt = Number(it.totalAmount || qty * Number(it.rate || 0)).toFixed(2);
          return `<tr><td>${pName}</td><td align="right">${qty}</td><td align="right">${rate}</td><td align="right">${amt}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>
  <div class="dashed-line"></div>
  <div class="row"><span>Gross Amount :</span><span>${subtotal.toFixed(2)}</span></div>
  <div class="row"><span>Net Amount :</span><span>${grandTotal.toFixed(2)}</span></div>
  ${previousDue > 0 ? `<div class="row"><span>Opening Balance :</span><span>${previousDue.toFixed(2)}</span></div>` : ''}
  ${previousDue > 0 ? `<div class="row"><span>Total Amt :</span><span>${totalPayable.toFixed(2)}</span></div>` : ''}
  ${paymentRows.map((p) => `<div class="row"><span>${p.label} :</span><span>${p.amount.toFixed(2)}</span></div>`).join('')}
  <div class="row bold"><span>Closing Balance :</span><span>${balanceDue.toFixed(2)}</span></div>
  <div class="dashed-line"></div>
  <div class="row"><span>No.Of.Items : ${items.length}</span><span>Total Qty : ${totalQty}</span></div>
  <div class="dashed-line"></div>
  <div class="text-center" style="margin-top: 6px;">*** THANK YOU VISIT AGAIN ***</div>
  ${settings.footerTerms ? `<div class="text-center">${settings.footerTerms}</div>` : ''}
  ${settings.footerTagline ? `<div class="text-center">${settings.footerTagline}</div>` : ''}
  <div class="text-center" style="font-size: 9px; margin-top: 4px; color: #444;">TVS RP-3200 · Direct ESC/POS</div>
</body>
</html>`;
  },

  /**
   * Builds clean HTML for test print receipt.
   */
  renderTestToHtml(settings: PrinterSettings): string {
    const is58mm = settings.paperSize === '58mm';
    const paperWidthMm = is58mm ? '58mm' : '80mm';
    const contentWidthMm = is58mm ? '48mm' : '72mm';
    const now = new Date();
    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName === 'SR FRUITS' || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TVS RP-3200 Test Print</title>
  <style>
    @page { size: ${paperWidthMm} auto; margin: 0; }
    @media print {
      html, body { width: ${contentWidthMm}; margin: 0 auto; padding: 0; }
    }
    body {
      width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      padding: 6px 0;
    }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .dashed-line { border-top: 1px dashed #000; margin: 4px 0; }
    .double-line { border-top: 2px double #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="text-center bold" style="font-size: 14px;">${shopName}</div>
  <div class="text-center">TVS RP-3200 HARDWARE TEST</div>
  <div class="double-line"></div>
  <div class="row"><span>Target Hardware:</span><span>TVS RP-3200</span></div>
  <div class="row"><span>Width Mode:</span><span>${is58mm ? '58mm' : '80mm'}</span></div>
  <div class="row"><span>Transport:</span><span>System / Browser Print</span></div>
  <div class="row"><span>Date / Time:</span><span>${formatReceiptDate(now)} ${formatReceiptTime(now)}</span></div>
  <div class="dashed-line"></div>
  <div class="row"><span>TVS TEST ITEM 1</span><span>1.00  100.00</span></div>
  <div class="row"><span>TVS TEST ITEM 2</span><span>2.00  250.00</span></div>
  <div class="dashed-line"></div>
  <div class="row bold"><span>TOTAL :</span><span>600.00</span></div>
  <div class="double-line"></div>
  <div class="text-center bold" style="margin-top: 6px;">PRINTER TEST SUCCESSFUL</div>
  <div class="text-center" style="font-size: 9px; color: #555;">TVS RP-3200 · Browser Print Engine</div>
</body>
</html>`;
  },

  /**
   * Prints HTML formatted thermal receipt silently via an invisible iframe.
   */
  printHtml(htmlContent: string): Promise<boolean> {
    return new Promise((resolve) => {
      let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'thermal-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.top = '-10000px';
        iframe.style.left = '-10000px';
        iframe.style.width = '80mm';
        iframe.style.height = '100mm';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        window.print();
        return resolve(true);
      }

      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        resolve(true);
      }, 250);
    });
  },
};
