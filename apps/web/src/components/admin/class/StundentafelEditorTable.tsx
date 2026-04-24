import { Plus, Trash2 } from 'lucide-react';
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

export interface EditorRow {
  id?: string;
  subjectId: string;
  subjectShortName?: string;
  subjectName?: string;
  weeklyHours: number;
  isCustomized?: boolean;
  preferDoublePeriod?: boolean;
}

interface SubjectOption {
  id: string;
  name: string;
  shortName: string;
}

interface Props {
  rows: EditorRow[];
  onChange: (rows: EditorRow[]) => void;
  availableSubjects: SubjectOption[];
}

/**
 * StundentafelEditorTable — SUBJECT-04 Wochenstunden editor.
 *
 * Each row allows editing weeklyHours (NumberInput step=0.5 min=0 tabular-nums),
 * flipping isCustomized visually when divergent from the template (server
 * manages the flag server-side; this UI reflects the value coming from the
 * backend after save).
 */
export function StundentafelEditorTable({ rows, onChange, availableSubjects }: Props) {
  const usedSubjectIds = new Set(rows.map((r) => r.subjectId));
  const addableSubjects = availableSubjects.filter((s) => !usedSubjectIds.has(s.id));

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

  const handleAdd = (subjectId: string) => {
    const subject = availableSubjects.find((s) => s.id === subjectId);
    if (!subject) return;
    onChange([
      ...rows,
      {
        subjectId,
        subjectShortName: subject.shortName,
        subjectName: subject.name,
        weeklyHours: 0,
      },
    ]);
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">Fach</th>
            <th className="px-3 py-2 font-semibold tabular-nums w-32">Wochenstunden</th>
            <th className="px-3 py-2 font-semibold w-28">Status</th>
            <th className="px-3 py-2 w-10" aria-label="Entfernen"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? `new-${row.subjectId}`} className="border-t">
              <td className="px-3 py-2">
                <span className="font-medium">{row.subjectShortName ?? row.subjectId}</span>
                {row.subjectName && (
                  <span className="text-muted-foreground ml-2">{row.subjectName}</span>
                )}
              </td>
              <td className="px-3 py-2 tabular-nums">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  inputMode="decimal"
                  value={row.weeklyHours}
                  onChange={(e) => handleHoursChange(idx, e.target.value)}
                  className="tabular-nums w-24"
                  aria-label={`Wochenstunden für ${row.subjectShortName ?? row.subjectId}`}
                />
              </td>
              <td className="px-3 py-2">
                {row.isCustomized ? (
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                    Angepasst
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Vorlage</span>
                )}
              </td>
              <td className="px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(idx)}
                  aria-label="Fach entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
          {addableSubjects.length > 0 && (
            <tr className="border-t bg-muted/10">
              <td className="px-3 py-2" colSpan={4}>
                <div className="flex items-center gap-2">
                  <Select value="" onValueChange={handleAdd}>
                    <SelectTrigger className="w-[240px]" aria-label="Fach hinzufügen">
                      <SelectValue placeholder="+ Fach hinzufügen" />
                    </SelectTrigger>
                    <SelectContent>
                      {addableSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <Plus className="h-4 w-4 inline mr-1" />
                          {s.shortName} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
