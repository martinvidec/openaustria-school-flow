import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route as DsgvoRoute } from '@/routes/_authenticated/admin/dsgvo';
import {
  useConsentsAdmin,
  useWithdrawConsent,
  type ConsentRecordDto,
  type ConsentStatus,
} from '@/hooks/useConsents';
import { ConsentsFilterToolbar } from './ConsentsFilterToolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Phase 15-06 Task 2: Einwilligungen tab body.
 *
 * Renders <ConsentsFilterToolbar> above a native <table> of consent
 * records. Filter state lives in the URL (Route.useSearch()) so the
 * Tab content re-fetches when the toolbar updates the params.
 *
 * Each row carries data-consent-id={id} + data-consent-status={status}
 * per UI-SPEC § Mutation invariants (D-21 — Phase 14 carry-forward).
 *
 * Row actions:
 *  - "Widerrufen": opens single-step confirm dialog ("Einwilligung
 *    widerrufen?"), calls useWithdrawConsent. Disabled when status is
 *    already 'withdrawn'.
 *  - "Löschen anstoßen": placeholder for plan 15-08 (Art. 17 dialog).
 *    Disabled with title="Wird in Plan 15-08 ausgeliefert" so the
 *    selector + slot exist for cheap activation later.
 *
 * Empty states match UI-SPEC verbatim — no copy improvisation:
 *  - filtered + zero results → "Keine Einwilligungen gefunden"
 *  - no filters + zero results → "Noch keine Einwilligungen erfasst"
 *
 * Pagination: simple Zurück / Weiter buttons that bump `page` via
 * navigate({ search }). totalPages comes from useConsentsAdmin meta.
 */

interface Props {
  schoolId: string;
}

function deriveStatus(c: ConsentRecordDto): ConsentStatus {
  if (c.withdrawnAt) return 'withdrawn';
  if (c.granted) return 'granted';
  return 'expired';
}

function statusLabel(s: ConsentStatus): string {
  return s === 'granted'
    ? 'Erteilt'
    : s === 'withdrawn'
      ? 'Widerrufen'
      : 'Abgelaufen';
}

function statusBadgeVariant(
  s: ConsentStatus,
): 'default' | 'secondary' | 'outline' {
  return s === 'granted' ? 'default' : s === 'withdrawn' ? 'secondary' : 'outline';
}

export function ConsentsTab({ schoolId }: Props) {
  const navigate = useNavigate();
  const search = DsgvoRoute.useSearch();
  const page = search.page ?? 1;

  const query = useConsentsAdmin({
    schoolId,
    purpose: search.purpose,
    status: search.status,
    personSearch: search.q,
    page,
    limit: 20,
  });

  const withdraw = useWithdrawConsent();
  const [pendingWithdraw, setPendingWithdraw] =
    useState<ConsentRecordDto | null>(null);

  const goPage = (next: number) =>
    navigate({
      to: '/admin/dsgvo',
      search: (prev) => ({ ...prev, tab: 'consents', page: next }),
    });

  const filtersActive = !!(search.purpose || search.status || search.q);
  const totalPages = query.data?.meta.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <ConsentsFilterToolbar />

      {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}

      {query.isError && (
        <p className="text-destructive">
          Einwilligungen konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.data.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">
            {filtersActive
              ? 'Keine Einwilligungen gefunden'
              : 'Noch keine Einwilligungen erfasst'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filtersActive
              ? 'Es gibt keine Einträge, die den aktuellen Filtern entsprechen.'
              : 'Sobald Nutzer Einwilligungen erteilen, erscheinen sie hier.'}
          </p>
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Person</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Zweck</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Erteilt am</th>
                  <th className="p-2 text-left">Widerrufen am</th>
                  <th className="p-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((c) => {
                  const s = deriveStatus(c);
                  const fullName = c.person
                    ? `${c.person.firstName} ${c.person.lastName}`
                    : '—';
                  return (
                    <tr
                      key={c.id}
                      data-consent-id={c.id}
                      data-consent-status={s}
                      className="border-t"
                    >
                      <td className="p-2">{fullName}</td>
                      <td className="p-2">{c.person?.email ?? '—'}</td>
                      <td className="p-2">{c.purpose}</td>
                      <td className="p-2">
                        <Badge variant={statusBadgeVariant(s)}>
                          {statusLabel(s)}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {c.grantedAt
                          ? new Date(c.grantedAt).toLocaleString('de-AT')
                          : '—'}
                      </td>
                      <td className="p-2">
                        {c.withdrawnAt
                          ? new Date(c.withdrawnAt).toLocaleString('de-AT')
                          : '—'}
                      </td>
                      <td className="p-2 text-right space-x-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={s === 'withdrawn'}
                          onClick={() => setPendingWithdraw(c)}
                        >
                          Widerrufen
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="Wird in Plan 15-08 ausgeliefert"
                        >
                          Löschen anstoßen
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              Seite {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Weiter
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={!!pendingWithdraw}
        onOpenChange={(o) =>
          !o && !withdraw.isPending && setPendingWithdraw(null)
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einwilligung widerrufen?</DialogTitle>
            <DialogDescription>
              Der Widerruf wird im Audit-Log protokolliert.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingWithdraw(null)}
              disabled={withdraw.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              disabled={withdraw.isPending}
              onClick={() => {
                if (!pendingWithdraw) return;
                withdraw.mutate(
                  {
                    personId: pendingWithdraw.personId,
                    purpose: pendingWithdraw.purpose,
                  },
                  { onSettled: () => setPendingWithdraw(null) },
                );
              }}
            >
              Widerrufen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
