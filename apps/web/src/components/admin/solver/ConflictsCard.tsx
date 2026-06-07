import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useTimetableConflicts,
  type TimetableConflictDto,
} from '@/hooks/useTimetableConflicts';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';

/**
 * Issue #177-B/C — surface + resolve the dropped-lesson conflicts behind a
 * COMPLETED_WITH_CONFLICTS run. Renders "N Konflikte zu lösen" with a
 * human-readable list (which teacher/room is double-booked in which slot), and
 * a per-conflict "Lösen" button that opens the resolution dialog (#177-C:
 * reassign teacher/room, move to a free slot, or cancel the lesson). Returns
 * null when the run has no open conflicts so the page stays clean.
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
  const { data: allConflicts = [] } = useTimetableConflicts(schoolId, runId);
  const [selected, setSelected] = useState<TimetableConflictDto | null>(null);

  // Only OPEN conflicts are actionable; resolved ones drop off the card.
  const conflicts = allConflicts.filter((c) => c.status === 'OPEN');

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
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-amber-200 bg-background/60 p-3"
              data-testid={`conflict-row-${c.id}`}
            >
              <div className="min-w-0">
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
                      <span className="font-semibold">
                        {c.conflictsWithLabel}
                      </span>
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
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(c)}
                data-testid={`resolve-conflict-${c.id}`}
              >
                Lösen
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>

      <ConflictResolutionDialog
        open={selected !== null}
        schoolId={schoolId}
        runId={runId}
        conflict={selected}
        onClose={() => setSelected(null)}
      />
    </Card>
  );
}
