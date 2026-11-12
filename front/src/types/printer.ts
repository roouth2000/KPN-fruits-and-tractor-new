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
  printQrCode: false,
  printLogo: true,
  logoUrl: '',
  shopInitials: 'SR',
  shopName: 'SR FRUITS',
  shopAddress: 'T/A-18,T/E-25,ANNA FRUITS MARKET,\nKOYAMBEDU,CHENNAI-600092',
  shopPhone: '8778219770',
  shopGst: '',
  footerTerms: 'No Return,No Exchange',
  footerMessage: 'Thank you!!!.Visit Again.!!!.',
  footerTagline: 'www.Websyncz.in-9092678008',
};

