import { useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { StickyMobileSaveBar } from '@/components/admin/shared/StickyMobileSaveBar';
import { useRoles } from '@/features/users/hooks/use-roles';
import { useUserRoles } from '@/features/users/hooks/use-user-roles';
import { useUpdateUserRoles } from '@/features/users/hooks/use-update-user-roles';
import { SelfLockoutWarnDialog } from './SelfLockoutWarnDialog';
import { LastAdminGuardDialog } from './LastAdminGuardDialog';
import type { UserAffectedEntity } from '@/components/admin/shared/AffectedEntitiesList';
import type { UserDirectoryDetail, UserApiError } from '@/features/users/types';

/**
 * Phase 13-02 — User-Detail Tab 2 (Rollen).
 *
 * UI-SPEC §Interaction Choreography §Role-Save:
 *   1. Konsistenz-InfoBanner (D-08) at top if role↔person-link divergence
 *   2. Card "Rollen zuweisen" with 5 Checkbox rows
 *   3. JWT-Refresh hint at bottom
 *   4. StickyMobileSaveBar (mobile) / inline buttons (desktop) when dirty
 *   5. Self-Lockout-Warn pre-flight check on save
 *   6. Last-Admin-Guard 409 → LastAdminGuardDialog
 *   7. 200 → success toast 'Rollen aktualisiert'
 */

interface Props {
  user: UserDirectoryDetail;
  currentUserId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function UserRolesTab({ user, currentUserId, onDirtyChange }: Props) {
  const { data: allRoles } = useRoles();
  const { data: userRolesData } = useUserRoles(user.id);
  const updateMutation = useUpdateUserRoles(user.id);

  const initialRoles = useMemo(() => userRolesData?.roles ?? user.roles, [userRolesData, user.roles]);
  const [selected, setSelected] = useState<string[]>(initialRoles);

  // Sync when initialRoles change (cache hydration).
  useEffect(() => {
    setSelected(initialRoles);
  }, [initialRoles]);

  const dirty = useMemo(() => {
    const a = new Set(initialRoles);
    const b = new Set(selected);
    if (a.size !== b.size) return true;
    for (const v of a) if (!b.has(v)) return true;
    return false;
  }, [initialRoles, selected]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const [selfLockoutOpen, setSelfLockoutOpen] = useState(false);
  const [lastAdminGuardOpen, setLastAdminGuardOpen] = useState(false);
  const [pendingAdmins, setPendingAdmins] = useState<UserAffectedEntity[]>([]);

  const toggle = (name: string, checked: boolean) => {
    setSelected((prev) => {
      const next = checked ? [...new Set([...prev, name])] : prev.filter((r) => r !== name);
      return next;
    });
  };

  const reset = () => setSelected(initialRoles);

  const performSave = () => {
    updateMutation.mutate(
      { roleNames: selected },
      {
        onError: (err) => {
          const apiErr = err as UserApiError;
          if (
            apiErr?.status === 409 &&
            apiErr?.problem?.type === 'schoolflow://errors/last-admin-guard'
          ) {
            const affected = (apiErr.problem.extensions?.affectedEntities ??
              apiErr.problem.affectedEntities ??
              []) as UserAffectedEntity[];
            setPendingAdmins(affected);
            setLastAdminGuardOpen(true);
          }
        },
      },
    );
  };

  const onSave = () => {
    // Pre-flight: self-lockout check (D-06).
    const isSelf = currentUserId && currentUserId === user.id;
    const wasAdmin = initialRoles.includes('admin');
    const isAdmin = selected.includes('admin');
    if (isSelf && wasAdmin && !isAdmin) {
      setSelfLockoutOpen(true);
      return;
    }
    performSave();
  };

  // Konsistenz-Hinweis InfoBanners (D-08).
  const divergences: string[] = [];
  const personType = user.personLink?.personType;
  if (selected.includes('lehrer') && personType !== 'TEACHER') {
    divergences.push(
      'Tipp: Dieser User hat die Lehrer-Rolle, ist aber nicht mit einem Lehrer-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um eine Lehrkraft zuzuordnen.',
    );
  }
  if (selected.includes('schueler') && personType !== 'STUDENT') {
    divergences.push(
      'Tipp: Dieser User hat die Schüler-Rolle, ist aber nicht mit einem Schüler-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um einen Schüler zuzuordnen.',
    );
  }
  if (selected.includes('eltern') && personType !== 'PARENT') {
    divergences.push(
      'Tipp: Dieser User hat die Eltern-Rolle, ist aber nicht mit einem Eltern-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um eine:n Erziehungsberechtigte:n zuzuordnen.',
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      {divergences.length > 0 && (
        <div
          className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground"
          role="status"
        >
          <div className="flex items-start gap-2">
            <TriangleAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" aria-hidden />
            <div className="space-y-1">
              {divergences.slice(0, 3).map((d, i) => (
                <p key={i}>{d}</p>
              ))}
              {divergences.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  …weitere ({divergences.length - 3})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Rollen zuweisen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(allRoles ?? []).map((role) => {
            const checked = selected.includes(role.name);
            return (
              <label
                key={role.id}
                className="flex items-start gap-3 px-2 py-2 rounded hover:bg-accent/30 min-h-11 cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => toggle(role.name, !!c)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {role.displayName ?? role.name}
                  </div>
                  {role.description && (
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <div
        className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground"
        role="status"
      >
        <span>
          Änderungen wirken spätestens nach erneutem Login vollständig (typisch innerhalb von 15
          Minuten).
        </span>
      </div>

      {dirty && (
        <div className="hidden md:flex justify-end gap-2">
          <Button variant="ghost" onClick={reset} disabled={updateMutation.isPending}>
            Verwerfen
          </Button>
          <Button onClick={onSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Wird gespeichert …' : 'Änderungen speichern'}
          </Button>
        </div>
      )}

      <StickyMobileSaveBar
        isDirty={dirty}
        isSaving={updateMutation.isPending}
        onSave={onSave}
        label="Änderungen speichern"
      />

      <SelfLockoutWarnDialog
        open={selfLockoutOpen}
        onCancel={() => setSelfLockoutOpen(false)}
        onConfirm={() => {
          setSelfLockoutOpen(false);
          performSave();
        }}
      />

      <LastAdminGuardDialog
        open={lastAdminGuardOpen}
        onClose={() => {
          setLastAdminGuardOpen(false);
          // Revert UI to initial — server rejected the change.
          setSelected(initialRoles);
        }}
        currentAdmins={pendingAdmins}
      />
    </div>
  );
}
