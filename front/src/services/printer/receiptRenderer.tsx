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
 * Scales an image to target dot width on an offscreen canvas, applies a pure 1-bit high-contrast
 * monochrome threshold filter so thermal printheads burn crisp solid black dots, and returns a PNG data URL.
 */
function getScaledThermalLogo(src: string, targetWidth: number = 140): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(src);
    }
    const img = new window.Image();
    // Only set crossOrigin if loading from external origin to prevent CORS canvas tainting
    if (src.startsWith('http') && !src.includes(window.location.host)) {
      img.crossOrigin = 'anonymous';
    }
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

        // Apply pure 1-bit monochrome thresholding for thermal printers
        try {
          const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const a = d[i + 3];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            // High contrast threshold: dark pixels become pure black (0), light pixels become pure white (255)
            const val = a < 128 || lum > 175 ? 255 : 0;
            d[i] = val;
            d[i + 1] = val;
            d[i + 2] = val;
            d[i + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // If tainted or security blocks, proceed with raw canvas
        }

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

    const lineDivider = is58mm ? '--------------------------------' : '------------------------------------------------';

    let logoHtml = '';
    if (settings.printLogo !== false) {
      try {
        const logoDataUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
        if (logoDataUrl) {
          logoHtml = `<div style="text-align: center; margin-bottom: 4px;">
            <img src="${logoDataUrl}" width="64" height="64" style="display: block; margin: 0 auto; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact;" alt="${shopName}" />
          </div>`;
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
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        padding: 2px 0 16px 0 !important;
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
    .shop-title {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .shop-info {
      font-size: 10px;
      text-align: center;
      line-height: 1.25;
      margin-top: 2px;
      color: #000;
    }
    .char-divider {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: -0.5px;
      text-align: center;
      margin: 3px 0;
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
      color: #000000 !important;
    }
    .bill-type {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      letter-spacing: 1px;
    }
    table.table-layout {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10.5px;
    }
    table.table-layout td, table.table-layout th {
      padding: 1px 0;
      vertical-align: top;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10.5px;
    }
    table.data-table th {
      border-bottom: 1.5px dashed #000000;
      padding-bottom: 2px;
      font-weight: bold;
      font-size: 10.5px;
    }
    table.data-table td {
      padding: 1.5px 0;
    }
    .footer-block {
      text-align: center;
      font-size: 10px;
      color: #000;
      margin-top: 5px;
      line-height: 1.35;
    }
    .footer-brand {
      font-size: 9px;
      color: #555;
      margin-top: 4px;
    }
  </style>
</head>
<body data-paper="${paperWidthMm}">
  <div class="receipt-container">
    ${logoHtml}
    ${initials ? `<div class="text-center bold" style="font-size: 12px; letter-spacing: 2px; margin-bottom: 2px;">[${initials}]</div>` : ''}
    <div class="shop-title">${shopName}</div>
    <div class="shop-info">
      ${addressLines.join('<br>')}
      <div>Phone: ${settings.shopPhone || '8778219770'}${settings.shopGst ? ` · GSTIN: ${settings.shopGst}` : ''}</div>
    </div>

    <div class="char-divider">${lineDivider}</div>
    <div class="bill-type">*** ${billType} ***</div>
    <div class="char-divider">${lineDivider}</div>

    <table class="table-layout">
      <tr>
        <td align="left" style="width: 55%;">Customer: <b>${customerName}</b></td>
        <td align="right" style="width: 45%;">${customerPhone ? `Mobile: ${customerPhone}` : ''}</td>
      </tr>
      <tr>
        <td align="left">Bill No: <b>${invNumber}</b></td>
        <td align="right">Date: ${invDate}</td>
      </tr>
      <tr>
        <td align="left">Cashier: ${cashierName}</td>
        <td align="right">Time: ${invTime}</td>
      </tr>
    </table>

    <div class="char-divider">${lineDivider}</div>

    <table class="data-table">
      <thead>
        <tr>
          <th align="left" style="width: 44%;">DESCRIPTION</th>
          <th align="right" style="width: 16%;">QTY</th>
          <th align="right" style="width: 20%;">RATE</th>
          <th align="right" style="width: 20%;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it: any) => {
          const pName = (it.productName || it.product?.name || 'Produce').toUpperCase();
          const variety = (it.variety || it.unit || 'BOX').toUpperCase();
          const qty = Number(it.quantity || 0);
          const rate = Number(it.rate || 0).toFixed(2);
          const amt = Number(it.totalAmount || qty * Number(it.rate || 0)).toFixed(2);
          return `
          <tr>
            <td colspan="4" class="bold" style="padding-top: 3px; font-size: 11px;">${pName}</td>
          </tr>
          <tr>
            <td style="color: #444; font-size: 9.5px; padding-left: 2px;">${variety}</td>
            <td align="right">${qty}</td>
            <td align="right">${rate}</td>
            <td align="right" class="bold">${amt}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="char-divider">${lineDivider}</div>

    <table class="table-layout">
      <tr>
        <td align="left" style="width: 60%;">Gross Amount :</td>
        <td align="right" style="width: 40%;">Rs.${subtotal.toFixed(2)}</td>
      </tr>
      <tr class="bold">
        <td align="left">Net Amount :</td>
        <td align="right">Rs.${grandTotal.toFixed(2)}</td>
      </tr>
      ${previousDue > 0 ? `
      <tr style="color: #b91c1c;">
        <td align="left">Opening Balance :</td>
        <td align="right">+ Rs.${previousDue.toFixed(2)}</td>
      </tr>
      <tr class="bold">
        <td align="left">Total Amt :</td>
        <td align="right">Rs.${totalPayable.toFixed(2)}</td>
      </tr>
      ` : ''}
      ${paymentRows.map((p) => `
      <tr style="color: #047857;">
        <td align="left">${p.label} :</td>
        <td align="right">- Rs.${p.amount.toFixed(2)}</td>
      </tr>
      `).join('')}
      <tr class="bold" style="font-size: 12px; border-top: 1.5px dashed #000000;">
        <td align="left" style="padding-top: 3px;">Closing Balance :</td>
        <td align="right" style="padding-top: 3px;">Rs.${balanceDue.toFixed(2)}</td>
      </tr>
    </table>

    <div class="char-divider">${lineDivider}</div>

    <table class="table-layout" style="font-size: 10px; color: #333;">
      <tr>
        <td align="left" style="width: 50%;">No.Of.Items : <b>${items.length}</b></td>
        <td align="right" style="width: 50%;">Total Qty : <b>${totalQty}</b></td>
      </tr>
    </table>

    <div class="char-divider">${lineDivider}</div>

    <div class="footer-block">
      <div class="bold">*** THANK YOU VISIT AGAIN ***</div>
      <div>${settings.footerTerms || 'Goods once sold cannot be taken back'}</div>
      ${settings.footerTagline ? `<div>${settings.footerTagline}</div>` : ''}
      <div class="footer-brand">TVS RP-3200 · Direct ESC/POS</div>
    </div>

    <div class="char-divider">${lineDivider}</div>
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

    const lineDivider = is58mm ? '--------------------------------' : '------------------------------------------------';
    const doubleDivider = is58mm ? '================================' : '================================================';

    let logoHtml = '';
    if (settings.printLogo !== false) {
      try {
        const logoDataUrl = await getScaledThermalLogo(kbnLogo, is58mm ? 120 : 160);
        if (logoDataUrl) {
          logoHtml = `<div style="text-align: center; margin-bottom: 4px;">
            <img src="${logoDataUrl}" width="64" height="64" style="display: block; margin: 0 auto; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact;" alt="${shopName}" />
          </div>`;
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
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        padding: 2px 0 16px 0 !important;
      }
    }
    * { box-sizing: border-box; }
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
    .char-divider {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: -0.5px;
      text-align: center;
      margin: 3px 0;
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
      color: #000000 !important;
    }
    table.table-layout { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    table.table-layout td { padding: 1.5px 0; }
  </style>
</head>
<body data-paper="${paperWidthMm}">
  <div class="receipt-container">
    ${logoHtml}
    ${initials ? `<div class="text-center bold" style="font-size: 12px; letter-spacing: 2px; margin-bottom: 2px;">[${initials}]</div>` : ''}
    <div class="text-center bold" style="font-size: 14px; text-transform: uppercase;">${shopName}</div>
    <div class="text-center bold" style="font-size: 11px; margin-top: 2px;">TVS RP-3200 HARDWARE TEST</div>
    <div class="char-divider">${doubleDivider}</div>
    <table class="table-layout">
      <tr><td>Target Hardware:</td><td align="right">TVS RP-3200</td></tr>
      <tr><td>Width Mode:</td><td align="right">${paperWidthMm}</td></tr>
      <tr><td>Transport:</td><td align="right">System / Browser Print</td></tr>
      <tr><td>Date / Time:</td><td align="right">${formatReceiptDate(now)} ${formatReceiptTime(now)}</td></tr>
    </table>
    <div class="char-divider">${lineDivider}</div>
    <table class="table-layout">
      <tr><td>TVS TEST ITEM 1</td><td align="right">1.00  100.00</td></tr>
      <tr><td>TVS TEST ITEM 2</td><td align="right">2.00  250.00</td></tr>
    </table>
    <div class="char-divider">${lineDivider}</div>
    <table class="table-layout">
      <tr class="bold">
        <td>TOTAL :</td>
        <td align="right">600.00</td>
      </tr>
    </table>
    <div class="char-divider">${doubleDivider}</div>
    <div class="text-center bold" style="margin-top: 6px;">PRINTER TEST SUCCESSFUL</div>
    <div class="text-center" style="font-size: 9px; color: #555; margin-top: 3px;">TVS RP-3200 · Browser Print Engine</div>
    <div class="char-divider">${lineDivider}</div>
  </div>
</body>
</html>`;
  },

  /**
   * Prints HTML formatted thermal receipt silently via an invisible iframe,
   * waiting for images to complete and dynamically calculating exact receipt height.
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

      const triggerPrint = () => {
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
      };

      const win = iframe.contentWindow;
      if (win && win.document) {
        const imgs = Array.from(win.document.images || []);
        if (imgs.length > 0) {
          let loadedCount = 0;
          let done = false;
          const onImgDone = () => {
            loadedCount++;
            if (!done && loadedCount >= imgs.length) {
              done = true;
              setTimeout(triggerPrint, 150);
            }
          };
          imgs.forEach((img) => {
            if (img.complete) {
              onImgDone();
            } else {
              img.onload = onImgDone;
              img.onerror = onImgDone;
            }
          });
          // Fallback timer in case image load event hangs
          setTimeout(() => {
            if (!done) {
              done = true;
              triggerPrint();
            }
          }, 600);
          return;
        }
      }

      setTimeout(triggerPrint, 300);
    });
  },
};
