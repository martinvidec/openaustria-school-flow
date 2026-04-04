import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AttendanceStatusIcon, getNextStatus } from './AttendanceStatusIcon';
import { LateMinutesInput } from './LateMinutesInput';
import { useAttendance, useBulkAttendance, useSetAllPresent } from '@/hooks/useClassbook';
import type { AttendanceRecordDto, AttendanceStatus, BulkAttendanceRequest } from '@schoolflow/shared';
import { Loader2, UserCheck } from 'lucide-react';

interface AttendanceGridProps {
  entryId: string;
  schoolId: string;
}

/**
 * Quick-tap attendance grid with student rows, tap-to-cycle status icons,
 * "Alle anwesend" button, and debounced batch save.
 *
 * Per UI-SPEC D-01, D-04, BOOK-01, BOOK-07:
 * - Students listed alphabetically by name
 * - Tap-to-cycle: present -> absent -> late -> excused -> present
 * - Late minutes input appears when status is LATE
 * - "Alle anwesend" button resets all students to present
 * - Changes debounced 2s after last interaction, then bulk save
 * - Toast "Anwesenheit gespeichert" on success
 * - All touch targets minimum 44x44px
 */
export function AttendanceGrid({ entryId, schoolId }: AttendanceGridProps) {
  const { data: serverRecords, isLoading } = useAttendance(schoolId, entryId);
  const bulkMutation = useBulkAttendance(schoolId, entryId);
  const setAllPresentMutation = useSetAllPresent(schoolId, entryId);

  // Local optimistic state
  const [localRecords, setLocalRecords] = useState<AttendanceRecordDto[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state from server on initial load / refetch
  useEffect(() => {
    if (serverRecords && !isDirty) {
      setLocalRecords(
        [...serverRecords].sort((a, b) => a.studentName.localeCompare(b.studentName, 'de')),
      );
    }
  }, [serverRecords, isDirty]);

  // Debounced save function
  const debouncedSave = useCallback(
    (records: AttendanceRecordDto[]) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const payload: BulkAttendanceRequest = {
          records: records.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            lateMinutes: r.status === 'LATE' ? (r.lateMinutes ?? undefined) : undefined,
          })),
        };

        bulkMutation.mutate(payload, {
          onSuccess: () => {
            setIsDirty(false);
            toast.success('Anwesenheit gespeichert', { duration: 4000 });
          },
          onError: () => {
            toast.error('Anwesenheit konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.', {
              duration: 4000,
            });
          },
        });
      }, 2000);
    },
    [bulkMutation],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleCycleStatus = (studentId: string) => {
    setLocalRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.studentId !== studentId) return r;
        const nextStatus = getNextStatus(r.status);
        return {
          ...r,
          status: nextStatus,
          lateMinutes: nextStatus === 'LATE' ? r.lateMinutes : null,
        };
      });
      setIsDirty(true);
      debouncedSave(updated);
      return updated;
    });
  };

  const handleLateMinutesChange = (studentId: string, minutes: number | null) => {
    setLocalRecords((prev) => {
      const updated = prev.map((r) => {
        if (r.studentId !== studentId) return r;
        return { ...r, lateMinutes: minutes };
      });
      setIsDirty(true);
      debouncedSave(updated);
      return updated;
    });
  };

  const handleSetAllPresent = () => {
    // Optimistic update: reset all to PRESENT
    setLocalRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'PRESENT' as AttendanceStatus,
        lateMinutes: null,
      })),
    );
    setIsDirty(false);

    // Cancel any pending debounced save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Immediately save via dedicated endpoint
    setAllPresentMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Anwesenheit gespeichert', { duration: 4000 });
      },
      onError: () => {
        toast.error('Anwesenheit konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.', {
          duration: 4000,
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Anwesenheit wird geladen...</span>
      </div>
    );
  }

  if (localRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Keine Schueler in dieser Klasse</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Fuegen Sie Schueler zur Klasse hinzu, um die Anwesenheit erfassen zu koennen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handleSetAllPresent}
          disabled={setAllPresentMutation.isPending}
          className="min-h-[44px] w-full sm:w-auto"
        >
          <UserCheck className="h-4 w-4 mr-1.5" />
          Alle anwesend
        </Button>

        {(bulkMutation.isPending || setAllPresentMutation.isPending) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Wird gespeichert...
          </div>
        )}
      </div>

      {/* Student rows with scroll container for long lists */}
      <div className="max-h-[70vh] overflow-y-auto overflow-x-auto divide-y border rounded-lg" role="list" aria-label="Anwesenheitsliste">
        {localRecords.map((record) => (
          <div
            key={record.studentId}
            className="flex items-center justify-between h-12 px-3 sm:px-4 rounded-md bg-background"
            role="listitem"
          >
            {/* Student name */}
            <span className="text-sm truncate max-w-[60%] sm:max-w-none min-w-0 mr-3">
              {record.studentName}
            </span>

            {/* Status + late minutes */}
            <div className="flex items-center gap-2 shrink-0">
              {record.status === 'LATE' && (
                <LateMinutesInput
                  value={record.lateMinutes}
                  onChange={(minutes) => handleLateMinutesChange(record.studentId, minutes)}
                />
              )}

              {/* Compact (icon only) on mobile, full labels on sm+ */}
              <span className="sm:hidden">
                <AttendanceStatusIcon
                  status={record.status}
                  onCycle={() => handleCycleStatus(record.studentId)}
                  compact={true}
                />
              </span>
              <span className="hidden sm:inline-flex">
                <AttendanceStatusIcon
                  status={record.status}
                  onCycle={() => handleCycleStatus(record.studentId)}
                  compact={false}
                />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
