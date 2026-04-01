import { createFileRoute, Outlet } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';
import { useTimetableSocket } from '@/hooks/useSocket';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!keycloak.authenticated) {
      await keycloak.login();
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // TODO: schoolId should come from user context or route params
  const schoolId = 'current-school-id';

  // App-wide WebSocket connection for real-time timetable updates.
  // Mounted here (not on /timetable page) so that ROOM-05 room change
  // events also propagate to /rooms and /admin/* pages.
  const { isConnected: _isConnected } = useTimetableSocket(schoolId);

  return <Outlet />;
}
