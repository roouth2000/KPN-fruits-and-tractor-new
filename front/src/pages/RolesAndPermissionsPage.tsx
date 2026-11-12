import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import type { RoleData, PermissionItem, UserProfile } from '../services/authApi';
import {
  UsersIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  CheckSquareIcon,
  PlusIcon,
  SaveIcon,
  RefreshCwIcon,
} from '../components/icons';

interface RolesAndPermissionsPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const RolesAndPermissionsPage: React.FC<RolesAndPermissionsPageProps> = ({ onShowToast }) => {
  const { activeRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'matrix' | 'users' | 'roles'>('matrix');
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState<Record<string, PermissionItem[]>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable local state for permissions matrix: roleSlug -> Set of permission slugs
  const [rolePermsMap, setRolePermsMap] = useState<Record<string, Set<string>>>({});

  // New user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    roleSlug: 'SALESPERSON',
  });

  const onShowToastRef = useRef(onShowToast);
  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      setIsLoading(true);
      const [rolesData, permsData, usersData] = await Promise.all([
        authApi.getRoles(),
        authApi.getAllPermissions(),
        authApi.getUsers(),
      ]);

      if (!isMountedRef.current) return;

      setRoles(rolesData || []);
      setPermissionsGrouped(permsData?.grouped || {});
      setUsers(usersData || []);

      // Initialize permissions matrix map
      const map: Record<string, Set<string>> = {};
      for (const r of rolesData || []) {
        map[r.slug] = new Set(r.permissions);
      }
      setRolePermsMap(map);
    } catch (err: any) {
      if (isMountedRef.current) {
        onShowToastRef.current?.(
          'Failed to load RBAC data',
          err.response?.data?.message || err.message || 'Error connecting to backend',
          'warning'
        );
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleTogglePermission = (roleSlug: string, permSlug: string) => {
    if (roleSlug === 'SUPERADMIN') {
      onShowToast?.('Permission locked', 'Superadmin always maintains wildcard access to all modules.', 'info');
      return;
    }

    setRolePermsMap((prev) => {
      const currentSet = new Set(prev[roleSlug] || []);
      if (currentSet.has(permSlug)) {
        currentSet.delete(permSlug);
      } else {
        currentSet.add(permSlug);
      }
      return {
        ...prev,
        [roleSlug]: currentSet,
      };
    });
  };

  const handleSaveRolePermissions = async (roleSlug: string) => {
    const role = roles.find((r) => r.slug === roleSlug);
    if (!role) return;

    try {
      setIsSaving(true);
      const permsArray = Array.from(rolePermsMap[roleSlug] || []);
      await authApi.updateRolePermissions(role.id, permsArray);
      onShowToast?.('Permissions Saved', `Role "${role.name}" updated with ${permsArray.length} active permissions.`, 'success');
      await loadData();
    } catch (err: any) {
      onShowToast?.('Update Failed', err.message || 'Failed to update role permissions', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authApi.createUser(newUserData);
      onShowToast?.('User Created', `Staff member ${newUserData.name} [${newUserData.roleSlug}] created successfully.`, 'success');
      setIsAddUserOpen(false);
      setNewUserData({
        username: '',
        name: '',
        email: '',
        password: '',
        roleSlug: 'SALESPERSON',
      });
      await loadData();
    } catch (err: any) {
      onShowToast?.('Creation Failed', err.message || 'Error creating user', 'warning');
    }
  };

  const canManageRoles = hasPermission('roles.manage');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <KeyRoundIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
                User Roles & Permissions Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Control access levels, configure permission gates, and simulate roles across the wholesale ERP
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManageRoles && (
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Staff User</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Permissions Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Staff Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckSquareIcon className="w-4 h-4" />
          <span>Role Summary & Access Bounds</span>
        </button>
      </div>

      {/* TAB 1: PERMISSION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Key Rule Callout Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900">Configured Role Permissions:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                <li><strong className="text-emerald-700">Sales Person:</strong> Strictly restricted to the Billing / POS page (<code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono">/sales/billing</code>). Cannot edit confirmed bills or view management reports.</li>
                <li><strong className="text-blue-700">Store Admin & Superadmin:</strong> Full invoice editing permission (<code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono">sales.edit</code>) and invoice cancellation with atomic stock reversal (<code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono">sales.cancel</code>).</li>
                <li><strong className="text-amber-700">Mandi Cashier:</strong> Create invoices, accept payments, collect previous dues, and print bills.</li>
              </ul>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-72">Permission & Capability</th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-purple-700">Superadmin</span>
                        <span className="text-[10px] text-slate-400 font-normal">All 28 perms</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-blue-700">Store Admin</span>
                        <span className="text-[10px] text-slate-400 font-normal">Invoice Edit / Cancel</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-amber-700">Cashier</span>
                        <span className="text-[10px] text-slate-400 font-normal">POS / Dues / Print</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-emerald-700">Sales Person</span>
                        <span className="text-[10px] text-slate-400 font-normal">Bill Page Only</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(permissionsGrouped).map(([moduleName, perms]) => (
                    <React.Fragment key={moduleName}>
                      {/* Module Header Bar */}
                      <tr className="bg-slate-100/70">
                        <td colSpan={5} className="py-2 px-4 font-bold text-slate-800 text-[11px] tracking-wide uppercase">
                          {moduleName} MODULE ({perms.length})
                        </td>
                      </tr>

                      {/* Permissions in Module */}
                      {perms.map((p) => {
                        const adminActive = rolePermsMap.ADMIN?.has(p.slug);
                        const cashierActive = rolePermsMap.CASHIER?.has(p.slug);
                        const salesActive = rolePermsMap.SALESPERSON?.has(p.slug);

                        const isSpecialInvoiceEdit = p.slug === 'sales.edit' || p.slug === 'sales.cancel';

                        return (
                          <tr key={p.slug} className={`hover:bg-slate-50/80 transition-colors ${isSpecialInvoiceEdit ? 'bg-amber-50/20' : ''}`}>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {isSpecialInvoiceEdit && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    Admin Only
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{p.description}</div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">{p.slug}</div>
                            </td>

                            {/* Superadmin column */}
                            <td className="py-2 px-3 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-700 font-bold" title="Superadmin wildcard access">
                                ✓
                              </span>
                            </td>

                            {/* Admin column */}
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('ADMIN', p.slug)}
                                disabled={!canManageRoles}
                                className={`w-6 h-6 rounded-md font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  adminActive
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {adminActive ? '✓' : '—'}
                              </button>
                            </td>

                            {/* Cashier column */}
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('CASHIER', p.slug)}
                                disabled={!canManageRoles}
                                className={`w-6 h-6 rounded-md font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  cashierActive
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {cashierActive ? '✓' : '—'}
                              </button>
                            </td>

                            {/* Salesperson column */}
                            <td className="py-2 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('SALESPERSON', p.slug)}
                                disabled={!canManageRoles}
                                className={`w-6 h-6 rounded-md font-bold transition-all inline-flex items-center justify-center cursor-pointer ${
                                  salesActive
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {salesActive ? '✓' : '—'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions for Matrix */}
            {canManageRoles && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Click any checkbox above to adjust role access in real-time, then save changes to MySQL.
                </div>

                <div className="flex items-center gap-2">
                  {['ADMIN', 'CASHIER', 'SALESPERSON'].map((slug) => (
                    <button
                      key={slug}
                      onClick={() => handleSaveRolePermissions(slug)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-all shadow-2xs cursor-pointer"
                    >
                      <SaveIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Save {slug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Staff Accounts ({users.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Staff credentials and associated role permission profiles
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Permissions Active</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Switch / Simulate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = activeRole === u.role;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email} · @{u.username}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'SUPERADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'CASHIER'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-medium text-slate-700">
                          {u.permissionsCount || u.permissions?.length || 0} Permissions
                        </span>
                        {u.role === 'SALESPERSON' && (
                          <div className="text-[10px] text-emerald-700 font-semibold">Bill Page Only</div>
                        )}
                        {u.role === 'ADMIN' && (
                          <div className="text-[10px] text-blue-700 font-semibold">Invoice Edit Enabled</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            isCurrent
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isCurrent ? 'Current Session' : 'Active Account'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE SUMMARY & DEFINITIONS */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sales Person Card */}
          <div className="bg-white rounded-xl border border-emerald-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  SALESPERSON
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Bill Page Only Show
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">Sales Associate / Booking Desk</h3>
              <p className="text-xs text-slate-500 mt-1">
                Designed for retail counter operators and booking clerks who must ONLY access the bill generation screen.
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span><strong>Accessible:</strong> Common Billing / POS page (<code className="font-mono text-[11px]">/sales/billing</code>)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span><strong>Capabilities:</strong> Fast item lookup, cash & customer billing, bill printing</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span><strong>Blocked:</strong> No invoice edit, no invoice cancellation, no profit/loss reports, no settings</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] font-medium text-slate-400">
                Assigned at login via staff credentials
              </span>
            </div>
          </div>

          {/* Store Administrator Card */}
          <div className="bg-white rounded-xl border border-blue-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  ADMIN
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                  Invoice Edit & Void Rights
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">Store & Branch Administrator</h3>
              <p className="text-xs text-slate-500 mt-1">
                Authorized supervisor with full operational control over billing, pricing overrides, returns, and reports.
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span><strong>Invoice Edit:</strong> Allowed to edit invoices, adjust bill discounts, and revise terms</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span><strong>Cancellation:</strong> Atomic invoice cancellation with ledger reversal and stock restock</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span><strong>Reports:</strong> Full visibility into Profit, Loss, APMC Margins, and Customer Dues</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] font-medium text-slate-400">
                Assigned at login via staff credentials
              </span>
            </div>
          </div>

          {/* Mandi Cashier Card */}
          <div className="bg-white rounded-xl border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  CASHIER
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Billing & Due Collection
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">Counter Billing Cashier</h3>
              <p className="text-xs text-slate-500 mt-1">
                Handles daily counter sales, multi-mode split payments (Cash, UPI, Bank), and previous due collection.
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span><strong>Sales & Dues:</strong> Scenario 52 (Previous Due + New Sale) and Scenario 54 (Due Collection)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span><strong>Printing:</strong> Issue thermal slips and A4 tax invoices</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span><strong>Restricted:</strong> Cannot edit confirmed invoices or cancel transactions</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] font-medium text-slate-400">
                Assigned at login via staff credentials
              </span>
            </div>
          </div>

          {/* Superadmin Card */}
          <div className="bg-white rounded-xl border border-purple-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  SUPERADMIN
                </span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  Unrestricted System Access
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">Super Administrator</h3>
              <p className="text-xs text-slate-500 mt-1">
                Master level access: modify role permissions matrix, manage system users, perform audit reviews.
              </p>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span><strong>Permissions:</strong> Wildcard bypass over all 28 system permissions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span><strong>Security:</strong> Configure role permissions and grant access to other staff</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <span className="text-[11px] font-medium text-slate-400">
                Assigned at login via staff credentials
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 font-sans">Add Staff Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Create a new employee user account and assign their role</p>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Patil"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUserData.username}
                  onChange={(e) => setNewUserData((p) => ({ ...p, username: e.target.value }))}
                  placeholder="e.g. rahul"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="rahul@finovore.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Password@123"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newUserData.roleSlug}
                  onChange={(e) => setNewUserData((p) => ({ ...p, roleSlug: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="SALESPERSON">Sales Person (Bill Page Only)</option>
                  <option value="CASHIER">Mandi Cashier (POS / Dues)</option>
                  <option value="ADMIN">Store Administrator (Full Edit / Cancel)</option>
                  <option value="SUPERADMIN">Super Administrator (Master)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
