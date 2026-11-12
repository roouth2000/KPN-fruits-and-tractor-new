import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { salesApi } from '../modules/sales/services/salesApi';
import type { Supplier } from '../modules/sales/types/billing';
import { formatINR } from '../utils/helpers';
import {
  LayersIcon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  CalendarIcon,
  BuildingIcon,
  ReceiptTextIcon,
  CheckIcon,
  FilterIcon,
  XIcon,
  TrendingUpIcon,
  EditIcon,
  Trash2Icon,
} from '../components/icons';

interface ProductInfo {
  id: number;
  name: string;
  variety: string;
  grade?: string;
  productCode?: string;
  defaultUnit?: string;
  wholesaleRate?: number | string;
  currentStock?: number | string;
}

interface BatchRecord {
  id: number;
  batchNumber: string;
  productId: number;
  supplierId: number | null;
  purchaseDate: string;
  initialQuantity: number | string;
  currentQuantity: number | string;
  unit: string;
  purchaseRate: number | string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | string;
  notes?: string;
  product?: ProductInfo;
  supplier?: Supplier;
}

interface BatchAllocationRecord {
  id: number;
  invoiceId: number;
  invoiceItemId: number;
  batchId: number;
  productId: number;
  supplierId: number | null;
  quantity: number | string;
  unit: string;
  purchaseRate: number | string;
  saleRate: number | string;
  allocatedDate: string;
  invoice?: {
    id: number;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string;
    status: string;
  };
  product?: {
    id: number;
    name: string;
    variety: string;
    defaultUnit: string;
  };
  batch?: {
    id: number;
    batchNumber: string;
    purchaseDate: string;
    purchaseRate: number | string;
  };
  supplier?: {
    id: number;
    name: string;
    supplierCode: string;
    city: string;
  };
}

interface StackManagementPageProps {
  onBackToDashboard: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const StackManagementPage: React.FC<StackManagementPageProps> = ({
  onBackToDashboard,
  onShowToast,
}) => {
  // Navigation tabs within Stack Management
  const [activeSubTab, setActiveSubTab] = useState<'stack' | 'table' | 'allocations' | 'rules'>('stack');

  // Core Data
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [allocations, setAllocations] = useState<BatchAllocationRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Add Stock Modal State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [inwardProductId, setInwardProductId] = useState<number | null>(null);
  const [inwardSupplierId, setInwardSupplierId] = useState<number | null>(null);
  const [inwardDate, setInwardDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [inwardBatchId, setInwardBatchId] = useState<string>('');
  const [inwardQty, setInwardQty] = useState<number>(0);
  const [inwardUnit, setInwardUnit] = useState<string>('BOX');
  const [inwardRate, setInwardRate] = useState<number>(0);
  const [inwardNotes, setInwardNotes] = useState<string>('Mandi Consignment Inward Dock #2');
  const [isSubmittingInward, setIsSubmittingInward] = useState(false);

  // Copy feedback state
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);

  // Edit Batch Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRecord | null>(null);
  const [editBatchNumber, setEditBatchNumber] = useState('');
  const [editSupplierId, setEditSupplierId] = useState<number | null>(null);
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editInitialQty, setEditInitialQty] = useState<number>(0);
  const [editCurrentQty, setEditCurrentQty] = useState<number>(0);
  const [editUnit, setEditUnit] = useState<string>('BOX');
  const [editPurchaseRate, setEditPurchaseRate] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Batch Modal State
  const [deleteModalBatch, setDeleteModalBatch] = useState<BatchRecord | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Fetch batches and trace data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesRes, allocsRes, suppsRes, prodsRes] = await Promise.all([
        salesApi.getAllBatches('ALL'),
        salesApi.getAllBatchAllocations(100),
        salesApi.getSuppliers(),
        salesApi.getAllProducts(),
      ]);

      setBatches(batchesRes || []);
      setAllocations(allocsRes || []);
      setSuppliers(suppsRes || []);
      setProducts(prodsRes || []);

      if (prodsRes && prodsRes.length > 0 && !inwardProductId) {
        setInwardProductId(prodsRes[0].id);
      }
      if (suppsRes && suppsRes.length > 0 && !inwardSupplierId) {
        setInwardSupplierId(suppsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load stack management data:', err);
      onShowToast?.('Data Load Error', 'Failed to retrieve batches from server', 'warning');
    } finally {
      setIsLoading(false);
    }
  }, [inwardProductId, inwardSupplierId, onShowToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate unique batch ID on selection changes
  const refreshAutoBatchNumber = useCallback(
    (prodId?: number | null, suppId?: number | null, dateStr?: string) => {
      const targetProdId = prodId ?? inwardProductId;
      const targetSuppId = suppId ?? inwardSupplierId;
      const targetDate = dateStr ?? inwardDate;

      const matchedProd = products.find((p) => p.id === targetProdId);
      const rawSku = matchedProd?.productCode ? matchedProd.productCode.replace(/[^a-zA-Z0-9]/g, '') : 'LOT';
      const sku = rawSku.slice(-4).toUpperCase() || 'LOT';
      const cleanDate = targetDate.replace(/-/g, '');
      const suppTag = targetSuppId ? `S${targetSuppId}` : 'S1';
      const randNum = Math.floor(100 + Math.random() * 900);

      setInwardBatchId(`BATCH-${cleanDate}-${suppTag}-${sku}-${randNum}`);
    },
    [inwardProductId, inwardSupplierId, inwardDate, products]
  );

  const handleOpenAddStock = (productId?: number) => {
    const pId = productId ?? (products[0] ? products[0].id : null);
    const sId = suppliers[0] ? suppliers[0].id : null;
    const today = new Date().toISOString().slice(0, 10);

    setInwardProductId(pId);
    setInwardSupplierId(sId);
    setInwardDate(today);
    setInwardQty(0);
    setInwardRate(0);

    const matched = products.find((p) => p.id === pId);
    if (matched) {
      setInwardUnit(matched.defaultUnit || 'BOX');
    }

    refreshAutoBatchNumber(pId, sId, today);
    setIsAddStockOpen(true);
  };

  // Submit new inward batch
  const handleConfirmInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardProductId || inwardQty <= 0) {
      onShowToast?.('Invalid Input', 'Select a product and enter a positive quantity.', 'warning');
      return;
    }

    setIsSubmittingInward(true);
    try {
      const result = await salesApi.addStock({
        productId: inwardProductId,
        supplierId: inwardSupplierId,
        purchaseDate: inwardDate,
        batchNumber: inwardBatchId.trim(),
        quantity: inwardQty,
        unit: inwardUnit,
        purchaseRate: inwardRate,
        notes: inwardNotes,
      });

      const prod = products.find((p) => p.id === inwardProductId);
      const supp = suppliers.find((s) => s.id === inwardSupplierId);
      const prodName = prod ? prod.name : 'Produce';

      onShowToast?.(
        'Batch Inward Logged',
        `Batch #${result.batch?.batchNumber || inwardBatchId} (+${inwardQty} ${inwardUnit} of ${prodName}) assigned to ${supp ? supp.name : 'Supplier'}.`,
        'success'
      );

      if (result.recalculated) {
        onShowToast?.(
          'Rule 7 Auto-Recalculation',
          'Backdated purchase date detected! All FIFO sales allocations across history were re-synchronized in chronological order.',
          'info'
        );
      }

      setIsAddStockOpen(false);
      loadData();
    } catch (err: any) {
      onShowToast?.(
        'Inward Failed',
        err.response?.data?.message || err.message || 'Error creating inward batch',
        'warning'
      );
    } finally {
      setIsSubmittingInward(false);
    }
  };

  // Edit Batch Handlers
  const handleOpenEditBatch = (batch: BatchRecord) => {
    setEditingBatch(batch);
    setEditBatchNumber(batch.batchNumber || '');
    setEditSupplierId(batch.supplierId || (batch.supplier ? batch.supplier.id : null));
    setEditPurchaseDate(batch.purchaseDate ? batch.purchaseDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditInitialQty(Number(batch.initialQuantity) || 0);
    setEditCurrentQty(Number(batch.currentQuantity) || 0);
    setEditUnit(batch.unit || 'BOX');
    setEditPurchaseRate(Number(batch.purchaseRate) || 0);
    setEditStatus(batch.status || 'ACTIVE');
    setEditNotes(batch.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    if (!editBatchNumber.trim()) {
      onShowToast?.('Validation Error', 'Batch number is required (Rule 2).', 'warning');
      return;
    }
    if (editInitialQty < 0 || editCurrentQty < 0) {
      onShowToast?.('Validation Error', 'Quantities cannot be negative.', 'warning');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const payload = {
        batchNumber: editBatchNumber.trim(),
        supplierId: editSupplierId,
        purchaseDate: editPurchaseDate,
        initialQuantity: Number(editInitialQty),
        currentQuantity: Number(editCurrentQty),
        unit: editUnit,
        purchaseRate: Number(editPurchaseRate),
        status: editStatus,
        notes: editNotes.trim(),
      };

      const result = await salesApi.updateBatch(editingBatch.id, payload);
      const isRecalculated = result?.recalculated;

      onShowToast?.(
        'Batch Updated',
        isRecalculated
          ? `Batch #${editBatchNumber} updated. Historical invoices re-sequenced via FIFO Rule 7.`
          : `Batch #${editBatchNumber} updated successfully.`,
        'success'
      );

      setIsEditModalOpen(false);
      setEditingBatch(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to update batch:', err);
      const message = err.response?.data?.message || err.message || 'Error updating batch';
      onShowToast?.('Update Failed', message, 'warning');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Batch Handler
  const handleConfirmDeleteBatch = async () => {
    if (!deleteModalBatch) return;

    setIsDeletingBatch(true);
    try {
      await salesApi.deleteBatch(deleteModalBatch.id);
      onShowToast?.(
        'Batch Deleted',
        `Batch #${deleteModalBatch.batchNumber} was deleted. FIFO allocations were recalculated (Rule 7).`,
        'success'
      );
      setDeleteModalBatch(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      const message = err.response?.data?.message || err.message || 'Error deleting batch';
      onShowToast?.('Delete Failed', message, 'warning');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Rule 7 Manual Recalculation
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    try {
      await salesApi.recalculateAllFIFO();
      onShowToast?.(
        'FIFO Recalculation Complete',
        'Rules 3, 4, 5 & 7 verified: Every batch stock and bill allocation re-sorted by purchase date in strict chronological order.',
        'success'
      );
      loadData();
    } catch (err: any) {
      onShowToast?.(
        'Recalculation Failed',
        err.response?.data?.message || err.message || 'Error recalculating FIFO',
        'warning'
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  // Copy batch number to clipboard
  const handleCopyBatch = (bNum: string) => {
    navigator.clipboard.writeText(bNum);
    setCopiedBatchId(bNum);
    setTimeout(() => setCopiedBatchId(null), 2000);
  };

  // Group batches by product for Stack view
  const groupedByProduct = useMemo(() => {
    const groups: { [key: number]: { product: ProductInfo; batches: BatchRecord[] } } = {};

    batches.forEach((b) => {
      const pId = b.productId;
      if (!groups[pId]) {
        groups[pId] = {
          product: b.product || {
            id: pId,
            name: `Product #${pId}`,
            variety: 'Standard',
            defaultUnit: b.unit,
            currentStock: 0,
          },
          batches: [],
        };
      }
      groups[pId].batches.push(b);
    });

    // Sort batches inside each group by purchaseDate ASC, id ASC (strict FIFO Rule 3)
    Object.values(groups).forEach((g) => {
      g.batches.sort((a, b) => {
        if (a.purchaseDate !== b.purchaseDate) {
          return a.purchaseDate.localeCompare(b.purchaseDate);
        }
        return a.id - b.id;
      });
    });

    return Object.values(groups);
  }, [batches]);

  // Filtered batches for table view
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const searchMatch =
        searchTerm === '' ||
        b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.product && b.product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.product && b.product.variety && b.product.variety.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.supplier && b.supplier.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.supplier && b.supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()));

      const prodMatch =
        selectedProductFilter === 'ALL' || String(b.productId) === selectedProductFilter;

      const suppMatch =
        selectedSupplierFilter === 'ALL' || String(b.supplierId) === selectedSupplierFilter;

      const statMatch = statusFilter === 'ALL' || b.status === statusFilter;

      return searchMatch && prodMatch && suppMatch && statMatch;
    });
  }, [batches, searchTerm, selectedProductFilter, selectedSupplierFilter, statusFilter]);

  // Filtered allocations for Rule 6 Trace view
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (a.invoice && a.invoice.invoiceNumber.toLowerCase().includes(s)) ||
        (a.invoice && a.invoice.customerName.toLowerCase().includes(s)) ||
        (a.product && a.product.name.toLowerCase().includes(s)) ||
        (a.supplier && a.supplier.name.toLowerCase().includes(s)) ||
        (a.batch && a.batch.batchNumber.toLowerCase().includes(s))
      );
    });
  }, [allocations, searchTerm]);

  // Overall KPIs
  const totalActiveBatches = batches.filter((b) => b.status === 'ACTIVE').length;
  const totalDepletedBatches = batches.filter((b) => b.status === 'DEPLETED').length;
  const totalAvailableStock = batches
    .filter((b) => b.status === 'ACTIVE')
    .reduce((sum, b) => sum + (parseFloat(String(b.currentQuantity)) || 0), 0);
  const distinctSuppliers = new Set(batches.map((b) => b.supplierId).filter(Boolean)).size;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <LayersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Stack Management (FIFO)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                7 FIFO Rules Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandi consignment lots, supplier-specific batches, purchase-date sorting &amp; sales trace audit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Rule 7: Recalculate FIFO */}
          <button
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
            title="Recalculate all FIFO allocations across backdated consignments and sales (Rule 7)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 text-indigo-600 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>{isRecalculating ? 'Re-synchronizing...' : 'Recalculate FIFO (Rule 7)'}</span>
          </button>

          {/* Add Inward Stock */}
          <button
            onClick={() => handleOpenAddStock()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Add Inward Batch</span>
          </button>

          {/* Back to Dashboard */}
          <button
            onClick={onBackToDashboard}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* 7 Rules Reference Strip */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-100/80 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Stack Management Operating Rules Engine
            </h2>
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold">100% Enforced in Backend</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 text-[11px]">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 1 · Supplier Batch</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Same produce with different suppliers stored as separate batches.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 2 · Unique Batch ID</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Every arrival gets a guaranteed unique batch code.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 3 · Purchase Date FIFO</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Strict chronological queue: oldest purchase date fulfilled first.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 4 · Deduct Oldest</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Sales bills deduct automatically from the earliest available stock.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 5 · Batch Sequential</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Next batch unlocks only after current batch reaches 0.00.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 6 · Bill Supplier Trace</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Records exact supplier and batch deducted in every invoice.
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="font-bold text-indigo-600 mb-0.5">Rule 7 · Backdated Replay</div>
            <p className="text-slate-600 text-[10px] leading-relaxed">
              Backdated purchases or sales trigger auto-recalculation of FIFO.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Batches</span>
            <LayersIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalActiveBatches}
          </div>
          <span className="text-[11px] text-slate-500">In warehouse queue</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Queue Stock</span>
            <PackageIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalAvailableStock.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Available for sales bills</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Depleted Batches</span>
            <CheckIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 font-mono">
            {totalDepletedBatches}
          </div>
          <span className="text-[11px] text-slate-400">100% finished &amp; audited</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suppliers Stocked</span>
            <BuildingIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {distinctSuppliers}
          </div>
          <span className="text-[11px] text-slate-500">Independent batch sources</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('stack')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'stack'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayersIcon className="w-3.5 h-3.5" />
            <span>FIFO Stack by Fruit</span>
          </button>

          <button
            onClick={() => setActiveSubTab('table')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PackageIcon className="w-3.5 h-3.5" />
            <span>All Batches Master ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('allocations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'allocations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ReceiptTextIcon className="w-3.5 h-3.5" />
            <span>Bill Supplier Trace (Rule 6)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-700/50 text-white">
              {allocations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUpIcon className="w-3.5 h-3.5" />
            <span>Rules Architecture</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative min-w-[240px]">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batch ID, fruit, supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: FIFO STACK BY FRUIT (Visual FIFO Queue Cards) */}
      {/* ========================================================= */}
      {activeSubTab === 'stack' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading FIFO batches from database...</p>
            </div>
          ) : groupedByProduct.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <LayersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">No Fruit Batches Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Record your first inward consignment to start building FIFO stacks.
              </p>
              <button
                onClick={() => handleOpenAddStock()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                + Add First Inward Batch
              </button>
            </div>
          ) : (
            groupedByProduct.map(({ product, batches: prodBatches }) => {
              // Active batches in strict FIFO order
              const activeProdBatches = prodBatches.filter((b) => b.status === 'ACTIVE');
              const depletedProdBatches = prodBatches.filter((b) => b.status === 'DEPLETED');
              const totalProdStock = activeProdBatches.reduce(
                (sum, b) => sum + (parseFloat(String(b.currentQuantity)) || 0),
                0
              );

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  {/* Fruit Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <PackageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{product.name}</h2>
                          <span className="text-xs text-slate-500">
                            ({product.variety || 'Standard'} · Grade {product.grade || 'A'})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          SKU: {product.productCode || `PROD-${product.id}`} · Default Unit: {product.defaultUnit || 'BOX'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Available</span>
                        <span className="text-base font-bold font-mono text-emerald-600">
                          {totalProdStock.toLocaleString()} {product.defaultUnit || 'BOX'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenAddStock(product.id)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
                      >
                        + Add Inward Lot
                      </button>
                    </div>
                  </div>

                  {/* FIFO Batches Stack Visualizer */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        <span>FIFO Allocation Queue (Oldest Stock Deducted First)</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {activeProdBatches.length} active batches · {depletedProdBatches.length} depleted
                      </span>
                    </div>

                    {prodBatches.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        No batches cataloged for this produce yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {prodBatches.map((batch, index) => {
                          const isHeadOfQueue = batch.status === 'ACTIVE' && activeProdBatches[0]?.id === batch.id;
                          const isDepleted = batch.status === 'DEPLETED';
                          const initQty = parseFloat(String(batch.initialQuantity)) || 1;
                          const currQty = parseFloat(String(batch.currentQuantity)) || 0;
                          const soldQty = Math.max(0, initQty - currQty);
                          const pctRemaining = Math.max(0, Math.min(100, Math.round((currQty / initQty) * 100)));

                          return (
                            <div
                              key={batch.id}
                              className={`rounded-xl p-3.5 border transition-all relative ${
                                isHeadOfQueue
                                  ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                                  : isDepleted
                                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                                  : 'bg-white border-slate-200 shadow-2xs'
                              }`}
                            >
                              {/* Queue Rank Badge */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isHeadOfQueue
                                        ? 'bg-indigo-600 text-white'
                                        : isDepleted
                                        ? 'bg-slate-200 text-slate-600'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isHeadOfQueue
                                      ? 'Queue #1 · Selling Now'
                                      : isDepleted
                                      ? 'Finished'
                                      : `Queue #${index + 1} · Waiting`}
                                  </span>
                                  {isHeadOfQueue && (
                                    <span className="text-[10px] font-bold text-indigo-700">
                                      Deducts First (Rule 4)
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    isDepleted
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {batch.status}
                                </span>
                              </div>

                              {/* Rule 2: Unique Batch ID */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Unique Batch ID</span>
                                <button
                                  onClick={() => handleCopyBatch(batch.batchNumber)}
                                  className="text-[11px] font-mono font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                                  title="Click to copy Batch ID"
                                >
                                  <span>{batch.batchNumber}</span>
                                  {copiedBatchId === batch.batchNumber ? (
                                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                                  ) : null}
                                </button>
                              </div>

                              {/* Rule 1: Supplier Info */}
                              <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/60 mb-2.5">
                                <span className="text-[10px] text-slate-400 block">
                                  Rule 1 · Stored Supplier Batch:
                                </span>
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {batch.supplier ? batch.supplier.name : 'Direct Consignment'}
                                </div>
                                {batch.supplier && (
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {batch.supplier.supplierCode} · {batch.supplier.city}
                                  </div>
                                )}
                              </div>

                              {/* Rule 3: Purchase Date */}
                              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2.5">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Purchase Date (FIFO)</span>
                                  <span className="font-mono font-semibold text-slate-700 flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3 text-slate-400" />
                                    <span>{batch.purchaseDate}</span>
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Cost Rate</span>
                                  <span className="font-mono font-semibold text-slate-700">
                                    {formatINR(Number(batch.purchaseRate))}
                                  </span>
                                </div>
                              </div>

                              {/* Stock Consumption Progress */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500">
                                    Remaining: <strong className="font-mono text-slate-900">{currQty}</strong> / {initQty} {batch.unit}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {pctRemaining}% left
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all rounded-full ${
                                      isDepleted
                                        ? 'bg-slate-300'
                                        : isHeadOfQueue
                                        ? 'bg-indigo-600'
                                        : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${pctRemaining}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                                  <span>Sold: {soldQty} {batch.unit}</span>
                                  {isHeadOfQueue && !isDepleted && (
                                    <span className="text-indigo-600 font-semibold">Active in POS Counter</span>
                                  )}
                                  {!isHeadOfQueue && !isDepleted && (
                                    <span className="text-slate-400">Unlocks when prior batch finishes</span>
                                  )}
                                </div>
                              </div>

                              {/* Batch Actions: Edit & Delete */}
                              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBatch(batch)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  title="Edit Batch"
                                >
                                  <EditIcon className="w-3 h-3 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalBatch(batch)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                  title="Delete Batch"
                                >
                                  <Trash2Icon className="w-3 h-3 text-slate-500" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: ALL BATCHES MASTER TABLE */}
      {/* ========================================================= */}
      {activeSubTab === 'table' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FilterIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Filters:</span>
              </span>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses ({batches.length})</option>
                <option value="ACTIVE">Active Only ({batches.filter((b) => b.status === 'ACTIVE').length})</option>
                <option value="DEPLETED">Depleted Finished ({batches.filter((b) => b.status === 'DEPLETED').length})</option>
              </select>

              {/* Product Filter */}
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Produce Varieties</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({p.variety || 'Standard'})
                  </option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Mandi Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredBatches.length} of {batches.length} batches
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Batch ID (Rule 2)</th>
                  <th className="py-2.5 px-3">Fruit Produce</th>
                  <th className="py-2.5 px-3">Supplier / Orchard (Rule 1)</th>
                  <th className="py-2.5 px-3">Purchase Date (Rule 3)</th>
                  <th className="py-2.5 px-3 text-right">Inward Qty</th>
                  <th className="py-2.5 px-3 text-right">Remaining Stock</th>
                  <th className="py-2.5 px-3 text-right">Cost Rate</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading batches...
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No matching batches found.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => (
                    <tr
                      key={b.id}
                      className={b.status === 'DEPLETED' ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => handleCopyBatch(b.batchNumber)}
                          className="hover:text-indigo-600 flex items-center gap-1 text-left cursor-pointer"
                          title="Click to copy"
                        >
                          <span>{b.batchNumber}</span>
                          {copiedBatchId === b.batchNumber && (
                            <CheckIcon className="w-3 h-3 text-emerald-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">
                          {b.product ? b.product.name : `Product #${b.productId}`}
                        </span>
                        {b.product && (
                          <span className="text-[10px] text-slate-400">
                            {b.product.variety} · Grade {b.product.grade || 'A'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {b.supplier ? b.supplier.name : 'Direct Mandi Consignment'}
                        </span>
                        {b.supplier && (
                          <span className="text-[10px] text-slate-400">
                            {b.supplier.supplierCode} · {b.supplier.city}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {b.purchaseDate}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium">
                        {b.initialQuantity} {b.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {b.currentQuantity} {b.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatINR(Number(b.purchaseRate))}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditBatch(b)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Batch"
                          >
                            <EditIcon className="w-3 h-3 text-slate-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalBatch(b)}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete Batch"
                          >
                            <Trash2Icon className="w-3 h-3 text-slate-500" />
                            <span>Delete</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAddStock(b.productId)}
                            className="px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Inward more"
                          >
                            + Inward
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: BILL SUPPLIER TRACE (RULE 6 AUDIT TRAIL) */}
      {/* ========================================================= */}
      {activeSubTab === 'allocations' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ReceiptTextIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Sales Bill Batch Trace &amp; Supplier Audit (Rule 6)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rule 6 Enforcement: Every bill records the exact quantity and supplier origin of produce sold
              </p>
            </div>

            <div className="text-xs font-mono text-slate-500">
              Total Logged Allocations: <strong>{allocations.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Bill / Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Fruit Produce</th>
                  <th className="py-2.5 px-3">Supplier Origin (Rule 6)</th>
                  <th className="py-2.5 px-3 font-mono">Deducted Batch ID</th>
                  <th className="py-2.5 px-3 text-right">Sold Qty</th>
                  <th className="py-2.5 px-3 text-right">Cost Rate</th>
                  <th className="py-2.5 px-3 text-right">Sale Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading sales bill allocations...
                    </td>
                  </tr>
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No sales allocations recorded yet. When a bill is saved, batch deductions appear here.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {alloc.invoice ? alloc.invoice.invoiceNumber : `#${alloc.invoiceId}`}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {alloc.allocatedDate || (alloc.invoice ? alloc.invoice.invoiceDate : '—')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {alloc.invoice ? alloc.invoice.customerName : 'Walk-in'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {alloc.product ? alloc.product.name : `Product #${alloc.productId}`}
                        </span>
                        {alloc.product && (
                          <span className="text-[10px] text-slate-400">{alloc.product.variety}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 font-semibold text-[11px]">
                          <BuildingIcon className="w-3 h-3 text-indigo-600" />
                          <span>
                            {alloc.supplier ? alloc.supplier.name : 'Direct Mandi Consignment'}
                          </span>
                        </div>
                        {alloc.supplier && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {alloc.supplier.supplierCode} · {alloc.supplier.city}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {alloc.batch ? alloc.batch.batchNumber : `Batch #${alloc.batchId}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {alloc.quantity} {alloc.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatINR(Number(alloc.purchaseRate))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatINR(Number(alloc.saleRate))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: RULES ARCHITECTURE & EXPLANATION */}
      {/* ========================================================= */}
      {activeSubTab === 'rules' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              FIFO Stack Management System Architecture
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Detailed technical and operational workflow of the 7 Stack Management rules implemented in Finovore ERP
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Rule 1 &amp; Rule 2
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Supplier Batch Separation &amp; Unique ID
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Even when produce shares the same product name (e.g. Royal Gala Apple), arrivals from different suppliers are stored as completely separate Batch records. Each Batch has a guaranteed unique ID formatted as <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-indigo-700 font-mono">BATCH-YYYYMMDD-S&lt;id&gt;-&lt;sku&gt;-&lt;rand&gt;</code>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Rule 3, 4 &amp; 5
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Strict FIFO Queue &amp; Sequential Depletion
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Active batches are ordered chronologically by <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800 font-mono">purchaseDate ASC</code>. When a sales bill is finalized, the system deducts units starting from the oldest batch. It moves to the next batch only after the current batch is 100% finished (currentQuantity = 0.00).
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Rule 6
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Traceable Supplier Origin in Every Bill
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every confirmed invoice item generates permanent audit records in the <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800 font-mono">invoice_item_batches</code> table detailing the exact quantity, batch ID, and supplier ID from which the fruit was fulfilled.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                Rule 7
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Backdated Arrival &amp; Sale Auto-Recalculation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an operator logs a backdated consignment purchase or historical sales invoice, the backend engine automatically resets batch stocks to initial quantities and replays all historical invoices in strict date sequence, re-allocating batches so FIFO sequence is never compromised.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD INWARD BATCH (RULE 1 & 2) */}
      {/* ========================================================= */}
      {isAddStockOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LayersIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Inward Fresh Produce Batch</h3>
                  <p className="text-xs text-slate-400">Rules 1 &amp; 2: Create isolated supplier batch with unique ID</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmInward} className="mt-4 space-y-3.5">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fruit Produce *
                </label>
                <select
                  value={inwardProductId || ''}
                  onChange={(e) => {
                    const pid = parseInt(e.target.value, 10);
                    setInwardProductId(pid);
                    const matched = products.find((p) => p.id === pid);
                    if (matched) {
                      setInwardUnit(matched.defaultUnit || 'BOX');
                      setInwardRate(Number(matched.purchaseRate) || 1500);
                    }
                    refreshAutoBatchNumber(pid, inwardSupplierId, inwardDate);
                  }}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.variety || 'Standard'}) · Currently: {p.currentStock || 0} {p.defaultUnit || 'BOX'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rule 1: Supplier */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Orchard Grower * (Rule 1: Stored as Separate Batch)
                </label>
                <select
                  value={inwardSupplierId || ''}
                  onChange={(e) => {
                    const sid = parseInt(e.target.value, 10) || null;
                    setInwardSupplierId(sid);
                    refreshAutoBatchNumber(inwardProductId, sid, inwardDate);
                  }}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- Select Mandi Supplier / Orchard --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city || 'Mandi'}) [{s.supplierCode}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Rule 3 & 7: Purchase Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consignment Date * (FIFO Rule 3)
                  </label>
                  <input
                    type="date"
                    required
                    value={inwardDate}
                    onChange={(e) => {
                      setInwardDate(e.target.value);
                      refreshAutoBatchNumber(inwardProductId, inwardSupplierId, e.target.value);
                    }}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-indigo-600 mt-0.5">Rule 7: Backdated auto-recalculates</p>
                </div>

                {/* Rule 2: Unique Batch ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Unique Batch ID * (Rule 2)
                    </label>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      Auto-generated
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={inwardBatchId}
                      title="Unique Batch ID is auto-generated to guarantee Rule 2 uniqueness"
                      className="w-full text-xs font-mono font-bold bg-slate-100/90 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => refreshAutoBatchNumber(inwardProductId, inwardSupplierId, inwardDate)}
                      title="Auto-generate new Unique Batch ID"
                      className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      <RefreshCwIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Auto-generated unique code (Rule 2)</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inward Qty *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={inwardQty}
                    onChange={(e) => setInwardQty(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={inwardUnit}
                    onChange={(e) => setInwardUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="BOX">BOX (~10kg)</option>
                    <option value="CRATE">CRATE (~22kg)</option>
                    <option value="KG">KG (Kilo)</option>
                    <option value="DOZEN">DOZEN (12)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rate (₹/unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={inwardRate}
                    onChange={(e) => setInwardRate(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consignment Notes
                </label>
                <input
                  type="text"
                  value={inwardNotes}
                  onChange={(e) => setInwardNotes(e.target.value)}
                  placeholder="e.g. Mandi arrival truck #MH-12-8812"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInward}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingInward ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Batch...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5 text-white" />
                      <span>Confirm Inward Batch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT BATCH (RULES 1, 2, 3 & 7) */}
      {/* ========================================================= */}
      {isEditModalOpen && editingBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Batch #{editingBatch.batchNumber}</h3>
                  <p className="text-xs text-slate-400">Rules 1, 2, 3 &amp; 7: Updates stock, supplier, or date with auto FIFO recalculation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBatch(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBatch} className="mt-4 space-y-4">
              {/* Product Info Read-only Pill */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Produce Item</span>
                  <span className="text-xs font-bold text-slate-900">
                    {editingBatch.product ? editingBatch.product.name : `Product #${editingBatch.productId}`}
                  </span>
                  {editingBatch.product && (
                    <span className="text-[11px] text-slate-500 ml-1">
                      ({editingBatch.product.variety} · Grade {editingBatch.product.grade || 'A'})
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  ID: #{editingBatch.id}
                </span>
              </div>

              {/* Unique Batch Number & Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch ID (Rule 2: Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editBatchNumber}
                    onChange={(e) => setEditBatchNumber(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supplier / Consignor (Rule 1)
                  </label>
                  <select
                    value={editSupplierId || ''}
                    onChange={(e) => setEditSupplierId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Direct Mandi Consignment</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.supplierCode} - {s.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Purchase Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Date (Rule 3: FIFO Order) *
                  </label>
                  <input
                    type="date"
                    required
                    value={editPurchaseDate}
                    onChange={(e) => setEditPurchaseDate(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ACTIVE">ACTIVE (In Stock)</option>
                    <option value="DEPLETED">DEPLETED (Finished)</option>
                    <option value="EXPIRED">EXPIRED (Discarded)</option>
                  </select>
                </div>
              </div>

              {/* Quantities & Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Inward *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editInitialQty}
                    onChange={(e) => setEditInitialQty(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remaining Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editCurrentQty}
                    onChange={(e) => setEditCurrentQty(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="BOX">BOX</option>
                    <option value="CRATE">CRATE</option>
                    <option value="KG">KG</option>
                    <option value="DOZEN">DOZEN</option>
                  </select>
                </div>
              </div>

              {/* Rate & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cost Rate (₹/unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editPurchaseRate}
                    onChange={(e) => setEditPurchaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consignment Notes
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="e.g. Cold storage room B4"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Rule 7 Notice Callout */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <span className="font-bold block mb-0.5">Rule 7 Automatic FIFO Recalculation:</span>
                Modifying the Purchase Date or Initial Inward changes the chronological priority. The backend engine will automatically re-sort batches and replay sales invoices in strict FIFO order.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingBatch(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving &amp; Replaying FIFO...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE BATCH CONFIRMATION (RULE 7) */}
      {/* ========================================================= */}
      {deleteModalBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Produce Batch?</h3>
                  <p className="text-xs text-slate-400">Permanently remove batch #{deleteModalBatch.batchNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalBatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Batch details summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch ID:</span>
                  <span className="font-mono font-bold text-slate-900">{deleteModalBatch.batchNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Produce Item:</span>
                  <span className="font-semibold text-slate-900">
                    {deleteModalBatch.product ? deleteModalBatch.product.name : `Product #${deleteModalBatch.productId}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold text-slate-800">
                    {deleteModalBatch.supplier ? deleteModalBatch.supplier.name : 'Direct Mandi Consignment'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inward Date:</span>
                  <span className="font-mono text-slate-700">{deleteModalBatch.purchaseDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Stock:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {deleteModalBatch.currentQuantity} {deleteModalBatch.unit}
                  </span>
                </div>
              </div>

              {/* Warning box */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
                <span className="font-bold block mb-1">Rule 7 Recalculation Notice:</span>
                Deleting this batch will remove its inventory. Historical bills that drew from this batch will be automatically recalculated in FIFO order from remaining older lots.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingBatch}
                  onClick={() => setDeleteModalBatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingBatch}
                  onClick={handleConfirmDeleteBatch}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isDeletingBatch ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting &amp; Replaying FIFO...</span>
                    </>
                  ) : (
                    <>
                      <Trash2Icon className="w-3.5 h-3.5 text-white" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
