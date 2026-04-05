import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Minimal teacher row normalised from the backend /teachers endpoint.
 * The backend returns a paginated { data, meta } envelope with Person+Teacher
 * join joined — this hook flattens it down to what the substitution UI needs
 * (id + firstName + lastName for teacher selects) and unwraps the envelope.
 */
export interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RawTeacher {
  id: string;
  person?: { firstName?: string; lastName?: string } | null;
}

interface PaginatedTeachers {
  data: RawTeacher[];
  meta?: unknown;
}

export const teachersKeys = {
  all: (schoolId: string) => ['teachers', schoolId] as const,
};

/**
 * Fetches teachers for a school as a flat TeacherOption list.
 * Uses a generous limit=500 since v1 targets single schools under ~200
 * teachers and we want a stable dropdown without pagination.
 */
export function useTeachers(schoolId: string | undefined) {
  return useQuery({
    queryKey: teachersKeys.all(schoolId ?? ''),
    queryFn: async (): Promise<TeacherOption[]> => {
      const params = new URLSearchParams({
        schoolId: schoolId!,
        limit: '500',
        page: '1',
      });
      const res = await apiFetch(`/api/v1/teachers?${params}`);
      if (!res.ok) throw new Error('Failed to load teachers');
      const body: PaginatedTeachers = await res.json();
      return (body.data ?? [])
        .map((t) => ({
          id: t.id,
          firstName: t.person?.firstName ?? '',
          lastName: t.person?.lastName ?? '',
        }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    },
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });
}
