import type { PrinterDeviceDetails } from './printerTypes';

/**
 * WebUSB API Controller for Direct Bulk USB Thermal Printing
 * Kept completely separate from WebSerial as an optional alternative.
 */
class WebUsbService {
  private activeDevice: any = null;
  private endpointNumber: number = 1;
  private interfaceNumber: number = 0;
  private isDeviceOpen: boolean = false;
  private currentDetails: PrinterDeviceDetails | null = null;
  private disconnectListeners: (() => void)[] = [];

  constructor() {
    this.setupGlobalEvents();
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  private setupGlobalEvents() {
    if (!this.isSupported()) return;

    try {
      (navigator as any).usb.addEventListener('disconnect', (event: any) => {
        if (event.device === this.activeDevice) {
          console.warn('[WebUSB] Active USB printer disconnected.');
          this.handleDisconnected();
        }
      });
    } catch (err) {
      console.warn('[WebUSB] Could not attach USB lifecycle listener:', err);
    }
  }

  private handleDisconnected() {
    this.activeDevice = null;
    this.isDeviceOpen = false;
    this.currentDetails = null;
    this.disconnectListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.push(callback);
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Request user permission for a WebUSB printer device (User gesture).
   */
  public async requestUsbPrinter(): Promise<PrinterDeviceDetails> {
    if (!this.isSupported()) {
      throw new Error('WebUSB API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
    }

    try {
      // Filter for USB class 7 (Printers) or allow common POS vendors
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { classCode: 7 }, // Standard USB Printer class
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0416 }, // WinBond / Xprinter
          { vendorId: 0x1fc9 }, // NXP / POS
          { vendorId: 0x0fe6 }, // ICS / POS
        ],
      });

      if (!device) {
        throw new Error('No USB printer device selected.');
      }

      await this.openUsbDevice(device);
      this.activeDevice = device;
      const details = this.extractUsbDetails(device);
      this.currentDetails = details;
      return details;
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        throw new Error('USB printer selection was cancelled.');
      }
      throw err;
    }
  }

  /**
   * Auto-reconnect to previously granted USB device.
   */
  public async autoReconnect(
    preferredVendorId?: number,
    preferredProductId?: number
  ): Promise<PrinterDeviceDetails | null> {
    if (!this.isSupported()) return null;

    try {
      const devices: any[] = await (navigator as any).usb.getDevices();
      if (!devices || devices.length === 0) return null;

      let target = devices[0];
      if (preferredVendorId !== undefined) {
        const match = devices.find(
          (d) =>
            d.vendorId === preferredVendorId &&
            (preferredProductId === undefined || d.productId === preferredProductId)
        );
        if (match) target = match;
      }

      await this.openUsbDevice(target);
      this.activeDevice = target;
      const details = this.extractUsbDetails(target);
      this.currentDetails = details;
      return details;
    } catch (err) {
      console.warn('[WebUSB] Auto-reconnect failed:', err);
      return null;
    }
  }

  private async openUsbDevice(device: any): Promise<void> {
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Locate the first interface with a bulk OUT endpoint
    let foundOutEndpoint = false;
    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            this.interfaceNumber = iface.interfaceNumber;
            this.endpointNumber = ep.endpointNumber;
            foundOutEndpoint = true;
            break;
          }
        }
        if (foundOutEndpoint) break;
      }
      if (foundOutEndpoint) break;
    }

    if (!foundOutEndpoint) {
      // Default fallback endpoint
      this.interfaceNumber = 0;
      this.endpointNumber = 1;
    }

    try {
      await device.claimInterface(this.interfaceNumber);
    } catch (e: any) {
      console.warn('[WebUSB] Interface claim note:', e?.message || e);
    }

    this.isDeviceOpen = true;
  }

  /**
   * Send ESC/POS data via USB bulk OUT transfer.
   */
  public async write(data: Uint8Array): Promise<number> {
    if (!this.activeDevice || !this.isDeviceOpen) {
      throw new Error('WebUSB printer is not connected.');
    }

    try {
      const res = await this.activeDevice.transferOut(this.endpointNumber, data);
      return res.bytesWritten || data.byteLength;
    } catch (err: any) {
      console.error('[WebUSB] Transfer error:', err);
      throw new Error(`WebUSB write failed: ${err?.message || 'Transfer error'}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.activeDevice) {
      try {
        if (this.isDeviceOpen) {
          await this.activeDevice.releaseInterface(this.interfaceNumber);
          await this.activeDevice.close();
        }
      } catch (err) {
        console.warn('[WebUSB] Error closing device:', err);
      } finally {
        this.activeDevice = null;
        this.isDeviceOpen = false;
        this.currentDetails = null;
      }
    }
  }

  public isConnected(): boolean {
    return Boolean(this.activeDevice && this.isDeviceOpen);
  }

  public getConnectedDevice(): PrinterDeviceDetails | null {
    return this.currentDetails;
  }

  private extractUsbDetails(device: any): PrinterDeviceDetails {
    const vid = device.vendorId;
    const pid = device.productId;
    const prodName = device.productName || 'USB Thermal Printer';
    return {
      name: prodName,
      vendorId: vid,
      productId: pid,
      manufacturer: device.manufacturerName,
      serialNumber: device.serialNumber,
      transport: 'WEB_USB',
    };
  }
}

export const webUsbService = new WebUsbService();

