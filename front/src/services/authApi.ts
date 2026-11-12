import { apiClient } from '../modules/sales/services/salesApi';

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'CASHIER' | 'SALESPERSON' | string;
  roleId: number;
  roleName: string;
  permissionsCount?: number;
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
}

export interface RoleData {
  id: number;
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionsCount: number;
  permissions: string[];
  permissionDetails?: PermissionItem[];
}

export interface PermissionItem {
  id: number;
  slug: string;
  name: string;
  module: string;
  description: string;
}

export interface PermissionsGrouped {
  total: number;
  grouped: Record<string, PermissionItem[]>;
  all: PermissionItem[];
}

export const authApi = {
  login: async (identifier: string, password: string): Promise<{ token: string; user: UserProfile }> => {
    const res = await apiClient.post('/auth/login', { identifier, password });
    return res.data.data;
  },

  switchRole: async (role: string): Promise<{ token: string; user: UserProfile }> => {
    const res = await apiClient.post('/auth/switch-role', { role });
    return res.data.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  getRoles: async (): Promise<RoleData[]> => {
    const res = await apiClient.get('/roles');
    return res.data.data || [];
  },

  getAllPermissions: async (): Promise<PermissionsGrouped> => {
    const res = await apiClient.get('/roles/permissions/all');
    return res.data.data;
  },

  updateRolePermissions: async (roleId: number, permissions: string[]): Promise<RoleData> => {
    const res = await apiClient.put(`/roles/${roleId}/permissions`, { permissions });
    return res.data.data;
  },

  getUsers: async (): Promise<UserProfile[]> => {
    const res = await apiClient.get('/users');
    return res.data.data || [];
  },

  createUser: async (userData: {
    username: string;
    name: string;
    email: string;
    password: string;
    roleSlug: string;
  }): Promise<UserProfile> => {
    const res = await apiClient.post('/users', userData);
    return res.data.data;
  },

  updateUser: async (userId: number, userData: Partial<UserProfile & { password?: string; roleSlug?: string }>): Promise<UserProfile> => {
    const res = await apiClient.put(`/users/${userId}`, userData);
    return res.data.data;
  },
};
