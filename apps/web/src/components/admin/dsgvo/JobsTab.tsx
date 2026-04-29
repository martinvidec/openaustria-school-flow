import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataList, type DataListColumn } from '@/components/shared/DataList';
import {
  useDsgvoJobs,
  type DsgvoJobStatus,
  type DsgvoJobType,
} from '@/hooks/useDsgvoJobs';

/**
 * Phase 15-08 Task 5: school-wide DSGVO jobs table tab body.
 *
 * Phase 16 Plan 05 (D-15) — migrated to <DataList> for mobile-card support
 * at <sm. The native `<table>` formerly inline in this Tab file has been
 * replaced with a DataList; the toolbar (manual `Aktualisieren` outline
 * button) and the pagination row stay above/below. Each row preserves
 * `data-dsgvo-job-id={id}` + `data-dsgvo-job-status={status}` on BOTH
 * desktop <tr> and mobile-card wrapper so the existing E2E suite
 * (`admin-dsgvo-export-job.spec.ts` etc.) continues to match.
 *
 * Renders a manual-refetch toolbar (`Aktualisieren` outline button per
 * UI-SPEC § Primary CTAs Tab 4) above the DataList of all DSGVO jobs for
 * the current school.
 *
 * Status Badge variant map (UI-SPEC § Color):
 *   QUEUED      → secondary
 *   PROCESSING  → custom warning class on top of default base
 *   COMPLETED   → custom success class on top of default base
 *   FAILED      → destructive
 *
 * The Tab itself does NOT poll — only per-id hooks
 * (`useDsgvoExportJob`, `useDsgvoDeletionJob`) used by the dialogs poll.
 * `Aktualisieren` triggers an explicit `query.refetch()` (T-15-08-05
 * accept disposition).
 *
 * Inline error banner copy (UI-SPEC § Error states): "Status-Aktualisierung
 * fehlgeschlagen — neuer Versuch in Kürze." — NO toast on transient list
 * load failures.
 */

interface Props {
  schoolId: string;
}

function statusVariant(
  s: DsgvoJobStatus,
): 'secondary' | 'destructive' | 'default' | 'outline' {
  switch (s) {
    case 'QUEUED':
      return 'secondary';
    case 'PROCESSING':
      return 'default'; // visualised with the warning custom class below
    case 'COMPLETED':
      return 'default'; // visualised with the success custom class below
    case 'FAILED':
      return 'destructive';
    default:
      return 'outline';
  }
}

function statusClass(s: DsgvoJobStatus): string {
  switch (s) {
    case 'PROCESSING':
      return 'bg-warning/15 text-warning hover:bg-warning/15';
    case 'COMPLETED':
      return 'bg-success/15 text-success hover:bg-success/15';
    default:
      return '';
  }
}

function statusLabel(s: DsgvoJobStatus): string {
  return s === 'QUEUED'
    ? 'Wartet'
    : s === 'PROCESSING'
      ? 'Läuft'
      : s === 'COMPLETED'
        ? 'Abgeschlossen'
        : 'Fehlgeschlagen';
}

function jobTypeLabel(t: DsgvoJobType): string {
  return t === 'DATA_EXPORT'
    ? 'Datenexport'
    : t === 'DATA_DELETION'
      ? 'Löschung (Art. 17)'
      : 'Aufbewahrungs-Cleanup';
}

type JobRow = NonNullable<ReturnType<typeof useDsgvoJobs>['data']>['data'][number];

export function JobsTab({ schoolId }: Props) {
  const [page, setPage] = useState(1);
  const query = useDsgvoJobs({ schoolId, page, limit: 20 });

  const totalPages = query.data?.meta.totalPages ?? 1;

  const columns: DataListColumn<JobRow>[] = [
    { key: 'type', header: 'Typ', cell: (j) => jobTypeLabel(j.jobType) },
    {
      key: 'status',
      header: 'Status',
      cell: (j) => (
        <Badge
          variant={statusVariant(j.status)}
          className={statusClass(j.status)}
        >
          {statusLabel(j.status)}
        </Badge>
      ),
    },
    {
      key: 'person',
      header: 'Person',
      cell: (j) =>
        j.person ? `${j.person.firstName} ${j.person.lastName}` : '—',
    },
    {
      key: 'createdAt',
      header: 'Erstellt am',
      cell: (j) => new Date(j.createdAt).toLocaleString('de-AT'),
    },
    {
      key: 'updatedAt',
      header: 'Zuletzt aktualisiert',
      cell: (j) => new Date(j.updatedAt).toLocaleString('de-AT'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Datenexport- und Löschungs-Jobs der Schule.
        </div>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Aktualisieren
        </Button>
      </div>

      {query.isError && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Status-Aktualisierung fehlgeschlagen — neuer Versuch in Kürze.
        </div>
      )}

      {query.data && query.data.data.length === 0 && !query.isLoading && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">Keine DSGVO-Jobs vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Datenexport- und Löschungs-Jobs erscheinen hier, sobald sie
            angestoßen werden.
          </p>
        </div>
      )}

      {(query.isLoading || (query.data && query.data.data.length > 0)) && (
        <>
          <DataList<JobRow>
            rows={query.data?.data ?? []}
            columns={columns}
            getRowId={(j) => j.id}
            getRowAttrs={(j) => ({
              'data-dsgvo-job-id': j.id,
              'data-dsgvo-job-status': j.status,
            })}
            loading={query.isLoading}
            mobileCard={(j) => {
              const fullName = j.person
                ? `${j.person.firstName} ${j.person.lastName}`
                : '—';
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base font-semibold leading-6">
                      {jobTypeLabel(j.jobType)}
                    </div>
                    <Badge
                      variant={statusVariant(j.status)}
                      className={statusClass(j.status)}
                    >
                      {statusLabel(j.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground leading-5">
                    {fullName}
                  </div>
                  <div className="text-xs text-muted-foreground leading-5">
                    Erstellt: {new Date(j.createdAt).toLocaleString('de-AT')}
                  </div>
                  <div className="text-xs text-muted-foreground leading-5">
                    Aktualisiert: {new Date(j.updatedAt).toLocaleString('de-AT')}
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
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
