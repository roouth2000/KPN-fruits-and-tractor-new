import type { SerialConnectionConfig, PaperSize } from './printerTypes';

/**
 * TVS RP-3200 Hardware Specifications & Configuration Profile
 * ESC/POS High-Speed Thermal Receipt Printer (USB + RS-232 Serial Dual Interface)
 */
export const TVS_RP3200_CONFIG = {
  modelName: 'TVS RP-3200',
  description: '80mm High-Speed POS Thermal Receipt Printer (ESC/POS Compatible)',
  nativeWidth: '80mm' as PaperSize,
  printableWidthDots: 576,
  charsPerLineFontA: 48,
  charsPerLineFontB: 64,
  charsPerLine58mm: 32,
  resolutionDpi: 203,
  maxPrintSpeedMmSec: 260,

  // Default factory serial port parameters (DIP switch default profile)
  defaultSerialConfig: {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
  } as SerialConnectionConfig,

  supportedBaudRates: [9600, 19200, 38400, 57600, 115200] as const,
  supportedDataBits: [8, 7] as const,
  supportedStopBits: [1, 2] as const,
  supportedParities: ['none', 'even', 'odd'] as const,
  supportedFlowControls: ['none', 'hardware'] as const,

  // ESC/POS Commands supported by TVS RP-3200
  commands: {
    init: [0x1b, 0x40], // ESC @
    fullCut: [0x1d, 0x56, 0x00], // GS V 0
    partialCut: [0x1d, 0x56, 0x01], // GS V 1
    feedAndCut: [0x1d, 0x56, 0x42, 0x04], // GS V 'B' 4 (Feed 4 lines and partial cut)
    openCashDrawerPin2: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (2-pin drawer)
    openCashDrawerPin5: [0x1b, 0x70, 0x01, 0x19, 0xfa], // ESC p 1 25 250 (5-pin drawer)
  },

  // DIP Switch Reference Matrix for TVS RP-3200
  dipSwitchGuide: {
    title: 'TVS RP-3200 DIP Switch Configuration (Bottom of Printer)',
    summary: 'The hardware communication speed on TVS RP-3200 is determined by DIP Switch Bank 1.',
    switches: [
      {
        switchNumber: 'SW-1, SW-2, SW-3',
        purpose: 'Serial Baud Rate Selection',
        options: [
          'ON,  ON,  ON  => 9600 bps (Standard Factory Default)',
          'OFF, ON,  ON  => 19200 bps',
          'ON,  OFF, ON  => 38400 bps (High-Speed POS)',
          'OFF, OFF, ON  => 57600 bps',
          'OFF, OFF, OFF => 115200 bps (Maximum Speed)',
        ],
      },
      {
        switchNumber: 'SW-4',
        purpose: 'Parity Check',
        options: ['ON => Parity Enabled', 'OFF => No Parity (Default: 8N1)'],
      },
      {
        switchNumber: 'SW-5',
        purpose: 'Data Length',
        options: ['ON => 7 Bits', 'OFF => 8 Bits (Default)'],
      },
      {
        switchNumber: 'SW-6',
        purpose: 'Handshaking / Flow Control',
        options: [
          'OFF => DTR/DSR (Hardware Flow Control)',
          'ON  => XON/XOFF (Software Flow Control)',
        ],
      },
      {
        switchNumber: 'SW-8',
        purpose: 'Auto Paper Cutter',
        options: ['ON => Cutter Enabled (Default)', 'OFF => Cutter Disabled'],
      },
    ],
  },
};

/**
 * Step-by-step instructions to print a self-test configuration slip directly
 * from the TVS RP-3200 hardware without needing a computer.
 */
export function getTvsSelfTestInstructions(): string[] {
  return [
    'Turn OFF the TVS RP-3200 power switch.',
    'Press and hold the paper FEED button on the front panel.',
    'While holding down the FEED button, turn ON the power switch.',
    'Release the FEED button as soon as the printer begins printing.',
    'The TVS RP-3200 will print a Self-Test configuration receipt.',
    'Look at the "SERIAL INTERFACE" section on the printed slip to verify the exact BAUD RATE (e.g., 9600, 19200, or 38400), DATA BITS (8), PARITY (None), and HANDSHAKING (DTR/DSR or None).',
  ];
}

/**
 * Instructions to identify how the TVS RP-3200 is enumerated in Windows Device Manager.
 */
export function getWindowsDeviceManagerInstructions(): {
  virtualComInstructions: string[];
  nativeUsbInstructions: string[];
} {
  return {
    virtualComInstructions: [
      'Open Windows Device Manager (Press Win + X -> Device Manager).',
      'Expand "Ports (COM & LPT)".',
      'Look for "USB-to-Serial Comm Port" or "TVS Virtual COM Port" (e.g. COM3, COM4).',
      'If visible: Web Serial will connect directly! Select this COM port in Chrome or Edge.',
    ],
    nativeUsbInstructions: [
      'If the TVS RP-3200 appears only under "Print queues" or "Universal Serial Bus controllers" (USB Printing Support):',
      'The Windows print spooler holds an exclusive lock on standard USB printer drivers.',
      'To enable Web Serial: Install the TVS Virtual COM Driver or connect using an RS-232 DB-9 serial cable / USB-Serial adapter.',
      'Alternatively: Select WebUSB protocol in Printer Settings if using a direct USB Class 7 interface.',
    ],
  };
}

