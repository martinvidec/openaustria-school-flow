import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useTimetableConflicts,
  type TimetableConflictDto,
} from '@/hooks/useTimetableConflicts';

/**
 * Issue #177-B — read-only surface for the dropped-lesson conflicts behind a
 * COMPLETED_WITH_CONFLICTS run. Renders "N Konflikte zu lösen" with a
 * human-readable list (which teacher/room is double-booked in which slot) and
 * a deep-link to the manual editor. Returns null when the run has no conflicts
 * so the page stays clean for healthy runs.
 *
 * The full per-conflict resolution UX (reassign teacher / move slot / cancel)
 * lands in #177-C; this card is the visibility floor that unblocks the admin.
 */

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
  SUNDAY: 'So',
};

function slotLabel(c: TimetableConflictDto): string {
  const day = DAY_LABELS[c.dayOfWeek] ?? c.dayOfWeek;
  const week = c.weekType && c.weekType !== 'BOTH' ? ` · Woche ${c.weekType}` : '';
  return `${day} ${c.periodNumber}. Stunde${week}`;
}

export function ConflictsCard({
  schoolId,
  runId,
}: {
  schoolId: string;
  runId: string;
}) {
  const { data: conflicts = [] } = useTimetableConflicts(schoolId, runId);

  if (conflicts.length === 0) return null;

  const n = conflicts.length;

  return (
    <Card
      className="border-amber-400/60 bg-amber-50/40"
      data-testid="solver-conflicts-card"
    >
      <CardHeader>
        <CardTitle className="text-[20px] text-amber-700">
          {n} {n === 1 ? 'Konflikt' : 'Konflikte'} zu lösen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Der Stundenplan wurde erstellt, aber {n}{' '}
          {n === 1 ? 'Lektion konnte' : 'Lektionen konnten'} nicht eingeplant
          werden, ohne eine Doppelbelegung zu erzeugen. Der Plan ist als
          Teilplan aktivierbar — lösen Sie die Konflikte anschließend unter
          „Stundenplan bearbeiten“.
        </p>
        <ul className="space-y-2">
          {conflicts.map((c) => (
            <li
              key={c.id}
              className="rounded-md border border-amber-200 bg-background/60 p-3"
              data-testid={`conflict-row-${c.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {c.conflictType === 'TEACHER'
                    ? 'Lehrer-Doppelbelegung'
                    : 'Raum-Doppelbelegung'}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {slotLabel(c)}
                </span>
              </div>
              <div className="mt-1.5">
                <span className="font-semibold">
                  {c.subjectLabel ?? 'Lektion'}
                </span>
                {c.conflictsWithLabel && (
                  <>
                    {' '}
                    kollidiert mit{' '}
                    <span className="font-semibold">{c.conflictsWithLabel}</span>
                  </>
                )}
                {c.conflictType === 'TEACHER' && c.teacherLabel && (
                  <span className="text-muted-foreground">
                    {' '}
                    · Lehrer: {c.teacherLabel}
                  </span>
                )}
                {c.conflictType === 'ROOM' && c.roomLabel && (
                  <span className="text-muted-foreground">
                    {' '}
                    · Raum: {c.roomLabel}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Link
          to="/admin/timetable-edit"
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Stundenplan bearbeiten →
        </Link>
      </CardContent>
    </Card>
  );
}
