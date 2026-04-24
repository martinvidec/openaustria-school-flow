import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import {
  AffectedEntitiesList,
  type UserAffectedEntity,
} from '@/components/admin/shared/AffectedEntitiesList';

/**
 * Phase 13-02 D-07 — Last-Admin-Guard 409 informational dialog.
 *
 * Shown when `PUT /admin/users/:id/roles` returns RFC 9457 409
 * `schoolflow://errors/last-admin-guard`. Single 'Verstanden' button
 * (default variant) — no cancel; this is informational, not a confirm.
 *
 * Copy verbatim per UI-SPEC §231.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  currentAdmins: UserAffectedEntity[];
}

export function LastAdminGuardDialog({ open, onClose, currentAdmins }: Props) {
  const count = currentAdmins.length;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" aria-hidden />
            <div>
              <DialogTitle>Mindestens ein Admin muss bestehen bleiben</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Weise einem anderen User die Admin-Rolle zu, bevor du diese entziehst. Siehe
                    betroffene Entitäten unten.
                  </p>
                  {count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Aktuell gibt es {count} Admin{count === 1 ? '' : 's'} im System.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div>
          <AffectedEntitiesList kind="user" entities={currentAdmins} heading="Aktive Admins" />
        </div>
        <DialogFooter>
          <Button onClick={onClose} autoFocus>
            Verstanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
