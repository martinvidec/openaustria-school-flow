import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useSchoolContext } from '@/stores/school-context-store';

interface UserContextResponse {
  schoolId: string;
  personId: string;
  personType: string;
  firstName: string;
  lastName: string;
  teacherId?: string;
  studentId?: string;
  classId?: string;
  className?: string;
  parentId?: string;
  childClassId?: string;
  childClassName?: string;
  childStudentName?: string;
  children?: Array<{ studentId: string; studentName: string; classId: string; className: string }>;
}

export function useUserContext() {
  const setContext = useSchoolContext((s) => s.setContext);
  const isLoaded = useSchoolContext((s) => s.isLoaded);

  const query = useQuery({
    queryKey: ['user-context'],
    queryFn: async (): Promise<UserContextResponse> => {
      const res = await apiFetch('/api/v1/users/me');
      if (!res.ok) throw new Error('Failed to load user context');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min cache -- user context rarely changes
    enabled: !isLoaded,
  });

  useEffect(() => {
    if (query.data && !isLoaded) {
      setContext(query.data);
    }
  }, [query.data, isLoaded, setContext]);

  return query;
}
