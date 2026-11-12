import React, { useState } from 'react';
import type {
  PrinterConnectionStatus,
  PrinterDeviceDetails,
  PrinterTransport,
  SerialBaudRate,
  SerialDataBits,
  SerialStopBits,
  SerialParity,
  SerialFlowControl,
} from '../../services/printer/printerTypes';
import type { BrowserPrinterSupport } from '../../services/printer/printerCapabilities';
import {
  TVS_RP3200_CONFIG,
  getTvsSelfTestInstructions,
  getWindowsDeviceManagerInstructions,
} from '../../services/printer/printerConfig';

interface PrinterConnectionProps {
  status: PrinterConnectionStatus;
  device: PrinterDeviceDetails | null;
  supportReport: BrowserPrinterSupport;
  baudRate: SerialBaudRate;
  dataBits: SerialDataBits;
  stopBits: SerialStopBits;
  parity: SerialParity;
  flowControl: SerialFlowControl;
  transport: PrinterTransport;
  onConnect: (transport?: PrinterTransport) => Promise<any>;
  onDisconnect: () => Promise<any>;
  onReconnect: () => Promise<any>;
  onBaudRateChange: (rate: SerialBaudRate) => void;
  onDataBitsChange: (bits: SerialDataBits) => void;
  onStopBitsChange: (bits: SerialStopBits) => void;
  onParityChange: (parity: SerialParity) => void;
  onFlowControlChange: (flow: SerialFlowControl) => void;
  onTransportChange: (transport: PrinterTransport) => void;
}

export const PrinterConnection: React.FC<PrinterConnectionProps> = ({
  status,
  device,
  supportReport,
  baudRate,
  dataBits,
  stopBits,
  parity,
  flowControl,
  transport,
  onConnect,
  onDisconnect,
  onReconnect,
  onBaudRateChange,
  onDataBitsChange,
  onStopBitsChange,
  onParityChange,
  onFlowControlChange,
  onTransportChange,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTvsGuide, setShowTvsGuide] = useState(false);

  const selfTestSteps = getTvsSelfTestInstructions();
  const windowsGuide = getWindowsDeviceManagerInstructions();

  const handleConnect = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await onConnect(transport);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Connection failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await onDisconnect();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Disconnect error.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReconnect = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const ok = await onReconnect();
      if (!ok) {
        setErrorMessage(
          'Could not auto-reconnect to previous printer. Please click "Connect TVS RP-3200" to select device.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Reconnect error.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      {/* Browser API Compatibility Alert */}
      {!supportReport.isSupportedBrowser && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs leading-relaxed">
          <span className="font-bold block mb-0.5">Browser Compatibility Note:</span>
          {supportReport.supportReason}
        </div>
      )}

      {/* Main Connection Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                status === 'CONNECTED'
                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                  : status === 'CONNECTING' || status === 'PRINTING'
                  ? 'bg-blue-500 animate-ping'
                  : 'bg-slate-400'
              }`}
            />
            <h3 className="font-bold text-slate-900 text-sm">
              {status === 'CONNECTED'
                ? 'TVS RP-3200 Printer Connected'
                : status === 'CONNECTING'
                ? 'Connecting to Hardware...'
                : status === 'PRINTING'
                ? 'Sending Print Job...'
                : 'TVS RP-3200 Not Connected'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {device
              ? device.name
              : 'Direct browser-to-printer ESC/POS communication via Web Serial (Zero background apps required).'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {status !== 'CONNECTED' ? (
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isBusy || !supportReport.hasWebSerial}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {isBusy ? 'Connecting...' : 'Connect TVS RP-3200'}
              </button>
              <button
                type="button"
                onClick={handleReconnect}
                disabled={isBusy}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                title="Attempt to reconnect to previously paired TVS RP-3200 without dialog"
              >
                Reconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isBusy}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
            >
              Disconnect
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTvsGuide(!showTvsGuide)}
            className="px-2.5 py-2 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>RP-3200 Hardware Guide</span>
          </button>
        </div>
      </div>

      {/* Hardware Transport & Serial Port Parameters */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Communication Protocol
            </label>
            <select
              value={transport}
              disabled={status === 'CONNECTED'}
              onChange={(e) => onTransportChange(e.target.value as PrinterTransport)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="WEB_SERIAL">Web Serial API (Recommended / COM Port)</option>
              <option value="WEB_USB">WebUSB API (Direct USB Endpoint)</option>
            </select>
            <span className="text-[10.5px] text-slate-500 mt-1 block">
              {transport === 'WEB_SERIAL'
                ? 'Communicates with TVS RP-3200 via USB Virtual COM or RS-232 serial cable.'
                : 'Direct USB endpoint communication (for USB Class 7 interfaces).'}
            </span>
          </div>

          {transport === 'WEB_SERIAL' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Serial Baud Rate (bps)
              </label>
              <select
                value={baudRate}
                disabled={status === 'CONNECTED'}
                onChange={(e) => onBaudRateChange(Number(e.target.value) as SerialBaudRate)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
              >
                <option value={9600}>9600 bps (TVS RP-3200 Standard Default)</option>
                <option value={19200}>19200 bps (TVS DIP Switch Alternative)</option>
                <option value={38400}>38400 bps (High-Speed POS Default)</option>
                <option value={57600}>57600 bps</option>
                <option value={115200}>115200 bps (Maximum Speed)</option>
              </select>
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Must match your TVS RP-3200 DIP switch setting or Self-Test slip.
              </span>
            </div>
          )}
        </div>

        {/* Detailed Serial Interface Settings (DIP Switch Parameters) */}
        {transport === 'WEB_SERIAL' && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wider">
              TVS RP-3200 Serial Port Advanced Parameters
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Data Bits</label>
                <select
                  value={dataBits}
                  disabled={status === 'CONNECTED'}
                  onChange={(e) => onDataBitsChange(Number(e.target.value) as SerialDataBits)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium text-xs disabled:opacity-60"
                >
                  <option value={8}>8 Bits (Standard)</option>
                  <option value={7}>7 Bits</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Stop Bits</label>
                <select
                  value={stopBits}
                  disabled={status === 'CONNECTED'}
                  onChange={(e) => onStopBitsChange(Number(e.target.value) as SerialStopBits)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium text-xs disabled:opacity-60"
                >
                  <option value={1}>1 Bit (Standard)</option>
                  <option value={2}>2 Bits</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Parity</label>
                <select
                  value={parity}
                  disabled={status === 'CONNECTED'}
                  onChange={(e) => onParityChange(e.target.value as SerialParity)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium text-xs disabled:opacity-60"
                >
                  <option value="none">None (Standard)</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Flow Control</label>
                <select
                  value={flowControl}
                  disabled={status === 'CONNECTED'}
                  onChange={(e) => onFlowControlChange(e.target.value as SerialFlowControl)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-medium text-xs disabled:opacity-60"
                >
                  <option value="none">None (Standard)</option>
                  <option value="hardware">Hardware (DTR/DSR)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible TVS RP-3200 Hardware & DIP Switch Guide */}
      {showTvsGuide && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
            <span className="font-bold text-indigo-950 text-xs">
              TVS RP-3200 Hardware Diagnostic &amp; Windows Setup
            </span>
            <button
              type="button"
              onClick={() => setShowTvsGuide(false)}
              className="text-indigo-700 hover:text-indigo-900 font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-indigo-900 block">
              1. How to print a Self-Test configuration receipt on TVS RP-3200:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-indigo-800 pl-1 text-[11.5px]">
              {selfTestSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="border-t border-indigo-200/60 pt-2 space-y-2">
            <span className="font-bold text-indigo-900 block">
              2. How TVS RP-3200 appears in Windows Device Manager:
            </span>
            <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 space-y-1 text-[11.5px] text-slate-700">
              <span className="font-bold text-slate-900 block">A. Virtual COM Mode (Recommended):</span>
              {windowsGuide.virtualComInstructions.map((inst, i) => (
                <p key={i} className="pl-2">· {inst}</p>
              ))}
            </div>
            <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 space-y-1 text-[11.5px] text-slate-700">
              <span className="font-bold text-slate-900 block">B. USB Print Queue Mode:</span>
              {windowsGuide.nativeUsbInstructions.map((inst, i) => (
                <p key={i} className="pl-2">· {inst}</p>
              ))}
            </div>
          </div>

          <div className="border-t border-indigo-200/60 pt-2 space-y-2">
            <span className="font-bold text-indigo-900 block">
              3. {TVS_RP3200_CONFIG.dipSwitchGuide.title}:
            </span>
            <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 space-y-2 text-[11px] text-slate-700">
              {TVS_RP3200_CONFIG.dipSwitchGuide.switches.map((sw, i) => (
                <div key={i} className="border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-bold text-indigo-950 block">{sw.switchNumber}: {sw.purpose}</span>
                  {sw.options.map((opt, oi) => (
                    <span key={oi} className="block text-slate-600 pl-2">· {opt}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error message if any */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2.5 text-xs">
          <span className="font-semibold block mb-0.5">Connection Error:</span>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
