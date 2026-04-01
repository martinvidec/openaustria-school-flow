import { useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import type { MoveValidation } from '@schoolflow/shared';

/**
 * Hook for debounced constraint validation during drag-and-drop.
 * Calls POST /api/v1/schools/:schoolId/timetable/validate-move with 200ms debounce
 * to prevent flooding the server (per Pitfall 6).
 *
 * Caches validation results per move target to avoid redundant API calls
 * when the user drags back over previously validated slots.
 */
export function useDragConstraints(schoolId: string) {
  const [validationResult, setValidationResult] = useState<MoveValidation | null>(null);
  const [validatingSlot, setValidatingSlot] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<Map<string, MoveValidation>>(new Map());

  const validateMove = useCallback(
    (lessonId: string, targetDay: string, targetPeriod: number, targetRoomId?: string) => {
      const cacheKey = `${lessonId}-${targetDay}-${targetPeriod}-${targetRoomId ?? ''}`;
      setValidatingSlot(`${targetDay}-${targetPeriod}`);

      // Check cache first
      const cached = cache.current.get(cacheKey);
      if (cached) {
        setValidationResult(cached);
        return;
      }

      // Debounce 200ms per Pitfall 6
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/validate-move`, {
            method: 'POST',
            body: JSON.stringify({ lessonId, targetDay, targetPeriod, targetRoomId }),
          });
          if (!res.ok) {
            // Server returned 4xx/5xx -- show as hard violation instead of crashing
            const fallback: MoveValidation = {
              valid: false,
              hardViolations: [{ type: 'server_error', description: `Validierung fehlgeschlagen (${res.status})` }],
              softWarnings: [],
            };
            cache.current.set(cacheKey, fallback);
            setValidationResult(fallback);
            return;
          }
          const result: MoveValidation = await res.json();
          cache.current.set(cacheKey, result);
          setValidationResult(result);
        } catch {
          // Network error -- show as hard violation
          const fallback: MoveValidation = {
            valid: false,
            hardViolations: [{ type: 'network_error', description: 'Netzwerkfehler bei der Validierung' }],
            softWarnings: [],
          };
          setValidationResult(fallback);
        }
      }, 200);
    },
    [schoolId],
  );

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setValidatingSlot(null);
    cache.current.clear();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  return { validationResult, validatingSlot, validateMove, clearValidation };
}
