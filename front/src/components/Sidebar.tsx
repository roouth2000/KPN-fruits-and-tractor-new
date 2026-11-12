import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import kbnLogo from '../assets/kbn-logo.jpeg';
import {
  LayoutGridIcon,
  PackageIcon,
  ArrowLeftRightIcon,
  ClipboardCheckIcon,
  ReceiptTextIcon,
  BuildingIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  UsersIcon,
  SettingsIcon,
  ChevronsUpDownIcon,
  PanelLeftIcon,
  FileTextIcon,
  DollarSignIcon,
  AlertOctagonIcon,
  RotateCcwIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  LogOutIcon,
} from './icons';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number | string;
  permission?: string;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { currentUser, isSalesperson, hasPermission, logout } = useAuth();
  const [reportsOpen, setReportsOpen] = useState(true);

  const reportItems: NavItem[] = [
    { id: 'report-stock', label: 'Stack / Stock (FIFO)', icon: PackageIcon, permission: 'reports.view' },
    { id: 'report-daily-sales', label: 'Daily Sales', icon: DollarSignIcon, permission: 'reports.view' },
    { id: 'report-monthly-sales', label: 'Monthly Sales', icon: BarChart3Icon, permission: 'reports.view' },
    { id: 'report-purchase', label: 'Purchase', icon: ReceiptTextIcon, permission: 'reports.view' },
    { id: 'report-profit', label: 'Profit', icon: TrendingUpIcon, permission: 'reports.financial' },
    { id: 'report-loss', label: 'Loss', icon: TrendingDownIcon, permission: 'reports.financial' },
    { id: 'report-damage', label: 'Damage', icon: AlertOctagonIcon, permission: 'reports.view' },
    { id: 'report-returns', label: 'Returns', icon: RotateCcwIcon, permission: 'reports.view' },
    { id: 'report-customer-due', label: 'Customer Due', icon: UsersIcon, permission: 'reports.view' },
    { id: 'report-supplier-due', label: 'Supplier Due', icon: BuildingIcon, permission: 'reports.view' },
    { id: 'report-tray', label: 'Tray Report', icon: LayersIcon, permission: 'reports.view' },
  ];

  const standardSections: NavSection[] = [
    {
      title: 'FRUIT INVENTORY',
      items: [
        { id: 'stack-management', label: 'Stack Management (FIFO)', icon: LayersIcon, permission: 'stock.view' },
        { id: 'products', label: 'Products / Fruits', icon: PackageIcon, permission: 'stock.view' },
        { id: 'stock-movements', label: 'Stock Movements', icon: ArrowLeftRightIcon, permission: 'stock.view' },
        { id: 'inventory-audit', label: 'Stock Audit & Quality', icon: ClipboardCheckIcon, permission: 'stock.adjust' },
      ],
    },
    {
      title: 'WHOLESALE TRADING',
      items: [
        { id: 'customers', label: 'Customers Directory', icon: UsersIcon, permission: 'customer.view' },
        { id: 'suppliers', label: 'Suppliers & Vendors', icon: BuildingIcon, permission: 'supplier.view' },
        { id: 'purchase-orders', label: 'Purchase Inward', icon: ReceiptTextIcon, permission: 'supplier.view' },
        { id: 'stock-transfers', label: 'Crates & Trays', icon: LayersIcon, permission: 'tray.view' },
      ],
    },
  ];

  const isAnyReportActive = activeTab.startsWith('report-');
  const canViewReports = hasPermission('reports.view');
  const canManageRoles = hasPermission('users.view') || hasPermission('roles.manage');

  // Avoid redundant state updates & re-renders if tab is already active
  const handleSelectTab = (tabId: string) => {
    if (activeTab === tabId) return;
    onSelectTab(tabId);
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 select-none flex-shrink-0 z-20 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={kbnLogo}
              alt="KBN Fruits and Traders"
              className="w-8 h-8 rounded-lg object-contain shadow-xs flex-shrink-0 border border-slate-200 bg-white p-0.5"
            />
            {!isCollapsed && (
              <span className="font-bold text-slate-900 tracking-tight text-sm font-sans truncate" title="KBN Fruits and Traders">
                KBN Fruits &amp; Traders
              </span>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <PanelLeftIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Organization switcher pill */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <button className="w-full text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl p-2.5 transition-all flex items-center justify-between group">
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-slate-900 truncate">
                  KBN Fruits and Traders
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  APMC Terminal · Bay #12, Vashi
                </div>
              </div>
              <ChevronsUpDownIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-1.5" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="px-2.5 py-2 space-y-3 max-h-[calc(100vh-210px)] overflow-y-auto">
          {/* Stack Management (FIFO Batches) - FIRST CLASS PRIMARY NAVIGATION (FIRST ADDED AT TOP) */}
          {!isSalesperson && (
            <button
              onClick={() => handleSelectTab('stack-management')}
              title={isCollapsed ? 'Stack Management (FIFO)' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
                activeTab === 'stack-management' || activeTab === 'stock'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'text-slate-800 hover:text-indigo-900 hover:bg-indigo-50/80 border border-transparent hover:border-indigo-100'
              }`}
            >
              <LayersIcon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  activeTab === 'stack-management' || activeTab === 'stock'
                    ? 'text-white'
                    : 'text-indigo-600'
                }`}
              />
              {!isCollapsed && (
                <span className="truncate text-left flex-1 flex items-center justify-between">
                  <span className="font-bold">Stack Management</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide ${
                    activeTab === 'stack-management' || activeTab === 'stock'
                      ? 'bg-indigo-700/80 text-white'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    FIFO #1
                  </span>
                </span>
              )}
            </button>
          )}

          {/* Main Command Center Link - Hidden for Sales Person */}
          {!isSalesperson && (
            <button
              onClick={() => handleSelectTab('command-center')}
              title={isCollapsed ? 'Command Center' : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative ${
                activeTab === 'command-center'
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutGridIcon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  activeTab === 'command-center' ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                }`}
              />
              {!isCollapsed && <span className="truncate text-left flex-1">Command Center</span>}
            </button>
          )}

          {/* Common Billing / POS Screen - ALWAYS SHOW FOR ALL ROLES! (Primary for Sales Person) */}
          <button
            onClick={() => handleSelectTab('billing')}
            title={isCollapsed ? 'Billing / POS' : undefined}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all group relative ${
              activeTab === 'billing' || activeTab === 'sales-billing'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-emerald-50/60'
            }`}
          >
            <DollarSignIcon
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                activeTab === 'billing' || activeTab === 'sales-billing' ? 'text-white' : 'text-emerald-600'
              }`}
            />
            {!isCollapsed && (
              <span className="truncate text-left flex-1 flex items-center justify-between">
                <span>Billing / POS</span>
                <span className="text-[10px] font-bold px-1.5 rounded bg-emerald-700/30 text-white">
                  {isSalesperson ? 'Primary' : 'Live'}
                </span>
              </span>
            )}
          </button>

          {/* Invoice List Page - View all bills and invoices */}
          <button
            onClick={() => handleSelectTab('invoices-list')}
            title={isCollapsed ? 'Invoices & Bills' : undefined}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all group relative ${
              activeTab === 'invoices-list' || activeTab === 'sales-invoices'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ReceiptTextIcon
              className={`w-4 h-4 flex-shrink-0 transition-colors ${
                activeTab === 'invoices-list' || activeTab === 'sales-invoices' ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
              }`}
            />
            {!isCollapsed && (
              <span className="truncate text-left flex-1 flex items-center justify-between">
                <span>Invoices & Bills</span>
                <span className="text-[10px] font-medium px-1.5 rounded bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                  History
                </span>
              </span>
            )}
          </button>

          {/* If SALESPERSON, show exclusive focus badge and hide all other modules */}
          {isSalesperson && !isCollapsed && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Sales Associate Mode</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                You are assigned to the Billing Desk. All managerial reports and stock modifications are restricted.
              </p>
            </div>
          )}

          {/* Non-Salesperson Navigation Modules */}
          {!isSalesperson && (
            <>
              {/* REPORTS Expandable Menu Section */}
              {canViewReports && (
                <div className="pt-1">
                  {!isCollapsed ? (
                    <div className="space-y-1">
                      <button
                        onClick={() => setReportsOpen((prev) => !prev)}
                        className={`w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 hover:text-slate-600 transition-colors ${
                          isAnyReportActive ? 'text-slate-700 font-extrabold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileTextIcon className="w-3.5 h-3.5" />
                          <span>REPORTS</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded-full">11</span>
                        </div>
                        {reportsOpen ? (
                          <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronRightIcon className="w-3 h-3 text-slate-400" />
                        )}
                      </button>

                      {reportsOpen && (
                        <div className="space-y-0.5 pl-2 border-l-2 border-slate-100 ml-3 mt-1">
                          {reportItems.map((rep) => {
                            // Filter reports based on financial permission
                            if (rep.permission && !hasPermission(rep.permission)) {
                              return null;
                            }
                            const Icon = rep.icon;
                            const isActive = activeTab === rep.id;
                            return (
                              <button
                                key={rep.id}
                                onClick={() => handleSelectTab(rep.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all text-left ${
                                  isActive
                                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span className="truncate flex-1">{rep.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative group">
                      <button
                        onClick={() => handleSelectTab('report-daily-sales')}
                        title="Reports (11 views)"
                        className={`w-full flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all ${
                          isAnyReportActive
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <FileTextIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Navigation Sections (Inventory & Wholesale Trading) */}
              {standardSections.map((section, idx) => (
                <div key={idx} className="space-y-0.5">
                  {section.title && !isCollapsed && (
                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {section.title}
                    </div>
                  )}
                  {section.items.map((item) => {
                    if (item.permission && !hasPermission(item.permission)) {
                      return null;
                    }
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-800'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate text-left flex-1">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Bottom Users & Roles + Settings */}
              <div className="pt-2 border-t border-slate-100 space-y-0.5">
                {canManageRoles && (
                  <button
                    onClick={() => handleSelectTab('users-roles')}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'users-roles' || activeTab === 'team'
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <UsersIcon className={`w-4 h-4 ${activeTab === 'users-roles' || activeTab === 'team' ? 'text-white' : 'text-indigo-600'}`} />
                    {!isCollapsed && <span>Users & Roles</span>}
                  </button>
                )}

                <button
                  onClick={() => handleSelectTab('settings')}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all ${
                    activeTab === 'settings' ? 'bg-slate-100 text-slate-900 font-semibold' : ''
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 text-slate-500" />
                  {!isCollapsed && <span>System Settings</span>}
                </button>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-1">
        <button
          onClick={() => {
            if (!isSalesperson) handleSelectTab('users-roles');
          }}
          className={`flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors text-left flex-1 min-w-0 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isSalesperson ? 'Salesperson Desk' : 'Click to manage Users & Roles'}
        >
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate">
                {currentUser?.name || 'Staff User'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentUser?.roleName || currentUser?.role}
              </div>
            </div>
          )}
        </button>

        {!isCollapsed ? (
          <button
            onClick={logout}
            title="Sign Out of Terminal"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={logout}
            title="Sign Out of Terminal"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOutIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};
