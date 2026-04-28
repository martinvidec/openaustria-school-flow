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
import { useRequestDeletion } from '@/hooks/useDsgvoDeletionJob';

/**
 * Phase 15-08 Task 4: 2-step Art. 17 (anonymization / deletion) confirmation
 * dialog with email-token strict-equal validation (DSGVO-ADM-06, D-19).
 *
 * Highest blast-radius UI in Phase 15 — initiates IRREVERSIBLE deletion of a
 * Person.
 *
 *   Step 1 — Sicherheitsabfrage:
 *     Warning copy verbatim per UI-SPEC § Destructive confirmations Art. 17.
 *     Buttons: "Abbrechen" (close) / "Weiter" (variant=default — NOT
 *     destructive — advances to step 2).
 *
 *   Step 2 — Bestätigung erforderlich:
 *     Input field "Email-Adresse zur Bestätigung". Submit button "Endgültig
 *     löschen" (variant=destructive).
 *
 *     STRICT EQUAL: `tokenInput === person.email` — case-sensitive, NO trim,
 *     NO toLowerCase normalization (UI-SPEC § Destructive confirmations Art.
 *     17 row). Submit button is `disabled` until match. The submit handler
 *     ALSO checks `tokenMatches` so that DOM-mutation tampering (T-15-08-01)
 *     cannot bypass validation.
 *
 *   Reset:
 *     `step` resets to 1 + `tokenInput` clears whenever `open === false`.
 *     This guards against a re-open with stale state.
 *
 *   DO NOT add `.toLowerCase()`, `.trim()`, or any normalization to the
 *   token comparison. DO NOT pre-fill `tokenInput` with the email — defeats
 *   the security purpose. The deletion `reason` field is DEFERRED (DTO has
 *   no `reason` — adding it would silently drop or 422).
 */

interface Props {
  open: boolean;
  schoolId: string;
  person: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  onClose: () => void;
}

export function RequestDeletionDialog({
  open,
  schoolId,
  person,
  onClose,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tokenInput, setTokenInput] = useState('');
  const requestDeletion = useRequestDeletion();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTokenInput('');
    }
  }, [open]);

  // STRICT-EQUAL — case-sensitive, no trim, no toLowerCase per UI-SPEC.
  const tokenMatches = tokenInput === person.email;

  const submit = () => {
    // Defense-in-depth (T-15-08-01): even if the disabled attribute is
    // removed via DevTools, the submit handler bails out unless the
    // strict-equal token check passes.
    if (!tokenMatches) return;
    requestDeletion.mutate(
      { personId: person.id, schoolId },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !requestDeletion.isPending && onClose()}
    >
      <DialogContent>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>
                User endgültig löschen — Sicherheitsabfrage
              </DialogTitle>
              <DialogDescription>
                Diese Aktion ist irreversibel. Alle personenbezogenen Daten
                dieses Nutzers werden anonymisiert oder gelöscht.
                Anonymisierte Audit-Einträge bleiben für Compliance-Zwecke
                erhalten.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              Vor dem nächsten Schritt: Stelle sicher, dass die Eltern bzw.
              der Erziehungsberechtigte über die Löschung informiert sind und
              kein offener Sachverhalt (Notenkonferenz, Disziplinarverfahren)
              den Eintrag noch benötigt.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button onClick={() => setStep(2)}>Weiter</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Bestätigung erforderlich</DialogTitle>
              <DialogDescription>
                Gib zur Bestätigung die Email-Adresse des Nutzers{' '}
                <strong>{person.email}</strong> exakt ein.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1">
              <Label className="text-muted-foreground">
                Email-Adresse zur Bestätigung
              </Label>
              <Input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {tokenInput.length > 0 && !tokenMatches && (
                <p className="text-destructive text-xs">
                  Email-Adresse stimmt nicht überein.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={requestDeletion.isPending}
              >
                Zurück
              </Button>
              <Button
                variant="destructive"
                disabled={!tokenMatches || requestDeletion.isPending}
                onClick={submit}
              >
                Endgültig löschen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
