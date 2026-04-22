import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TeacherDto } from '@/hooks/useTeachers';

/**
 * ErmaessigungenList — Tab 4 of the teacher detail page.
 *
 * Row-Add list: Select (Grund) · Input (Anmerkung) · Number (Werteinheiten) · Trash2.
 * Save sends the full array via PUT (replace-all, Phase 2 D-04).
 */

const REDUCTION_LABELS: Record<string, string> = {
  KLASSENVORSTAND: 'Klassenvorstand',
  KUSTODIAT: 'Kustodiat',
  MENTOR: 'Mentoring',
  PERSONALVERTRETUNG: 'Personalvertretung',
  ADMINISTRATION: 'Administration',
  OTHER: 'Sonstiges',
};

type ReductionKind = keyof typeof REDUCTION_LABELS;

interface Row {
  id: string;
  reductionType: ReductionKind;
  description: string;
  werteinheiten: number;
}

interface Props {
  teacher: TeacherDto;
  onSave: (reductions: Array<{ reductionType: string; description?: string; werteinheiten: number }>) => Promise<void> | void;
  isSaving?: boolean;
}

export function ErmaessigungenList({ teacher, onSave, isSaving = false }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    (teacher.reductions ?? []).map((r, i) => ({
      id: r.id ?? `existing-${i}`,
      reductionType: (r.reductionType as ReductionKind) ?? 'OTHER',
      description: r.description ?? '',
      werteinheiten: r.werteinheiten ?? 0,
    })),
  );

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        reductionType: 'KUSTODIAT',
        description: '',
        werteinheiten: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const validationErrors = rows.map((r) =>
    r.reductionType === 'OTHER' && r.description.trim().length === 0
      ? 'Anmerkung ist bei "Sonstiges" erforderlich'
      : undefined,
  );
  const hasErrors = validationErrors.some(Boolean);
  const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.werteinheiten) ? r.werteinheiten : 0), 0);

  const handleSave = async () => {
    if (hasErrors) return;
    await onSave(
      rows.map((r) => ({
        reductionType: r.reductionType,
        description: r.description.trim() || undefined,
        werteinheiten: r.werteinheiten,
      })),
    );
  };

  return (
    <div className="space-y-3 pb-16 md:pb-0" aria-label="Ermässigungen">
      {rows.map((row, i) => (
        <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 md:col-span-4">
            <Label htmlFor={`grund-${row.id}`}>Grund</Label>
            <Select
              value={row.reductionType}
              onValueChange={(v) => update(row.id, { reductionType: v as ReductionKind })}
            >
              <SelectTrigger id={`grund-${row.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REDUCTION_LABELS).map(([v, lbl]) => (
                  <SelectItem key={v} value={v}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-8 md:col-span-5">
            <Label htmlFor={`anm-${row.id}`}>Anmerkung</Label>
            <Input
              id={`anm-${row.id}`}
              value={row.description}
              onChange={(e) => update(row.id, { description: e.target.value })}
              aria-invalid={!!validationErrors[i]}
              aria-describedby={validationErrors[i] ? `anm-err-${row.id}` : undefined}
            />
            {validationErrors[i] && (
              <p id={`anm-err-${row.id}`} className="text-sm text-destructive mt-1">
                {validationErrors[i]}
              </p>
            )}
          </div>
          <div className="col-span-3 md:col-span-2">
            <Label htmlFor={`we-${row.id}`}>WE</Label>
            <Input
              id={`we-${row.id}`}
              type="number"
              min={0}
              step={0.5}
              value={row.werteinheiten}
              onChange={(e) => update(row.id, { werteinheiten: Number(e.target.value) })}
            />
          </div>
          <div className="col-span-1 md:col-span-1 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeRow(row.id)}
              aria-label="Zeile entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addRow}>
        Ermäßigung hinzufügen
      </Button>

      <div className="flex justify-between items-center pt-4 border-t text-sm">
        <span className="text-muted-foreground">
          {rows.length} Ermäßigung{rows.length === 1 ? '' : 'en'} · Gesamt {total.toFixed(1)} WE
        </span>
        <Button onClick={handleSave} disabled={isSaving || hasErrors}>
          Speichern
        </Button>
      </div>
    </div>
  );
}
