import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissionOverrides } from '@/features/users/hooks/use-permission-overrides';
import { OverrideRow } from './OverrideRow';

/**
 * Phase 13-02 — Per-User-Overrides section (Tab 4 top half).
 *
 * UI-SPEC §471-478: flex-column of OverrideRow Cards + footer button
 * '+ Override hinzufügen'. Empty state per UI-SPEC §201:
 *   `Keine Overrides gesetzt` + CTA `+ Override hinzufügen`.
 */

interface Props {
  userId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export function OverridesSection({ userId, onDirtyChange }: Props) {
  const { data, isLoading } = usePermissionOverrides(userId);
  const [draft, setDraft] = useState(false);

  // The section is "dirty" only while a draft (unsaved new) row is open.
  useEffect(() => {
    onDirtyChange?.(draft);
  }, [draft, onDirtyChange]);

  const overrides = data ?? [];
  const knownActions = Array.from(new Set(overrides.map((o) => o.action)));
  const knownSubjects = Array.from(new Set(overrides.map((o) => o.subject)));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Per-User-Overrides</h2>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground py-12 text-center">Lade …</div>
      )}

      {!isLoading && overrides.length === 0 && !draft && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <h3 className="text-base font-semibold">Keine Overrides gesetzt</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-3 max-w-md">
            Per-User-Berechtigungen überschreiben die Rollen-Defaults. Fügen Sie einen Override
            hinzu, um gezielt Zugriff zu erweitern oder zu entziehen.
          </p>
          <Button onClick={() => setDraft(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden /> Override hinzufügen
          </Button>
        </div>
      )}

      {(overrides.length > 0 || draft) && (
        <div className="flex flex-col gap-3">
          {overrides.map((o) => (
            <OverrideRow
              key={o.id}
              override={o}
              userId={userId}
              knownActions={knownActions}
              knownSubjects={knownSubjects}
            />
          ))}
          {draft && (
            <OverrideRow
              override={null}
              userId={userId}
              knownActions={knownActions}
              knownSubjects={knownSubjects}
              onSaved={() => setDraft(false)}
              onDiscard={() => setDraft(false)}
            />
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setDraft(true)}
              disabled={draft}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden /> Override hinzufügen
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
