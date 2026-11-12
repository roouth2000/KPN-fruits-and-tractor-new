import React, { useState, useEffect } from 'react';
import {
  XIcon,
  SparklesIcon,
  PlusIcon,
  ChevronDownIcon,
} from './icons';
import { formatINR, formatNumber } from '../utils/helpers';
import { supplierApi } from '../services/supplierApi';
import type { SupplierItem } from '../services/supplierApi';

interface ProductItem {
  id: string;
  productId: number;
  name: string;
  variety: string;
  quantity: number;
  unitCost: number;
  imageUrl: string;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApproval: (orderData: {
    poNumber: string;
    supplier: string;
    total: number;
    approver: string;
  }) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmitApproval,
}) => {
  const [activeTab, setActiveTab] = useState<'po' | 'transfer'>('po');
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [deliverTo, setDeliverTo] = useState('APMC Bay #12, Vashi Cold Store');
  const [neededBy, setNeededBy] = useState('Tomorrow 05:00 AM');
  const [paymentTerms, setPaymentTerms] = useState('APMC Weekly Settlement (15 days)');
  const [shipBy, setShipBy] = useState('Refrigerated Truck (NH-48)');
  const [reference, setReference] = useState('Morning Wholesale Arrival');
  const [note, setNote] = useState('Inspected at weighbridge; plastic crates palletized');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial products matching Mandi Produce trade
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 'p1',
      productId: 1,
      name: 'Apple',
      variety: 'Royal Gala (Grade A)',
      quantity: 50,
      unitCost: 1500,
      imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'p2',
      productId: 2,
      name: 'Mango',
      variety: 'Alphonso (Ratnagiri A+)',
      quantity: 40,
      unitCost: 2200,
      imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=100&auto=format&fit=crop&q=80',
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    supplierApi
      .getSuppliers()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSuppliers(data);
          setSelectedSupplierId(data[0].id);
        }
      })
      .catch((err) => console.warn('Could not fetch suppliers:', err));
  }, [isOpen]);

  // Dynamic calculations
  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const subtotal = products.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);
  const freight = 3500;
  const total = subtotal + freight;

  // Approval limit is ₹1,00,000 for standard dock clerk
  const isOverLimit = total > 100000;

  const handleQuantityChange = (id: string, newQtyStr: string) => {
    const val = parseInt(newQtyStr.replace(/[^0-9]/g, ''), 10);
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: isNaN(val) ? 0 : val } : item
      )
    );
  };

  const handleAddProduct = () => {
    const newId = `p-${Date.now()}`;
    setProducts((prev) => [
      ...prev,
      {
        id: newId,
        productId: 3,
        name: 'Orange',
        variety: 'Nagpur Mandarin (Grade A)',
        quantity: 30,
        unitCost: 900,
        imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=100&auto=format&fit=crop&q=80',
      },
    ]);
  };

  const handleRemoveProduct = (id: string) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const selectedSupplierObj =
    suppliers.find((s) => s.id === Number(selectedSupplierId)) || suppliers[0];

  const handleSendForApproval = async () => {
    setIsSubmitting(true);
    const poNum = `PO-${Date.now().toString().slice(-4)}`;

    try {
      if (products.length > 0) {
        await supplierApi.recordInwardPurchase({
          supplierId: selectedSupplierObj ? selectedSupplierObj.id : 1,
          productId: products[0].productId,
          quantity: totalUnits,
          rate: Math.round(subtotal / (totalUnits || 1)),
          poNumber: poNum,
          notes: `${reference}: ${note} (${totalUnits} Crates inward)`,
        });
      }
    } catch (err) {
      console.warn('Inward record API warning:', err);
    }

    onSubmitApproval({
      poNumber: poNum,
      supplier: selectedSupplierObj?.name || 'Shimla Apple Orchards',
      total,
      approver: isOverLimit ? 'APMC Mandi Director' : 'Bay Inward Clerk',
    });
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
              Inward Produce Procurement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record orchard consignment · routed to APMC Bay #12 Inward Desk
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 border-b border-slate-200/70 flex gap-6">
          <button
            onClick={() => setActiveTab('po')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'po'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Purchase Consignment
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'transfer'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Bay Transfer / Sorting
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Area */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top 3 Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Grower / Supplier
                </label>
                <div className="relative">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-slate-800 appearance-none hover:bg-slate-100/70 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  >
                    {suppliers.length > 0 ? (
                      suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={1}>Shimla Apple Orchards</option>
                        <option value={2}>Ratnagiri Mango Growers Co-op</option>
                        <option value={3}>Nagpur Citrus Producers</option>
                      </>
                    )}
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Arrival Dock
                </label>
                <div className="relative">
                  <select
                    value={deliverTo}
                    onChange={(e) => setDeliverTo(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-slate-800 appearance-none hover:bg-slate-100/70 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  >
                    <option value="APMC Bay #12, Vashi Cold Store">APMC Bay #12 (Cold Store)</option>
                    <option value="APMC Bay #4, Ambient Dock">APMC Bay #4 (Ambient Dock)</option>
                    <option value="Ripening Chamber #2">Ripening Chamber #2</option>
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Expected Inward
                </label>
                <div className="relative">
                  <select
                    value={neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-slate-800 appearance-none hover:bg-slate-100/70 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  >
                    <option value="Tomorrow 05:00 AM">Tomorrow 05:00 AM</option>
                    <option value="Today Evening 07:00 PM">Today Evening 07:00 PM</option>
                    <option value="Immediate Inward">Immediate Inward</option>
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Payment Terms
                </label>
                <div className="relative">
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-slate-800 appearance-none hover:bg-slate-100/70 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  >
                    <option value="APMC Weekly Settlement (15 days)">APMC Weekly (15 days)</option>
                    <option value="Immediate Cash / RTGS">Immediate Cash / RTGS</option>
                    <option value="30 Days Mandi Credit">30 Days Mandi Credit</option>
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Haulage Mode
                </label>
                <div className="relative">
                  <select
                    value={shipBy}
                    onChange={(e) => setShipBy(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-7 text-slate-800 appearance-none hover:bg-slate-100/70 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  >
                    <option value="Refrigerated Truck (NH-48)">Refrigerated Truck (NH-48)</option>
                    <option value="Eicher Open 14ft">Eicher Open 14ft</option>
                    <option value="Farmer Mini Truck">Farmer Mini Truck</option>
                  </select>
                  <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Batch / Reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  placeholder="e.g. Batch #SH-2026"
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">Consignment Produce</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {products.length} fruit lines · {formatNumber(totalUnits)} Crates
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                {/* Header */}
                <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-2">
                  <div className="col-span-6">Fruit & Variety</div>
                  <div className="col-span-2 text-right">Crates</div>
                  <div className="col-span-2 text-right">Rate/Box</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100 bg-white">
                  {products.map((item) => {
                    const lineTotal = item.quantity * item.unitCost;
                    return (
                      <div
                        key={item.id}
                        className="px-3 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60 transition-colors text-xs"
                      >
                        <div className="col-span-6 flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0 bg-slate-100"
                          />
                          <div className="truncate">
                            <div className="font-semibold text-slate-800 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {item.variety}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <input
                            type="text"
                            value={formatNumber(item.quantity)}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 text-right text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all font-mono"
                          />
                        </div>

                        <div className="col-span-2 text-right text-xs text-slate-600 font-mono">
                          {formatINR(item.unitCost)}
                        </div>

                        <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 font-mono">
                            {formatINR(lineTotal)}
                          </span>
                          {products.length > 1 && (
                            <button
                              onClick={() => handleRemoveProduct(item.id)}
                              title="Remove item"
                              className="text-slate-300 hover:text-rose-500 transition-colors p-0.5"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 bg-slate-50/50 border-t border-slate-100">
                  <button
                    onClick={handleAddProduct}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors border border-dashed border-slate-200"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Add Fruit Lot to Consignment</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Dock Notes & Grading Remarks
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors shadow-2xs"
                placeholder="Weighbridge docket, temperature log, driver contact..."
              />
            </div>
          </div>

          {/* Right Summary Area */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800">Inward Cost Summary</div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Produce Subtotal</span>
                  <span className="font-mono text-slate-800">{formatINR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mandi Freight & Cess</span>
                  <span className="font-mono text-slate-800">{formatINR(freight)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-800">Total Inward Cost</span>
                <span className="text-xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {formatINR(total)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Authority Sign-off
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isOverLimit
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isOverLimit ? 'Requires Manager Approval' : 'Dock Sign-off'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                    M
                  </div>
                  <div className="truncate text-xs">
                    <div className="font-bold text-slate-900">
                      {isOverLimit ? 'APMC Mandi Director' : 'Bay Inward Clerk'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isOverLimit ? 'High-value consignment' : 'Standard daily arrival'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality & Cold Chain Card */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <SparklesIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="leading-tight">Cold Chain & Quality Check</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    APMC Standard Fruit Protocol
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>Reefer container arrived at optimal +2°C to +4°C</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                  <span>Standard 20kg plastic crates with barcode stickers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Records consignment inward & credits supplier ledger
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSendForApproval}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording Inward...' : 'Confirm Inward Consignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
