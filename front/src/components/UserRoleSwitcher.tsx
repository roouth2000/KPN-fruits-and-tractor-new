import React from 'react';
import { useAuth } from '../context/AuthContext';

interface RoleOption {
  slug: string;
  label: string;
  user: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
}

const roleOptions: RoleOption[] = [
  {
    slug: 'SUPERADMIN',
    label: 'Super Administrator',
    user: 'Super Administrator',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderCol: 'border-purple-300',
  },
  {
    slug: 'ADMIN',
    label: 'Store Administrator',
    user: 'Ramesh Store Admin',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    borderCol: 'border-blue-300',
  },
  {
    slug: 'CASHIER',
    label: 'Mandi Cashier',
    user: 'Rohan Sharma (Cashier)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    borderCol: 'border-amber-300',
  },
  {
    slug: 'SALESPERSON',
    label: 'Sales Person',
    user: 'Amit Verma (Sales)',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    borderCol: 'border-emerald-300',
  },
];

export const UserRoleSwitcher: React.FC = () => {
  const { currentUser, activeRole } = useAuth();

  const currentOption = roleOptions.find((r) => r.slug === activeRole) || {
    slug: activeRole || 'STAFF',
    label: activeRole || 'Staff',
    user: currentUser?.name || 'Staff User',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    borderCol: 'border-slate-300',
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white shadow-2xs text-left select-none"
      title={`Staff Account: ${currentUser?.name || currentOption.user} (${currentOption.label})`}
    >
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${currentOption.badgeBg} ${currentOption.badgeText} border ${currentOption.borderCol}`}
      >
        {currentOption.slug}
      </span>

      <div className="hidden sm:block text-xs">
        <div className="font-semibold text-slate-800 leading-tight">
          {currentUser?.name || currentOption.user}
        </div>
        <div className="text-[10px] text-slate-400">
          {activeRole === 'SALESPERSON' ? 'Bill Page Only' : currentOption.label}
        </div>
      </div>
    </div>
  );
};
