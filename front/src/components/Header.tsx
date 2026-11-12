import React, { useState, useMemo } from 'react';
import {
  SearchIcon,
  PlusIcon,
  BellIcon,
  LogOutIcon,
} from './icons';
import { UserRoleSwitcher } from './UserRoleSwitcher';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenNewOrder: () => void;
  onOpenSearch: () => void;
  onExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewOrder,
  onOpenSearch,
}) => {
  const { isSalesperson, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const notifications = [
    {
      id: 1,
      title: 'Pending PO payment reminder',
      desc: 'PO-1056 for Kiln & Co needs settlement before 14:00 today',
      time: '12m ago',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Low stock threshold alert',
      desc: 'Nagpur Oranges (Grade A) dropped below reorder threshold (38 crates)',
      time: '28m ago',
      type: 'info',
    },
    {
      id: 3,
      title: 'Fruit crate dispatch TR-0318',
      desc: 'En route to APMC Vashi terminal bay #4',
      time: '1h ago',
      type: 'success',
    },
  ];

  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    []
  );

  return (
    <header className="px-6 py-4 border-b border-slate-200/70 bg-white/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      {/* Title & metadata */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
            Command Center
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isSalesperson ? 'Sales Desk · Bill Only' : 'APMC Live Terminal'}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 font-normal">
          {todayFormatted} · APMC Market Terminal Bay #12
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-all w-52 sm:w-64 cursor-pointer text-left shadow-2xs group"
        >
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          <span className="truncate flex-1">Search SKUs and orders</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* + New order button */}
        <button
          onClick={onOpenNewOrder}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5 text-white" />
          <span>New order</span>
        </button>

        {/* Live RBAC Staff Profile Badge (Role switching disabled) */}
        <UserRoleSwitcher />

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setHasUnread(false);
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all relative"
            title="Notifications"
          >
            <BellIcon className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Notifications</span>
                <span className="text-[11px] text-slate-400">All caught up</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-800">{n.title}</h4>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="Sign out of system"
        >
          <LogOutIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
