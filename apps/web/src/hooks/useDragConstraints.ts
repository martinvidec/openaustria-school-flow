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
          const result: MoveValidation = await res.json();
          cache.current.set(cacheKey, result);
          setValidationResult(result);
        } catch {
          setValidationResult(null);
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
