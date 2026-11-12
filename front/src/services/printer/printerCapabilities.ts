/**
 * Printer Capabilities & Browser API Compatibility Detector
 * Checks for Web Serial, WebUSB, HTTPS/Secure Context, and browser support.
 */

export interface BrowserPrinterSupport {
  hasWebSerial: boolean;
  hasWebUsb: boolean;
  isSecureContext: boolean;
  isSupportedBrowser: boolean;
  browserName: string;
  recommendedTransport: 'WEB_SERIAL' | 'WEB_USB' | 'BROWSER_DIALOG';
  supportReason: string;
}

export function checkBrowserPrinterSupport(): BrowserPrinterSupport {
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
  const hasUsb = typeof navigator !== 'undefined' && 'usb' in navigator;

  // Determine browser name
  let browserName = 'Unknown Browser';
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Edg\//i.test(ua)) {
    browserName = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua)) {
    browserName = 'Google Chrome';
  } else if (/Firefox\//i.test(ua)) {
    browserName = 'Mozilla Firefox';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browserName = 'Apple Safari';
  }

  const isChromium = hasSerial || hasUsb;

  let recommendedTransport: 'WEB_SERIAL' | 'WEB_USB' | 'BROWSER_DIALOG' = 'BROWSER_DIALOG';
  let supportReason = '';

  if (!isSecure) {
    supportReason = 'Web Serial/USB require an HTTPS secure context (or localhost). Native printing is unavailable over unencrypted HTTP.';
    recommendedTransport = 'BROWSER_DIALOG';
  } else if (hasSerial) {
    recommendedTransport = 'WEB_SERIAL';
    supportReason = 'Web Serial API is available. Ideal for standard POS thermal printers via USB Virtual COM / Serial.';
  } else if (hasUsb) {
    recommendedTransport = 'WEB_USB';
    supportReason = 'WebUSB API is available. Supported for compatible direct USB bulk printers.';
  } else {
    recommendedTransport = 'BROWSER_DIALOG';
    supportReason = `${browserName} does not support Web Serial or WebUSB. Use Google Chrome or Microsoft Edge on Windows for direct hardware thermal printing.`;
  }

  return {
    hasWebSerial: hasSerial,
    hasWebUsb: hasUsb,
    isSecureContext: isSecure,
    isSupportedBrowser: isChromium && isSecure,
    browserName,
    recommendedTransport,
    supportReason,
  };
}

