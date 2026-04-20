import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { PeriodInput } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Props {
  period: PeriodInput & { id: string };
  index: number;
  durationMinutes: number | null;
  onChange: (idx: number, patch: Partial<PeriodInput>) => void;
  onRemove: (idx: number) => void;
}

export function SortablePeriodCard({
  period,
  index,
  durationMinutes,
  onChange,
  onRemove,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: period.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <Card ref={setNodeRef} style={style}>
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab p-3"
            aria-label="Periode verschieben"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden />
          </button>
          <span className="h-6 px-2 text-xs bg-muted rounded inline-flex items-center">
            #{period.periodNumber}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => onRemove(index)}
          aria-label="Periode entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`p-${period.id}-label`}>Bezeichnung</Label>
          <Input
            id={`p-${period.id}-label`}
            value={period.label ?? ''}
            onChange={(e) => onChange(index, { label: e.target.value })}
            placeholder="1. Stunde"
            className="h-11"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`p-${period.id}-start`}>Start</Label>
            <Input
              id={`p-${period.id}-start`}
              type="time"
              value={period.startTime}
              onChange={(e) => onChange(index, { startTime: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`p-${period.id}-end`}>Ende</Label>
            <Input
              id={`p-${period.id}-end`}
              type="time"
              value={period.endTime}
              onChange={(e) => onChange(index, { endTime: e.target.value })}
              className="h-11"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Dauer: {durationMinutes != null ? `${durationMinutes} min` : '—'}
        </p>
        <div className="flex items-center justify-between">
          <Label htmlFor={`p-${period.id}-break`}>Pause danach</Label>
          <Switch
            id={`p-${period.id}-break`}
            checked={period.isBreak}
            onCheckedChange={(v) => onChange(index, { isBreak: v })}
            className="h-11 w-11"
          />
        </div>
      </div>
    </Card>
  );
}
