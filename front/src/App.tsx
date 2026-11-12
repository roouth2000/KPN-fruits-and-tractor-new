import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BillingPage } from './modules/sales/pages/BillingPage';
import { InvoiceListPage } from './modules/sales/pages/InvoiceListPage';
import { CustomersPage } from './pages/CustomersPage';
import { RolesAndPermissionsPage } from './pages/RolesAndPermissionsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { ActivityItem } from './components/OperationsActivity';
import { NewOrderModal } from './components/NewOrderModal';
import { SearchModal } from './components/SearchModal';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';

// Report Pages
import {
  DailySalesPage,
  MonthlySalesPage,
  PurchaseReportPage,
  StockReportPage,
  ProfitReportPage,
  LossReportPage,
  DamageReportPage,
  ReturnsReportPage,
  CustomerDueReportPage,
  SupplierDueReportPage,
  TrayReportPage,
} from './pages/reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isSalesperson, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('billing'); // Default to Common Billing Screen!
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customActivities, setCustomActivities] = useState<ActivityItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stable tab switcher that ignores redundant clicks to the same tab
  const handleSelectTab = useCallback((newTab: string) => {
    setActiveTab((prev) => (prev === newTab ? prev : newTab));
  }, []);

  // Enforce "sale person bill page only show" rule (allows billing counter & invoices list)
  useEffect(() => {
    if (
      isSalesperson &&
      activeTab !== 'billing' &&
      activeTab !== 'sales-billing' &&
      activeTab !== 'invoices-list' &&
      activeTab !== 'sales-invoices'
    ) {
      setActiveTab('billing');
    }
  }, [isSalesperson, activeTab]);

  // Hotkey listener for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoized toast dispatch with deduplication to prevent toast floods
  const addToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => {
      // Discard duplicate toast if already showing to keep UI pristine
      const isDuplicate = prev.some((t) => t.title === title && t.message === message);
      if (isDuplicate) return prev;
      return [...prev, { id, title, message, type }];
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const handleApprovalSubmit = useCallback((orderData: {
    poNumber: string;
    supplier: string;
    total: number;
    approver: string;
  }) => {
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      title: `${orderData.poNumber} inward verified from ${orderData.supplier}`,
      operator: 'APMC Inward Desk',
      time: 'Just now',
      status: 'review',
    };
    setCustomActivities((prev) => [newActivity, ...prev]);

    addToast(
      'Purchase order submitted',
      `${orderData.poNumber} (₹${orderData.total.toLocaleString()}) logged for inward verification.`
    );
  }, [addToast]);

  const handleExport = useCallback((reportName = 'Report') => {
    const exportData = {
      report: reportName,
      generatedAt: new Date().toISOString(),
      facility: 'Finovore Produce Mandi Terminal (Bay #12, Vashi)',
      system: 'Finovore Wholesale ERP Billing Engine',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finovore-${reportName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('Data exported', `${reportName} downloaded as JSON.`);
  }, [addToast]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-wide">Authenticating Mandi Terminal...</h2>
        <p className="text-xs text-slate-400 mt-1">APMC Wholesale ERP</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderRestrictedNotice = (featureName: string) => (
    <div className="max-w-md mx-auto my-16 p-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl border border-rose-100">
        ✕
      </div>
      <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
      <p className="text-xs text-slate-500 mt-1">
        Your role ({isSalesperson ? 'Sales Person' : 'Current Staff'}) is restricted from viewing {featureName}.
        Only authorized screens are accessible.
      </p>
      <button
        onClick={() => setActiveTab('billing')}
        className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all cursor-pointer shadow-sm active:scale-95"
      >
        Return to Billing Desk
      </button>
    </div>
  );

  const renderActiveView = () => {
    switch (activeTab) {
      case 'billing':
      case 'sales-billing':
        return (
          <BillingPage
            onShowToast={addToast}
            onNavigateInvoices={() => setActiveTab('invoices-list')}
          />
        );
      case 'invoices-list':
      case 'sales-invoices':
      case 'invoices':
        return (
          <InvoiceListPage
            onNavigateNewBill={() => setActiveTab('billing')}
            onShowToast={addToast}
          />
        );
      case 'forecasting':
      case 'report-daily-sales':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Daily Sales Reports');
        }
        return (
          <DailySalesPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Daily Sales Report')}
          />
        );
      case 'analytics':
      case 'report-monthly-sales':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Monthly Analytics Reports');
        }
        return (
          <MonthlySalesPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Monthly Sales Report')}
          />
        );
      case 'purchase-orders':
      case 'report-purchase':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Purchase Order Reports');
        }
        return (
          <PurchaseReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Purchase Report')}
          />
        );
      case 'products':
      case 'stock':
      case 'stock-movements':
      case 'report-stock':
        if (isSalesperson || !hasPermission('stock.view')) {
          return renderRestrictedNotice('Inventory & Stock Audit');
        }
        return (
          <StockReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Stock & Inventory Report')}
            onShowToast={addToast}
          />
        );
      case 'customers':
      case 'customer':
      case 'customer-list':
        if (isSalesperson || !hasPermission('customer.view')) {
          return renderRestrictedNotice('Customer Directory');
        }
        return (
          <CustomersPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onNavigateBilling={() => setActiveTab('billing')}
            onShowToast={addToast}
          />
        );
      case 'report-profit':
        if (isSalesperson || !hasPermission('reports.financial')) {
          return renderRestrictedNotice('Financial Profit Analysis');
        }
        return (
          <ProfitReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Profit Report')}
          />
        );
      case 'report-loss':
        if (isSalesperson || !hasPermission('reports.financial')) {
          return renderRestrictedNotice('Loss & Margin Analysis');
        }
        return (
          <LossReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Loss Report')}
          />
        );
      case 'inventory-audit':
      case 'report-damage':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Produce Damage Reports');
        }
        return (
          <DamageReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Damage Report')}
          />
        );
      case 'report-returns':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Customer Returns Reports');
        }
        return (
          <ReturnsReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Returns & RMA Report')}
          />
        );
      case 'report-customer-due':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Customer Due Ledger Reports');
        }
        return (
          <CustomerDueReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Customer Due Report')}
            onSendReminder={(c) => addToast('Reminder sent', `Statement & reminder dispatched to ${c}`, 'info')}
          />
        );
      case 'suppliers':
      case 'report-supplier-due':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Supplier Outstandings');
        }
        return (
          <SupplierDueReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Supplier Due Report')}
            onSchedulePayment={(s) => addToast('Payment scheduled', `Payment batch queued for ${s}`, 'success')}
          />
        );
      case 'stock-transfers':
      case 'report-tray':
        if (isSalesperson || !hasPermission('reports.view')) {
          return renderRestrictedNotice('Mandi Tray Accounting');
        }
        return (
          <TrayReportPage
            onBackToDashboard={() => setActiveTab('command-center')}
            onExport={() => handleExport('Tray Asset Report')}
            onLogReturn={(b) => addToast('Asset scanned', `Tray batch ${b} logged at receiving dock`, 'success')}
          />
        );
      case 'settings':
        if (isSalesperson) {
          return renderRestrictedNotice('System Settings');
        }
        return (
          <SettingsPage
            onShowToast={addToast}
            onNavigateRoles={() => handleSelectTab('users-roles')}
          />
        );
      case 'users-roles':
      case 'team':
      case 'roles':
        if (isSalesperson || !hasPermission('roles.manage')) {
          return renderRestrictedNotice('Staff Roles & Permissions');
        }
        return <RolesAndPermissionsPage onShowToast={addToast} />;
      case 'command-center':
      default:
        if (isSalesperson) {
          return (
            <BillingPage
              onShowToast={addToast}
              onNavigateInvoices={() => handleSelectTab('invoices-list')}
            />
          );
        }
        return (
          <DashboardPage
            customActivities={customActivities}
            onNavigateReport={(repId) => handleSelectTab(repId)}
            onOpenNewOrder={() => handleSelectTab('billing')}
            onSendReminder={(cust, amt) =>
              addToast(
                'Reminder Dispatched',
                `WhatsApp & SMS payment reminder sent to ${cust} for ₹${amt.toLocaleString()}.`,
                'info'
              )
            }
            onPaySupplier={(supp, amt) =>
              addToast(
                'Payment Processed',
                `UPI/NEFT settlement initiated to ${supp} for ₹${amt.toLocaleString()}.`,
                'success'
              )
            }
          />
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-hidden font-sans antialiased text-slate-800">
      {/* Left Sidebar with expandable Reports Section and Common Billing */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full overflow-hidden">
        {/* Top Bar Header */}
        <Header
          onOpenNewOrder={() => handleSelectTab('billing')}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Active View / Canvas */}
        <main className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* New Purchase Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        onSubmitApproval={handleApprovalSubmit}
      />

      {/* Search / Command Palette */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAction={(item) => addToast('Selected item', item, 'info')}
      />

      {/* Toast Notification Stack */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
