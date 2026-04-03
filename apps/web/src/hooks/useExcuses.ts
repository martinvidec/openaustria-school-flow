import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  AbsenceExcuseDto,
  AbsenceStatisticsDto,
  ExcuseReason,
} from '@schoolflow/shared';

/**
 * Query key factory for hierarchical excuse cache invalidation.
 * Structure enables granular or broad invalidation:
 * - excuseKeys.all(schoolId) invalidates everything for a school
 * - excuseKeys.list(schoolId, status) invalidates a specific status filter
 * - excuseKeys.statistics(...) invalidates class/student statistics
 */
export const excuseKeys = {
  all: (schoolId: string) => ['excuses', schoolId] as const,
  list: (schoolId: string, status?: string) =>
    ['excuses', schoolId, 'list', status ?? 'all'] as const,
  detail: (schoolId: string, excuseId: string) =>
    ['excuses', schoolId, excuseId] as const,
  statistics: (schoolId: string, classId: string, startDate?: string, endDate?: string) =>
    ['statistics', schoolId, classId, startDate ?? '', endDate ?? ''] as const,
  studentStatistics: (schoolId: string, studentId: string) =>
    ['statistics', schoolId, 'student', studentId] as const,
};

/**
 * Fetches excuses for a school, optionally filtered by status.
 */
export function useExcuses(schoolId: string | undefined, status?: string) {
  return useQuery({
    queryKey: excuseKeys.list(schoolId ?? '', status),
    queryFn: async (): Promise<AbsenceExcuseDto[]> => {
      const params = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/excuses${params}`,
      );
      if (!res.ok) throw new Error('Failed to load excuses');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 15_000,
  });
}

/**
 * Mutation: Create a new absence excuse (parent submitting for child).
 * Invalidates all excuse queries for the school on success.
 */
export function useCreateExcuse(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      studentId: string;
      startDate: string;
      endDate: string;
      reason: ExcuseReason;
      note?: string;
    }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/excuses`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to create excuse');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: excuseKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Mutation: Review an excuse (Klassenvorstand accept/reject).
 * Invalidates all excuse queries for the school on success (status changed, attendance may cascade).
 */
export function useReviewExcuse(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      excuseId: string;
      status: 'ACCEPTED' | 'REJECTED';
      reviewNote?: string;
    }) => {
      const { excuseId, ...body } = data;
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/excuses/${excuseId}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error('Failed to review excuse');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: excuseKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Mutation: Upload an attachment file for an excuse.
 * Uses FormData -- does NOT set Content-Type header (browser sets multipart boundary).
 * Invalidates the excuse detail query on success.
 */
export function useUploadAttachment(schoolId: string | undefined, excuseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // FormData body: do NOT set Content-Type header.
      // The browser must set it with the correct multipart boundary.
      // apiFetch detects FormData and skips the auto-set of Content-Type.
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/excuses/${excuseId}/attachment`,
        {
          method: 'POST',
          body: formData,
        },
      );
      if (!res.ok) throw new Error('Failed to upload attachment');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && excuseId) {
        queryClient.invalidateQueries({
          queryKey: excuseKeys.detail(schoolId, excuseId),
        });
        queryClient.invalidateQueries({
          queryKey: excuseKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Fetches absence statistics for a class.
 * Returns per-student absence breakdown for a given date range.
 */
export function useAbsenceStatistics(
  schoolId: string | undefined,
  classId: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: excuseKeys.statistics(schoolId ?? '', classId ?? '', startDate, endDate),
    queryFn: async (): Promise<AbsenceStatisticsDto[]> => {
      const params = new URLSearchParams();
      if (classId) params.set('classId', classId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/statistics/class?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load absence statistics');
      return res.json();
    },
    enabled: !!schoolId && !!classId,
    staleTime: 30_000,
  });
}

/**
 * Fetches absence statistics for a single student.
 */
export function useStudentStatistics(
  schoolId: string | undefined,
  studentId: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: excuseKeys.studentStatistics(schoolId ?? '', studentId ?? ''),
    queryFn: async (): Promise<AbsenceStatisticsDto> => {
      const params = new URLSearchParams();
      if (studentId) params.set('studentId', studentId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/statistics/student?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load student statistics');
      return res.json();
    },
    enabled: !!schoolId && !!studentId,
    staleTime: 30_000,
  });
}
