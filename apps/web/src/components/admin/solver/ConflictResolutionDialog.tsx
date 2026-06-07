import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimetableConflictDto } from '@/hooks/useTimetableConflicts';
import {
  useConflictSuggestions,
  useResolveConflict,
  type ResolveConflictPayload,
} from '@/hooks/useConflictResolution';

/**
 * Issue #177-C — resolution dialog for a single dropped-lesson conflict.
 *
 * Three actions, gated on what the suggestions endpoint returns:
 *   - reassign-resource: assign a free qualified teacher (TEACHER conflict) or
 *     a free compatible room (ROOM conflict) at the original slot.
 *   - move-slot: move the lesson (original teacher + room) to a free slot.
 *   - cancel: drop the lesson permanently.
 *
 * On success the run flips back to COMPLETED once the last conflict is gone.
 */

type Action = ResolveConflictPayload['action'];

export function ConflictResolutionDialog({
  open,
  schoolId,
  runId,
  conflict,
  onClose,
}: {
  open: boolean;
  schoolId: string;
  runId: string;
  conflict: TimetableConflictDto | null;
  onClose: () => void;
}) {
  const conflictId = conflict?.id ?? null;
  const isTeacher = conflict?.conflictType === 'TEACHER';

  const { data: suggestions, isLoading } = useConflictSuggestions(
    schoolId,
    runId,
    conflictId,
    open,
  );
  const resolve = useResolveConflict(schoolId, runId);

  const [action, setAction] = useState<Action>('cancel');
  const [resourceId, setResourceId] = useState<string>('');
  const [slotKey, setSlotKey] = useState<string>('');

  // Reset the form each time the dialog opens for a (new) conflict.
  useEffect(() => {
    if (open) {
      setAction('cancel');
      setResourceId('');
      setSlotKey('');
    }
  }, [open, conflictId]);

  const resources = suggestions?.alternativeResources ?? [];
  const freeSlots = suggestions?.freeSlots ?? [];
  const reassignLabel = isTeacher
    ? 'Anderen Lehrer zuweisen'
    : 'Anderen Raum zuweisen';

  const handleSubmit = () => {
    if (!conflict) return;
    let payload: ResolveConflictPayload;
    if (action === 'cancel') {
      payload = { action: 'cancel' };
    } else if (action === 'reassign-resource') {
      if (!resourceId) {
        toast.error(
          isTeacher ? 'Bitte einen Lehrer wählen.' : 'Bitte einen Raum wählen.',
        );
        return;
      }
      payload = isTeacher
        ? { action: 'reassign-resource', newTeacherId: resourceId }
        : { action: 'reassign-resource', newRoomId: resourceId };
    } else {
      const slot = freeSlots.find(
        (s) => `${s.dayOfWeek}-${s.periodNumber}-${s.weekType}` === slotKey,
      );
      if (!slot) {
        toast.error('Bitte einen freien Slot wählen.');
        return;
      }
      payload = {
        action: 'move-slot',
        dayOfWeek: slot.dayOfWeek,
        periodNumber: slot.periodNumber,
        weekType: slot.weekType,
      };
    }

    resolve.mutate(
      { conflictId: conflict.id, payload },
      {
        onSuccess: (res) => {
          toast.success(
            res.runCompleted
              ? 'Konflikt gelöst — Stundenplan ist jetzt vollständig.'
              : 'Konflikt gelöst.',
          );
          onClose();
        },
        onError: (err) => {
          toast.error('Konflikt konnte nicht gelöst werden', {
            description:
              err instanceof Error ? err.message : 'Unbekannter Fehler',
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="conflict-resolve-dialog">
        <DialogHeader>
          <DialogTitle>Konflikt lösen</DialogTitle>
        </DialogHeader>

        {conflict && (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{conflict.subjectLabel}</div>
              <div className="text-muted-foreground">
                {isTeacher ? 'Lehrer-Doppelbelegung' : 'Raum-Doppelbelegung'}
                {conflict.conflictsWithLabel
                  ? ` · kollidiert mit ${conflict.conflictsWithLabel}`
                  : ''}
              </div>
            </div>

            <RadioGroup
              value={action}
              onValueChange={(v) => setAction(v as Action)}
              className="space-y-3"
            >
              {/* reassign-resource */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="reassign-resource"
                    id="action-reassign"
                    disabled={resources.length === 0}
                    data-testid="action-reassign"
                  />
                  <Label
                    htmlFor="action-reassign"
                    className={
                      resources.length === 0 ? 'text-muted-foreground' : ''
                    }
                  >
                    {reassignLabel}
                    {!isLoading && resources.length === 0 && (
                      <span className="text-xs"> (keine frei)</span>
                    )}
                  </Label>
                </div>
                {action === 'reassign-resource' && resources.length > 0 && (
                  <Select value={resourceId} onValueChange={setResourceId}>
                    <SelectTrigger
                      className="min-h-11 sm:min-h-9"
                      data-testid="reassign-select"
                    >
                      <SelectValue
                        placeholder={isTeacher ? 'Lehrer wählen' : 'Raum wählen'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* move-slot */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="move-slot"
                    id="action-move"
                    disabled={freeSlots.length === 0}
                    data-testid="action-move"
                  />
                  <Label
                    htmlFor="action-move"
                    className={
                      freeSlots.length === 0 ? 'text-muted-foreground' : ''
                    }
                  >
                    In freien Slot verschieben
                    {!isLoading && freeSlots.length === 0 && (
                      <span className="text-xs"> (keiner frei)</span>
                    )}
                  </Label>
                </div>
                {action === 'move-slot' && freeSlots.length > 0 && (
                  <Select value={slotKey} onValueChange={setSlotKey}>
                    <SelectTrigger
                      className="min-h-11 sm:min-h-9"
                      data-testid="move-select"
                    >
                      <SelectValue placeholder="Slot wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {freeSlots.map((s) => {
                        const key = `${s.dayOfWeek}-${s.periodNumber}-${s.weekType}`;
                        return (
                          <SelectItem key={key} value={key}>
                            {s.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* cancel */}
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="cancel"
                  id="action-cancel"
                  data-testid="action-cancel"
                />
                <Label htmlFor="action-cancel">Lektion entfernen</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={resolve.isPending}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={resolve.isPending}
            data-testid="conflict-resolve-submit"
          >
            {resolve.isPending ? 'Wird gelöst…' : 'Lösen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
