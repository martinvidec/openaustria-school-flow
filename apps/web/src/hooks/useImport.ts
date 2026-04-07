import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type {
  ImportJobDto,
  ImportDryRunResult,
  StartImportRequest,
} from '@schoolflow/shared';

/**
 * Query key factory for hierarchical import cache invalidation.
 */
export const importKeys = {
  all: (schoolId: string) => ['import', schoolId] as const,
  history: (schoolId: string) => ['import-history', schoolId] as const,
  job: (schoolId: string, jobId: string) =>
    ['import', schoolId, 'job', jobId] as const,
};

/**
 * Upload an import file (Untis XML, DIF, or CSV) via FormData.
 * Returns the parse result with entity counts (Untis) or CSV headers + sample rows.
 */
export function useUploadImport(schoolId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/import/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );
      if (!res.ok) {
        throw new Error('Datei konnte nicht hochgeladen werden');
      }
      return res.json();
    },
    onError: () => {
      toast.error(
        'Datei konnte nicht gelesen werden. Bitte stellen Sie sicher, dass es sich um eine gueltige Datei handelt.',
      );
    },
  });
}

/**
 * Start a dry-run import to validate data before committing.
 * Returns an ImportJobDto with dryRunResult populated.
 */
export function useDryRun(schoolId: string) {
  return useMutation({
    mutationFn: async (request: StartImportRequest): Promise<ImportJobDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/import/dry-run`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
      );
      if (!res.ok) {
        throw new Error('Dry-Run fehlgeschlagen');
      }
      return res.json();
    },
    onError: () => {
      toast.error('Vorschau konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
    },
  });
}

/**
 * Commit an import job after dry-run verification.
 * Triggers the actual data import.
 */
export function useCommitImport(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importJobId: string): Promise<ImportJobDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/import/${importJobId}/commit`,
        {
          method: 'POST',
        },
      );
      if (!res.ok) {
        throw new Error('Import konnte nicht gestartet werden');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: importKeys.history(schoolId),
      });
    },
    onError: () => {
      toast.error('Import fehlgeschlagen. Bitte pruefen Sie die Datei und versuchen Sie es erneut.');
    },
  });
}

/**
 * Fetch import history for a school (list of past import jobs).
 * Sorted by createdAt descending on the server.
 */
export function useImportHistory(schoolId: string) {
  return useQuery({
    queryKey: importKeys.history(schoolId),
    queryFn: async (): Promise<ImportJobDto[]> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/import`);
      if (!res.ok) throw new Error('Failed to load import history');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single import job status. Polls every 2s when enabled
 * as a fallback for Socket.IO progress events.
 */
export function useImportJob(schoolId: string, importJobId: string | null) {
  return useQuery({
    queryKey: importKeys.job(schoolId, importJobId ?? ''),
    queryFn: async (): Promise<ImportJobDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/import/${importJobId}`,
      );
      if (!res.ok) throw new Error('Failed to load import job');
      return res.json();
    },
    enabled: !!schoolId && !!importJobId,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}
