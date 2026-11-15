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
   * Matches the exact thermal receipt bill layout and visual styling seen on-screen.
   */
  async renderInvoiceToHtml(invoiceData: any, settings: PrinterSettings): Promise<string> {
    const inv = invoiceData.invoice || invoiceData;
    const items = inv.items || [];
    const payments = inv.payments || [];
    const is58mm = settings.paperSize === '58mm';
    const paperWidthMm = is58mm ? '58mm' : '80mm';
    const contentWidthMm = is58mm ? '48mm' : '72mm';

    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName.includes('SR FRUITS') || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const rawInitials = (settings.shopInitials || '').trim().toUpperCase();
    const initials = !rawInitials || rawInitials === 'SR' ? 'KBN' : rawInitials;

    const addressLines = (
      settings.shopAddress ||
      'T/A-18,T/E-25,ANNA FRUITS MARKET\nKOYAMBEDU, CHENNAI-600092'
    )
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
      'Admin';
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
        const lbl = mode === 'GPAY' || mode === 'UPI' ? 'Gpay Received' : `${p.paymentMode || 'Payment'} Paid`;
        return { label: lbl, amount: Number(p.amount || 0) };
      });
    } else if (paidAmount > 0) {
      paymentRows = [{ label: 'Paid Amount', amount: paidAmount }];
    }

    let logoHtml = '';
    if (settings.printLogo !== false) {
      try {
        const logoDataUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
        if (logoDataUrl) {
          logoHtml = `<div class="logo-container"><img src="${logoDataUrl}" class="logo-img" alt="${shopName}" /></div>`;
        }
      } catch {
        logoHtml = '';
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${invNumber}</title>
  <style>
    @page {
      size: ${paperWidthMm} 297mm;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${contentWidthMm} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        padding: 4px 2px 20px 2px !important;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      padding: 4px 2px 20px 2px;
    }
    .receipt-container {
      width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 3px;
    }
    .logo-img {
      width: 58px;
      height: 58px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .monogram {
      text-align: center;
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 2px;
      margin-bottom: 2px;
      color: #222;
    }
    .shop-title {
      font-size: 13.5px;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .shop-info {
      font-size: 10px;
      text-align: center;
      line-height: 1.25;
      margin-top: 2px;
      color: #333;
    }
    .dashed-divider {
      border-top: 1px dashed #444;
      margin: 5px 0;
    }
    .bill-type {
      text-align: center;
      font-weight: bold;
      font-size: 11.5px;
      letter-spacing: 1px;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 10.5px;
      padding: 0.5px 0;
    }
    .truncate {
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      border-bottom: 1px dashed #444;
      padding-bottom: 2px;
      margin-bottom: 2px;
    }
    .col-desc { flex: 1; text-align: left; }
    .col-qty { width: 32px; text-align: right; }
    .col-rate { width: 50px; text-align: right; }
    .col-amt { width: 62px; text-align: right; }
    .item-block {
      padding: 2.5px 0;
      border-bottom: 1px dashed #eee;
    }
    .item-block:last-child {
      border-bottom: none;
    }
    .item-name {
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .item-subrow {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #333;
      margin-top: 1px;
    }
    .item-unit {
      color: #666;
      font-size: 9.5px;
    }
    .financial-totals {
      font-size: 11px;
    }
    .financial-totals .flex-row {
      padding: 1px 0;
    }
    .text-rose { color: #b91c1c; }
    .text-green { color: #047857; }
    .closing-balance {
      border-top: 1px dashed #444;
      padding-top: 3px;
      margin-top: 2px;
      font-weight: 800;
      font-size: 12px;
    }
    .footer-block {
      text-align: center;
      font-size: 10px;
      color: #444;
      margin-top: 4px;
      line-height: 1.35;
    }
    .footer-brand {
      font-size: 9px;
      color: #666;
      margin-top: 4px;
    }
    .tear-border {
      border-bottom: 2px dashed #888;
      margin-top: 8px;
    }
  </style>
</head>
<body data-paper="${paperWidthMm}">
  <div class="receipt-container">
    ${logoHtml}
    ${initials ? `<div class="monogram">[${initials}]</div>` : ''}
    <div class="shop-title">${shopName}</div>
    <div class="shop-info">
      ${addressLines.join('<br>')}
      <div>Phone: ${settings.shopPhone || '8778219770'}${settings.shopGst ? ` · GSTIN: ${settings.shopGst}` : ''}</div>
    </div>

    <div class="dashed-divider"></div>
    <div class="bill-type">*** ${billType} ***</div>
    <div class="dashed-divider"></div>

    <div class="customer-section">
      <div class="flex-row">
        <span style="color: #555;">Customer:</span>
        <span class="bold truncate">${customerName}</span>
      </div>
      ${customerPhone ? `
      <div class="flex-row">
        <span style="color: #555;">Mobile:</span>
        <span>${customerPhone}</span>
      </div>` : ''}
    </div>

    <div class="dashed-divider"></div>

    <div class="metadata-section">
      <div class="flex-row">
        <span>Bill No: <strong class="bold">${invNumber}</strong></span>
        <span>Date: ${invDate}</span>
      </div>
      <div class="flex-row">
        <span>Cashier: ${cashierName}</span>
        <span>Time: ${invTime}</span>
      </div>
    </div>

    <div class="dashed-divider"></div>

    <div class="items-header">
      <span class="col-desc">Description</span>
      <span class="col-qty">Qty</span>
      <span class="col-rate">Rate</span>
      <span class="col-amt">Amount</span>
    </div>

    <div class="items-list">
      ${items.map((it: any) => {
        const pName = (it.productName || it.product?.name || 'Produce').toUpperCase();
        const variety = (it.variety || it.unit || 'BOX').toUpperCase();
        const qty = Number(it.quantity || 0);
        const rate = Number(it.rate || 0).toFixed(2);
        const amt = Number(it.totalAmount || qty * Number(it.rate || 0)).toFixed(2);
        return `
        <div class="item-block">
          <div class="item-name">${pName}</div>
          <div class="item-subrow">
            <span class="item-unit">${variety}</span>
            <span class="col-qty">${qty}</span>
            <span class="col-rate">${rate}</span>
            <span class="col-amt bold">${amt}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="dashed-divider"></div>

    <div class="financial-totals">
      <div class="flex-row">
        <span>Gross Amount :</span>
        <span>₹${subtotal.toFixed(2)}</span>
      </div>
      <div class="flex-row bold">
        <span>Net Amount :</span>
        <span>₹${grandTotal.toFixed(2)}</span>
      </div>
      ${previousDue > 0 ? `
      <div class="flex-row text-rose">
        <span>Opening Balance :</span>
        <span>+ ₹${previousDue.toFixed(2)}</span>
      </div>
      <div class="flex-row bold">
        <span>Total Amt :</span>
        <span>₹${totalPayable.toFixed(2)}</span>
      </div>
      ` : ''}
      ${paymentRows.map((p) => `
      <div class="flex-row text-green">
        <span>${p.label} :</span>
        <span>- ₹${p.amount.toFixed(2)}</span>
      </div>
      `).join('')}
      <div class="flex-row closing-balance">
        <span>Closing Balance :</span>
        <span>₹${balanceDue.toFixed(2)}</span>
      </div>
    </div>

    <div class="dashed-divider"></div>

    <div class="flex-row" style="color: #444;">
      <span>No.Of.Items : <strong>${items.length}</strong></span>
      <span>Total Qty : <strong>${totalQty}</strong></span>
    </div>

    <div class="dashed-divider"></div>

    <div class="footer-block">
      <div class="bold">*** THANK YOU VISIT AGAIN ***</div>
      <div>${settings.footerTerms || 'Goods once sold cannot be taken back'}</div>
      ${settings.footerTagline ? `<div>${settings.footerTagline}</div>` : ''}
      <div class="footer-brand">TVS RP-3200 · Direct ESC/POS</div>
    </div>

    <div class="tear-border"></div>
  </div>
</body>
</html>`;
  },

  /**
   * Builds clean HTML for test print receipt.
   */
  async renderTestToHtml(settings: PrinterSettings): Promise<string> {
    const is58mm = settings.paperSize === '58mm';
    const paperWidthMm = is58mm ? '58mm' : '80mm';
    const contentWidthMm = is58mm ? '48mm' : '72mm';
    const now = new Date();
    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName.includes('SR FRUITS') || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const rawInitials = (settings.shopInitials || '').trim().toUpperCase();
    const initials = !rawInitials || rawInitials === 'SR' ? 'KBN' : rawInitials;

    let logoHtml = '';
    if (settings.printLogo !== false) {
      try {
        const logoDataUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
        if (logoDataUrl) {
          logoHtml = `<div class="logo-container"><img src="${logoDataUrl}" class="logo-img" alt="${shopName}" /></div>`;
        }
      } catch {
        logoHtml = '';
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TVS RP-3200 Test Print</title>
  <style>
    @page {
      size: ${paperWidthMm} 200mm;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${contentWidthMm} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        padding: 4px 2px 20px 2px !important;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      padding: 6px 2px 20px 2px;
    }
    .receipt-container { width: 100%; margin: 0 auto; }
    .text-center { text-align: center; }
    .bold { font-weight: bold; }
    .logo-container { display: flex; justify-content: center; margin-bottom: 3px; }
    .logo-img { width: 54px; height: 54px; object-fit: contain; display: block; margin: 0 auto; }
    .monogram { text-align: center; font-weight: 900; font-size: 11px; letter-spacing: 2px; margin-bottom: 2px; color: #222; }
    .dashed-divider { border-top: 1px dashed #444; margin: 5px 0; }
    .double-divider { border-top: 2px double #000; margin: 5px 0; }
    .flex-row { display: flex; justify-content: space-between; font-size: 10.5px; padding: 1px 0; }
  </style>
</head>
<body data-paper="${paperWidthMm}">
  <div class="receipt-container">
    ${logoHtml}
    ${initials ? `<div class="monogram">[${initials}]</div>` : ''}
    <div class="text-center bold" style="font-size: 13.5px;">${shopName}</div>
    <div class="text-center" style="font-size: 11px; font-weight: bold; margin-top: 2px;">TVS RP-3200 HARDWARE TEST</div>
    <div class="double-divider"></div>
    <div class="flex-row"><span>Target Hardware:</span><span>TVS RP-3200</span></div>
    <div class="flex-row"><span>Width Mode:</span><span>${paperWidthMm}</span></div>
    <div class="flex-row"><span>Transport:</span><span>System / Browser Print</span></div>
    <div class="flex-row"><span>Date / Time:</span><span>${formatReceiptDate(now)} ${formatReceiptTime(now)}</span></div>
    <div class="dashed-divider"></div>
    <div class="flex-row"><span>TVS TEST ITEM 1</span><span>1.00  100.00</span></div>
    <div class="flex-row"><span>TVS TEST ITEM 2</span><span>2.00  250.00</span></div>
    <div class="dashed-divider"></div>
    <div class="flex-row bold"><span>TOTAL :</span><span>600.00</span></div>
    <div class="double-divider"></div>
    <div class="text-center bold" style="margin-top: 6px;">PRINTER TEST SUCCESSFUL</div>
    <div class="text-center" style="font-size: 9px; color: #555; margin-top: 3px;">TVS RP-3200 · Browser Print Engine</div>
  </div>
</body>
</html>`;
  },

  /**
   * Prints HTML formatted thermal receipt silently via an invisible iframe,
   * dynamically calculating exact receipt height so browser preview matches thermal roll size.
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
        iframe.style.height = '1200px';
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
          const win = iframe.contentWindow;
          if (win && win.document) {
            const body = win.document.body;
            const scrollHeight = body.scrollHeight || 500;
            const contentHeightMm = Math.max(100, Math.ceil((scrollHeight * 25.4) / 96) + 12);

            const is58mm = body.getAttribute('data-paper') === '58mm';
            const widthMm = is58mm ? '58mm' : '80mm';

            const styleEl = win.document.createElement('style');
            styleEl.id = 'dynamic-page-size';
            styleEl.innerHTML = `@page { size: ${widthMm} ${contentHeightMm}mm !important; margin: 0mm !important; }`;
            win.document.head.appendChild(styleEl);

            win.focus();
            win.print();
          } else {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          }
        } catch {
          window.print();
        }
        resolve(true);
      }, 350);
    });
  },
};
