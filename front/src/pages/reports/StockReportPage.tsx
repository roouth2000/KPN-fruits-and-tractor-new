import React, { useState, useEffect, useCallback } from 'react';
import { ReportHeader } from './components/ReportHeader';
import { ReportKpis } from './components/ReportKpis';
import { ReportTable } from './components/ReportTable';
import type { ReportColumn, ReportKpi } from './types';
import { formatINR } from '../../utils/helpers';
import { reportApi } from '../../services/reportApi';
import { salesApi } from '../../modules/sales/services/salesApi';
import type { Supplier, Batch } from '../../modules/sales/types/billing';
import {
  PlusIcon,
  PackageIcon,
  XIcon,
  RefreshCwIcon,
  LayersIcon,
  EditIcon,
  Trash2Icon,
  CheckIcon,
} from '../../components/icons';

interface StockRow {
  id: string;
  sku: string;
  name: string;
  variety: string;
  grade: string;
  unit: string;
  baseUnit: string;
  stock: string;
  baseStock: string;
  rate: number;
  purchaseRate: number;
  valuation: number;
  status: string;
  batchesCount?: number;
  batches?: any[];
}

interface StockReportPageProps {
  onBackToDashboard: () => void;
  onExport: () => void;
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const StockReportPage: React.FC<StockReportPageProps> = ({
  onBackToDashboard,
  onExport,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('Current Status');
  const [kpis, setKpis] = useState<ReportKpi[]>([]);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supplier & Batch Management State (FIFO Rules)
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [inwardPurchaseDate, setInwardPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Add Stock Modal State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [inwardQuantity, setInwardQuantity] = useState<number>(50);
  const [inwardUnit, setInwardUnit] = useState<string>('BOX');
  const [inwardRate, setInwardRate] = useState<number>(1500);
  const [inwardBatchLot, setInwardBatchLot] = useState<string>('');
  const [inwardNotes, setInwardNotes] = useState<string>('APMC Mandi Yard Inward');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  // Inspect Batches Slide-over / Modal State
  const [inspectBatchesProduct, setInspectBatchesProduct] = useState<StockRow | null>(null);
  const [inspectBatchesList, setInspectBatchesList] = useState<Batch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // New Fruit Modal State
  const [isNewFruitOpen, setIsNewFruitOpen] = useState(false);
  const [newFruitName, setNewFruitName] = useState('');
  const [newFruitVariety, setNewFruitVariety] = useState('');
  const [newFruitGrade, setNewFruitGrade] = useState('A');
  const [newFruitUnit, setNewFruitUnit] = useState('BOX');
  const [newFruitWholesale, setNewFruitWholesale] = useState<number>(2000);
  const [newFruitRetail, setNewFruitRetail] = useState<number>(2200);
  const [newFruitPurchase, setNewFruitPurchase] = useState<number>(1500);
  const [newFruitInitialStock, setNewFruitInitialStock] = useState<number>(0);
  const [newFruitMinLevel, setNewFruitMinLevel] = useState<number>(20);
  const [isSubmittingFruit, setIsSubmittingFruit] = useState(false);

  // Edit Batch Modal State (FIFO Stack)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editBatchNumber, setEditBatchNumber] = useState('');
  const [editSupplierId, setEditSupplierId] = useState<number | null>(null);
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editInitialQty, setEditInitialQty] = useState<number>(0);
  const [editCurrentQty, setEditCurrentQty] = useState<number>(0);
  const [editUnit, setEditUnit] = useState<string>('BOX');
  const [editPurchaseRate, setEditPurchaseRate] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSubmittingEditBatch, setIsSubmittingEditBatch] = useState(false);

  // Delete Batch Modal State
  const [deleteBatchModal, setDeleteBatchModal] = useState<Batch | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Edit Fruit SKU Modal State
  const [editingFruit, setEditingFruit] = useState<StockRow | null>(null);
  const [editFruitName, setEditFruitName] = useState('');
  const [editFruitVariety, setEditFruitVariety] = useState('');
  const [editFruitGrade, setEditFruitGrade] = useState('A');
  const [editFruitUnit, setEditFruitUnit] = useState('BOX');
  const [editFruitWholesale, setEditFruitWholesale] = useState<number>(2000);
  const [editFruitRetail, setEditFruitRetail] = useState<number>(2200);
  const [editFruitPurchase, setEditFruitPurchase] = useState<number>(1500);
  const [editFruitMinLevel, setEditFruitMinLevel] = useState<number>(20);
  const [isSubmittingEditFruit, setIsSubmittingEditFruit] = useState(false);

  // Delete Fruit SKU Modal State
  const [deleteFruitModal, setDeleteFruitModal] = useState<StockRow | null>(null);
  const [isDeletingFruit, setIsDeletingFruit] = useState(false);

  const loadStockData = useCallback(() => {
    setIsLoading(true);
    reportApi
      .getStockReport()
      .then((res) => {
        if (res) {
          setKpis(res.kpis || []);
          setRows(res.rows || []);
        }
      })
      .catch((err) => console.error('Failed to load stock report:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadStockData();
    // Load suppliers for stock inward
    salesApi
      .getSuppliers()
      .then((res) => {
        setSuppliers(res || []);
        if (res && res.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(res[0].id);
        }
      })
      .catch((err) => console.error('Failed to load suppliers:', err));
  }, [loadStockData]);

  // Load batches when inspectBatchesProduct changes
  useEffect(() => {
    if (inspectBatchesProduct) {
      setIsLoadingBatches(true);
      salesApi
        .getProductBatches(parseInt(inspectBatchesProduct.id, 10))
        .then((batches) => setInspectBatchesList(batches || []))
        .catch((err) => console.error('Failed to load product batches:', err))
        .finally(() => setIsLoadingBatches(false));
    } else {
      setInspectBatchesList([]);
    }
  }, [inspectBatchesProduct]);

  // Open Inward Stock Modal with selected fruit
  const handleOpenAddStock = (product?: StockRow) => {
    let pid: number | null = null;
    let unit = 'BOX';
    let rate = 1500;
    let sku = 'SKU';

    if (product) {
      pid = parseInt(product.id, 10);
      unit = product.unit || 'BOX';
      rate = product.purchaseRate || 1500;
      sku = product.sku ? product.sku.slice(-4) : 'LOT';
    } else if (rows.length > 0) {
      pid = parseInt(rows[0].id, 10);
      unit = rows[0].unit || 'BOX';
      rate = rows[0].purchaseRate || 1500;
      sku = rows[0].sku ? rows[0].sku.slice(-4) : 'LOT';
    }

    setSelectedProductId(pid);
    setInwardUnit(unit);
    setInwardRate(rate);

    const suppId = selectedSupplierId || (suppliers[0] ? suppliers[0].id : 1);
    setSelectedSupplierId(suppId);

    const todayStr = new Date().toISOString().slice(0, 10);
    setInwardPurchaseDate(todayStr);

    const dateCode = todayStr.replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    setInwardBatchLot(`BATCH-${dateCode}-S${suppId}-${sku}-${randCode}`);
    setInwardQuantity(50);
    setIsAddStockOpen(true);
  };

  // Submit Inward Stock (Rule 1 & Rule 2: Supplier Batch with Unique Batch ID)
  const handleInwardStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || inwardQuantity <= 0) {
      onShowToast?.('Invalid Quantity', 'Please enter a valid stock quantity.', 'warning');
      return;
    }

    setIsSubmittingStock(true);
    try {
      const res = await salesApi.addStock({
        productId: selectedProductId,
        quantity: inwardQuantity,
        supplierId: selectedSupplierId,
        purchaseDate: inwardPurchaseDate,
        batchNumber: inwardBatchLot,
        unit: inwardUnit,
        purchaseRate: inwardRate,
        notes: inwardNotes,
      });

      const matched = rows.find((r) => r.id === String(selectedProductId));
      const fruitLabel = matched ? `${matched.name} (${matched.variety})` : 'Product';
      const supp = suppliers.find((s) => s.id === selectedSupplierId);

      onShowToast?.(
        'Stock Batch Created',
        `Batch #${res.batch?.batchNumber || inwardBatchLot} (+${inwardQuantity} ${inwardUnit} of ${fruitLabel}) created under ${supp ? supp.name : 'Supplier'}.`,
        'success'
      );

      if (res.recalculated) {
        onShowToast?.(
          'FIFO Recalculated',
          'Backdated purchase consignment detected: FIFO queue and sales allocations were automatically re-synchronized!',
          'info'
        );
      }

      setIsAddStockOpen(false);
      loadStockData();
    } catch (err: any) {
      onShowToast?.(
        'Failed to Add Stock',
        err.response?.data?.message || err.message || 'Error updating stock',
        'warning'
      );
    } finally {
      setIsSubmittingStock(false);
    }
  };

  // Recalculate FIFO allocations (Rule 7)
  const handleRecalculateFIFO = async () => {
    setIsRecalculating(true);
    try {
      await salesApi.recalculateAllFIFO();
      onShowToast?.(
        'FIFO Recalculation Complete',
        'All warehouse stock batches and sales bills have been re-allocated in strict FIFO order based on purchase dates.',
        'success'
      );
      loadStockData();
      if (inspectBatchesProduct) {
        const batches = await salesApi.getProductBatches(parseInt(inspectBatchesProduct.id, 10));
        setInspectBatchesList(batches || []);
      }
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

  // Submit Register New Fruit
  const handleCreateFruitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFruitName.trim()) {
      onShowToast?.('Missing Name', 'Please provide a fruit name.', 'warning');
      return;
    }

    setIsSubmittingFruit(true);
    try {
      await salesApi.createProduct({
        name: newFruitName.trim(),
        variety: newFruitVariety.trim() || 'Standard',
        grade: newFruitGrade,
        defaultUnit: newFruitUnit,
        baseUnit: 'KG',
        conversionFactor: newFruitUnit === 'CRATE' ? 22 : newFruitUnit === 'DOZEN' ? 12 : 20,
        wholesaleRate: newFruitWholesale,
        retailRate: newFruitRetail,
        purchaseRate: newFruitPurchase,
        initialStock: newFruitInitialStock,
        minStockLevel: newFruitMinLevel,
      });

      onShowToast?.(
        'Fruit Registered',
        `${newFruitName} (${newFruitVariety || 'Standard'}) added to mandi catalog with ${newFruitInitialStock} ${newFruitUnit} stock.`,
        'success'
      );
      setIsNewFruitOpen(false);
      setNewFruitName('');
      setNewFruitVariety('');
      loadStockData();
    } catch (err: any) {
      onShowToast?.(
        'Failed to Register Fruit',
        err.response?.data?.message || err.message || 'Error creating fruit SKU',
        'warning'
      );
    } finally {
      setIsSubmittingFruit(false);
    }
  };

  // Handlers for Batch Edit & Delete (FIFO Stack)
  const handleOpenEditBatch = (batch: Batch) => {
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
  };

  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    if (!editBatchNumber.trim()) {
      onShowToast?.('Validation Error', 'Batch ID is required (Rule 2).', 'warning');
      return;
    }

    setIsSubmittingEditBatch(true);
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
      onShowToast?.(
        'Batch Updated',
        result?.recalculated
          ? `Batch #${editBatchNumber} updated. FIFO re-allocation calculated across historical bills (Rule 7).`
          : `Batch #${editBatchNumber} updated successfully.`,
        'success'
      );

      setEditingBatch(null);
      loadStockData();
      if (inspectBatchesProduct) {
        const updatedBatches = await salesApi.getProductBatches(parseInt(inspectBatchesProduct.id, 10));
        setInspectBatchesList(updatedBatches || []);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error updating batch';
      onShowToast?.('Update Failed', message, 'warning');
    } finally {
      setIsSubmittingEditBatch(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteBatchModal) return;

    setIsDeletingBatch(true);
    try {
      await salesApi.deleteBatch(deleteBatchModal.id);
      onShowToast?.(
        'Batch Deleted',
        `Batch #${deleteBatchModal.batchNumber} was deleted. FIFO allocations were recalculated (Rule 7).`,
        'success'
      );
      setDeleteBatchModal(null);
      loadStockData();
      if (inspectBatchesProduct) {
        const updatedBatches = await salesApi.getProductBatches(parseInt(inspectBatchesProduct.id, 10));
        setInspectBatchesList(updatedBatches || []);
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error deleting batch';
      onShowToast?.('Delete Failed', message, 'warning');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Handlers for Fruit SKU Edit & Delete
  const handleOpenEditFruit = (fruit: StockRow) => {
    setEditingFruit(fruit);
    setEditFruitName(fruit.name || '');
    setEditFruitVariety(fruit.variety || '');
    setEditFruitGrade(fruit.grade || 'A');
    setEditFruitUnit(fruit.unit || 'BOX');
    setEditFruitWholesale(fruit.rate || 2000);
    setEditFruitRetail(Math.round((fruit.rate || 2000) * 1.1));
    setEditFruitPurchase(fruit.purchaseRate || 1500);
    setEditFruitMinLevel(20);
  };

  const handleSaveEditFruit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFruit) return;

    setIsSubmittingEditFruit(true);
    try {
      await salesApi.updateProduct(parseInt(editingFruit.id, 10), {
        name: editFruitName.trim(),
        variety: editFruitVariety.trim(),
        grade: editFruitGrade.trim(),
        defaultUnit: editFruitUnit,
        wholesaleRate: editFruitWholesale,
        retailRate: editFruitRetail,
        purchaseRate: editFruitPurchase,
        minStockLevel: editFruitMinLevel,
      });

      onShowToast?.('Fruit SKU Updated', `${editFruitName} catalog details updated successfully.`, 'success');
      setEditingFruit(null);
      loadStockData();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error updating fruit SKU';
      onShowToast?.('Update Failed', message, 'warning');
    } finally {
      setIsSubmittingEditFruit(false);
    }
  };

  const handleConfirmDeleteFruit = async () => {
    if (!deleteFruitModal) return;

    setIsDeletingFruit(true);
    try {
      const res = await salesApi.deleteProduct(parseInt(deleteFruitModal.id, 10));
      onShowToast?.('Fruit Catalog Updated', res?.message || 'Product removed successfully.', 'success');
      setDeleteFruitModal(null);
      loadStockData();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error deleting fruit SKU';
      onShowToast?.('Delete Failed', message, 'warning');
    } finally {
      setIsDeletingFruit(false);
    }
  };

  const filtered = rows.filter(
    (s) =>
      s.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.variety.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ReportColumn<StockRow>[] = [
    {
      key: 'sku',
      header: 'SKU Code',
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Fruit Produce',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">{row.name}</span>
          <span className="text-[10px] text-slate-400 block">{row.variety} · Grade {row.grade}</span>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Sale Stock',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
          {row.stock}
        </span>
      ),
    },
    {
      key: 'batchesCount',
      header: 'Batches (FIFO)',
      align: 'center',
      render: (row) => (
        <button
          onClick={() => setInspectBatchesProduct(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors shadow-2xs"
          title="Inspect supplier batch lots & FIFO queue"
        >
          <LayersIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>{row.batchesCount || 0} Batches</span>
        </button>
      ),
    },
    {
      key: 'baseStock',
      header: 'Base Stock (Weight)',
      align: 'center',
      render: (row) => <span className="font-mono text-slate-600">{row.baseStock}</span>,
    },
    {
      key: 'rate',
      header: 'Wholesale Rate',
      align: 'right',
      render: (row) => <span className="font-mono font-semibold text-slate-800">{formatINR(row.rate)}</span>,
    },
    {
      key: 'purchaseRate',
      header: 'Procurement Rate',
      align: 'right',
      render: (row) => <span className="font-mono text-slate-500">{formatINR(row.purchaseRate)}</span>,
    },
    {
      key: 'valuation',
      header: 'Asset Valuation',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">
          {formatINR(row.valuation)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            row.status === 'Optimal'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : row.status.includes('Critical')
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenAddStock(row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title={`Add inward stock to ${row.name}`}
          >
            <PlusIcon className="w-3 h-3 text-emerald-600" />
            <span>Add Stock</span>
          </button>
          <button
            onClick={() => handleOpenEditFruit(row)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title={`Edit ${row.name} SKU & rates`}
          >
            <EditIcon className="w-3 h-3 text-slate-500" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setDeleteFruitModal(row)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title={`Delete / archive ${row.name}`}
          >
            <Trash2Icon className="w-3 h-3 text-slate-500" />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <ReportHeader
        title="Stock & Inventory Management"
        subtitle="Real-time multi-unit fruit inventory, inward arrivals, dual-unit conversion tracking, and mandi cold room valuations"
        onBack={onBackToDashboard}
        onExport={onExport}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      >
        <div className="flex items-center gap-2">
          {/* Recalculate FIFO Allocations (Rule 7) */}
          <button
            onClick={handleRecalculateFIFO}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Recalculate FIFO allocations across all products and backdated entries (Rule 7)"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 text-slate-500 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>{isRecalculating ? 'Re-allocating...' : 'Recalculate FIFO'}</span>
          </button>

          {/* Main Add Stock Button */}
          <button
            onClick={() => handleOpenAddStock()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>+ Add Stock (Inward)</span>
          </button>

          {/* Register New Fruit SKU */}
          <button
            onClick={() => setIsNewFruitOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <PackageIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>+ New Fruit SKU</span>
          </button>
        </div>
      </ReportHeader>

      <ReportKpis kpis={kpis} />

      <ReportTable
        title="Warehouse Inventory Positions"
        subtitle={`${filtered.length} fruit varieties actively cataloged in Mandi terminal`}
        count={filtered.length}
        columns={columns}
        data={filtered}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter by SKU, fruit name or variety..."
        emptyMessage={isLoading ? 'Loading live inventory from warehouse database...' : 'No stock records found.'}
      />

      {/* ========================================================= */}
      {/* MODAL 1: ADD / INWARD STOCK TO INVENTORY */}
      {/* ========================================================= */}
      {isAddStockOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PackageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Inward Fresh Produce Stock</h3>
                  <p className="text-xs text-slate-400">Receive new consignment lots into Mandi storage</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInwardStockSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Fruit Produce *
                </label>
                <select
                  value={selectedProductId || ''}
                  onChange={(e) => {
                    const pid = parseInt(e.target.value, 10);
                    setSelectedProductId(pid);
                    const matched = rows.find((r) => r.id === String(pid));
                    if (matched) {
                      setInwardUnit(matched.unit || 'BOX');
                      setInwardRate(matched.purchaseRate || 1500);
                      const dStr = inwardPurchaseDate.replace(/-/g, '');
                      const sku = matched.sku ? matched.sku.slice(-4) : 'LOT';
                      setInwardBatchLot(`BATCH-${dStr}-S${selectedSupplierId || 1}-${sku}-${Math.floor(100 + Math.random() * 900)}`);
                    }
                  }}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.variety}) · Currently: {r.stock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rule 1: Supplier Selection (Separate Batch per Supplier) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier / Orchard Grower * (Rule 1: Stored as Separate Batch)
                </label>
                <select
                  value={selectedSupplierId || ''}
                  onChange={(e) => {
                    const sid = parseInt(e.target.value, 10) || null;
                    setSelectedSupplierId(sid);
                    const matched = rows.find((r) => r.id === String(selectedProductId));
                    const sku = matched && matched.sku ? matched.sku.slice(-4) : 'LOT';
                    const dStr = inwardPurchaseDate.replace(/-/g, '');
                    setInwardBatchLot(`BATCH-${dStr}-S${sid || 'DIR'}-${sku}-${Math.floor(100 + Math.random() * 900)}`);
                  }}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
                {/* Rule 3 & 7: Purchase Date in FIFO Order */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consignment Date * (FIFO Sorted)
                  </label>
                  <input
                    type="date"
                    required
                    value={inwardPurchaseDate}
                    onChange={(e) => {
                      setInwardPurchaseDate(e.target.value);
                      const matched = rows.find((r) => r.id === String(selectedProductId));
                      const sku = matched && matched.sku ? matched.sku.slice(-4) : 'LOT';
                      const dStr = e.target.value.replace(/-/g, '');
                      setInwardBatchLot(`BATCH-${dStr}-S${selectedSupplierId || 'DIR'}-${sku}-${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Rule 7: Backdated recalculates FIFO</p>
                </div>

                {/* Rule 2: Unique Batch ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unique Batch ID * (Rule 2)
                  </label>
                  <input
                    type="text"
                    required
                    value={inwardBatchLot}
                    onChange={(e) => setInwardBatchLot(e.target.value)}
                    placeholder="e.g. BATCH-20261111-S1-GALA-001"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Auto-generated unique code</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inward Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={inwardQuantity}
                    onChange={(e) => setInwardQuantity(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50"
                    className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Packaging Unit
                  </label>
                  <select
                    value={inwardUnit}
                    onChange={(e) => setInwardUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  >
                    <option value="BOX">BOX (~20kg)</option>
                    <option value="CRATE">CRATE (~22kg)</option>
                    <option value="KG">KG (Kilo)</option>
                    <option value="DOZEN">DOZEN (12 Units)</option>
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
                    placeholder="e.g. 1500"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandi Gate Notes / Consignment Reference
                </label>
                <input
                  type="text"
                  value={inwardNotes}
                  onChange={(e) => setInwardNotes(e.target.value)}
                  placeholder="e.g. Truck TR-0318 inward at Gate #2"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
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
                  disabled={isSubmittingStock}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingStock ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Inwarding...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5 text-white" />
                      <span>Confirm Stock Inward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: REGISTER NEW FRUIT VARIETY */}
      {/* ========================================================= */}
      {isNewFruitOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PackageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Fruit Variety</h3>
                  <p className="text-xs text-slate-400">Add a new fruit SKU to the APMC pricing catalog</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewFruitOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFruitSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fruit Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFruitName}
                    onChange={(e) => setNewFruitName(e.target.value)}
                    placeholder="e.g. Grapes or Strawberry"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Variety / Cultivar
                  </label>
                  <input
                    type="text"
                    value={newFruitVariety}
                    onChange={(e) => setNewFruitVariety(e.target.value)}
                    placeholder="e.g. Sonaka Seedless"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quality Grade
                  </label>
                  <select
                    value={newFruitGrade}
                    onChange={(e) => setNewFruitGrade(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    <option value="A+">Grade A+ (Premium Export)</option>
                    <option value="A">Grade A (Standard Mandi)</option>
                    <option value="B">Grade B (Economy)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Unit
                  </label>
                  <select
                    value={newFruitUnit}
                    onChange={(e) => setNewFruitUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    <option value="BOX">BOX (Corrugated Box ~20kg)</option>
                    <option value="CRATE">CRATE (Plastic Crate ~22kg)</option>
                    <option value="KG">KG (Kilogram)</option>
                    <option value="DOZEN">DOZEN (12 Units)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wholesale (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newFruitWholesale}
                    onChange={(e) => setNewFruitWholesale(parseFloat(e.target.value) || 0)}
                    placeholder="2000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Retail (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newFruitRetail}
                    onChange={(e) => setNewFruitRetail(parseFloat(e.target.value) || 0)}
                    placeholder="2200"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procure (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newFruitPurchase}
                    onChange={(e) => setNewFruitPurchase(parseFloat(e.target.value) || 0)}
                    placeholder="1500"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Inward Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newFruitInitialStock}
                    onChange={(e) => setNewFruitInitialStock(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Safety Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={newFruitMinLevel}
                    onChange={(e) => setNewFruitMinLevel(parseFloat(e.target.value) || 0)}
                    placeholder="20"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewFruitOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFruit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingFruit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <PackageIcon className="w-3.5 h-3.5 text-white" />
                      <span>Save Fruit SKU</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: FIFO BATCHES & SUPPLIER TRACE MODAL */}
      {/* ========================================================= */}
      {inspectBatchesProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LayersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    FIFO Batches &amp; Supplier Lots: {inspectBatchesProduct.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {inspectBatchesProduct.variety} · Grade {inspectBatchesProduct.grade} · Available: {inspectBatchesProduct.stock}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenAddStock(inspectBatchesProduct);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Inward Lot</span>
                </button>
                <button
                  onClick={() => setInspectBatchesProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* FIFO Alert Note */}
            <div className="my-4 p-3 bg-indigo-50/70 border border-indigo-200/60 rounded-xl text-xs text-indigo-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Strict FIFO Queue Rules Active</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                1. Stored as separate batches per supplier · 2. Unique Batch IDs · 3. Sorted by Purchase Date (FIFO) · 4. Sales deduct from the oldest batch first · 5. Moves to the next batch only after the older is completely finished · 6. Supplier trace recorded in every bill.
              </p>
            </div>

            {/* Batches Table */}
            <div className="flex-1 overflow-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Batch ID</th>
                    <th className="py-2.5 px-3">Supplier / Orchard</th>
                    <th className="py-2.5 px-3">Purchase Date</th>
                    <th className="py-2.5 px-3 text-right">Inward Qty</th>
                    <th className="py-2.5 px-3 text-right">Remaining Stock</th>
                    <th className="py-2.5 px-3 text-right">Cost Rate</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingBatches ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Loading FIFO batches from database...
                      </td>
                    </tr>
                  ) : inspectBatchesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No batch records found for this product produce.
                      </td>
                    </tr>
                  ) : (
                    inspectBatchesList.map((b, idx) => (
                      <tr key={b.id} className={b.status === 'DEPLETED' ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/70'}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-normal">#{idx + 1}</span>
                            <span>{b.batchNumber}</span>
                          </div>
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
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {b.purchaseDate}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-600">
                          {b.initialQuantity} {b.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {b.currentQuantity} {b.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatINR(b.purchaseRate)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : b.status === 'DEPLETED'
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
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
                              onClick={() => setDeleteBatchModal(b)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                              title="Delete Batch"
                            >
                              <Trash2Icon className="w-3 h-3 text-slate-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">
                Sorted by Purchase Date in strict FIFO order (Oldest stock fulfilled first)
              </span>
              <button
                type="button"
                onClick={() => setInspectBatchesProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: EDIT BATCH (FIFO RULES 1, 2, 3 & 7) */}
      {/* ========================================================= */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Batch #{editingBatch.batchNumber}</h3>
                  <p className="text-xs text-slate-400">Rules 1, 2, 3 &amp; 7: Updates lot stock with auto FIFO recalculation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBatch} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Produce Item</span>
                  <span className="text-xs font-bold text-slate-900">
                    {inspectBatchesProduct ? inspectBatchesProduct.name : `Product #${editingBatch.productId}`}
                  </span>
                  {inspectBatchesProduct && (
                    <span className="text-[11px] text-slate-500 ml-1">
                      ({inspectBatchesProduct.variety} · Grade {inspectBatchesProduct.grade})
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                  Batch ID: #{editingBatch.id}
                </span>
              </div>

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
                    placeholder="e.g. Cold room rack A2"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <span className="font-bold block mb-0.5">Rule 7 Automatic FIFO Recalculation:</span>
                Modifying the Purchase Date or Initial Inward changes the chronological priority. The engine will automatically re-sort batches and replay sales invoices in strict FIFO order.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditBatch}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEditBatch ? (
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
      {/* MODAL 5: DELETE BATCH CONFIRMATION (RULE 7) */}
      {/* ========================================================= */}
      {deleteBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Batch Lot?</h3>
                  <p className="text-xs text-slate-400">Permanently remove batch #{deleteBatchModal.batchNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteBatchModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch ID:</span>
                  <span className="font-mono font-bold text-slate-900">{deleteBatchModal.batchNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="font-semibold text-slate-800">
                    {deleteBatchModal.supplier ? deleteBatchModal.supplier.name : 'Direct Mandi Consignment'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inward Date:</span>
                  <span className="font-mono text-slate-700">{deleteBatchModal.purchaseDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Stock:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {deleteBatchModal.currentQuantity} {deleteBatchModal.unit}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
                <span className="font-bold block mb-1">Rule 7 Recalculation Notice:</span>
                Deleting this batch will remove its inventory. Historical bills that drew from this batch will be automatically recalculated in FIFO order from remaining older lots.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingBatch}
                  onClick={() => setDeleteBatchModal(null)}
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

      {/* ========================================================= */}
      {/* MODAL 6: EDIT FRUIT SKU */}
      {/* ========================================================= */}
      {editingFruit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Fruit SKU: {editingFruit.name}</h3>
                  <p className="text-xs text-slate-400">Update produce rates, grade, and unit specifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFruit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFruit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fruit Name *</label>
                  <input
                    type="text"
                    required
                    value={editFruitName}
                    onChange={(e) => setEditFruitName(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Variety</label>
                  <input
                    type="text"
                    value={editFruitVariety}
                    onChange={(e) => setEditFruitVariety(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grade</label>
                  <select
                    value={editFruitGrade}
                    onChange={(e) => setEditFruitGrade(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="A">Grade A (Premium)</option>
                    <option value="A+">Grade A+ (Export)</option>
                    <option value="B">Grade B (Standard)</option>
                    <option value="C">Grade C (Economy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Unit</label>
                  <select
                    value={editFruitUnit}
                    onChange={(e) => setEditFruitUnit(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="BOX">BOX (~20kg)</option>
                    <option value="CRATE">CRATE (~22kg)</option>
                    <option value="KG">KG (Kilo)</option>
                    <option value="DOZEN">DOZEN (12)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wholesale Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFruitWholesale}
                    onChange={(e) => setEditFruitWholesale(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Procurement (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFruitPurchase}
                    onChange={(e) => setEditFruitPurchase(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Retail Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFruitRetail}
                    onChange={(e) => setEditFruitRetail(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Min Safety Level</label>
                <input
                  type="number"
                  min="0"
                  value={editFruitMinLevel}
                  onChange={(e) => setEditFruitMinLevel(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingFruit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditFruit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEditFruit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving SKU...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                      <span>Update Fruit SKU</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: DELETE FRUIT SKU CONFIRMATION */}
      {/* ========================================================= */}
      {deleteFruitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Fruit SKU?</h3>
                  <p className="text-xs text-slate-400">{deleteFruitModal.name} ({deleteFruitModal.sku})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteFruitModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fruit Name:</span>
                  <span className="font-bold text-slate-900">{deleteFruitModal.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU Code:</span>
                  <span className="font-mono text-slate-700">{deleteFruitModal.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stock:</span>
                  <span className="font-mono font-bold text-slate-900">{deleteFruitModal.stock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batches Count:</span>
                  <span className="font-mono text-indigo-600 font-semibold">{deleteFruitModal.batchesCount || 0} Batches</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
                If batches or sales transactions exist for this produce, the system will safely deactivate and archive the catalog record to preserve all accounting and historical ledger integrity.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeletingFruit}
                  onClick={() => setDeleteFruitModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingFruit}
                  onClick={handleConfirmDeleteFruit}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isDeletingFruit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
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
