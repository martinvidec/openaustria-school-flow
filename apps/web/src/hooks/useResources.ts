import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { ResourceDto, UpsertResourceRequest } from '@schoolflow/shared';

export const resourceKeys = {
  all: (schoolId: string) => ['resources', schoolId] as const,
};

/**
 * Fetches all resources for a school.
 */
export function useResources(schoolId: string | undefined) {
  return useQuery({
    queryKey: resourceKeys.all(schoolId ?? ''),
    queryFn: async (): Promise<ResourceDto[]> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/resources`);
      if (!res.ok) throw new Error('Failed to load resources');
      return res.json();
    },
    enabled: !!schoolId,
  });
}

/**
 * Mutation to create a new resource.
 * Invalidates resource queries on success and shows toast feedback.
 */
export function useCreateResource(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpsertResourceRequest) => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/resources`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Erstellen fehlgeschlagen');
      return res.json() as Promise<ResourceDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all(schoolId) });
      toast.success('Ressource gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation to update an existing resource.
 * Invalidates resource queries on success and shows toast feedback.
 */
export function useUpdateResource(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: UpsertResourceRequest & { id: string }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/resources/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(dto),
        },
      );
      if (!res.ok) throw new Error('Aktualisierung fehlgeschlagen');
      return res.json() as Promise<ResourceDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all(schoolId) });
      toast.success('Ressource gespeichert');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation to delete a resource.
 * Invalidates resource queries on success and shows toast feedback.
 */
export function useDeleteResource(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/resources/${id}`,
        {
          method: 'DELETE',
        },
      );
      if (!res.ok) throw new Error('Loeschen fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all(schoolId) });
      toast.success('Ressource geloescht');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
