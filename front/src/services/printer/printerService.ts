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
    return this.status;
  }

  public isConnected(): boolean {
    return (
      this.status === 'CONNECTED' &&
      (webSerialService.isConnected() || webUsbService.isConnected())
    );
  }

  public getConnectedDevice(): PrinterDeviceDetails | null {
    return this.activeDevice;
  }

  /**
   * Reads persisted printer settings from localStorage.
   */
  public getSettings(): PrinterSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) };
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

    this.setStatus('CONNECTING');

    try {
      let details: PrinterDeviceDetails;

      if (mode === 'WEB_USB') {
        details = await webUsbService.requestUsbPrinter();
      } else {
        // Default: Web Serial API
        details = await webSerialService.requestPrinterPort(settings.baudRate);
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
          settings.baudRate,
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
          settings.baudRate,
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

      // Ensure printer is connected
      if (!this.isConnected()) {
        const reconnected = await this.attemptSilentReconnect();
        if (!reconnected && !this.isConnected()) {
          this.setStatus('NOT_CONNECTED');
          return {
            success: false,
            transport: settings.transport,
            error: 'Printer is not connected. Please click "Connect Printer" to select your USB thermal printer.',
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
      console.error('[PrinterService] Print error:', err);
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

