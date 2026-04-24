import { useState } from 'react';
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
import { useLinkPerson } from '@/features/users/hooks/use-link-person';
import {
  PersonAutocompletePopover,
  type SelectedPerson,
} from './PersonAutocompletePopover';
import type { PersonType, ProblemDetail } from '@/features/users/types';

/**
 * Phase 13-02 — Mit Person verknüpfen Dialog.
 *
 * UI-SPEC §298: title `Mit Person verknüpfen` (or `Verknüpfung ändern`
 * when re-linking from a linked state).
 *
 * Body: RadioGroup of Lehrkraft / Schüler:in / Erziehungsberechtigte:n
 * + PersonAutocompletePopover bound to the selected radio.
 *
 * On 409 link-conflict the dialog closes and propagates the conflict
 * payload up so the parent can open `ReLinkConflictDialog`.
 */

interface Props {
  open: boolean;
  userId: string;
  /** if true, dialog title becomes 'Verknüpfung ändern' */
  changeMode?: boolean;
  onClose: () => void;
  onConflict: (problem: ProblemDetail, attempted: { personType: PersonType; personId: string }) => void;
}

export function LinkPersonDialog({ open, userId, changeMode, onClose, onConflict }: Props) {
  const [personType, setPersonType] = useState<PersonType>('TEACHER');
  const [selected, setSelected] = useState<SelectedPerson | null>(null);
  const linkMutation = useLinkPerson(userId);

  const reset = () => {
    setSelected(null);
    setPersonType('TEACHER');
  };

  const onConfirm = () => {
    if (!selected) return;
    linkMutation.mutate(
      { personType, personId: selected.id },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (err: any) => {
          if (
            err?.status === 409 &&
            err?.problem?.type === 'schoolflow://errors/person-link-conflict'
          ) {
            onConflict(err.problem, { personType, personId: selected.id });
            reset();
            onClose();
          }
        },
      },
    );
  };

  const onDialogChange = (next: boolean) => {
    if (!next) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{changeMode ? 'Verknüpfung ändern' : 'Mit Person verknüpfen'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Person-Typ</Label>
            <RadioGroup
              value={personType}
              onValueChange={(v) => {
                setPersonType(v as PersonType);
                setSelected(null);
              }}
              className="grid gap-2"
            >
              {(
                [
                  ['TEACHER', 'Lehrkraft'],
                  ['STUDENT', 'Schüler:in'],
                  ['PARENT', 'Erziehungsberechtigte:n'],
                ] as Array<[PersonType, string]>
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-accent/30 cursor-pointer min-h-11"
                >
                  <RadioGroupItem value={value} id={`person-type-${value}`} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <PersonAutocompletePopover personType={personType} onSelect={setSelected} />

          {selected && (
            <div className="rounded-md border bg-accent/30 p-2 text-sm">
              Ausgewählt:{' '}
              <span className="font-semibold">
                {selected.firstName} {selected.lastName}
              </span>
              {selected.secondary && (
                <span className="text-xs text-muted-foreground"> ({selected.secondary})</span>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onDialogChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!selected || linkMutation.isPending}
          >
            {linkMutation.isPending
              ? 'Verknüpft …'
              : changeMode
                ? 'Verknüpfung übernehmen'
                : 'Verknüpfen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
