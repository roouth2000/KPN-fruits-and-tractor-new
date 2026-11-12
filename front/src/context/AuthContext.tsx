import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '../services/authApi';
import type { UserProfile, RoleData } from '../services/authApi';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  activeRole: string;
  roles: RoleData[];
  permissions: string[];
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (roles: string[] | string) => boolean;
  isSalesperson: boolean;
  isAdminOrSuperadmin: boolean;
  switchRole: (roleSlug: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('finovore_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeRole, setActiveRole] = useState<string>(() => {
    return localStorage.getItem('finovore_role') || '';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('finovore_token') && !!localStorage.getItem('finovore_user');
  });

  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync profile & roles from backend on mount if token exists
  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('finovore_token');
    if (!token) {
      setIsLoading(false);
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }

    try {
      setIsLoading(true);
      // Fetch latest profile from /auth/me
      const profile = await authApi.getMe();
      if (profile) {
        setCurrentUser(profile);
        setActiveRole(profile.role);
        setIsAuthenticated(true);
        localStorage.setItem('finovore_role', profile.role);
        localStorage.setItem('finovore_user', JSON.stringify(profile));
      }

      // Fetch system roles list if permitted
      const rolesData = await authApi.getRoles().catch(() => []);
      if (rolesData && rolesData.length > 0) {
        setRoles(rolesData);
      }
    } catch (err) {
      console.warn('Session verification failed or token expired:', err);
      // If token expired, clear session
      localStorage.removeItem('finovore_token');
      localStorage.removeItem('finovore_user');
      localStorage.removeItem('finovore_role');
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  /**
   * Log in with Email or Username and Password
   */
  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await authApi.login(identifier, password);
      if (res && res.token && res.user) {
        localStorage.setItem('finovore_token', res.token);
        localStorage.setItem('finovore_role', res.user.role);
        localStorage.setItem('finovore_user', JSON.stringify(res.user));

        setCurrentUser(res.user);
        setActiveRole(res.user.role);
        setIsAuthenticated(true);

        return { success: true };
      }
      return { success: false, error: 'Authentication returned invalid payload' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Log out of current session
   */
  const logout = () => {
    localStorage.removeItem('finovore_token');
    localStorage.removeItem('finovore_user');
    localStorage.removeItem('finovore_role');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveRole('');
  };

  /**
   * Switch active role simulation
   */
  const switchRole = async (roleSlug: string) => {
    const target = roleSlug.toUpperCase();
    setActiveRole(target);
    localStorage.setItem('finovore_role', target);

    try {
      const res = await authApi.switchRole(target);
      if (res && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('finovore_token', res.token);
        localStorage.setItem('finovore_user', JSON.stringify(res.user));
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.warn('Role switch error:', err);
    }
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    // SUPERADMIN has wildcard access to all features
    if (currentUser.role === 'SUPERADMIN') return true;
    return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(permission);
  }, [currentUser]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPERADMIN') return true;
    return perms.some((p) => Array.isArray(currentUser.permissions) && currentUser.permissions.includes(p));
  }, [currentUser]);

  const hasRole = useCallback((roleQuery: string[] | string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPERADMIN') return true;
    const allowed = Array.isArray(roleQuery) ? roleQuery : [roleQuery];
    return allowed.map((r) => r.toUpperCase()).includes(currentUser.role.toUpperCase());
  }, [currentUser]);

  const isSalesperson = currentUser?.role === 'SALESPERSON';
  const isAdminOrSuperadmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const contextValue = useMemo<AuthContextType>(
    () => ({
      currentUser,
      isAuthenticated,
      activeRole,
      roles,
      permissions: currentUser ? currentUser.permissions : [],
      isLoading,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasRole,
      isSalesperson,
      isAdminOrSuperadmin,
      switchRole,
      refreshAuth,
    }),
    [
      currentUser,
      isAuthenticated,
      activeRole,
      roles,
      isLoading,
      hasPermission,
      hasAnyPermission,
      hasRole,
      isSalesperson,
      isAdminOrSuperadmin,
      refreshAuth,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export type { AuthContextType };
export { useAuth } from './useAuth';
