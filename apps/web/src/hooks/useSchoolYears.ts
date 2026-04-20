import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SchoolYearDto, SchoolYearInput } from '@schoolflow/shared';
import { apiFetch } from '@/lib/api';

export const schoolYearKeys = {
  all: (schoolId: string) => ['school-years', schoolId] as const,
  one: (schoolId: string, yearId: string) => ['school-years', schoolId, yearId] as const,
};

export function useSchoolYears(schoolId: string | undefined) {
  return useQuery({
    queryKey: schoolYearKeys.all(schoolId ?? ''),
    queryFn: async (): Promise<SchoolYearDto[]> => {
      if (!schoolId) return [];
      const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years`);
      if (!res.ok) throw new Error('Schuljahre konnten nicht geladen werden');
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateSchoolYear(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SchoolYearInput): Promise<SchoolYearDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/school-years`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Schuljahr konnte nicht angelegt werden');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
      toast.success('Schuljahr angelegt.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSchoolYear(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      yearId,
      dto,
    }: {
      yearId: string;
      dto: Partial<SchoolYearInput>;
    }): Promise<SchoolYearDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}`,
        { method: 'PATCH', body: JSON.stringify(dto) },
      );
      if (!res.ok) throw new Error('Schuljahr konnte nicht aktualisiert werden');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useActivateSchoolYear(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (yearId: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}/activate`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Schuljahr konnte nicht aktiviert werden');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: ['school', schoolId] });
      qc.invalidateQueries({ queryKey: ['timetable-run:active', schoolId] });
      toast.success('Aktives Schuljahr gewechselt.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Thrown by useDeleteSchoolYear when the backend 409's with referenceCount
// (D-10 orphan-guard). Plan 10-05's DeleteSchoolYearDialog reads the count.
export class SchoolYearOrphanError extends Error {
  constructor(public referenceCount: number) {
    super(
      `Schuljahr wird noch von ${referenceCount} Eintraegen verwendet und kann nicht geloescht werden.`,
    );
    this.name = 'SchoolYearOrphanError';
  }
}

export function useDeleteSchoolYear(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (yearId: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}`,
        { method: 'DELETE' },
      );
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        throw new SchoolYearOrphanError(body.referenceCount ?? 0);
      }
      if (!res.ok) throw new Error('Schuljahr konnte nicht geloescht werden');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) });
      toast.success('Schuljahr geloescht.');
    },
    onError: (e: Error) => {
      if (e instanceof SchoolYearOrphanError) {
        toast.error(
          `Schuljahr kann nicht geloescht werden — wird noch von ${e.referenceCount} Eintraegen verwendet.`,
        );
      } else {
        toast.error(e.message);
      }
    },
  });
}

// Holiday + AutonomousDay nested CRUD (D-08 sub-UI; backend endpoints from Plan 10-02 Task 3)
export interface HolidayInput {
  name: string;
  startDate: string;
  endDate: string;
}
export interface AutonomousDayInput {
  date: string;
  reason?: string;
}

export function useCreateHoliday(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ yearId, dto }: { yearId: string; dto: HolidayInput }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}/holidays`,
        { method: 'POST', body: JSON.stringify(dto) },
      );
      if (!res.ok) throw new Error('Ferieneintrag konnte nicht angelegt werden');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHoliday(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ yearId, holidayId }: { yearId: string; holidayId: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}/holidays/${holidayId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Ferieneintrag konnte nicht geloescht werden');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateAutonomousDay(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      yearId,
      dto,
    }: {
      yearId: string;
      dto: AutonomousDayInput;
    }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}/autonomous-days`,
        { method: 'POST', body: JSON.stringify(dto) },
      );
      if (!res.ok) throw new Error('Schulautonomer Tag konnte nicht angelegt werden');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAutonomousDay(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ yearId, dayId }: { yearId: string; dayId: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/school-years/${yearId}/autonomous-days/${dayId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Schulautonomer Tag konnte nicht geloescht werden');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}
