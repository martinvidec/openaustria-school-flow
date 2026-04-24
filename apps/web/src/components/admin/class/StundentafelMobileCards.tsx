import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EditorRow } from './StundentafelEditorTable';

interface Props {
  rows: EditorRow[];
  onChange: (rows: EditorRow[]) => void;
}

/**
 * Mobile (<640px) collapse of the Stundentafel editor — stacked Cards.
 */
export function StundentafelMobileCards({ rows, onChange }: Props) {
  const handleHoursChange = (index: number, value: string) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const next = [...rows];
    next[index] = { ...next[index], weeklyHours: num };
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="sm:hidden space-y-2">
      {rows.map((row, idx) => (
        <div
          key={row.id ?? `new-${row.subjectId}`}
          className="rounded-md border bg-card p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{row.subjectShortName ?? row.subjectId}</span>
            {row.isCustomized && (
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                Angepasst
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={30}
              step={0.5}
              inputMode="decimal"
              value={row.weeklyHours}
              onChange={(e) => handleHoursChange(idx, e.target.value)}
              className="tabular-nums flex-1"
              aria-label={`Wochenstunden für ${row.subjectShortName ?? row.subjectId}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(idx)}
              aria-label="Fach entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
