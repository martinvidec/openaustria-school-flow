import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  useCreateRetentionPolicy,
  useUpdateRetentionPolicy,
  type RetentionPolicyDto,
} from '@/hooks/useRetention';

/**
 * Phase 15-06 Task 3: Modal dialog for retention-policy create + edit.
 *
 * Two modes via the `mode` prop:
 *  - 'create' → all fields editable (dataCategory + retentionDays).
 *    POST /api/v1/dsgvo/retention via useCreateRetentionPolicy.
 *  - 'edit'   → dataCategory disabled, only retentionDays editable.
 *    PUT /api/v1/dsgvo/retention/:id via useUpdateRetentionPolicy.
 *    Backend reads ONLY @Body('retentionDays') — passing other fields
 *    is silently ignored, but the input is disabled to prevent confusion
 *    (T-15-06-04 mitigation).
 *
 * Validation:
 *  - dataCategory required + non-empty (create only)
 *  - retentionDays integer >= 1 (both modes)
 *  - Inline error copy "Pflichtfeld." per UI-SPEC § Error states (verbatim).
 *
 * NOTE — deviation from plan prose: the plan's action snippet referenced
 * a `legalBasis` field, but neither `RetentionPolicy` (Prisma model) nor
 * `RetentionPolicyDto` (frontend hook type) nor `CreateRetentionPolicyDto`
 * (backend DTO) has a `legalBasis` field. Verified 2026-04-28 against
 * apps/api/prisma/schema.prisma + apps/api/src/modules/dsgvo/retention/
 * dto/create-retention-policy.dto.ts. Field omitted from the dialog
 * (Rule 1 bug-fix) — adding it would either trip the backend whitelist
 * or be silently dropped, both creating a broken UX contract.
 *
 * Hooks already toast on success/error and invalidate queries, so the
 * dialog only needs to call onClose() on success.
 */

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  policy?: RetentionPolicyDto;
  schoolId: string;
  onClose: () => void;
}

export function RetentionEditDialog({
  open,
  mode,
  policy,
  schoolId,
  onClose,
}: Props) {
  const create = useCreateRetentionPolicy();
  const update = useUpdateRetentionPolicy();

  const [dataCategory, setDataCategory] = useState('');
  const [retentionDays, setRetentionDays] = useState<number | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && policy) {
      setDataCategory(policy.dataCategory);
      setRetentionDays(policy.retentionDays);
    } else {
      setDataCategory('');
      setRetentionDays('');
    }
    setErrors({});
  }, [open, mode, policy]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'create' && !dataCategory.trim()) {
      e.dataCategory = 'Pflichtfeld.';
    }
    if (typeof retentionDays !== 'number' || retentionDays < 1) {
      e.retentionDays = 'Pflichtfeld.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (mode === 'create') {
      create.mutate(
        {
          schoolId,
          dataCategory: dataCategory.trim(),
          retentionDays: Number(retentionDays),
        },
        { onSuccess: () => onClose() },
      );
    } else if (policy) {
      update.mutate(
        { id: policy.id, retentionDays: Number(retentionDays) },
        { onSuccess: () => onClose() },
      );
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !isPending && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Aufbewahrungsrichtlinie anlegen'
              : 'Aufbewahrungsrichtlinie bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            Aufbewahrungsfrist pro Datenkategorie verwalten (DSGVO-ADM-02).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-1">
            <Label
              htmlFor="retention-data-category"
              className="text-muted-foreground"
            >
              Datenkategorie
            </Label>
            <Input
              id="retention-data-category"
              value={dataCategory}
              onChange={(e) => setDataCategory(e.target.value)}
              disabled={mode === 'edit' || isPending}
              placeholder="z.B. noten, anwesenheit, kommunikation"
            />
            {errors.dataCategory && (
              <p className="text-destructive text-xs">
                {errors.dataCategory}
              </p>
            )}
          </div>

          <div className="grid gap-1">
            <Label
              htmlFor="retention-days"
              className="text-muted-foreground"
            >
              Aufbewahrung (Tage)
            </Label>
            <Input
              id="retention-days"
              type="number"
              min={1}
              value={retentionDays}
              disabled={isPending}
              onChange={(e) =>
                setRetentionDays(
                  e.target.value === '' ? '' : Number(e.target.value),
                )
              }
            />
            {errors.retentionDays && (
              <p className="text-destructive text-xs">
                {errors.retentionDays}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending}>
              {mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
