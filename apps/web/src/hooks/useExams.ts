import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ExamDto,
  ExamCollisionDto,
  CreateExamRequest,
} from '@schoolflow/shared';

/**
 * Query key factory for hierarchical exam cache invalidation.
 */
export const examKeys = {
  all: (schoolId: string) => ['exams', schoolId] as const,
  list: (schoolId: string, classId?: string) =>
    ['exams', schoolId, classId ?? '__all__'] as const,
  collision: (schoolId: string, classId: string, date: string) =>
    ['exam-collision', schoolId, classId, date] as const,
};

/**
 * Fetches exams for a school, optionally filtered by classId.
 */
export function useExams(schoolId: string, classId?: string) {
  return useQuery({
    queryKey: examKeys.list(schoolId, classId),
    queryFn: async (): Promise<ExamDto[]> => {
      const params = classId
        ? `?classId=${encodeURIComponent(classId)}`
        : '';
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/exams${params}`,
      );
      if (!res.ok) throw new Error('Failed to load exams');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

/**
 * Checks for exam collisions on a specific date for a class.
 * Only enabled when both classId and date are provided.
 */
export function useExamCollisionCheck(
  schoolId: string,
  classId: string | undefined,
  date: string | undefined,
  excludeId?: string,
) {
  return useQuery({
    queryKey: examKeys.collision(schoolId, classId ?? '', date ?? ''),
    queryFn: async (): Promise<ExamCollisionDto> => {
      const params = new URLSearchParams({
        classId: classId!,
        date: date!,
      });
      if (excludeId) params.set('excludeId', excludeId);
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/exams/collision-check?${params}`,
      );
      if (!res.ok) throw new Error('Failed to check exam collisions');
      return res.json();
    },
    enabled: !!schoolId && !!classId && !!date,
    staleTime: 10_000,
  });
}

/**
 * Mutation: Create a new exam.
 * Does NOT auto-toast if collision exists (dialog handles warning display).
 * Otherwise shows success toast.
 */
export function useCreateExam(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateExamRequest & { forceCreate?: boolean }) => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/exams`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Pruefung konnte nicht gespeichert werden');
      return res.json() as Promise<{ exam: ExamDto; collision?: ExamCollisionDto }>;
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: examKeys.all(schoolId) });
      toast.success('Pruefung eingetragen');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation: Update an existing exam.
 * Invalidates exam queries on success.
 */
export function useUpdateExam(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: Partial<CreateExamRequest> & { id: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/exams/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(dto),
        },
      );
      if (!res.ok) throw new Error('Pruefung konnte nicht gespeichert werden');
      return res.json() as Promise<ExamDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all(schoolId) });
      toast.success('Pruefung gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation: Delete an exam.
 * Invalidates exam queries on success and shows toast feedback.
 */
export function useDeleteExam(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/exams/${id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Loeschen fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all(schoolId) });
      toast.success('Pruefung geloescht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
