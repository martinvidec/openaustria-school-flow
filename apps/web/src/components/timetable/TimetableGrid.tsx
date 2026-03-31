import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TimetableCell } from './TimetableCell';
import type {
  TimetableViewLesson,
  PeriodInfo,
  DayOfWeekType,
  SubjectColorPair,
} from '@schoolflow/shared';

/** Short German day labels for grid headers */
const DAY_SHORT_LABELS: Record<DayOfWeekType, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

interface TimetableGridProps {
  periods: PeriodInfo[];
  days: DayOfWeekType[];
  lessons: TimetableViewLesson[];
  subjectColors: ((subjectId: string) => SubjectColorPair) | Map<string, SubjectColorPair>;
  showBreaks?: boolean;
  viewMode: 'day' | 'week';
  selectedDay?: string;
  editable?: boolean;
  onCellClick?: (lesson: TimetableViewLesson) => void;
}

/** Represents a merged Doppelstunde (double period) */
interface MergedLesson {
  lesson: TimetableViewLesson;
  spanRows: number;
  isSecondary: boolean; // true for the second period that gets absorbed
}

/**
 * Core CSS Grid timetable layout.
 * - Days as columns, periods as rows
 * - Break rows between periods at 24px height
 * - Regular period rows at 56px height (desktop)
 * - Doppelstunden rendered as merged cells spanning 2 rows
 *
 * Per UI-SPEC D-01, Pitfall 4 (Doppelstunde), Pitfall 7 (break row mapping).
 */
export function TimetableGrid({
  periods,
  days,
  lessons,
  subjectColors,
  showBreaks = true,
  viewMode,
  selectedDay,
  editable = false,
  onCellClick,
}: TimetableGridProps) {
  // Determine which days to show based on view mode
  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      // In day view, show only the selected day (or Monday as default)
      const dayToShow = selectedDay ?? 'MONDAY';
      return days.filter((d) => d === dayToShow);
    }
    return days;
  }, [viewMode, selectedDay, days]);

  // Build grid row mapping: each period (including breaks) gets a grid row index.
  // This avoids Pitfall 7: periodNumber !== grid row index when breaks exist.
  const gridRowMap = useMemo(() => {
    const map = new Map<number, number>(); // periodNumber -> gridRow (1-indexed, row 1 is header)
    let gridRow = 2; // Start at 2 because row 1 is the header

    for (const period of periods) {
      if (period.isBreak && !showBreaks) continue;
      map.set(period.periodNumber, gridRow);
      gridRow++;
    }

    return map;
  }, [periods, showBreaks]);

  // Detect Doppelstunden (Pitfall 4):
  // Group consecutive same-classSubjectId lessons in the same day
  const mergedLessons = useMemo(() => {
    const merged = new Map<string, MergedLesson>(); // key: "dayOfWeek-periodNumber"

    // Sort lessons by day and period for grouping
    const sorted = [...lessons].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek.localeCompare(b.dayOfWeek);
      return a.periodNumber - b.periodNumber;
    });

    // Track which lessons are absorbed into a Doppelstunde
    const absorbed = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const key = `${current.dayOfWeek}-${current.periodNumber}`;

      if (absorbed.has(current.id)) {
        // This lesson is the second half of a Doppelstunde
        merged.set(key, {
          lesson: current,
          spanRows: 1,
          isSecondary: true,
        });
        continue;
      }

      // Check if this + next form a Doppelstunde
      const isDoppelstunde =
        next &&
        current.dayOfWeek === next.dayOfWeek &&
        current.classSubjectId === next.classSubjectId &&
        current.periodNumber + 1 === next.periodNumber;

      if (isDoppelstunde) {
        absorbed.add(next.id);
        merged.set(key, {
          lesson: current,
          spanRows: 2,
          isSecondary: false,
        });
      } else {
        merged.set(key, {
          lesson: current,
          spanRows: 1,
          isSecondary: false,
        });
      }
    }

    return merged;
  }, [lessons]);

  // Helper to get subject color from either a function or Map
  function getColor(subjectId: string): SubjectColorPair {
    if (typeof subjectColors === 'function') {
      return subjectColors(subjectId);
    }
    return subjectColors.get(subjectId) ?? { bg: '#f3f4f6', text: '#374151' };
  }

  // Calculate grid rows: header row + one row per period (including breaks)
  const visiblePeriods = showBreaks
    ? periods
    : periods.filter((p) => !p.isBreak);

  const dayCount = visibleDays.length;

  // grid-template-columns: period-label column + one column per visible day
  const gridTemplateCols = `auto repeat(${dayCount}, 1fr)`;

  // grid-template-rows: header row + per-period rows
  const gridTemplateRows = [
    'auto', // header row
    ...visiblePeriods.map((p) => (p.isBreak ? '24px' : '56px')),
  ].join(' ');

  return (
    <div
      role="grid"
      aria-label="Stundenplan"
      className={cn(
        'grid gap-px bg-muted/30 rounded-lg border overflow-hidden',
        viewMode === 'week' && 'overflow-x-auto',
      )}
      style={{
        gridTemplateColumns: gridTemplateCols,
        gridTemplateRows: gridTemplateRows,
        minWidth: viewMode === 'week' ? `${dayCount * 120 + 60}px` : undefined,
      }}
    >
      {/* Header row: empty corner cell + day labels */}
      <div
        className="bg-muted/50 flex items-center justify-center text-sm font-semibold p-2"
        style={{ gridRow: 1, gridColumn: 1 }}
      />
      {visibleDays.map((day, dayIdx) => (
        <div
          key={day}
          className="bg-muted/50 flex items-center justify-center text-sm font-semibold p-2"
          style={{ gridRow: 1, gridColumn: dayIdx + 2 }}
        >
          {DAY_SHORT_LABELS[day]}
        </div>
      ))}

      {/* Period rows */}
      {visiblePeriods.map((period) => {
        const gridRow = gridRowMap.get(period.periodNumber);
        if (gridRow === undefined) return null;

        return (
          <PeriodRow
            key={period.periodNumber}
            period={period}
            gridRow={gridRow}
            visibleDays={visibleDays}
            mergedLessons={mergedLessons}
            gridRowMap={gridRowMap}
            getColor={getColor}
            editable={editable}
            onCellClick={onCellClick}
          />
        );
      })}
    </div>
  );
}

/** Props for a single period row */
interface PeriodRowProps {
  period: PeriodInfo;
  gridRow: number;
  visibleDays: DayOfWeekType[];
  mergedLessons: Map<string, MergedLesson>;
  gridRowMap: Map<number, number>;
  getColor: (subjectId: string) => SubjectColorPair;
  editable: boolean;
  onCellClick?: (lesson: TimetableViewLesson) => void;
}

/** Renders one period row: period label + lesson cells for each day column */
function PeriodRow({
  period,
  gridRow,
  visibleDays,
  mergedLessons,
  gridRowMap,
  getColor,
  editable,
  onCellClick,
}: PeriodRowProps) {
  if (period.isBreak) {
    return (
      <>
        {/* Break label cell */}
        <div
          className="bg-muted flex items-center justify-center text-xs text-muted-foreground"
          style={{ gridRow, gridColumn: 1 }}
        >
          {period.label ?? ''}
        </div>
        {/* Break spans across all day columns */}
        {visibleDays.map((_, dayIdx) => (
          <div
            key={dayIdx}
            className="bg-muted"
            style={{ gridRow, gridColumn: dayIdx + 2 }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {/* Period number label with time tooltip */}
      <div
        className="bg-background flex items-center justify-center text-sm font-semibold text-muted-foreground"
        style={{ gridRow, gridColumn: 1 }}
        title={`${period.startTime} - ${period.endTime}`}
      >
        {period.periodNumber}.
      </div>

      {/* Lesson cells for each visible day */}
      {visibleDays.map((day, dayIdx) => {
        const key = `${day}-${period.periodNumber}`;
        const merged = mergedLessons.get(key);

        // Skip if this cell is the second half of a Doppelstunde
        if (merged?.isSecondary) {
          return null;
        }

        const colIndex = dayIdx + 2;

        if (!merged) {
          // Empty slot
          return (
            <div
              key={key}
              className="bg-muted/20"
              style={{ gridRow, gridColumn: colIndex }}
            />
          );
        }

        const { lesson, spanRows } = merged;
        const color = getColor(lesson.subjectId);

        // For Doppelstunde, calculate grid row span
        // Need to account for any break rows between the two period rows
        let totalGridSpan = 1;
        if (spanRows === 2) {
          const nextPeriodGridRow = gridRowMap.get(period.periodNumber + 1);
          if (nextPeriodGridRow !== undefined) {
            // Span from current row to the end of the next period's row
            totalGridSpan = nextPeriodGridRow - gridRow + 1;
          }
        }

        return (
          <div
            key={key}
            style={{
              gridRow: totalGridSpan > 1 ? `${gridRow} / span ${totalGridSpan}` : gridRow,
              gridColumn: colIndex,
            }}
            className="bg-background"
          >
            <TimetableCell
              lesson={lesson}
              color={color}
              editable={editable}
              onClick={onCellClick ? () => onCellClick(lesson) : undefined}
            />
          </div>
        );
      })}
    </>
  );
}
