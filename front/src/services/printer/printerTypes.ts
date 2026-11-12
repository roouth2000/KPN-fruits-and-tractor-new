export type PaperSize = '80mm' | '58mm';
export type PrinterTransport = 'WEB_SERIAL' | 'WEB_USB' | 'BROWSER_DIALOG';
export type SerialBaudRate = 9600 | 19200 | 38400 | 57600 | 115200;
export type SerialDataBits = 7 | 8;
export type SerialStopBits = 1 | 2;
export type SerialParity = 'none' | 'even' | 'odd';
export type SerialFlowControl = 'none' | 'hardware';

export type PrinterConnectionStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'PRINTING'
  | 'PRINT_FAILED';

export interface SerialConnectionConfig {
  baudRate: SerialBaudRate;
  dataBits: SerialDataBits;
  stopBits: SerialStopBits;
  parity: SerialParity;
  flowControl: SerialFlowControl;
}

export interface PrinterDeviceDetails {
  name: string;
  vendorId?: number;
  productId?: number;
  manufacturer?: string;
  transport: PrinterTransport;
  serialNumber?: string;
  portPath?: string;
}

export interface PrinterSettings {
  printerName?: string;
  transport: PrinterTransport;
  paperSize: PaperSize;
  baudRate: SerialBaudRate;
  dataBits: SerialDataBits;
  stopBits: SerialStopBits;
  parity: SerialParity;
  flowControl: SerialFlowControl;
  autoPrintOnSave: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
  copies: number;
  printSupplierBatchTrace: boolean;
  printQrCode: boolean;
  printLogo?: boolean;
  logoUrl?: string;
  shopInitials?: string;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGst: string;
  footerTerms?: string;
  footerMessage: string;
  footerTagline?: string;
  savedVendorId?: number;
  savedProductId?: number;
}

export interface PrintResult {
  success: boolean;
  transport: PrinterTransport;
  printerName?: string;
  bytesWritten?: number;
  error?: string;
  message?: string;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  transport: 'WEB_SERIAL',
  paperSize: '80mm',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  flowControl: 'none',
  autoPrintOnSave: true,
  cutPaper: true,
  openCashDrawer: false,
  copies: 1,
  printSupplierBatchTrace: false,
  printQrCode: false,
  printLogo: true,
  logoUrl: '',
  shopInitials: 'KBN',
  shopName: 'KBN FRUITS',
  shopAddress: 'T/A-18,T/E-25,ANNA FRUITS MARKET,\nKOYAMBEDU,CHENNAI-600092',
  shopPhone: '8778219770',
  shopGst: '',
  footerTerms: 'No Return,No Exchange',
  footerMessage: 'Thank you!!!.Visit Again.!!!.',
  footerTagline: 'www.Websyncz.in-9092678008',
};
