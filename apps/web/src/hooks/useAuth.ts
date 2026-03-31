import { useMemo } from 'react';
import { keycloak } from '@/lib/keycloak';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const isAuthenticated = keycloak.authenticated ?? false;

  const user = useMemo<AuthUser | null>(() => {
    if (!isAuthenticated) return null;

    const roles = keycloak.realmAccess?.roles ?? [];

    return {
      id: keycloak.subject ?? '',
      email: keycloak.tokenParsed?.email ?? '',
      username: keycloak.tokenParsed?.preferred_username ?? '',
      firstName: keycloak.tokenParsed?.given_name ?? '',
      lastName: keycloak.tokenParsed?.family_name ?? '',
      roles,
    };
  }, [isAuthenticated]);

  const login = async () => {
    await keycloak.login();
  };

  const logout = async () => {
    await keycloak.logout({ redirectUri: window.location.origin });
  };

  return { user, isAuthenticated, login, logout };
}
