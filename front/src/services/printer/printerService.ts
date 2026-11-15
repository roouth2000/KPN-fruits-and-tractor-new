import { webSerialService } from './webSerialService';
import { webUsbService } from './webUsbService';
import { receiptRenderer } from './receiptRenderer';
import {
  DEFAULT_PRINTER_SETTINGS,
  type PrinterConnectionStatus,
  type PrinterDeviceDetails,
  type PrinterSettings,
  type PrinterTransport,
  type PrintResult,
} from './printerTypes';

const STORAGE_KEY = 'finovore_thermal_printer_settings';

/**
 * Universal Hardware Thermal Printer Service
 * Manages direct browser-native printing via Web Serial and WebUSB,
 * automatic reconnect on reload, duplicate print protection, and settings persistence.
 */
class PrinterService {
  private status: PrinterConnectionStatus = 'NOT_CONNECTED';
  private listeners: ((status: PrinterConnectionStatus) => void)[] = [];
  private activeDevice: PrinterDeviceDetails | null = null;
  private isPrintingLock: boolean = false;
  private hasAttemptedAutoReconnect: boolean = false;

  constructor() {
    this.setupListeners();
    // Schedule silent auto-reconnect on startup if in browser
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.attemptSilentReconnect();
      }, 500);
    }
  }

  private setupListeners() {
    webSerialService.onDisconnect(() => {
      this.setStatus('DISCONNECTED');
      this.activeDevice = null;
    });

    webUsbService.onDisconnect(() => {
      this.setStatus('DISCONNECTED');
      this.activeDevice = null;
    });
  }

  public onStatusChange(callback: (status: PrinterConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.status);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: PrinterConnectionStatus) {
    this.status = newStatus;
    this.listeners.forEach((cb) => {
      try {
        cb(newStatus);
      } catch (err) {
        console.error('[PrinterService] Listener error:', err);
      }
    });
  }

  public getStatus(): PrinterConnectionStatus {
    const settings = this.getSettings();
    if (settings.transport === 'BROWSER_DIALOG') {
      return 'CONNECTED';
    }
    return this.status;
  }

  public isConnected(): boolean {
    const settings = this.getSettings();
    if (settings.transport === 'BROWSER_DIALOG') {
      return true;
    }
    return (
      this.status === 'CONNECTED' &&
      (webSerialService.isConnected() || webUsbService.isConnected())
    );
  }

  public getConnectedDevice(): PrinterDeviceDetails | null {
    const settings = this.getSettings();
    if (settings.transport === 'BROWSER_DIALOG') {
      return {
        name: 'Windows System Printer (TVS RP-3200)',
        transport: 'BROWSER_DIALOG',
      };
    }
    return this.activeDevice;
  }

  /**
   * Reads persisted printer settings from localStorage.
   */
  public getSettings(): PrinterSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.shopName === 'SR FRUITS' || parsed.shopName === 'SR') {
          parsed.shopName = 'KBN FRUITS';
        }
        if (parsed.shopInitials === 'SR') {
          parsed.shopInitials = 'KBN';
        }
        if (parsed.footerTagline && (parsed.footerTagline.includes('Websyncz') || parsed.footerTagline.includes('www.') || parsed.footerTagline.includes('http'))) {
          parsed.footerTagline = '';
        }
        return { ...DEFAULT_PRINTER_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn('[PrinterService] Failed reading settings:', err);
    }
    return { ...DEFAULT_PRINTER_SETTINGS };
  }

  /**
   * Saves printer settings to localStorage.
   */
  public saveSettings(settings: PrinterSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('[PrinterService] Failed saving settings:', err);
    }
  }

  /**
   * Prompts the user to pick and grant access to a thermal printer (User gesture).
   */
  public async connectPrinter(transport?: PrinterTransport): Promise<PrinterDeviceDetails> {
    const settings = this.getSettings();
    const mode = transport || settings.transport || 'WEB_SERIAL';

    if (mode === 'BROWSER_DIALOG') {
      const details: PrinterDeviceDetails = {
        name: 'Windows System Printer (TVS RP-3200)',
        transport: 'BROWSER_DIALOG',
      };
      this.activeDevice = details;
      this.setStatus('CONNECTED');
      this.saveSettings({
        ...settings,
        transport: 'BROWSER_DIALOG',
      });
      return details;
    }

    this.setStatus('CONNECTING');

    try {
      let details: PrinterDeviceDetails;

      if (mode === 'WEB_USB') {
        details = await webUsbService.requestUsbPrinter();
      } else {
        // Default: Web Serial API for TVS RP-3200 (Virtual COM / RS-232)
        details = await webSerialService.requestPrinterPort({
          baudRate: settings.baudRate || 9600,
          dataBits: settings.dataBits || 8,
          stopBits: settings.stopBits || 1,
          parity: settings.parity || 'none',
          flowControl: settings.flowControl || 'none',
        });
      }

      this.activeDevice = details;
      this.setStatus('CONNECTED');

      // Persist chosen vendor/product to enable silent auto-reconnect on refresh
      this.saveSettings({
        ...settings,
        transport: mode,
        savedVendorId: details.vendorId,
        savedProductId: details.productId,
      });

      return details;
    } catch (err: any) {
      this.setStatus('NOT_CONNECTED');
      throw err;
    }
  }

  /**
   * Disconnects the active thermal printer connection.
   */
  public async disconnectPrinter(): Promise<void> {
    try {
      await webSerialService.disconnect();
      await webUsbService.disconnect();
    } finally {
      this.activeDevice = null;
      this.setStatus('DISCONNECTED');
    }
  }

  /**
   * Silent auto-reconnect on application boot using previously authorized ports.
   * Does NOT show user permission dialogs.
   */
  public async attemptSilentReconnect(): Promise<boolean> {
    if (this.hasAttemptedAutoReconnect || this.isConnected()) {
      return this.isConnected();
    }
    this.hasAttemptedAutoReconnect = true;

    const settings = this.getSettings();
    try {
      if (settings.transport === 'WEB_USB') {
        const details = await webUsbService.autoReconnect(
          settings.savedVendorId,
          settings.savedProductId
        );
        if (details) {
          this.activeDevice = details;
          this.setStatus('CONNECTED');
          return true;
        }
      } else {
        const details = await webSerialService.autoReconnect(
          {
            baudRate: settings.baudRate || 9600,
            dataBits: settings.dataBits || 8,
            stopBits: settings.stopBits || 1,
            parity: settings.parity || 'none',
            flowControl: settings.flowControl || 'none',
          },
          settings.savedVendorId,
          settings.savedProductId
        );
        if (details) {
          this.activeDevice = details;
          this.setStatus('CONNECTED');
          return true;
        }
      }
    } catch (err) {
      console.warn('[PrinterService] Silent reconnect error:', err);
    }

    return false;
  }

  /**
   * Reconnects to the last used printer.
   */
  public async reconnectPrinter(): Promise<boolean> {
    this.setStatus('CONNECTING');
    const settings = this.getSettings();

    try {
      if (settings.transport === 'WEB_USB') {
        const dev = await webUsbService.autoReconnect(
          settings.savedVendorId,
          settings.savedProductId
        );
        if (dev) {
          this.activeDevice = dev;
          this.setStatus('CONNECTED');
          return true;
        }
      } else {
        const dev = await webSerialService.autoReconnect(
          {
            baudRate: settings.baudRate || 9600,
            dataBits: settings.dataBits || 8,
            stopBits: settings.stopBits || 1,
            parity: settings.parity || 'none',
            flowControl: settings.flowControl || 'none',
          },
          settings.savedVendorId,
          settings.savedProductId
        );
        if (dev) {
          this.activeDevice = dev;
          this.setStatus('CONNECTED');
          return true;
        }
      }
    } catch (err) {
      console.error('[PrinterService] Reconnect failed:', err);
    }

    this.setStatus('NOT_CONNECTED');
    return false;
  }

  /**
   * Prints an invoice receipt directly to the connected thermal printer.
   * Includes duplicate protection lock and copy multiplier.
   */
  public async printInvoice(
    invoiceData: any,
    overrideSettings?: Partial<PrinterSettings>
  ): Promise<PrintResult> {
    if (this.isPrintingLock) {
      return {
        success: false,
        transport: 'WEB_SERIAL',
        error: 'Print job in progress. Please wait a moment.',
      };
    }

    this.isPrintingLock = true;
    this.setStatus('PRINTING');

    try {
      const settings: PrinterSettings = {
        ...this.getSettings(),
        ...overrideSettings,
      };

      if (settings.transport === 'BROWSER_DIALOG') {
        const html = await receiptRenderer.renderInvoiceToHtml(invoiceData, settings);
        await receiptRenderer.printHtml(html);
        this.setStatus('CONNECTED');
        return {
          success: true,
          transport: 'BROWSER_DIALOG',
          printerName: 'Windows System Printer (TVS RP-3200)',
          message: 'Invoice sent to Windows System Printer.',
        };
      }

      // Ensure printer is connected
      if (!this.isConnected()) {
        const reconnected = await this.attemptSilentReconnect();
        if (!reconnected && !this.isConnected()) {
          // Direct USB/Serial port not paired or connected -> seamlessly fallback to system print dialog so invoice prints
          console.warn('[PrinterService] Direct printer not connected, automatically falling back to system print dialog');
          const html = await receiptRenderer.renderInvoiceToHtml(invoiceData, {
            ...settings,
            transport: 'BROWSER_DIALOG',
          });
          await receiptRenderer.printHtml(html);
          this.setStatus('CONNECTED');
          return {
            success: true,
            transport: 'BROWSER_DIALOG',
            printerName: 'Windows System Printer (TVS RP-3200)',
            message: 'Invoice sent to Windows System Printer.',
          };
        }
      }

      // Generate ESC/POS binary data using react-thermal-printer
      const escPosBytes = await receiptRenderer.renderInvoiceToEscPos(invoiceData, settings);

      const copies = Math.max(1, settings.copies || 1);
      let totalBytesWritten = 0;

      for (let i = 0; i < copies; i++) {
        if (settings.transport === 'WEB_USB') {
          totalBytesWritten += await webUsbService.write(escPosBytes);
        } else {
          totalBytesWritten += await webSerialService.write(escPosBytes);
        }
      }

      this.setStatus('CONNECTED');
      return {
        success: true,
        transport: settings.transport,
        printerName: this.activeDevice?.name || 'USB Thermal Printer',
        bytesWritten: totalBytesWritten,
        message: `Printed ${copies} ${copies === 1 ? 'copy' : 'copies'} successfully via Web Serial.`,
      };
    } catch (err: any) {
      console.error('[PrinterService] Print error, falling back to system print dialog:', err);
      try {
        const fallbackSettings = { ...this.getSettings(), ...overrideSettings, transport: 'BROWSER_DIALOG' as const };
        const html = await receiptRenderer.renderInvoiceToHtml(invoiceData, fallbackSettings);
        await receiptRenderer.printHtml(html);
        return {
          success: true,
          transport: 'BROWSER_DIALOG',
          printerName: 'Windows System Printer',
          message: 'Invoice printed via system print dialog.',
        };
      } catch (fallbackErr) {
        console.error('[PrinterService] Fallback print also failed:', fallbackErr);
      }
      this.setStatus('PRINT_FAILED');
      return {
        success: false,
        transport: this.getSettings().transport,
        error: err?.message || 'Failed to print receipt',
      };
    } finally {
      this.isPrintingLock = false;
    }
  }

  /**
   * Prints a Test Receipt to verify physical alignment, width, and cutter.
   */
  public async printTestReceipt(overrideSettings?: Partial<PrinterSettings>): Promise<PrintResult> {
    if (this.isPrintingLock) {
      return { success: false, transport: 'WEB_SERIAL', error: 'Printer is busy' };
    }

    this.isPrintingLock = true;
    this.setStatus('PRINTING');

    try {
      const settings: PrinterSettings = {
        ...this.getSettings(),
        ...overrideSettings,
      };

      if (settings.transport === 'BROWSER_DIALOG') {
        const html = await receiptRenderer.renderTestToHtml(settings);
        await receiptRenderer.printHtml(html);
        this.setStatus('CONNECTED');
        return {
          success: true,
          transport: 'BROWSER_DIALOG',
          printerName: 'Windows System Printer (TVS RP-3200)',
          message: 'Test receipt sent to Windows System Printer.',
        };
      }

      if (!this.isConnected()) {
        const reconnected = await this.attemptSilentReconnect();
        if (!reconnected && !this.isConnected()) {
          this.setStatus('NOT_CONNECTED');
          return {
            success: false,
            transport: settings.transport,
            error: 'Printer is not connected. Click "Connect Printer" first.',
          };
        }
      }

      const testBytes = await receiptRenderer.renderTestReceipt(settings);

      let bytesWritten = 0;
      if (settings.transport === 'WEB_USB') {
        bytesWritten = await webUsbService.write(testBytes);
      } else {
        bytesWritten = await webSerialService.write(testBytes);
      }

      this.setStatus('CONNECTED');
      return {
        success: true,
        transport: settings.transport,
        printerName: this.activeDevice?.name || 'USB Thermal Printer',
        bytesWritten,
        message: 'Test receipt printed successfully.',
      };
    } catch (err: any) {
      this.setStatus('PRINT_FAILED');
      return {
        success: false,
        transport: this.getSettings().transport,
        error: err?.message || 'Test print failed',
      };
    } finally {
      this.isPrintingLock = false;
    }
  }
}

export const printerService = new PrinterService();

