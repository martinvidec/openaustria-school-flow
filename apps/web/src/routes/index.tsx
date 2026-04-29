import { createFileRoute, redirect } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Phase 16 Plan 03 Task 1 — D-02 role-aware redirect.
    //
    // Pitfall #1 (16-RESEARCH): mirror `_authenticated.tsx:10-12` await-login
    // pattern to avoid races where `keycloak.realmAccess?.roles` is undefined
    // during a token refresh. Without the guard, an unauthenticated visitor
    // could read an empty roles array and be redirected to `/timetable`,
    // bypassing the admin-redirect path entirely on first paint.
    //
    // We deliberately read the keycloak instance directly (not via the React
    // auth hook) because `beforeLoad` is not a React render context — that
    // hook wraps `useMemo` and cannot be invoked from a router lifecycle
    // callback.
    if (!keycloak.authenticated) {
      await keycloak.login();
      return; // unreachable — keycloak.login() redirects to KC and never resolves.
    }
    const roles = keycloak.realmAccess?.roles ?? [];
    throw redirect({ to: roles.includes('admin') ? '/admin' : '/timetable' });
  },
});
