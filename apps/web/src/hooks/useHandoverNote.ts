import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  HandoverNoteDto,
  HandoverAttachmentDto,
} from '@schoolflow/shared';

/**
 * SUBST-04 — Handover note TanStack Query bindings.
 *
 * Backed by the backend HandoverController:
 *  - GET    /handover-notes/substitutions/:substitutionId
 *  - POST   /handover-notes/substitutions/:substitutionId  (JSON create/update)
 *  - POST   /handover-notes/:noteId/attachments             (multipart upload)
 *  - DELETE /handover-notes/:id
 *  - DELETE /handover-notes/attachments/:id
 *
 * JSON and multipart endpoints are deliberately on separate handler methods
 * (Pitfall 5 in 06-RESEARCH.md) so the hook also splits them into two
 * mutations: useCreateOrUpdateHandoverNote (JSON) and
 * useUploadHandoverAttachment (FormData, apiFetch skips Content-Type
 * auto-set for FormData per the Phase 5 convention).
 */
export const handoverKeys = {
  all: ['handover'] as const,
  bySubstitution: (substitutionId: string) =>
    ['handover', 'substitution', substitutionId] as const,
};

export function useHandoverNote(substitutionId: string | null) {
  return useQuery({
    queryKey: handoverKeys.bySubstitution(substitutionId ?? ''),
    queryFn: async (): Promise<HandoverNoteDto | null> => {
      const res = await apiFetch(
        `/api/v1/handover-notes/substitutions/${substitutionId}`,
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error('Uebergabenotiz konnte nicht geladen werden.');
      }
      // Backend may return an empty 200 (null) for substitutions without a note
      const text = await res.text();
      if (!text) return null;
      try {
        const parsed = JSON.parse(text) as HandoverNoteDto | null;
        return parsed ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!substitutionId,
    staleTime: 30_000,
  });
}

export interface CreateOrUpdateHandoverNoteVariables {
  substitutionId: string;
  content: string;
}

export function useCreateOrUpdateHandoverNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      substitutionId,
      content,
    }: CreateOrUpdateHandoverNoteVariables): Promise<HandoverNoteDto> => {
      const res = await apiFetch(
        `/api/v1/handover-notes/substitutions/${substitutionId}`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) {
        throw new Error('Uebergabenotiz konnte nicht gespeichert werden.');
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: handoverKeys.bySubstitution(vars.substitutionId),
      });
    },
  });
}

export interface UploadHandoverAttachmentVariables {
  noteId: string;
  substitutionId: string;
  file: File;
}

export function useUploadHandoverAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noteId,
      file,
    }: UploadHandoverAttachmentVariables): Promise<HandoverAttachmentDto> => {
      const formData = new FormData();
      formData.append('file', file);
      // apiFetch detects FormData and skips Content-Type auto-set so the
      // browser can populate the multipart boundary (Phase 5 precedent).
      const res = await apiFetch(
        `/api/v1/handover-notes/${noteId}/attachments`,
        {
          method: 'POST',
          body: formData,
        },
      );
      if (!res.ok) {
        throw new Error('Anhang konnte nicht hochgeladen werden.');
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: handoverKeys.bySubstitution(vars.substitutionId),
      });
    },
  });
}
