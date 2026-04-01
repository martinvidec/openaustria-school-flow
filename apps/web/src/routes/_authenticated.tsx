import { createFileRoute, Outlet } from '@tanstack/react-router';
import { keycloak } from '@/lib/keycloak';
import { useTimetableSocket } from '@/hooks/useSocket';
import { useUserContext } from '@/hooks/useUserContext';
import { useSchoolContext } from '@/stores/school-context-store';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!keycloak.authenticated) {
      await keycloak.login();
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useUserContext(); // Trigger user context fetch on auth layout mount
  const schoolId = useSchoolContext((s) => s.schoolId);
  const isLoaded = useSchoolContext((s) => s.isLoaded);

  // App-wide WebSocket connection for real-time timetable updates.
  // Mounted here (not on /timetable page) so that ROOM-05 room change
  // events also propagate to /rooms and /admin/* pages.
  const { isConnected: _isConnected } = useTimetableSocket(schoolId ?? '');

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <Outlet />;
}
