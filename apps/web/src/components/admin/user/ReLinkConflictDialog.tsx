import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';
import {
  AffectedEntitiesList,
  type UserAffectedEntity,
} from '@/components/admin/shared/AffectedEntitiesList';
import { useLinkPerson } from '@/features/users/hooks/use-link-person';
import { useUnlinkPerson } from '@/features/users/hooks/use-unlink-person';
import { toast } from 'sonner';
import type {
  PersonType,
  ProblemAffectedEntity,
  ProblemDetail,
} from '@/features/users/types';

/**
 * Phase 13-02 D-14 — 409 Person-Link conflict resolution.
 *
 * Backend hint: `affectedEntities[0].kind === 'user'` → unlink the
 * conflicting USER first; `kind === 'person-*'` → unlink the PERSON
 * side first. After step 1 succeeds, retry the original link.
 *
 * Copy verbatim per UI-SPEC §233.
 */

interface Props {
  open: boolean;
  problem: ProblemDetail | null;
  /** The user we were trying to link (the request originator). */
  userId: string;
  /** The link payload that triggered the 409 — for retry. */
  attempt: { personType: PersonType; personId: string } | null;
  onClose: () => void;
}

export function ReLinkConflictDialog({
  open,
  problem,
  userId,
  attempt,
  onClose,
}: Props) {
  const [stage, setStage] = useState<'idle' | 'unlinking' | 'relinking'>('idle');
  const linkMutation = useLinkPerson(userId);

  const affectedEntities = (problem?.extensions?.affectedEntities ??
    problem?.affectedEntities ??
    []) as ProblemAffectedEntity[];

  // Determine which side holds the conflict.
  const conflictingUserId =
    affectedEntities.find((e) => e.kind === 'user')?.id ?? null;

  const unlinkConflictingUser = useUnlinkPerson(conflictingUserId ?? '');

  const onConfirm = async () => {
    if (!attempt) return;
    setStage('unlinking');
    try {
      if (conflictingUserId) {
        await unlinkConflictingUser.mutateAsync(undefined);
      } else {
        // Person-side conflict — backend would need a person-side unlink
        // endpoint. For v1.1 we surface the hint and ask the admin to
        // resolve manually via the affected person's admin route.
        toast.error('Verknüpfung nicht möglich', {
          description:
            'Bitte lösen Sie zuerst die bestehende Verknüpfung im jeweiligen Personen-Datensatz.',
        });
        setStage('idle');
        onClose();
        return;
      }
      setStage('relinking');
      await linkMutation.mutateAsync(attempt);
      setStage('idle');
      onClose();
    } catch {
      setStage('idle');
      // hooks already toast errors per Silent-4XX-Invariante.
    }
  };

  const userEntities: UserAffectedEntity[] = affectedEntities
    .filter((e) => e.kind === 'user')
    .map((e) => ({ id: e.id, email: e.email, name: e.name }));

  const isPending =
    stage !== 'idle' || linkMutation.isPending || unlinkConflictingUser.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden />
            <div>
              <DialogTitle>Bestehende Verknüpfung ersetzen?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    {problem?.detail ??
                      'Die Person ist bereits mit einem anderen User verknüpft. Um diese Verknüpfung dem neuen User zuzuweisen, muss zuerst die bestehende gelöst werden. Fortfahren?'}
                  </p>
                  {stage === 'unlinking' && (
                    <p className="text-xs text-muted-foreground">Stufe 1: bestehende Verknüpfung wird gelöst …</p>
                  )}
                  {stage === 'relinking' && (
                    <p className="text-xs text-muted-foreground">Stufe 2: neue Verknüpfung wird erstellt …</p>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {userEntities.length > 0 && (
          <div>
            <AffectedEntitiesList
              kind="user"
              entities={userEntities}
              heading="Betroffene Verknüpfung"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Wird ersetzt …' : 'Bestehende lösen und neu verknüpfen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
