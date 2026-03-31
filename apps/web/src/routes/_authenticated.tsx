import { createFileRoute, Outlet } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!keycloak.authenticated) {
      await keycloak.login();
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
