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
function getScaledThermalLogo(src: string, targetWidth: number = 150): Promise<string> {
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
        const scale = targetWidth / (img.width || 1);
        const targetHeight = Math.round((img.height || 1) * scale);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        // Fill solid white background for clean B/W dot printing
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
            // High contrast threshold: dark pixels become pure black (0), light background becomes pure white (255)
            const val = a < 128 || lum > 195 ? 255 : 0;
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

// Monospace ASCII formatting helpers for thermal printers
function toAscii(str: string): string {
  if (!str) return '';
  return str
    .replace(/₹/g, 'Rs.')
    .replace(/·/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\n\r]/g, '');
}

function padRight(str: string, width: number): string {
  const s = toAscii(String(str || ''));
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

function padLeft(str: string, width: number): string {
  const s = toAscii(String(str || ''));
  if (s.length >= width) return s.slice(0, width);
  return ' '.repeat(width - s.length) + s;
}

function padCenter(str: string, width: number): string {
  const s = toAscii(String(str || '')).trim();
  if (s.length >= width) return s.slice(0, width);
  const left = Math.floor((width - s.length) / 2);
  const right = width - s.length - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

function formatTwoCol(left: string, right: string, width: number): string[] {
  const l = toAscii(String(left || '')).trim();
  const r = toAscii(String(right || '')).trim();
  if (!l && !r) return [];
  if (!r) return [l];
  if (!l) return [padLeft(r, width)];
  if (l.length + r.length + 1 <= width) {
    const spaces = width - l.length - r.length;
    return [l + ' '.repeat(spaces) + r];
  }
  return [l, padLeft(r, width)];
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

        {/* 17. Auto cut paper with generous 7-line feed to clear printhead to cutter */}
        {settings.cutPaper && <Cut lineFeeds={7} partial={false} />}
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
        {settings.cutPaper && <Cut lineFeeds={7} partial={false} />}
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

    const width = is58mm ? 32 : 48;
    const lineDivider = '-'.repeat(width);
    const doubleDivider = '='.repeat(width);
    const logoWidth = is58mm ? 120 : 150;

    let processedLogoSrc = '';
    if (settings.printLogo !== false) {
      try {
        const rawLogoSrc = settings.logoUrl || kbnLogo;
        processedLogoSrc = await getScaledThermalLogo(rawLogoSrc, is58mm ? 120 : 150);
      } catch (err) {
        console.warn('Failed preparing logo for HTML print:', err);
      }
    }

    let logoHtml = '';
    if (processedLogoSrc) {
      logoHtml = `<div style="text-align: center; margin: 0 auto 6px auto; padding: 0;">
        <img src="${processedLogoSrc}" width="${logoWidth}" height="${logoWidth}" class="thermal-logo" alt="${shopName}" style="display: block; margin: 0 auto; width: ${logoWidth}px; max-width: ${logoWidth}px; height: auto; object-fit: contain; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;" />
      </div>`;
    }

    // Header block
    const headerLines: string[] = [];
    if (initials) {
      headerLines.push(`<b>${padCenter(initials, width)}</b>`);
    }
    headerLines.push(`<b>${padCenter(shopName, width)}</b>`);
    for (const addr of addressLines) {
      headerLines.push(padCenter(addr, width));
    }
    const phoneStr = `Phone: ${settings.shopPhone || '8778219770'}${settings.shopGst ? ` | GSTIN: ${settings.shopGst}` : ''}`;
    headerLines.push(padCenter(phoneStr, width));

    headerLines.push(doubleDivider);
    headerLines.push(`<b>${padCenter('*** ' + billType + ' ***', width)}</b>`);
    headerLines.push(doubleDivider);

    // Metadata lines
    const metaLines: string[] = [];
    metaLines.push(...formatTwoCol(`Customer: ${customerName}`, customerPhone ? `Mobile: ${customerPhone}` : '', width));
    metaLines.push(...formatTwoCol(`Bill No: ${invNumber}`, `Date: ${invDate}`, width));
    metaLines.push(...formatTwoCol(`Cashier: ${cashierName}`, `Time: ${invTime}`, width));

    // Items table
    const colDescWidth = is58mm ? 13 : 20;
    const colQtyWidth = is58mm ? 4 : 6;
    const colRateWidth = is58mm ? 7 : 10;
    const colAmtWidth = is58mm ? 8 : 12;

    const itemHeaderStr =
      padRight('DESCRIPTION', colDescWidth) +
      padLeft('QTY', colQtyWidth) +
      padLeft('RATE', colRateWidth) +
      padLeft('AMOUNT', colAmtWidth);

    const itemLines: string[] = [];
    itemLines.push(`<b>${itemHeaderStr}</b>`);
    itemLines.push(lineDivider);

    for (const it of items) {
      const pName = toAscii(String(it.productName || it.product?.name || 'Produce')).toUpperCase();
      const variety = toAscii(String(it.variety || it.unit || 'BOX')).toUpperCase();
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0).toFixed(2);
      const amt = Number(it.totalAmount || qty * Number(it.rate || 0)).toFixed(2);

      itemLines.push(`<b>${padRight(pName, width)}</b>`);
      const rowDetails =
        padRight((is58mm ? ' ' : '  ') + variety, colDescWidth) +
        padLeft(String(qty), colQtyWidth) +
        padLeft(rate, colRateWidth) +
        padLeft(amt, colAmtWidth);
      itemLines.push(rowDetails);
    }

    itemLines.push(lineDivider);

    // Summary lines
    const sumLblWidth = is58mm ? 20 : 34;
    const sumValWidth = is58mm ? 12 : 14;

    const summaryLines: string[] = [];
    summaryLines.push(padRight('Gross Amount :', sumLblWidth) + padLeft('Rs.' + subtotal.toFixed(2), sumValWidth));
    summaryLines.push(`<b>${padRight('Net Amount :', sumLblWidth) + padLeft('Rs.' + grandTotal.toFixed(2), sumValWidth)}</b>`);

    if (previousDue > 0) {
      summaryLines.push(padRight('Opening Balance :', sumLblWidth) + padLeft('+ Rs.' + previousDue.toFixed(2), sumValWidth));
      summaryLines.push(`<b>${padRight('Total Amt :', sumLblWidth) + padLeft('Rs.' + totalPayable.toFixed(2), sumValWidth)}</b>`);
    }

    for (const p of paymentRows) {
      summaryLines.push(padRight(p.label + ' :', sumLblWidth) + padLeft('- Rs.' + p.amount.toFixed(2), sumValWidth));
    }

    summaryLines.push(doubleDivider);
    summaryLines.push(`<b>${padRight('Closing Balance :', sumLblWidth) + padLeft('Rs.' + balanceDue.toFixed(2), sumValWidth)}</b>`);
    summaryLines.push(doubleDivider);

    // Item count & Total quantity
    const countLines: string[] = formatTwoCol(`No.Of.Items : ${items.length}`, `Total Qty : ${totalQty}`, width);

    // Footer lines
    const safeTagline =
      settings.footerTagline &&
      !settings.footerTagline.includes('Websyncz') &&
      !settings.footerTagline.includes('www.') &&
      !settings.footerTagline.includes('http')
        ? padCenter(settings.footerTagline, width)
        : '';

    const footerLines: string[] = [
      lineDivider,
      `<b>${padCenter('*** THANK YOU VISIT AGAIN ***', width)}</b>`,
      padCenter(settings.footerTerms || 'No Return,No Exchange', width),
      safeTagline,
      lineDivider,
      '',
      '',
      '',
      '',
      '',
    ].filter((line) => line !== null && line !== undefined && line !== '');

    const allLines = [
      ...headerLines,
      ...metaLines,
      lineDivider,
      ...itemLines,
      ...summaryLines,
      ...countLines,
      ...footerLines,
    ];

    const renderedReceiptText = allLines.join('\n');
    const estimatedHeightMm = Math.max(
      150,
      110 + (items.length * 10) + (paymentRows.length * 6) + (settings.printLogo !== false ? 40 : 0) + 25
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: ${paperWidthMm} ${estimatedHeightMm}mm;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        min-width: ${contentWidthMm} !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        min-width: ${contentWidthMm} !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      img {
        display: block !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: pixelated !important;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img {
      display: block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      image-rendering: pixelated;
    }
    body {
      width: ${contentWidthMm};
      max-width: ${contentWidthMm};
      min-width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: 9.2px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      padding: 0;
    }
    .receipt-container {
      width: ${contentWidthMm};
      max-width: ${contentWidthMm};
      min-width: ${contentWidthMm};
      margin: 0 auto;
    }
    pre.receipt-mono {
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: 9.2px;
      line-height: 1.25;
      letter-spacing: -0.15px;
      white-space: pre;
      margin: 0;
      padding: 0;
      color: #000000 !important;
      background: transparent !important;
      overflow: hidden;
    }
    pre.receipt-mono b {
      font-weight: bold;
    }
  </style>
</head>
<body data-paper="${paperWidthMm}" data-est-height="${estimatedHeightMm}">
  <div class="receipt-container">
    ${logoHtml}
    <pre class="receipt-mono">${renderedReceiptText}</pre>
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
    const width = is58mm ? 32 : 48;
    const now = new Date();
    const rawShopName = (settings.shopName || '').trim().toUpperCase();
    const shopName =
      !rawShopName || rawShopName.includes('SR FRUITS') || rawShopName === 'SR'
        ? 'KBN FRUITS'
        : rawShopName;
    const rawInitials = (settings.shopInitials || '').trim().toUpperCase();
    const initials = !rawInitials || rawInitials === 'SR' ? 'KBN' : rawInitials;

    const lineDivider = '-'.repeat(width);
    const doubleDivider = '='.repeat(width);
    const logoWidth = is58mm ? 120 : 150;

    let processedLogoSrc = '';
    if (settings.printLogo !== false) {
      try {
        const rawLogoSrc = settings.logoUrl || kbnLogo;
        processedLogoSrc = await getScaledThermalLogo(rawLogoSrc, is58mm ? 120 : 150);
      } catch (err) {
        console.warn('Failed preparing logo for test print:', err);
      }
    }

    let logoHtml = '';
    if (processedLogoSrc) {
      logoHtml = `<div style="text-align: center; margin: 0 auto 6px auto; padding: 0;">
        <img src="${processedLogoSrc}" width="${logoWidth}" height="${logoWidth}" class="thermal-logo" alt="${shopName}" style="display: block; margin: 0 auto; width: ${logoWidth}px; max-width: ${logoWidth}px; height: auto; object-fit: contain; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;" />
      </div>`;
    }

    const testLines: string[] = [
      initials ? `<b>${padCenter(initials, width)}</b>` : '',
      `<b>${padCenter(shopName, width)}</b>`,
      `<b>${padCenter('TVS RP-3200 HARDWARE TEST', width)}</b>`,
      doubleDivider,
      ...formatTwoCol('Target Hardware:', 'TVS RP-3200', width),
      ...formatTwoCol('Width Mode:', paperWidthMm, width),
      ...formatTwoCol('Transport:', 'System / Browser Print', width),
      ...formatTwoCol('Date / Time:', `${formatReceiptDate(now)} ${formatReceiptTime(now)}`, width),
      lineDivider,
      ...formatTwoCol('TVS TEST ITEM 1', '1.00  100.00', width),
      ...formatTwoCol('TVS TEST ITEM 2', '2.00  250.00', width),
      lineDivider,
      `<b>${padRight('TOTAL :', width - 12)}${padLeft('600.00', 12)}</b>`,
      doubleDivider,
      `<b>${padCenter('PRINTER TEST SUCCESSFUL', width)}</b>`,
      lineDivider,
      '',
      '',
      '',
      '',
      '',
    ].filter((line) => line !== null && line !== undefined);

    const renderedTestText = testLines.join('\n');
    const estimatedHeightMm = 180;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <base href="${typeof window !== 'undefined' ? window.location.origin + '/' : '/'}">
  <title>TVS RP-3200 Test Print</title>
  <style>
    @page {
      size: ${paperWidthMm} ${estimatedHeightMm}mm;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        min-width: ${contentWidthMm} !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-container {
        width: ${contentWidthMm} !important;
        max-width: ${contentWidthMm} !important;
        min-width: ${contentWidthMm} !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
      }
      img {
        display: block !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: pixelated !important;
      }
    }
    * { box-sizing: border-box; }
    img {
      display: block;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      image-rendering: pixelated;
    }
    body {
      width: ${contentWidthMm};
      max-width: ${contentWidthMm};
      min-width: ${contentWidthMm};
      margin: 0 auto;
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: 9.2px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      padding: 0;
    }
    .receipt-container {
      width: ${contentWidthMm};
      max-width: ${contentWidthMm};
      min-width: ${contentWidthMm};
      margin: 0 auto;
    }
    pre.receipt-mono {
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: 9.2px;
      line-height: 1.25;
      letter-spacing: -0.15px;
      white-space: pre;
      margin: 0;
      padding: 0;
      color: #000000 !important;
      background: transparent !important;
      overflow: hidden;
    }
    pre.receipt-mono b {
      font-weight: bold;
    }
  </style>
</head>
<body data-paper="${paperWidthMm}" data-est-height="${estimatedHeightMm}">
  <div class="receipt-container">
    ${logoHtml}
    <pre class="receipt-mono">${renderedTestText}</pre>
  </div>
</body>
</html>`;
  },

  /**
   * Prints HTML formatted thermal receipt silently via an invisible iframe,
   * waiting for images to complete and dynamically calculating exact receipt height
   * so receipts scale dynamically without page-splitting, headers, or truncation.
   */
  printHtml(htmlContent: string): Promise<boolean> {
    return new Promise((resolve) => {
      const oldIframe = document.getElementById('thermal-print-iframe');
      if (oldIframe && oldIframe.parentNode) {
        oldIframe.parentNode.removeChild(oldIframe);
      }

      const is58mm = htmlContent.includes('data-paper="58mm"');
      const widthMm = is58mm ? '58mm' : '80mm';

      const iframe = document.createElement('iframe');
      iframe.id = 'thermal-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.width = widthMm;
      iframe.style.height = '6000px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

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
            const container = win.document.querySelector('.receipt-container') as HTMLElement | null;
            const pre = win.document.querySelector('.receipt-mono') as HTMLElement | null;
            const estHeightAttr = Number(body?.getAttribute('data-est-height')) || 150;

            // Measure actual unconstrained DOM height in pixels
            const measuredPx = Math.max(
              container ? container.scrollHeight : 0,
              container ? container.offsetHeight : 0,
              pre ? pre.scrollHeight : 0,
              body ? body.scrollHeight : 0,
              win.document.documentElement ? win.document.documentElement.scrollHeight : 0
            );

            // Convert px to mm at 96 DPI: 1 px = 25.4 / 96 mm
            // Add +15mm feed margin so the blade cuts cleanly after the trailing blank lines
            const measuredMm = Math.ceil((measuredPx * 25.4) / 96) + 15;
            const contentHeightMm = Math.max(estHeightAttr, measuredMm, 120);

            // Shrink iframe to exact receipt height so Chrome treats the print job as exactly 1 page
            iframe.style.height = `${contentHeightMm}mm`;
            iframe.style.maxHeight = `${contentHeightMm}mm`;

            const styleEl = win.document.createElement('style');
            styleEl.id = 'dynamic-page-size';
            styleEl.innerHTML = `
              @page {
                size: ${widthMm} ${contentHeightMm}mm !important;
                margin: 0mm !important;
              }
              @media print {
                html, body {
                  width: ${widthMm} !important;
                  height: ${contentHeightMm}mm !important;
                  max-height: ${contentHeightMm}mm !important;
                  margin: 0mm !important;
                  padding: 0mm !important;
                  overflow: hidden !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .receipt-container {
                  width: ${widthMm} !important;
                  margin: 0mm !important;
                  padding: 0mm !important;
                }
              }
            `;
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
        const imgs = Array.from(win.document.images || []) as HTMLImageElement[];
        if (imgs.length > 0) {
          Promise.all(
            imgs.map((img: HTMLImageElement) => {
              if ('decode' in img && typeof img.decode === 'function') {
                return img.decode().catch(() => {});
              }
              return new Promise<void>((r) => {
                if (img.complete) return r();
                img.onload = () => r();
                img.onerror = () => r();
              });
            })
          ).then(() => {
            setTimeout(triggerPrint, 350);
          }).catch(() => {
            setTimeout(triggerPrint, 350);
          });
          return;
        }
      }

      setTimeout(triggerPrint, 350);
    });
  },
};
