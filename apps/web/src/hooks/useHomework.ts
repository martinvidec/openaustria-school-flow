import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { HomeworkDto, CreateHomeworkRequest } from '@schoolflow/shared';

/**
 * Query key factory for hierarchical homework cache invalidation.
 */
export const homeworkKeys = {
  all: (schoolId: string) => ['homework', schoolId] as const,
  list: (schoolId: string, classSubjectId?: string) =>
    ['homework', schoolId, classSubjectId ?? '__all__'] as const,
  byLesson: (schoolId: string, classBookEntryId: string) =>
    ['homework', 'by-lesson', schoolId, classBookEntryId] as const,
};

/**
 * Fetches homework list for a school, optionally filtered by classSubjectId.
 */
export function useHomework(schoolId: string, classSubjectId?: string) {
  return useQuery({
    queryKey: homeworkKeys.list(schoolId, classSubjectId),
    queryFn: async (): Promise<HomeworkDto[]> => {
      const params = classSubjectId
        ? `?classSubjectId=${encodeURIComponent(classSubjectId)}`
        : '';
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/homework${params}`,
      );
      if (!res.ok) throw new Error('Failed to load homework');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

/**
 * Fetches homework associated with a specific classbook entry (lesson).
 */
export function useHomeworkByLesson(
  schoolId: string,
  classBookEntryId: string | undefined,
) {
  return useQuery({
    queryKey: homeworkKeys.byLesson(schoolId, classBookEntryId ?? ''),
    queryFn: async (): Promise<HomeworkDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/homework/by-lesson/${classBookEntryId}`,
      );
      if (!res.ok) throw new Error('Failed to load homework for lesson');
      return res.json();
    },
    enabled: !!schoolId && !!classBookEntryId,
    staleTime: 30_000,
  });
}

/**
 * Mutation: Create a new homework assignment.
 * Invalidates homework queries on success and shows toast feedback.
 */
export function useCreateHomework(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateHomeworkRequest) => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/homework`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Hausaufgabe konnte nicht gespeichert werden');
      return res.json() as Promise<HomeworkDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeworkKeys.all(schoolId) });
      toast.success('Hausaufgabe erstellt');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation: Update an existing homework assignment.
 * Invalidates homework queries on success.
 */
export function useUpdateHomework(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: Partial<CreateHomeworkRequest> & { id: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/homework/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(dto),
        },
      );
      if (!res.ok) throw new Error('Hausaufgabe konnte nicht gespeichert werden');
      return res.json() as Promise<HomeworkDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeworkKeys.all(schoolId) });
      toast.success('Hausaufgabe gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation: Delete a homework assignment.
 * Invalidates homework queries on success and shows toast feedback.
 */
export function useDeleteHomework(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/homework/${id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Loeschen fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeworkKeys.all(schoolId) });
      toast.success('Hausaufgabe geloescht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
