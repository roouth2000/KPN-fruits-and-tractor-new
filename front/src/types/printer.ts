export type PaperSize = '80mm' | '58mm';
export type PrintMode = 'QZ_TRAY_SILENT' | 'BROWSER_DIALOG';
export type QZTrayStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

export interface PrinterSettings {
  printerName: string;
  paperSize: PaperSize;
  printMode: PrintMode;
  autoPrintOnSave: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
  copies: number;
  printSupplierBatchTrace: boolean;
  printQrCode: boolean;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGst: string;
  footerMessage: string;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerName: '',
  paperSize: '80mm',
  printMode: 'QZ_TRAY_SILENT',
  autoPrintOnSave: true,
  cutPaper: true,
  openCashDrawer: false,
  copies: 1,
  printSupplierBatchTrace: true,
  printQrCode: true,
  shopName: 'FINOVORE PRODUCE MANDI',
  shopAddress: 'APMC Terminal, Bay #12, Fruit Market, Vashi, Navi Mumbai - 400703',
  shopPhone: '+91 98765 43210',
  shopGst: '27AABCF1234F1Z8',
  footerMessage: 'Thank you for your business! Fresh produce checked & verified at Mandi dock.',
};

