import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreatePermissionOverride } from '@/features/users/hooks/use-create-permission-override';
import { useUpdatePermissionOverride } from '@/features/users/hooks/use-update-permission-override';
import { useDeletePermissionOverride } from '@/features/users/hooks/use-delete-permission-override';
import { ConditionsJsonEditor } from './ConditionsJsonEditor';
import type { PermissionOverride } from '@/features/users/types';

/**
 * Phase 13-02 — single Override row inside `OverridesSection`.
 *
 * UI-SPEC §Override CRUD:
 *   - Grid (desktop): Action | Subject | Granted/Denied switch | Reason
 *     | Collapsible toggle | Delete (2-click inline confirm)
 *   - Mobile: stacked vertically; conditions panel at bottom
 *   - Per-row dirty state → inline 'Override speichern' button appears
 *     when dirty
 *   - Delete: click 1 flashes red + label; click 2 within 3s fires
 *     mutation; click elsewhere or 3s timeout cancels
 */

const STANDARD_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];
const STANDARD_SUBJECTS = ['all'];

interface Props {
  override: PermissionOverride | null; // null = new (not yet saved)
  userId: string;
  knownActions?: string[];
  knownSubjects?: string[];
  onSaved?: () => void;
  onDiscard?: () => void;
}

interface Form {
  action: string;
  subject: string;
  granted: boolean;
  reason: string;
  conditions: Record<string, unknown> | null;
  conditionsRaw: string | null;
}

function fromOverride(o: PermissionOverride | null): Form {
  return {
    action: o?.action ?? '',
    subject: o?.subject ?? '',
    granted: o?.granted ?? true,
    reason: o?.reason ?? '',
    conditions: o?.conditions ?? null,
    conditionsRaw: o?.conditions ? JSON.stringify(o.conditions, null, 2) : null,
  };
}

export function OverrideRow({
  override,
  userId,
  knownActions,
  knownSubjects,
  onSaved,
  onDiscard,
}: Props) {
  const [form, setForm] = useState<Form>(() => fromOverride(override));
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [conditionsValid, setConditionsValid] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const initial = useMemo(() => fromOverride(override), [override]);

  useEffect(() => {
    setForm(fromOverride(override));
  }, [override]);

  // 2-click delete timeout.
  useEffect(() => {
    if (!confirmingDelete) return;
    const t = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  const createMutation = useCreatePermissionOverride(userId);
  const updateMutation = useUpdatePermissionOverride(userId);
  const deleteMutation = useDeletePermissionOverride(userId);

  const dirty =
    form.action !== initial.action ||
    form.subject !== initial.subject ||
    form.granted !== initial.granted ||
    form.reason !== initial.reason ||
    JSON.stringify(form.conditions) !== JSON.stringify(initial.conditions);

  const canSave =
    form.action.trim() !== '' &&
    form.subject.trim() !== '' &&
    form.reason.trim() !== '' &&
    conditionsValid;

  const onSave = () => {
    if (!canSave) return;
    if (override === null) {
      createMutation.mutate(
        {
          userId,
          action: form.action,
          subject: form.subject,
          granted: form.granted,
          conditions: form.conditions,
          reason: form.reason,
        },
        { onSuccess: () => onSaved?.() },
      );
    } else {
      updateMutation.mutate(
        {
          id: override.id,
          payload: {
            action: form.action,
            subject: form.subject,
            granted: form.granted,
            conditions: form.conditions,
            reason: form.reason,
          },
        },
        { onSuccess: () => onSaved?.() },
      );
    }
  };

  const onDeleteClick = () => {
    if (override === null) {
      // New row never persisted — just discard.
      onDiscard?.();
      return;
    }
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMutation.mutate(override.id, { onSuccess: () => onSaved?.() });
  };

  const actionOptions = Array.from(
    new Set([...(knownActions ?? []), ...STANDARD_ACTIONS]),
  );
  const subjectOptions = Array.from(
    new Set([...(knownSubjects ?? []), ...STANDARD_SUBJECTS]),
  );

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Card
      className={cn(
        'transition-colors',
        confirmingDelete && 'bg-destructive/10 border-destructive',
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_2fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Aktion</Label>
            <Select
              value={form.action}
              onValueChange={(v) => setForm((f) => ({ ...f, action: v }))}
            >
              <SelectTrigger className="min-h-11 sm:min-h-9">
                <SelectValue placeholder="Aktion wählen …" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ressource</Label>
            <Select
              value={form.subject}
              onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}
            >
              <SelectTrigger className="min-h-11 sm:min-h-9">
                <SelectValue placeholder="Ressource wählen …" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Switch
              checked={form.granted}
              onCheckedChange={(c) => setForm((f) => ({ ...f, granted: c }))}
              aria-label="Status"
              className={cn(
                form.granted
                  ? 'data-[state=checked]:bg-success'
                  : 'data-[state=unchecked]:bg-destructive',
              )}
            />
            <span
              className={cn(
                'text-xs font-semibold',
                form.granted ? 'text-success' : 'text-destructive',
              )}
            >
              {form.granted ? 'Erlaubt' : 'Verweigert'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="reason-input">
              Begründung
            </Label>
            <Input
              id="reason-input"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="z.B. Vertretungs-Admin während Sommerferien 2026"
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteClick}
              disabled={isPending}
              className={cn(
                'min-h-11 min-w-11 sm:min-h-9 sm:min-w-9',
                confirmingDelete && 'text-destructive',
              )}
              aria-label={
                confirmingDelete ? 'Zum Bestätigen erneut klicken' : 'Override löschen'
              }
              title={confirmingDelete ? 'Zum Bestätigen erneut klicken' : 'Override löschen'}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConditionsOpen((o) => !o)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          aria-expanded={conditionsOpen}
        >
          {conditionsOpen ? (
            <ChevronDown className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden />
          )}
          Erweitert: Bedingungen
        </button>

        {conditionsOpen && (
          <ConditionsJsonEditor
            value={form.conditionsRaw}
            onChange={(raw) => setForm((f) => ({ ...f, conditionsRaw: raw }))}
            onValidChange={(parsed) => {
              setForm((f) => ({ ...f, conditions: parsed }));
              setConditionsValid(true);
            }}
          />
        )}

        {dirty && (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={onSave}
              disabled={!canSave || isPending}
              className="min-h-11 sm:min-h-9"
            >
              {isPending ? 'Speichert …' : 'Override speichern'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
