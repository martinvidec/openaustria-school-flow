import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useDsgvoJobs,
  type DsgvoJobStatus,
  type DsgvoJobType,
} from '@/hooks/useDsgvoJobs';

/**
 * Phase 15-08 Task 5: school-wide DSGVO jobs table tab body.
 *
 * Renders a manual-refetch toolbar (`Aktualisieren` outline button per
 * UI-SPEC § Primary CTAs Tab 4) above a native <table> of all DSGVO jobs
 * for the current school. Each row carries `data-dsgvo-job-id={id}` and
 * `data-dsgvo-job-status={status}` selectors locked for the plan 15-10
 * E2E suite.
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
 *
 * DEFERRED for v1 (documented in 15-08 SUMMARY):
 *  - Job-Detail-Drawer / "Detail öffnen" row action
 *  - Filter toolbar with status / jobType selects (Aktualisieren button is
 *    sufficient for v1)
 *  - URL deep-link state for filter
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

export function JobsTab({ schoolId }: Props) {
  const [page, setPage] = useState(1);
  const query = useDsgvoJobs({ schoolId, page, limit: 20 });

  const totalPages = query.data?.meta.totalPages ?? 1;

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

      {query.isLoading && <p className="text-muted-foreground">Lädt…</p>}
      {query.isError && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Status-Aktualisierung fehlgeschlagen — neuer Versuch in Kürze.
        </div>
      )}

      {query.data && query.data.data.length === 0 && (
        <div className="rounded-md border p-8 text-center">
          <p className="font-semibold">Keine DSGVO-Jobs vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Datenexport- und Löschungs-Jobs erscheinen hier, sobald sie
            angestoßen werden.
          </p>
        </div>
      )}

      {query.data && query.data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Typ</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Person</th>
                  <th className="p-2 text-left">Erstellt am</th>
                  <th className="p-2 text-left">Zuletzt aktualisiert</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((j) => {
                  const fullName = j.person
                    ? `${j.person.firstName} ${j.person.lastName}`
                    : '—';
                  return (
                    <tr
                      key={j.id}
                      data-dsgvo-job-id={j.id}
                      data-dsgvo-job-status={j.status}
                      className="border-t"
                    >
                      <td className="p-2">{jobTypeLabel(j.jobType)}</td>
                      <td className="p-2">
                        <Badge
                          variant={statusVariant(j.status)}
                          className={statusClass(j.status)}
                        >
                          {statusLabel(j.status)}
                        </Badge>
                      </td>
                      <td className="p-2">{fullName}</td>
                      <td className="p-2">
                        {new Date(j.createdAt).toLocaleString('de-AT')}
                      </td>
                      <td className="p-2">
                        {new Date(j.updatedAt).toLocaleString('de-AT')}
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
        </>
      )}
    </div>
  );
}
