import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from './StatusBadge';
import { DisableUserDialog } from './DisableUserDialog';
import { EnableUserDialog } from './EnableUserDialog';
import type { UserDirectoryDetail } from '@/features/users/types';

/**
 * Phase 13-02 — User-Detail Tab 1 (Stammdaten).
 *
 * UI-SPEC §Layout §Stammdaten-Tab:
 *   - Read-only KC fields in 2-col grid (desktop) / 1-col (mobile)
 *   - 'Account-Status' Card with Switch + action button (Sperren / Reaktivieren)
 *   - No dirty state — Enabled-Toggle uses optimistic mutation via WarnDialog confirm
 */

interface Props {
  user: UserDirectoryDetail;
}

function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('de-AT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function UserStammdatenTab({ user }: Props) {
  const [disableOpen, setDisableOpen] = useState(false);
  const [enableOpen, setEnableOpen] = useState(false);

  const fields: Array<{ label: string; value: string }> = [
    { label: 'Vorname', value: user.firstName || '—' },
    { label: 'Nachname', value: user.lastName || '—' },
    { label: 'E-Mail', value: user.email || '—' },
    { label: 'Benutzername', value: user.username || '—' },
    { label: 'Erstellt am', value: formatDate(user.createdTimestamp) },
    { label: 'User-ID', value: user.id },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{f.label}</span>
            <span className="text-sm text-muted-foreground break-all" title={f.value}>
              {f.label === 'User-ID' ? `${f.value.slice(0, 8)} …` : f.value}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account-Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Switch checked={user.enabled} disabled aria-label="Account-Status" />
            <StatusBadge enabled={user.enabled} />
          </div>
          {user.enabled ? (
            <Button
              variant="destructive"
              onClick={() => setDisableOpen(true)}
              className="min-h-11"
            >
              Sperren
            </Button>
          ) : (
            <Button onClick={() => setEnableOpen(true)} className="min-h-11">
              Reaktivieren
            </Button>
          )}
        </CardContent>
      </Card>

      <DisableUserDialog
        open={disableOpen}
        user={user}
        onClose={() => setDisableOpen(false)}
      />
      <EnableUserDialog open={enableOpen} user={user} onClose={() => setEnableOpen(false)} />
    </div>
  );
}
