import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EditorRow } from './StundentafelEditorTable';

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  rows: EditorRow[];
  onChange: (rows: EditorRow[]) => void;
  availableTeachers: TeacherOption[];
}

const NO_TEACHER = '__no_teacher__';

/**
 * Mobile (<640px) collapse of the Stundentafel editor — stacked Cards.
 */
export function StundentafelMobileCards({
  rows,
  onChange,
  availableTeachers,
}: Props) {
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

  const handleTeacherChange = (index: number, value: string) => {
    const next = [...rows];
    if (value === NO_TEACHER) {
      next[index] = {
        ...next[index],
        teacherId: null,
        teacherDisplayName: undefined,
      };
    } else {
      const t = availableTeachers.find((tt) => tt.id === value);
      next[index] = {
        ...next[index],
        teacherId: value,
        teacherDisplayName: t ? `${t.lastName} ${t.firstName}` : undefined,
      };
    }
    onChange(next);
  };

  return (
    <div className="sm:hidden space-y-2">
      {rows.map((row, idx) => (
        <div
          key={row.id ?? `new-${row.subjectId}`}
          className="rounded-md border bg-card p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
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
          <Select
            value={row.teacherId ?? NO_TEACHER}
            onValueChange={(v) => handleTeacherChange(idx, v)}
          >
            <SelectTrigger
              aria-label={`Lehrkraft für ${row.subjectShortName ?? row.subjectId}`}
            >
              <SelectValue placeholder="Nicht zugewiesen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEACHER}>Nicht zugewiesen</SelectItem>
              {availableTeachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
