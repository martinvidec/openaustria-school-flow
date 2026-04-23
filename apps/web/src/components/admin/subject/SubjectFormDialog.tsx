import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateSubject,
  useUpdateSubject,
  SubjectApiError,
  type SubjectDto,
} from '@/hooks/useSubjects';

/**
 * SubjectFormDialog (Phase 11 Plan 11-02 SUBJECT-02).
 *
 * Body fields (D-11 USER-OVERRIDE ROLLBACK 2026-04-22):
 *   1. Name  (required, maxLength 64)
 *   2. Kürzel (required, maxLength 8, auto-uppercase on blur)
 *
 * Farbe field is DROPPED — Subject schema has no color columns; colors
 * are auto-derived via getSubjectColor(id). Information note replaces
 * the picker UI per UI-SPEC §3.3.2.
 *
 * 409 Kürzel-uniqueness (implementation constraint, NOT a REQ-ID):
 * inline error on the Kürzel field — `Dieses Kürzel ist bereits vergeben.`
 * Dialog stays open. No toast (the hook's onError suppresses for 409).
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  /** When provided, dialog operates in edit mode for the given subject. */
  subject?: SubjectDto;
}

export function SubjectFormDialog({ open, onOpenChange, schoolId, subject }: Props) {
  const isEdit = !!subject;
  const createMutation = useCreateSubject(schoolId);
  const updateMutation = useUpdateSubject(schoolId, subject?.id ?? '');

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [touched, setTouched] = useState(false);
  const [shortNameServerError, setShortNameServerError] = useState<string | null>(
    null,
  );

  // Reset form when opening in a new mode or with a different subject.
  useEffect(() => {
    if (!open) return;
    setName(subject?.name ?? '');
    setShortName(subject?.shortName ?? '');
    setTouched(false);
    setShortNameServerError(null);
  }, [open, subject?.id, subject?.name, subject?.shortName]);

  const errors = {
    name:
      name.trim().length === 0
        ? 'Pflichtfeld'
        : name.length > 64
          ? 'Maximal 64 Zeichen'
          : undefined,
    shortName: shortNameServerError
      ? shortNameServerError
      : shortName.trim().length === 0
        ? 'Pflichtfeld'
        : shortName.length > 8
          ? 'Maximal 8 Zeichen'
          : undefined,
  };
  const isValid = !errors.name && !errors.shortName && !shortNameServerError;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleShortNameBlur = () => {
    // Auto-uppercase on blur (UI-SPEC §3.3, mirrors Zod .transform).
    if (shortName !== shortName.toUpperCase()) {
      setShortName(shortName.toUpperCase());
    }
    // Clear server error on edit.
    setShortNameServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      schoolId,
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof SubjectApiError && err.status === 409) {
        // Inline-surface the Kürzel uniqueness error — keep dialog open.
        setShortNameServerError('Dieses Kürzel ist bereits vergeben.');
      }
      // Other errors already toast'd by the mutation hook's onError.
    }
  };

  const dialogTitle = isEdit ? 'Fach bearbeiten' : 'Fach anlegen';
  const submitLabel = isEdit ? 'Speichern' : 'Fach anlegen';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Pflegen Sie Name und Kürzel des Fachs. Die Farbe wird automatisch
            zugewiesen.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-label={dialogTitle}
        >
          <div>
            <Label htmlFor="subject-name">Name *</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematik"
              maxLength={64}
              required
              aria-invalid={!!(touched && errors.name)}
              aria-describedby={touched && errors.name ? 'subject-name-err' : undefined}
              data-testid="subject-name-input"
            />
            {touched && errors.name && (
              <p id="subject-name-err" className="text-sm text-destructive mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="subject-shortname">Kürzel *</Label>
            <Input
              id="subject-shortname"
              value={shortName}
              onChange={(e) => {
                setShortName(e.target.value);
                if (shortNameServerError) setShortNameServerError(null);
              }}
              onBlur={handleShortNameBlur}
              placeholder="M"
              maxLength={8}
              required
              aria-invalid={!!(touched && errors.shortName)}
              aria-describedby={
                touched && errors.shortName ? 'subject-shortname-err' : undefined
              }
              data-testid="subject-shortname-input"
            />
            {touched && errors.shortName && (
              <p
                id="subject-shortname-err"
                className="text-sm text-destructive mt-1"
                data-testid="subject-shortname-error"
              >
                {errors.shortName}
              </p>
            )}
          </div>

          <div
            className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3"
            data-testid="subject-color-info"
          >
            Die Farbe wird automatisch aus der Standard-Palette vergeben.
            Manuelle Farbauswahl folgt in einer späteren Phase.
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              autoFocus
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving || !isValid} data-testid="subject-submit">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
