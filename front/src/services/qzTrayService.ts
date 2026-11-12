import qz from 'qz-tray';
import type { PrinterSettings, QZTrayStatus } from '../types/printer';
import { DEFAULT_PRINTER_SETTINGS } from '../types/printer';
import { receiptGenerator } from '../utils/receiptGenerator';

const STORAGE_KEY = 'finovore_printer_settings';

class QZTrayService {
  private status: QZTrayStatus = 'DISCONNECTED';
  private listeners: ((status: QZTrayStatus) => void)[] = [];
  private isInitializing = false;
  private discoveredPrintersCache: string[] = [];

  constructor() {
    this.configureSecurity();
  }

  /**
   * Set certificate and signature promises for QZ Tray.
   */
  private configureSecurity() {
    try {
      qz.security.setCertificatePromise((resolve: (cert?: string) => void) => {
        // In local/standalone environments, resolving empty triggers QZ Tray's local permission dialog
        resolve();
      });

      qz.security.setSignaturePromise(() => {
        return (resolve: (sig?: string) => void) => {
          resolve();
        };
      });
    } catch (err) {
      console.warn('[QZ Tray] Security config warning:', err);
    }
  }

  /**
   * Subscribe to connection status changes.
   */
  public onStatusChange(callback: (status: QZTrayStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.status);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: QZTrayStatus) {
    this.status = newStatus;
    this.listeners.forEach((cb) => cb(newStatus));
  }

  public getStatus(): QZTrayStatus {
    return this.status;
  }

  public isConnected(): boolean {
    try {
      return qz.websocket.isActive();
    } catch {
      return false;
    }
  }

  /**
   * Connect to QZ Tray local WebSocket.
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected()) {
      this.setStatus('CONNECTED');
      return true;
    }

    if (this.isInitializing) return false;
    this.isInitializing = true;
    this.setStatus('CONNECTING');

    try {
      await qz.websocket.connect({
        retries: 2,
        delay: 1,
      });

      this.setStatus('CONNECTED');
      this.isInitializing = false;
      return true;
    } catch (error: any) {
      console.warn('[QZ Tray] Connection error:', error?.message || error);
      this.setStatus('DISCONNECTED');
      this.isInitializing = false;
      return false;
    }
  }

  /**
   * Disconnect from QZ Tray.
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected()) {
        await qz.websocket.disconnect();
      }
    } catch (err) {
      console.warn('[QZ Tray] Disconnect error:', err);
    } finally {
      this.setStatus('DISCONNECTED');
    }
  }

  /**
   * Discover all physical and network printers available via QZ Tray.
   */
  public async discoverPrinters(): Promise<string[]> {
    try {
      if (!this.isConnected()) {
        const connected = await this.connect();
        if (!connected) return this.discoveredPrintersCache;
      }

      const printers = await qz.printers.find();
      const list = Array.isArray(printers) ? printers : [printers].filter(Boolean);
      this.discoveredPrintersCache = list;
      return list;
    } catch (err) {
      console.error('[QZ Tray] Failed to discover printers:', err);
      return this.discoveredPrintersCache;
    }
  }

  /**
   * Get default system printer from QZ Tray.
   */
  public async getDefaultPrinter(): Promise<string | null> {
    try {
      if (!this.isConnected()) {
        const connected = await this.connect();
        if (!connected) return null;
      }
      return await qz.printers.getDefault();
    } catch (err) {
      console.warn('[QZ Tray] Could not determine default printer:', err);
      return null;
    }
  }

  /**
   * Get saved printer settings from localStorage with fallback defaults.
   */
  public getSettings(): PrinterSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('[QZ Tray] Failed to parse stored printer settings:', err);
    }
    return { ...DEFAULT_PRINTER_SETTINGS };
  }

  /**
   * Persist printer settings to localStorage.
   */
  public saveSettings(newSettings: Partial<PrinterSettings>): PrinterSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[QZ Tray] Failed to save printer settings to localStorage:', err);
    }
    return updated;
  }

  /**
   * Direct silent print of a sales invoice without browser dialogs.
   * If QZ Tray is offline, gracefully falls back to browser printing.
   */
  public async printInvoice(
    invoiceData: any,
    customSettings?: Partial<PrinterSettings>
  ): Promise<{
    success: boolean;
    method: 'QZ_TRAY' | 'BROWSER_DIALOG';
    printer: string;
    message?: string;
  }> {
    const settings = { ...this.getSettings(), ...customSettings };
    const receiptHtml = receiptGenerator.generateReceiptHtml(invoiceData, settings);

    // If configured to use browser dialog, execute fallback directly
    if (settings.printMode === 'BROWSER_DIALOG') {
      this.fallbackBrowserPrint(receiptHtml);
      return {
        success: true,
        method: 'BROWSER_DIALOG',
        printer: 'Browser Native Print',
      };
    }

    // Attempt direct QZ Tray printing
    try {
      if (!this.isConnected()) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('QZ Tray is not running or unreachable on ws://localhost:8182');
        }
      }

      const printerToUse = settings.printerName || (await this.getDefaultPrinter());
      if (!printerToUse) {
        throw new Error('No target printer selected or detected');
      }

      const is58mm = settings.paperSize === '58mm';
      const qzConfig = qz.configs.create(printerToUse, {
        size: { width: is58mm ? 58 : 80, height: null },
        units: 'mm',
        copies: settings.copies || 1,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        scaleContent: true,
      });

      const printData = [
        {
          type: 'html',
          format: 'plain',
          data: receiptHtml,
        },
      ];

      await qz.print(qzConfig, printData);

      return {
        success: true,
        method: 'QZ_TRAY',
        printer: printerToUse,
        message: `Invoice sent silently to ${printerToUse} (${settings.paperSize})`,
      };
    } catch (err: any) {
      console.warn('[QZ Tray] Direct print failed, falling back to browser print:', err?.message || err);
      this.fallbackBrowserPrint(receiptHtml);
      return {
        success: true,
        method: 'BROWSER_DIALOG',
        printer: 'Browser Fallback (QZ Tray Offline)',
        message: 'QZ Tray was not detected; opened via Browser Print.',
      };
    }
  }

  /**
   * Diagnostic test print to verify printer communication, alignment, and paper cut.
   */
  public async printTestReceipt(
    customSettings?: Partial<PrinterSettings>
  ): Promise<{
    success: boolean;
    method: 'QZ_TRAY' | 'BROWSER_DIALOG';
    printer: string;
  }> {
    const settings = { ...this.getSettings(), ...customSettings };
    const targetPrinter = settings.printerName || 'Default System Printer';
    const testHtml = receiptGenerator.generateTestReceiptHtml(settings, targetPrinter);

    if (settings.printMode === 'BROWSER_DIALOG') {
      this.fallbackBrowserPrint(testHtml);
      return { success: true, method: 'BROWSER_DIALOG', printer: 'Browser Fallback' };
    }

    try {
      if (!this.isConnected()) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('QZ Tray is not connected');
        }
      }

      const printerToUse = settings.printerName || (await this.getDefaultPrinter());
      if (!printerToUse) {
        throw new Error('No printer selected');
      }

      const is58mm = settings.paperSize === '58mm';
      const qzConfig = qz.configs.create(printerToUse, {
        size: { width: is58mm ? 58 : 80, height: null },
        units: 'mm',
        copies: 1,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        scaleContent: true,
      });

      const printData = [
        {
          type: 'html',
          format: 'plain',
          data: testHtml,
        },
      ];

      await qz.print(qzConfig, printData);
      return { success: true, method: 'QZ_TRAY', printer: printerToUse };
    } catch (err) {
      console.warn('[QZ Tray] Test print fallback to browser print:', err);
      this.fallbackBrowserPrint(testHtml);
      return { success: true, method: 'BROWSER_DIALOG', printer: 'Browser Fallback' };
    }
  }

  /**
   * Clean hidden-iframe fallback printing without navigating away from the current screen.
   */
  public fallbackBrowserPrint(htmlContent: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 350);
    }
  }
}

export const qzTrayService = new QZTrayService();
