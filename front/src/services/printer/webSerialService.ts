import type { PrinterDeviceDetails, SerialBaudRate } from './printerTypes';

/**
 * Web Serial API Hardware Controller for Direct Thermal Printing
 * Supports user-gesture device selection, automatic reconnection via getPorts(),
 * connection monitoring, and robust stream writing to USB/Serial thermal printers.
 */
class WebSerialService {
  private activePort: any = null;
  private isPortOpen: boolean = false;
  private currentDeviceDetails: PrinterDeviceDetails | null = null;
  private disconnectListeners: (() => void)[] = [];

  constructor() {
    this.setupGlobalEventListeners();
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  private setupGlobalEventListeners() {
    if (!this.isSupported()) return;

    try {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.port === this.activePort) {
          console.warn('[WebSerial] Connected printer port was physically disconnected.');
          this.handlePortDisconnected();
        }
      });

      (navigator as any).serial.addEventListener('connect', (event: any) => {
        console.log('[WebSerial] Serial device connected to system:', event.port);
      });
    } catch (err) {
      console.warn('[WebSerial] Could not attach global serial lifecycle events:', err);
    }
  }

  private handlePortDisconnected() {
    this.isPortOpen = false;
    this.activePort = null;
    this.currentDeviceDetails = null;
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
   * Request user permission for a new serial device (Requires user gesture / click).
   */
  public async requestPrinterPort(baudRate: SerialBaudRate = 9600): Promise<PrinterDeviceDetails> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge on HTTPS.');
    }

    try {
      // Prompt user to pick USB Serial printer
      const port = await (navigator as any).serial.requestPort();
      if (!port) {
        throw new Error('No device selected');
      }

      await this.openPort(port, baudRate);
      this.activePort = port;
      const details = this.extractPortDetails(port);
      this.currentDeviceDetails = details;
      return details;
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'AbortError') {
        throw new Error('Printer selection was cancelled.');
      }
      if (err.name === 'SecurityError') {
        throw new Error('Serial access blocked by browser security policy. Please ensure the app is running over HTTPS.');
      }
      throw err;
    }
  }

  /**
   * Attempt automatic silent reconnection using previously authorized ports.
   * Does NOT trigger a user permission dialog.
   */
  public async autoReconnect(
    baudRate: SerialBaudRate = 9600,
    preferredVendorId?: number,
    preferredProductId?: number
  ): Promise<PrinterDeviceDetails | null> {
    if (!this.isSupported()) return null;

    try {
      const ports: any[] = await (navigator as any).serial.getPorts();
      if (!ports || ports.length === 0) {
        return null;
      }

      // Find matching port if vendorId/productId provided, otherwise use the first authorized port
      let targetPort = ports[0];
      if (preferredVendorId !== undefined) {
        const match = ports.find((p) => {
          const info = p.getInfo();
          return info.usbVendorId === preferredVendorId &&
            (preferredProductId === undefined || info.usbProductId === preferredProductId);
        });
        if (match) targetPort = match;
      }

      await this.openPort(targetPort, baudRate);
      this.activePort = targetPort;
      const details = this.extractPortDetails(targetPort);
      this.currentDeviceDetails = details;
      return details;
    } catch (err: any) {
      console.warn('[WebSerial] Auto-reconnect failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Open the serial port connection stream.
   */
  private async openPort(port: any, baudRate: SerialBaudRate = 9600): Promise<void> {
    // If port is already open (writable is active), don't reopen
    if (port.writable && this.isPortOpen) {
      return;
    }

    try {
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        bufferSize: 16384,
      });
      this.isPortOpen = true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError' && port.writable) {
        // Already opened
        this.isPortOpen = true;
        return;
      }
      throw new Error(`Failed to open serial port: ${err?.message || 'Port is busy or unavailable'}`);
    }
  }

  /**
   * Send raw ESC/POS binary data to the thermal printer.
   */
  public async write(data: Uint8Array): Promise<number> {
    if (!this.activePort || !this.isPortOpen) {
      throw new Error('Printer is not connected. Please connect your USB thermal printer first.');
    }

    if (!this.activePort.writable) {
      throw new Error('Printer serial port is not writable.');
    }

    const writer = this.activePort.writable.getWriter();
    try {
      await writer.write(data);
      return data.byteLength;
    } catch (err: any) {
      console.error('[WebSerial] Write error:', err);
      throw new Error(`Thermal printer write failed: ${err?.message || 'Device communication error'}`);
    } finally {
      try {
        writer.releaseLock();
      } catch (e) {
        // ignore lock release error if stream already closed
      }
    }
  }

  /**
   * Disconnect and release the serial port.
   */
  public async disconnect(): Promise<void> {
    if (this.activePort) {
      try {
        if (this.isPortOpen) {
          await this.activePort.close();
        }
      } catch (err: any) {
        console.warn('[WebSerial] Error closing serial port:', err?.message || err);
      } finally {
        this.activePort = null;
        this.isPortOpen = false;
        this.currentDeviceDetails = null;
      }
    }
  }

  public isConnected(): boolean {
    return Boolean(this.activePort && this.isPortOpen);
  }

  public getConnectedDevice(): PrinterDeviceDetails | null {
    return this.currentDeviceDetails;
  }

  private extractPortDetails(port: any): PrinterDeviceDetails {
    const info = port.getInfo ? port.getInfo() : {};
    const vid = info.usbVendorId;
    const pid = info.usbProductId;

    let displayName = 'USB Thermal Printer (Serial)';
    if (vid !== undefined && pid !== undefined) {
      const hexVid = vid.toString(16).padStart(4, '0').toUpperCase();
      const hexPid = pid.toString(16).padStart(4, '0').toUpperCase();
      displayName = `POS Thermal Printer [VID:${hexVid} PID:${hexPid}]`;
    }

    return {
      name: displayName,
      vendorId: vid,
      productId: pid,
      transport: 'WEB_SERIAL',
    };
  }
}

export const webSerialService = new WebSerialService();

