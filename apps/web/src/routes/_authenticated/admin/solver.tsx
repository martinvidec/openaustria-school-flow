import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSchoolContext } from '@/stores/school-context-store';
import { useSolverSocket } from '@/hooks/useSolverSocket';
import { useRecentTimetableRuns } from '@/hooks/useRecentTimetableRuns';
import { apiFetch } from '@/lib/api';
import { GeneratorPageWeightsCard } from '@/components/admin/solver/GeneratorPageWeightsCard';

export const Route = createFileRoute('/_authenticated/admin/solver')({
  component: AdminSolverPage,
});

/**
 * Admin "Stundenplan-Generator" page (TIME-06, v1.0 audit Finding 3).
 *
 * Minimal viable solver UI that exercises the full /solver Socket.IO flow:
 *  1. POST /api/v1/schools/:schoolId/timetable/solve queues a solve run.
 *  2. The Timefold sidecar posts progress callbacks to NestJS, which
 *     rebroadcasts them via the /solver gateway as solve:progress.
 *  3. This page renders live hard/soft scores and the remaining-violation
 *     groups while the solver is running.
 *  4. On solve:complete the hook invalidates the timetable cache and
 *     shows a success toast; the "Letztes Ergebnis" card displays the
 *     final score summary.
 *
 * Polish items intentionally deferred to v1.1 (see 9.3-CONTEXT.md):
 *  - Run history list (useTimetableRuns integration)
 *  - Multi-school selector
 *  - Constraint weight tuning
 *  - Score-over-time chart
 */
function AdminSolverPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected, progress, lastResult, activeRun, trackRun } =
    useSolverSocket(schoolId);
  // #60: REST-driven listing of recent runs. Independent of WS state so the
  // user can always recover and activate a COMPLETED run, even when the
  // solve:complete event was lost.
  const { data: recentRuns = [] } = useRecentTimetableRuns(schoolId);
  const [isStarting, setIsStarting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activatingRunId, setActivatingRunId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!schoolId) return;
    setIsStarting(true);
    try {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/solve`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to start solve (HTTP ${res.status})`);
      }
      // #53 Schicht 1: capture runId from the 202 response so the UI can
      // show "Wird in Warteschlange aufgenommen…" immediately, and arm
      // the REST polling fallback for cases where the WS goes silent.
      const data = (await res.json()) as { runId: string; status: string };
      trackRun(data.runId);
      toast.info('Stundenplan-Generierung gestartet', {
        description: `Run ${data.runId.slice(0, 8)}… eingereiht.`,
      });
    } catch (error) {
      toast.error('Fehler beim Starten der Generierung', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Phase 10.5-04 D-12: Aktivieren button publishes the lastResult run as the
  // current timetable and navigates to /timetable. No confirmation dialog
  // (CONTEXT.md D-12 rejected Option C). Local useState mirrors the
  // isStarting pattern above (CD-03 — keep consistent with handleGenerate).
  const handleActivate = async () => {
    if (!schoolId || !lastResult) return;
    setIsActivating(true);
    try {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${lastResult.runId}/activate`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Stundenplan aktiviert');
      navigate({ to: '/timetable' });
    } catch (error) {
      toast.error('Aktivierung fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsActivating(false);
    }
  };

  // #60: activate any run from the REST-driven "Letzte Runs" list. The
  // existing handleActivate is keyed off `lastResult` (WS state) and is
  // kept for the live happy-path; this one is the resilient fallback.
  const handleActivateRun = async (runId: string) => {
    if (!schoolId) return;
    setActivatingRunId(runId);
    try {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/activate`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Stundenplan aktiviert');
      // Refresh recent-runs so the new isActive=true row is reflected
      // before navigation.
      await queryClient.invalidateQueries({ queryKey: ['timetable-runs:recent'] });
      navigate({ to: '/timetable' });
    } catch (error) {
      toast.error('Aktivierung fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    } finally {
      setActivatingRunId(null);
    }
  };

  // #53 Schicht 1: explicit run-state machine that drives the UI cards.
  //   - "running"  = QUEUED or SOLVING (button disabled, queued/progress card)
  //   - "failed"   = FAILED (red error card with errorReason)
  //   - "complete" = COMPLETED (green result card via `lastResult`)
  // Falls back to the legacy `progress !== null` flag so this still works
  // if the socket fires before activeRun gets the QUEUED snapshot.
  const isQueued =
    activeRun?.status === 'QUEUED' && progress === null;
  const isRunning =
    progress !== null ||
    activeRun?.status === 'SOLVING' ||
    activeRun?.status === 'QUEUED';
  const failedRun =
    activeRun?.status === 'FAILED' ? activeRun : null;

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.2]">
          Stundenplan-Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Generieren Sie automatisch einen optimalen Stundenplan basierend auf
          den definierten Constraints. Der Vorgang kann einige Minuten dauern.
        </p>
      </div>

      {/* Phase 14-02 D-06: read-only Schul-Gewichtungen card with deep-link
          to /admin/solver-tuning?tab=weights. */}
      {schoolId && <GeneratorPageWeightsCard schoolId={schoolId} />}

      {/* Status + trigger card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-[20px]">Status</CardTitle>
            <Button
              onClick={handleGenerate}
              disabled={!schoolId || isStarting || isRunning}
            >
              {isStarting
                ? 'Wird gestartet...'
                : isRunning
                  ? 'Solver laeuft...'
                  : 'Stundenplan generieren'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                isConnected
                  ? 'inline-block h-2 w-2 rounded-full bg-green-500'
                  : 'inline-block h-2 w-2 rounded-full bg-muted-foreground'
              }
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              {isConnected
                ? 'Live-Updates verbunden'
                : 'Nicht verbunden (Updates folgen beim Verbinden)'}
            </span>
          </div>

          {/* #53 Schicht 1: queued-state card. Shown while the run is
              QUEUED and no progress event has arrived yet — closes the
              "silent void" gap between POST and first solver tick. */}
          {isQueued && activeRun && (
            <div
              className="space-y-2 rounded-md border border-border bg-muted/30 p-4"
              role="status"
              aria-live="polite"
              data-testid="solver-queued-card"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Wird in Warteschlange aufgenommen…
              </div>
              <div className="text-xs text-muted-foreground">
                Run:{' '}
                <span className="font-mono">{activeRun.runId}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Engine startet gleich. Fortschritt erscheint hier sobald die
                ersten Lösungen gefunden wurden.
              </div>
            </div>
          )}

          {/* Live progress block -- only while solver is running */}
          {progress && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Fortschritt</span>
                <span className="text-xs text-muted-foreground">
                  Run: <span className="font-mono">{progress.runId}</span>
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Hard Score</dt>
                  <dd className="font-semibold">{progress.hardScore}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Soft Score</dt>
                  <dd className="font-semibold">{progress.softScore}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Laufzeit</dt>
                  <dd className="font-semibold">
                    {progress.elapsedSeconds}s
                  </dd>
                </div>
              </dl>
              <div className="text-xs text-muted-foreground">
                Verbesserung:{' '}
                <span className="font-semibold">
                  {progress.improvementRate}
                </span>
              </div>
              {progress.remainingViolations.length > 0 && (
                <div className="space-y-1 border-t border-border/60 pt-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Verbleibende Constraint-Verletzungen
                  </div>
                  <ul className="space-y-1 text-xs">
                    {progress.remainingViolations.slice(0, 5).map((v) => (
                      <li key={v.type} className="flex justify-between">
                        <span>{v.type}</span>
                        <span className="font-mono tabular-nums">
                          {v.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* #60: REST-driven "Letzte Runs" card. Resilient to WS event loss —
          the user can always see and activate any COMPLETED run from the
          server's actual state, not just the one whose solve:complete
          event made it through. Hidden when the list is empty (no runs
          ever started) so the page stays uncluttered for first use. */}
      {recentRuns.length > 0 && (
        <Card data-testid="recent-runs-card">
          <CardHeader>
            <CardTitle className="text-[20px]">Letzte Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {recentRuns.map((run) => {
                const dt = new Date(run.createdAt);
                const created = isNaN(dt.getTime())
                  ? run.createdAt
                  : dt.toLocaleString('de-AT', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    });
                const canActivate =
                  run.status === 'COMPLETED' && !run.isActive;
                return (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                    data-testid={`recent-run-row-${run.id}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{run.id}</span>
                        <span
                          className={
                            run.isActive
                              ? 'rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800'
                              : run.status === 'COMPLETED'
                                ? 'rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800'
                                : run.status === 'FAILED'
                                  ? 'rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800'
                                  : 'rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground'
                          }
                        >
                          {run.isActive ? 'Aktiv' : run.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {created}
                        {run.hardScore !== null && run.softScore !== null && (
                          <>
                            {' · '}Hard {run.hardScore} / Soft {run.softScore}
                          </>
                        )}
                      </div>
                    </div>
                    {canActivate && (
                      <Button
                        size="sm"
                        onClick={() => handleActivateRun(run.id)}
                        disabled={activatingRunId !== null}
                        data-testid={`activate-run-${run.id}`}
                      >
                        {activatingRunId === run.id
                          ? 'Wird aktiviert…'
                          : 'Aktivieren'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* #53 Schicht 1: failure card — surfaces the watchdog-detected
          timeout (or any other FAILED reason) instead of leaving the user
          staring at a silent spinner. Backed by activeRun.errorReason. */}
      {failedRun && (
        <Card
          className="border-destructive/60 bg-destructive/5"
          data-testid="solver-failed-card"
        >
          <CardHeader>
            <CardTitle className="text-[20px] text-destructive">
              Generierung fehlgeschlagen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Run ID</span>
              <span className="font-mono text-xs">{failedRun.runId}</span>
            </div>
            <div className="rounded-md bg-background/40 p-3 text-sm">
              {failedRun.errorReason ??
                'Unbekannter Fehler — siehe API-Logs für Details.'}
            </div>
            <p className="text-xs text-muted-foreground">
              Bitte Generierung erneut starten. Wiederholen sich Fehler,
              prüfen Sie unter „Stundenplan-Tuning“ die Constraints und
              kontaktieren Sie den Support.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last result card -- only after a solve:complete event */}
      {lastResult && lastResult.status !== 'FAILED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[20px]">Letztes Ergebnis</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Run ID</dt>
                <dd className="font-mono text-xs">{lastResult.runId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold">{lastResult.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hard Score</dt>
                <dd className="font-semibold">{lastResult.hardScore}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Soft Score</dt>
                <dd className="font-semibold">{lastResult.softScore}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dauer</dt>
                <dd className="font-semibold">
                  {lastResult.elapsedSeconds}s
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              Der generierte Stundenplan ist unter &quot;Stundenplan&quot;
              verfuegbar. Unter &quot;Stundenplan bearbeiten&quot; koennen Sie
              einzelne Lektionen manuell verschieben.
            </p>
            {/* Phase 10.5-04 D-12: activate run as current timetable */}
            <Button
              className="mt-4"
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? 'Wird aktiviert…' : 'Aktivieren'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
