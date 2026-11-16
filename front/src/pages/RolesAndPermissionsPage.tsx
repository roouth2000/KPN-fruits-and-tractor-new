import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  EditIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  UserCheckIcon,
} from '../components/icons';

interface RolesAndPermissionsPageProps {
  onShowToast?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; badgeBg: string; badgeText: string; border: string; accent: string; icon: string; description: string }
> = {
  SUPERADMIN: {
    label: 'Super Administrator',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    border: 'border-purple-200',
    accent: 'bg-purple-600',
    icon: '👑',
    description: 'Supreme access across all wholesale ERP modules, system configuration, and audit logs.',
  },
  ADMIN: {
    label: 'Store Administrator',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    border: 'border-blue-200',
    accent: 'bg-blue-600',
    icon: '🛡️',
    description: 'Invoice editing, void/cancellation with stock reversal, customer/supplier ledgers, and reports.',
  },
  CASHIER: {
    label: 'Mandi Cashier',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    border: 'border-amber-200',
    accent: 'bg-amber-600',
    icon: '💰',
    description: 'POS bill generation, cash & UPI payments, previous due collections, and thermal receipt printing.',
  },
  SALESPERSON: {
    label: 'Sales Person',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    border: 'border-emerald-200',
    accent: 'bg-emerald-600',
    icon: '⚡',
    description: 'Dedicated bill desk operator. Strictly restricted to Common Billing / POS screen.',
  },
};

export const RolesAndPermissionsPage: React.FC<RolesAndPermissionsPageProps> = ({ onShowToast }) => {
  const { currentUser, activeRole, hasPermission, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [permissionsGrouped, setPermissionsGrouped] = useState<Record<string, PermissionItem[]>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Search & Filters for Users Tab
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

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

  // Edit user modal state
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    roleSlug: 'SALESPERSON',
    password: '',
    isActive: true,
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
      const [rolesRes, permsRes, usersRes] = await Promise.allSettled([
        authApi.getRoles(),
        authApi.getAllPermissions(),
        authApi.getUsers(),
      ]);

      if (!isMountedRef.current) return;

      if (rolesRes.status === 'fulfilled') {
        const rolesData = rolesRes.value || [];
        setRoles(rolesData);
        // Initialize permissions matrix map
        const map: Record<string, Set<string>> = {};
        for (const r of rolesData) {
          map[r.slug] = new Set(r.permissions);
        }
        setRolePermsMap(map);
      }

      if (permsRes.status === 'fulfilled') {
        setPermissionsGrouped(permsRes.value?.grouped || {});
      }

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value || []);
      }
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

  const canManageRoles = hasPermission('roles.manage');
  const canManageUsers = hasPermission('users.manage') || canManageRoles;

  // Toggle permission check in matrix
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

  // Save modified role permissions to MySQL
  const handleSaveRolePermissions = async (roleSlug: string) => {
    const role = roles.find((r) => r.slug === roleSlug);
    if (!role) return;

    const permsArray = Array.from(rolePermsMap[roleSlug] || []);
    setIsSaving(true);
    try {
      await authApi.updateRolePermissions(role.id, permsArray);
      onShowToast?.(
        'Permissions Saved',
        `Role "${role.name}" permissions updated in database successfully.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      onShowToast?.('Update Failed', err.message || 'Failed to update role permissions', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Staff User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    try {
      await authApi.createUser(newUserData);
      onShowToast?.(
        'User Created',
        `Staff member ${newUserData.name} [${newUserData.roleSlug}] created successfully.`,
        'success'
      );
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
      onShowToast?.('Creation Failed', err.response?.data?.message || err.message || 'Error creating user', 'warning');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      roleSlug: user.role,
      password: '',
      isActive: user.isActive !== false,
    });
    setIsEditUserOpen(true);
  };

  // Submit Edit Staff User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmittingUser(true);
    try {
      const payload: any = {
        name: editUserData.name.trim(),
        email: editUserData.email.trim(),
        roleSlug: editUserData.roleSlug,
        isActive: editUserData.isActive,
      };
      if (editUserData.password.trim()) {
        payload.password = editUserData.password.trim();
      }

      await authApi.updateUser(editingUser.id, payload);
      onShowToast?.(
        'Staff Profile Updated',
        `Updated account details for ${editUserData.name}.`,
        'success'
      );
      setIsEditUserOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      onShowToast?.('Update Failed', err.response?.data?.message || err.message || 'Error updating user profile', 'warning');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Switch Role simulation
  const handleRoleSwitch = async (roleSlug: string) => {
    try {
      await switchRole(roleSlug);
      onShowToast?.('Role Switched', `Active session role switched to ${roleSlug}.`, 'info');
    } catch (err: any) {
      onShowToast?.('Switch Failed', err.message || 'Could not switch role', 'warning');
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearchTerm, selectedRoleFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <KeyRoundIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Staff Users & Role Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage staff credentials, role assignments, and granular RBAC permission matrix across the APMC ERP.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          {canManageUsers && (
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <PlusIcon className="w-4 h-4 text-white stroke-[2.5]" />
              <span>+ Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Staff Accounts</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">
              Users
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {users.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">registered members</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Accounts with active credentials
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>System Roles</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-100">
              RBAC
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {roles.length || 4}
            </span>
            <span className="text-xs text-slate-400 font-medium">access tiers</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Superadmin, Admin, Cashier, Salesperson
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Current Session</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100">
              Active Login
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-base font-bold text-slate-900 truncate">
              {currentUser?.name || 'Logged-in Staff'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
            Role: <span className="text-indigo-600 font-bold">{activeRole}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Security Gates</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100">
              Gates Active
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              28
            </span>
            <span className="text-xs text-slate-400 font-medium">granular permissions</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across 8 functional ERP modules
          </p>
        </div>
      </div>

      {/* 3. Tab Switcher Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckSquareIcon className="w-4 h-4" />
          <span>Role Summary & Access Bounds</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Permissions Matrix</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: STAFF USERS LIST */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search staff by name, email, username..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                {userSearchTerm && (
                  <button
                    onClick={() => setUserSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="SUPERADMIN">Super Administrator</option>
                <option value="ADMIN">Store Administrator</option>
                <option value="CASHIER">Mandi Cashier</option>
                <option value="SALESPERSON">Sales Person</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Access Scope & Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Session / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCwIcon className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Loading staff accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="max-w-xs mx-auto text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg">
                            👥
                          </div>
                          <p className="text-sm font-bold text-slate-800">No staff members found</p>
                          <p className="text-xs text-slate-400">
                            No users match your search query or role filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrent = activeRole === u.role;
                      const roleMeta = ROLE_CONFIG[u.role] || {
                        label: u.role,
                        badgeBg: 'bg-slate-100',
                        badgeText: 'text-slate-800',
                        border: 'border-slate-200',
                        icon: '👤',
                        description: 'Custom staff member',
                      };

                      const initials = u.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2) || 'U';

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Staff Member Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs ${
                                  u.role === 'SUPERADMIN'
                                    ? 'bg-purple-600'
                                    : u.role === 'ADMIN'
                                    ? 'bg-blue-600'
                                    : u.role === 'CASHIER'
                                    ? 'bg-amber-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-semibold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  @{u.username} · <span className="text-slate-500">{u.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.border}`}
                            >
                              <span>{roleMeta.icon}</span>
                              <span>{roleMeta.label}</span>
                            </span>
                          </td>

                          {/* Access Scope & Capabilities */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">
                                {u.permissionsCount || u.permissions?.length || 0}
                              </span>
                              <span className="text-slate-400 text-[11px]">permissions</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {u.role === 'SALESPERSON' && (
                                <span className="text-emerald-700 font-semibold">⚡ Counter Billing Desk Only</span>
                              )}
                              {u.role === 'CASHIER' && (
                                <span className="text-amber-800 font-semibold">💰 POS, Payments, Dues & Printing</span>
                              )}
                              {u.role === 'ADMIN' && (
                                <span className="text-blue-800 font-semibold">🛡️ Full Invoice Edit & Cancel</span>
                              )}
                              {u.role === 'SUPERADMIN' && (
                                <span className="text-purple-800 font-semibold">👑 Master Enterprise Control</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {u.isActive !== false ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Deactivated
                              </span>
                            )}
                          </td>

                          {/* Actions / Switch */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {canManageUsers && (
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Edit Staff Account"
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <EditIcon className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleRoleSwitch(u.role)}
                                title={`Switch active session to ${u.role}`}
                                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-slate-100 text-slate-400 cursor-default'
                                    : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs hover:text-indigo-600'
                                }`}
                                disabled={isCurrent}
                              >
                                {isCurrent ? 'Current' : 'Simulate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ROLE DEFINITIONS & SUMMARY */}
      {/* ============================================================== */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(ROLE_CONFIG).map(([slug, meta]) => {
            const roleUsers = users.filter((u) => u.role === slug);
            const roleObj = roles.find((r) => r.slug === slug);

            return (
              <div
                key={slug}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${meta.accent}`} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.border}`}
                    >
                      <span>{meta.icon}</span>
                      <span>{slug}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {roleUsers.length} active {roleUsers.length === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{meta.label}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {meta.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Assigned Permissions:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {roleObj?.permissionsCount || (slug === 'SUPERADMIN' ? 28 : 0)} / 28
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-600 text-[11px]">
                      {slug === 'SUPERADMIN' && (
                        <p className="text-purple-700 font-medium">
                          ✓ Full unrestricted authority across all branches, accounts, and ERP configuration.
                        </p>
                      )}
                      {slug === 'ADMIN' && (
                        <p className="text-blue-700 font-medium">
                          ✓ Full bill editing and cancellation with inventory reversals. Financial ledgers enabled.
                        </p>
                      )}
                      {slug === 'CASHIER' && (
                        <p className="text-amber-700 font-medium">
                          ✓ Point of sale bill creation, payment allocations, previous due receipts, and printouts.
                        </p>
                      )}
                      {slug === 'SALESPERSON' && (
                        <p className="text-emerald-700 font-medium">
                          ✓ Focused billing only. Reports, stock modification, and settings are strictly restricted.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedRoleFilter(slug);
                      setActiveTab('users');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    View Members ({roleUsers.length}) →
                  </button>

                  <button
                    onClick={() => setActiveTab('matrix')}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Inspect Matrix Permissions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PERMISSION MATRIX */}
      {/* ============================================================== */}
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

            {/* Matrix Action Footer */}
            {canManageRoles && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      {/* ============================================================== */}
      {/* 4. ADD STAFF USER MODAL */}
      {/* ============================================================== */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                  <UserCheckIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Staff Account</h3>
                  <p className="text-[11px] text-slate-500">Create login credentials and assign role tier</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Staff Name *</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUserData.username}
                  onChange={(e) => setNewUserData((p) => ({ ...p, username: e.target.value }))}
                  placeholder="e.g. rahul"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="rahul@kbnfruits.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Password@123"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={newUserData.roleSlug}
                  onChange={(e) => setNewUserData((p) => ({ ...p, roleSlug: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="SALESPERSON">⚡ Sales Person (Billing Desk Only)</option>
                  <option value="CASHIER">💰 Mandi Cashier (POS / Dues / Receipts)</option>
                  <option value="ADMIN">🛡️ Store Administrator (Full Edit / Cancel)</option>
                  <option value="SUPERADMIN">👑 Super Administrator (Master Control)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
                >
                  {isSubmittingUser ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="w-3.5 h-3.5" />
                  )}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. EDIT STAFF USER MODAL */}
      {/* ============================================================== */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
                  <EditIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Staff Account</h3>
                  <p className="text-[11px] text-slate-500">@{editingUser.username} · ID #{editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditUserOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Staff Name *</label>
                <input
                  type="text"
                  required
                  value={editUserData.name}
                  onChange={(e) => setEditUserData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editUserData.email}
                  onChange={(e) => setEditUserData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={editUserData.roleSlug}
                  onChange={(e) => setEditUserData((p) => ({ ...p, roleSlug: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="SALESPERSON">⚡ Sales Person (Billing Desk Only)</option>
                  <option value="CASHIER">💰 Mandi Cashier (POS / Dues / Receipts)</option>
                  <option value="ADMIN">🛡️ Store Administrator (Full Edit / Cancel)</option>
                  <option value="SUPERADMIN">👑 Super Administrator (Master Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reset Password</label>
                <input
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep existing password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserData.isActive}
                    onChange={(e) => setEditUserData((p) => ({ ...p, isActive: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">Account Active & Enabled</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditUserOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
                >
                  {isSubmittingUser ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
