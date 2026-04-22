import { useEffect, useMemo, useState } from 'react';
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
import { useKeycloakUsers, type KeycloakUser } from '@/hooks/useKeycloakUsers';
import { useLinkKeycloak } from '@/hooks/useTeachers';

/**
 * KeycloakLinkDialog — Tab 1 (Stammdaten) Keycloak-Link section trigger.
 *
 * State machine:
 *   Idle      (email.length < 3)
 *   Searching (isLoading)
 *   NoMatch   (200 with empty array OR 404)
 *   Match     (200 with ≥1 user)
 *
 * `alreadyLinkedToPersonId` renders an amber warning box so the admin knows
 * clicking Verknüpfen will overwrite an existing mapping.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  initialEmail?: string;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function KeycloakLinkDialog({ open, onOpenChange, teacherId, initialEmail = '' }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const debouncedEmail = useDebounced(email, 300);
  const { data = [], isLoading, isFetched } = useKeycloakUsers({ email: debouncedEmail });
  const [selected, setSelected] = useState<KeycloakUser | null>(null);
  const linkMutation = useLinkKeycloak(teacherId);

  // Auto-select the sole match so the Verknüpfen button activates without
  // an extra click for the overwhelmingly common single-match case.
  useEffect(() => {
    if (data.length === 1) setSelected(data[0]);
    else setSelected(null);
  }, [data]);

  const state: 'idle' | 'searching' | 'nomatch' | 'match' = useMemo(() => {
    if (debouncedEmail.length < 3) return 'idle';
    if (isLoading) return 'searching';
    if (isFetched && data.length === 0) return 'nomatch';
    return 'match';
  }, [debouncedEmail, isLoading, isFetched, data.length]);

  const handleConfirm = async () => {
    if (!selected) return;
    await linkMutation.mutateAsync(selected.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keycloak-Account verknüpfen</DialogTitle>
          <DialogDescription>
            E-Mail des Keycloak-Accounts eingeben, der dieser Lehrperson zugeordnet werden soll.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="maria.huber@schule.at"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            aria-label="Keycloak-E-Mail"
          />

          {state === 'idle' && (
            <p className="text-sm text-muted-foreground">Mindestens 3 Zeichen eingeben.</p>
          )}
          {state === 'searching' && (
            <p className="text-sm text-muted-foreground">Suche läuft …</p>
          )}
          {state === 'nomatch' && (
            <p className="text-sm text-muted-foreground">
              Kein Account mit dieser E-Mail gefunden
            </p>
          )}
          {state === 'match' &&
            data.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  selected?.id === u.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="font-medium">
                  {u.firstName} {u.lastName}
                </div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Keycloak-ID: {u.id.slice(0, 8)}…
                </div>
                {u.alreadyLinkedToPersonId && (
                  <div className="mt-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
                    Bereits verknüpft mit {u.alreadyLinkedToPersonName}. Die Verknüpfung wird
                    überschrieben.
                  </div>
                )}
              </button>
            ))}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" autoFocus onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || linkMutation.isPending}>
            Verknüpfen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
