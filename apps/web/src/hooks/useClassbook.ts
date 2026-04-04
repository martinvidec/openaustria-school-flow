import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  ClassBookEntryDto,
  AttendanceRecordDto,
  BulkAttendanceRequest,
  StudentNoteDto,
} from '@schoolflow/shared';

/**
 * Query key factory for hierarchical classbook cache invalidation.
 * Structure enables granular or broad invalidation:
 * - classbookKeys.all(schoolId) invalidates everything for a school
 * - classbookKeys.attendance(schoolId, entryId) invalidates a specific attendance list
 * - classbookKeys.notes(schoolId, entryId) invalidates notes for a specific entry
 */
export const classbookKeys = {
  all: (schoolId: string) => ['classbook', schoolId] as const,
  entry: (schoolId: string, entryId: string) =>
    ['classbook', schoolId, 'entry', entryId] as const,
  entryByTimetableLesson: (schoolId: string, timetableLessonId: string, date?: string) =>
    ['classbook', schoolId, 'by-timetable-lesson', timetableLessonId, date ?? 'today'] as const,
  entryByLesson: (schoolId: string, classSubjectId: string, date: string, periodNumber: number) =>
    ['classbook', schoolId, 'by-lesson', classSubjectId, date, periodNumber] as const,
  attendance: (schoolId: string, entryId: string) =>
    ['classbook', schoolId, 'attendance', entryId] as const,
  recent: (schoolId: string, entryId: string) =>
    ['classbook', schoolId, 'recent', entryId] as const,
  notes: (schoolId: string, entryId: string) =>
    ['classbook', schoolId, 'notes', entryId] as const,
};

/**
 * Fetches a single classbook entry by its ID.
 */
export function useClassbookEntry(schoolId: string | undefined, entryId: string | undefined) {
  return useQuery({
    queryKey: classbookKeys.entry(schoolId ?? '', entryId ?? ''),
    queryFn: async (): Promise<ClassBookEntryDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/classbook/${entryId}`);
      if (!res.ok) throw new Error('Failed to load classbook entry');
      return res.json();
    },
    enabled: !!schoolId && !!entryId,
    staleTime: 30_000,
  });
}

/**
 * Resolves a TimetableLesson ID to a ClassBookEntry via the backend
 * by-timetable-lesson endpoint. This is the PRIMARY hook for the lesson
 * detail route -- it takes the TimetableLesson ID from URL params and
 * resolves it to a ClassBookEntry (creating one if it doesn't exist).
 *
 * Returns ClassBookEntryDto with joined subjectName, className, teacherName.
 */
export function useClassbookEntryByTimetableLesson(
  schoolId: string | undefined,
  timetableLessonId: string | undefined,
  date?: string,
) {
  return useQuery({
    queryKey: classbookKeys.entryByTimetableLesson(schoolId ?? '', timetableLessonId ?? '', date),
    queryFn: async (): Promise<ClassBookEntryDto> => {
      const params = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/by-timetable-lesson/${timetableLessonId}${params}`,
      );
      if (!res.ok) throw new Error('Failed to resolve timetable lesson to classbook entry');
      return res.json();
    },
    enabled: !!schoolId && !!timetableLessonId,
    staleTime: 30_000,
  });
}

/**
 * Fetches a classbook entry by composite key (classSubjectId + date + periodNumber + weekType).
 * Fallback create-on-navigate hook when composite key is already known.
 */
export function useClassbookEntryByLesson(
  schoolId: string | undefined,
  classSubjectId: string | undefined,
  date: string | undefined,
  periodNumber: number | undefined,
  weekType: string | undefined,
) {
  return useQuery({
    queryKey: classbookKeys.entryByLesson(
      schoolId ?? '',
      classSubjectId ?? '',
      date ?? '',
      periodNumber ?? 0,
    ),
    queryFn: async (): Promise<ClassBookEntryDto> => {
      const params = new URLSearchParams({
        classSubjectId: classSubjectId!,
        date: date!,
        periodNumber: String(periodNumber),
        weekType: weekType ?? 'A',
      });
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/by-lesson?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load classbook entry by lesson');
      return res.json();
    },
    enabled: !!schoolId && !!classSubjectId && !!date && periodNumber !== undefined,
    staleTime: 30_000,
  });
}

/**
 * Fetches attendance records for a classbook entry.
 */
export function useAttendance(schoolId: string | undefined, entryId: string | undefined) {
  return useQuery({
    queryKey: classbookKeys.attendance(schoolId ?? '', entryId ?? ''),
    queryFn: async (): Promise<AttendanceRecordDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/attendance`,
      );
      if (!res.ok) throw new Error('Failed to load attendance');
      return res.json();
    },
    enabled: !!schoolId && !!entryId,
    staleTime: 10_000,
  });
}

/**
 * Mutation: Bulk update attendance records for a classbook entry.
 * Invalidates the attendance query on success.
 */
export function useBulkAttendance(schoolId: string | undefined, entryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkAttendanceRequest) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/attendance`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to update attendance');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && entryId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.attendance(schoolId, entryId),
        });
      }
    },
  });
}

/**
 * Mutation: Set all students as present for a classbook entry.
 * Invalidates the attendance query on success.
 */
export function useSetAllPresent(schoolId: string | undefined, entryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/attendance/all-present`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Failed to set all present');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && entryId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.attendance(schoolId, entryId),
        });
      }
    },
  });
}

/**
 * Mutation: Update lesson content (thema, lehrstoff, hausaufgabe).
 * Invalidates the entry query on success.
 */
export function useUpdateLessonContent(schoolId: string | undefined, entryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { thema?: string; lehrstoff?: string; hausaufgabe?: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/content`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to update lesson content');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && entryId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.entry(schoolId, entryId),
        });
      }
    },
  });
}

/**
 * Fetches recent classbook entries (for lesson history/context).
 */
export function useRecentEntries(schoolId: string | undefined, entryId: string | undefined) {
  return useQuery({
    queryKey: classbookKeys.recent(schoolId ?? '', entryId ?? ''),
    queryFn: async (): Promise<ClassBookEntryDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/recent`,
      );
      if (!res.ok) throw new Error('Failed to load recent entries');
      return res.json();
    },
    enabled: !!schoolId && !!entryId,
    staleTime: 60_000,
  });
}

// --- Note CRUD hooks ---

/**
 * Fetches notes for a classbook entry.
 */
export function useNotes(schoolId: string | undefined, entryId: string | undefined) {
  return useQuery({
    queryKey: classbookKeys.notes(schoolId ?? '', entryId ?? ''),
    queryFn: async (): Promise<StudentNoteDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/notes`,
      );
      if (!res.ok) throw new Error('Failed to load notes');
      return res.json();
    },
    enabled: !!schoolId && !!entryId,
    staleTime: 10_000,
  });
}

/**
 * Mutation: Create a new note on a classbook entry.
 * Invalidates the notes query on success.
 */
export function useCreateNote(schoolId: string | undefined, entryId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { studentId: string; content: string; isPrivate: boolean }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/${entryId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Failed to create note');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId && entryId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.notes(schoolId, entryId),
        });
      }
    },
  });
}

/**
 * Mutation: Update an existing note.
 * Invalidates all classbook note queries for the school on success.
 */
export function useUpdateNote(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { noteId: string; content?: string; isPrivate?: boolean }) => {
      const { noteId, ...body } = data;
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/notes/${noteId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error('Failed to update note');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.all(schoolId),
        });
      }
    },
  });
}

/**
 * Mutation: Delete a note.
 * Invalidates all classbook note queries for the school on success.
 */
export function useDeleteNote(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/classbook/notes/${noteId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to delete note');
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: classbookKeys.all(schoolId),
        });
      }
    },
  });
}
