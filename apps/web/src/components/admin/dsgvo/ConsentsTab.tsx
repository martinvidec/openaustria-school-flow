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
import { RequestExportDialog } from './RequestExportDialog';
import { RequestDeletionDialog } from './RequestDeletionDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
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
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for mobile-card support
 * at <sm. The native `<table>` formerly inline in this Tab file has been
 * replaced with a DataList; the existing <ConsentsFilterToolbar> bar stays
 * above. Each row preserves `data-consent-id={id}` + `data-consent-status={status}`
 * on BOTH desktop <tr> and mobile-card wrapper so the existing E2E suite
 * (`admin-dsgvo-consents.spec.ts`) continues to match.
 *
 * Filter state lives in the URL (Route.useSearch()) so the Tab content
 * re-fetches when the toolbar updates the params.
 *
 * Row actions:
 *  - "Widerrufen": opens single-step confirm dialog ("Einwilligung
 *    widerrufen?"), calls useWithdrawConsent. Disabled when status is
 *    already 'withdrawn'.
 *  - "Löschen anstoßen": opens RequestDeletionDialog (Art. 17).
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
  // Plan 15-08: Datenexport-anstoßen toolbar button + RequestExportDialog mount
  const [exportDialog, setExportDialog] =
    useState<{ personId?: string } | null>(null);
  // Plan 15-08: Löschen-anstoßen row action → 2-step Art. 17 dialog
  const [deletionDialog, setDeletionDialog] = useState<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  const goPage = (next: number) =>
    navigate({
      to: '/admin/dsgvo',
      search: (prev) => ({ ...prev, tab: 'consents', page: next }),
    });

  const filtersActive = !!(search.purpose || search.status || search.q);
  const totalPages = query.data?.meta.totalPages ?? 1;

  const columns: DataListColumn<ConsentRecordDto>[] = [
    {
      key: 'person',
      header: 'Person',
      cell: (c) =>
        c.person ? `${c.person.firstName} ${c.person.lastName}` : '—',
    },
    {
      key: 'email',
      header: 'Email',
      cell: (c) => c.person?.email ?? '—',
    },
    { key: 'purpose', header: 'Zweck', cell: (c) => c.purpose },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => {
        const s = deriveStatus(c);
        return (
          <Badge variant={statusBadgeVariant(s)}>{statusLabel(s)}</Badge>
        );
      },
    },
    {
      key: 'grantedAt',
      header: 'Erteilt am',
      cell: (c) =>
        c.grantedAt ? new Date(c.grantedAt).toLocaleString('de-AT') : '—',
    },
    {
      key: 'withdrawnAt',
      header: 'Widerrufen am',
      cell: (c) =>
        c.withdrawnAt ? new Date(c.withdrawnAt).toLocaleString('de-AT') : '—',
    },
    {
      key: 'actions',
      header: 'Aktionen',
      className: 'text-right',
      cell: (c) => {
        const s = deriveStatus(c);
        return (
          <div className="text-right space-x-2">
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
              disabled={!c.person}
              onClick={() => {
                if (!c.person) return;
                setDeletionDialog({
                  id: c.person.id,
                  email: c.person.email ?? '',
                  firstName: c.person.firstName,
                  lastName: c.person.lastName,
                });
              }}
            >
              Löschen anstoßen
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plan 15-08: Datenexport-anstoßen primary CTA (UI-SPEC § Primary CTAs Tab 1) */}
      <div className="flex justify-end">
        <Button onClick={() => setExportDialog({})}>
          Datenexport anstoßen
        </Button>
      </div>

      <ConsentsFilterToolbar />

      {query.isError && (
        <p className="text-destructive">
          Einwilligungen konnten nicht geladen werden.
        </p>
      )}

      {query.data && query.data.data.length === 0 && !query.isLoading && (
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

      {(query.isLoading || (query.data && query.data.data.length > 0)) && (
        <>
          <DataList<ConsentRecordDto>
            rows={query.data?.data ?? []}
            columns={columns}
            getRowId={(c) => c.id}
            getRowAttrs={(c) => ({
              'data-consent-id': c.id,
              'data-consent-status': deriveStatus(c),
            })}
            loading={query.isLoading}
            mobileCard={(c) => {
              const s = deriveStatus(c);
              const fullName = c.person
                ? `${c.person.firstName} ${c.person.lastName}`
                : '—';
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base font-semibold leading-6">
                      {fullName}
                    </div>
                    <Badge variant={statusBadgeVariant(s)}>
                      {statusLabel(s)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground leading-5">
                    {c.person?.email ?? '—'}
                  </div>
                  <div className="text-sm leading-5">{c.purpose}</div>
                  {c.grantedAt && (
                    <div className="text-xs text-muted-foreground leading-5">
                      Erteilt: {new Date(c.grantedAt).toLocaleString('de-AT')}
                    </div>
                  )}
                  {c.withdrawnAt && (
                    <div className="text-xs text-muted-foreground leading-5">
                      Widerrufen: {new Date(c.withdrawnAt).toLocaleString('de-AT')}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 min-h-11"
                      disabled={s === 'withdrawn'}
                      onClick={() => setPendingWithdraw(c)}
                    >
                      Widerrufen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-h-11"
                      disabled={!c.person}
                      onClick={() => {
                        if (!c.person) return;
                        setDeletionDialog({
                          id: c.person.id,
                          email: c.person.email ?? '',
                          firstName: c.person.firstName,
                          lastName: c.person.lastName,
                        });
                      }}
                    >
                      Löschen anstoßen
                    </Button>
                  </div>
                </div>
              );
            }}
          />

          {query.data && query.data.data.length > 0 && (
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
          )}
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

      {exportDialog && (
        <RequestExportDialog
          open
          schoolId={schoolId}
          personId={exportDialog.personId}
          onClose={() => setExportDialog(null)}
        />
      )}

      {deletionDialog && (
        <RequestDeletionDialog
          open
          schoolId={schoolId}
          person={deletionDialog}
          onClose={() => setDeletionDialog(null)}
        />
      )}
    </div>
  );
}
