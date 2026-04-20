import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { PeriodInput } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface Props {
  period: PeriodInput & { id: string };
  index: number;
  durationMinutes: number | null;
  onChange: (idx: number, patch: Partial<PeriodInput>) => void;
  onRemove: (idx: number) => void;
}

export function SortablePeriodRow({
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
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-muted/50 transition-colors">
      <td className="w-8 px-3 py-3 text-center">
        <button
          type="button"
          className="cursor-grab"
          aria-label="Periode verschieben"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
        </button>
      </td>
      <td className="w-12 px-3 py-3 text-center text-sm">{period.periodNumber}</td>
      <td className="w-32 px-3 py-3">
        <Input
          value={period.label ?? ''}
          onChange={(e) => onChange(index, { label: e.target.value })}
          placeholder="1. Stunde"
          className="h-10"
        />
      </td>
      <td className="w-28 px-3 py-3">
        <Input
          type="time"
          value={period.startTime}
          onChange={(e) => onChange(index, { startTime: e.target.value })}
          className="h-10"
        />
      </td>
      <td className="w-28 px-3 py-3">
        <Input
          type="time"
          value={period.endTime}
          onChange={(e) => onChange(index, { endTime: e.target.value })}
          className="h-10"
        />
      </td>
      <td className="w-20 px-3 py-3 text-right text-sm">
        {durationMinutes != null ? (
          `${durationMinutes} min`
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="w-24 px-3 py-3 text-center">
        <Switch
          checked={period.isBreak}
          onCheckedChange={(v) => onChange(index, { isBreak: v })}
          aria-label="Pause danach"
        />
      </td>
      <td className="w-10 px-3 py-3 text-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(index)}
          aria-label="Periode entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
