import { useState, useEffect, useCallback } from 'react';
import { printerService } from '../services/printer/printerService';
import { checkBrowserPrinterSupport, type BrowserPrinterSupport } from '../services/printer/printerCapabilities';
import type {
  PrinterConnectionStatus,
  PrinterDeviceDetails,
  PrinterSettings,
  PrinterTransport,
  PrintResult,
} from '../services/printer/printerTypes';

export function useThermalPrinter() {
  const [status, setStatus] = useState<PrinterConnectionStatus>(printerService.getStatus());
  const [device, setDevice] = useState<PrinterDeviceDetails | null>(printerService.getConnectedDevice());
  const [settings, setSettings] = useState<PrinterSettings>(printerService.getSettings());
  const [supportReport] = useState<BrowserPrinterSupport>(checkBrowserPrinterSupport());

  useEffect(() => {
    const unsub = printerService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setDevice(printerService.getConnectedDevice());
    });
    return unsub;
  }, []);

  const connect = useCallback(async (transport?: PrinterTransport) => {
    const dev = await printerService.connectPrinter(transport);
    setDevice(dev);
    setSettings(printerService.getSettings());
    return dev;
  }, []);

  const disconnect = useCallback(async () => {
    await printerService.disconnectPrinter();
    setDevice(null);
  }, []);

  const reconnect = useCallback(async () => {
    return await printerService.reconnectPrinter();
  }, []);

  const saveSettings = useCallback((newSettings: PrinterSettings) => {
    printerService.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const printInvoice = useCallback(
    async (invoiceData: any, overrides?: Partial<PrinterSettings>): Promise<PrintResult> => {
      return await printerService.printInvoice(invoiceData, overrides);
    },
    []
  );

  const printTestReceipt = useCallback(
    async (overrides?: Partial<PrinterSettings>): Promise<PrintResult> => {
      return await printerService.printTestReceipt(overrides);
    },
    []
  );

  return {
    status,
    isConnected: printerService.isConnected(),
    isConnecting: status === 'CONNECTING',
    isPrinting: status === 'PRINTING',
    device,
    settings,
    supportReport,
    connect,
    disconnect,
    reconnect,
    saveSettings,
    printInvoice,
    printTestReceipt,
  };
}

