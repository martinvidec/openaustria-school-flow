import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { differenceInMinutes, parse } from 'date-fns';
import { Plus, RefreshCcw } from 'lucide-react';
import type { PeriodInput } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import { SortablePeriodCard } from './SortablePeriodCard';
import { SortablePeriodRow } from './SortablePeriodRow';

export type PeriodWithId = PeriodInput & { id: string };

interface Props {
  periods: PeriodWithId[];
  onChange: (next: PeriodWithId[]) => void;
  onTemplateReload: () => void;
}

export function durationFor(p: PeriodInput): number | null {
  try {
    const start = parse(p.startTime, 'HH:mm', new Date());
    const end = parse(p.endTime, 'HH:mm', new Date());
    const diff = differenceInMinutes(end, start);
    return diff > 0 ? diff : null;
  } catch {
    return null;
  }
}

export function renumber(arr: PeriodWithId[]): PeriodWithId[] {
  return arr.map((p, i) => ({ ...p, periodNumber: i + 1 }));
}

export function PeriodsEditor({ periods, onChange, onTemplateReload }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleChange = (idx: number, patch: Partial<PeriodInput>) => {
    const next = [...periods];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const handleRemove = (idx: number) => {
    onChange(renumber(periods.filter((_, i) => i !== idx)));
  };
  const handleAdd = () => {
    const nextNumber = periods.length + 1;
    const id = `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onChange([
      ...periods,
      {
        id,
        periodNumber: nextNumber,
        startTime: '08:00',
        endTime: '08:50',
        isBreak: false,
        label: '',
      },
    ]);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = periods.findIndex((p) => p.id === e.active.id);
    const newIndex = periods.findIndex((p) => p.id === e.over!.id);
    onChange(renumber(arrayMove(periods, oldIndex, newIndex)));
  };

  const screenReaderInstructions = {
    draggable:
      'Zum Verschieben Leertaste druecken. Pfeiltasten zum Bewegen. Leertaste zum Ablegen. Escape zum Abbrechen.',
  };
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) =>
      `Periode ${active.id} wird verschoben`,
    onDragOver: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) => (over ? `Periode ${active.id} ueber Position ${over.id}` : ''),
    onDragEnd: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) => (over ? `Periode ${active.id} auf Position ${over.id} abgelegt` : 'Verschieben abgebrochen'),
    onDragCancel: () => 'Verschieben abgebrochen',
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ screenReaderInstructions, announcements }}
      >
        <SortableContext
          items={periods.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Desktop dense table */}
          <div className="hidden sm:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                  <th className="w-8 px-3 py-2"></th>
                  <th className="w-12 px-3 py-2 text-center">#</th>
                  <th className="w-32 px-3 py-2 text-left">Bezeichnung</th>
                  <th className="w-28 px-3 py-2 text-left">Start</th>
                  <th className="w-28 px-3 py-2 text-left">Ende</th>
                  <th className="w-20 px-3 py-2 text-right">Dauer</th>
                  <th className="w-24 px-3 py-2 text-center">Pause</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <SortablePeriodRow
                    key={p.id}
                    period={p}
                    index={i}
                    durationMinutes={durationFor(p)}
                    onChange={handleChange}
                    onRemove={handleRemove}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {periods.map((p, i) => (
              <SortablePeriodCard
                key={p.id}
                period={p}
                index={i}
                durationMinutes={durationFor(p)}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="h-11 md:h-10 md:w-auto w-full"
        >
          <Plus className="h-4 w-4 mr-2" /> Periode hinzufuegen
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onTemplateReload}
          className="h-11 md:h-10 text-destructive"
        >
          <RefreshCcw className="h-4 w-4 mr-2" /> Aus Template neu laden
        </Button>
      </div>
    </div>
  );
}
