import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { GradeMatrixRow, GradeWeightDto } from '@schoolflow/shared';

/**
 * Query key factory for hierarchical grade cache invalidation.
 * Structure enables granular or broad invalidation:
 * - gradeKeys.all(schoolId) invalidates everything for a school
 * - gradeKeys.matrix(...) invalidates a specific class subject's grade matrix
 * - gradeKeys.weights(...) invalidates weight configuration
 */
export const gradeKeys = {
  all: (schoolId: string) => ['grades', schoolId] as const,
  matrix: (schoolId: string, classSubjectId: string, category?: string) =>
    ['grades', schoolId, 'matrix', classSubjectId, category ?? 'all'] as const,
  weights: (schoolId: string, classSubjectId: string) =>
    ['grades', schoolId, 'weights', classSubjectId] as const,
};

/** Response shape for grade matrix endpoint */
interface GradeMatrixResponse {
  rows: GradeMatrixRow[];
  weights: GradeWeightDto;
}

/**
 * Fetches the grade matrix for a class subject.
 * Returns a spreadsheet-like grid: students as rows, grades as columns.
 */
export function useGradeMatrix(
  schoolId: string | undefined,
  classSubjectId: string | undefined,
  category?: string,
  sortBy?: string,
) {
  return useQuery({
    queryKey: gradeKeys.matrix(schoolId ?? '', classSubjectId ?? '', category),
    queryFn: async (): Promise<GradeMatrixResponse> => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (sortBy) params.set('sortBy', sortBy);
      const qs = params.toString();
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades/matrix/${classSubjectId}${qs ? `?${qs}` : ''}`,
      );
      if (!res.ok) throw new Error('Failed to load grade matrix');
      return res.json();
    },
    enabled: !!schoolId && !!classSubjectId,
    staleTime: 30_000,
  });
}

/**
 * Mutation: Create a new grade entry.
 * Invalidates all grade queries for the school on success.
 */
export function useCreateGrade(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      classSubjectId: string;
      studentId: string;
      category: string;
      value: number;
      description?: string;
      date: string;
    }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to create grade');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: gradeKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Mutation: Update an existing grade entry.
 * Invalidates all grade queries for the school on success.
 */
export function useUpdateGrade(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      gradeId: string;
      value?: number;
      description?: string;
      date?: string;
    }) => {
      const { gradeId, ...body } = data;
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades/${gradeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error('Failed to update grade');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: gradeKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Mutation: Delete a grade entry.
 * Invalidates all grade queries for the school on success.
 */
export function useDeleteGrade(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gradeId: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades/${gradeId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to delete grade');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: gradeKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Fetches grade weight configuration for a class subject.
 * Returns the weight percentages for Schularbeit, Muendlich, and Mitarbeit.
 */
export function useGradeWeights(
  schoolId: string | undefined,
  classSubjectId: string | undefined,
) {
  return useQuery({
    queryKey: gradeKeys.weights(schoolId ?? '', classSubjectId ?? ''),
    queryFn: async (): Promise<GradeWeightDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades/weights/${classSubjectId}`,
      );
      if (!res.ok) throw new Error('Failed to load grade weights');
      return res.json();
    },
    enabled: !!schoolId && !!classSubjectId,
    staleTime: 60_000,
  });
}

/**
 * Mutation: Update grade weight configuration for a class subject.
 * Invalidates both weights and matrix queries on success (matrix recalculates averages).
 */
export function useUpdateGradeWeights(
  schoolId: string | undefined,
  classSubjectId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      schularbeitPct: number;
      muendlichPct: number;
      mitarbeitPct: number;
    }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/grades/weights/${classSubjectId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to update grade weights');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && classSubjectId) {
        queryClient.invalidateQueries({
          queryKey: gradeKeys.weights(schoolId, classSubjectId),
        });
        queryClient.invalidateQueries({
          queryKey: gradeKeys.matrix(schoolId, classSubjectId),
        });
      }
    },
  });
}
