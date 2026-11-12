import React, { useState } from 'react';
import type { PrinterConnectionStatus, PrinterDeviceDetails, PrinterTransport, SerialBaudRate } from '../../services/printer/printerTypes';
import type { BrowserPrinterSupport } from '../../services/printer/printerCapabilities';

interface PrinterConnectionProps {
  status: PrinterConnectionStatus;
  device: PrinterDeviceDetails | null;
  supportReport: BrowserPrinterSupport;
  baudRate: SerialBaudRate;
  transport: PrinterTransport;
  onConnect: (transport?: PrinterTransport) => Promise<any>;
  onDisconnect: () => Promise<any>;
  onReconnect: () => Promise<any>;
  onBaudRateChange: (rate: SerialBaudRate) => void;
  onTransportChange: (transport: PrinterTransport) => void;
}

export const PrinterConnection: React.FC<PrinterConnectionProps> = ({
  status,
  device,
  supportReport,
  baudRate,
  transport,
  onConnect,
  onDisconnect,
  onReconnect,
  onBaudRateChange,
  onTransportChange,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setErrorMessage('Could not auto-reconnect to previous printer. Please click "Connect Printer" to select device.');
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
                ? 'Thermal Printer Connected'
                : status === 'CONNECTING'
                ? 'Connecting to Hardware...'
                : status === 'PRINTING'
                ? 'Sending Print Job...'
                : 'No Printer Connected'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {device
              ? device.name
              : 'Direct browser-to-printer communication via Web Serial (Zero background apps required).'}
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
                {isBusy ? 'Connecting...' : 'Connect Thermal Printer'}
              </button>
              <button
                type="button"
                onClick={handleReconnect}
                disabled={isBusy}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                title="Attempt to reconnect to previously paired device without dialog"
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
        </div>
      </div>

      {/* Hardware Transport & Port Configuration */}
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
            <option value="WEB_SERIAL">Web Serial API (Recommended / USB Virtual COM)</option>
            <option value="WEB_USB">WebUSB API (Direct USB Bulk)</option>
          </select>
          <span className="text-[10.5px] text-slate-500 mt-1 block">
            {transport === 'WEB_SERIAL'
              ? 'Works with standard USB POS thermal printers on Windows, Linux, and Mac.'
              : 'Direct USB endpoint for printers supporting standard USB Class 7.'}
          </span>
        </div>

        {transport === 'WEB_SERIAL' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Serial Baud Rate
            </label>
            <select
              value={baudRate}
              disabled={status === 'CONNECTED'}
              onChange={(e) => onBaudRateChange(Number(e.target.value) as SerialBaudRate)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value={9600}>9600 bps (Standard / Default for most POS-58/80)</option>
              <option value={19200}>19200 bps</option>
              <option value={38400}>38400 bps</option>
              <option value={57600}>57600 bps</option>
              <option value={115200}>115200 bps (High-Speed / Epson & Star)</option>
            </select>
            <span className="text-[10.5px] text-slate-500 mt-1 block">
              Default is 9600 bps. Change only if your printer manual specifies a different speed.
            </span>
          </div>
        )}
      </div>

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

