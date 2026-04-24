import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AUSTRIAN_STUNDENTAFELN } from '@schoolflow/shared';
import { useApplyStundentafel } from '@/hooks/useClassSubjects';

const SCHOOL_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'AHS_UNTER', label: 'AHS Unterstufe' },
  { value: 'AHS_OBER', label: 'AHS Oberstufe' },
  { value: 'NMS', label: 'NMS / Mittelschule' },
  { value: 'VS', label: 'Volksschule' },
  { value: 'BHS', label: 'BHS' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  yearLevel: number;
  defaultSchoolType?: string;
}

export function ApplyStundentafelDialog({
  open,
  onOpenChange,
  classId,
  yearLevel,
  defaultSchoolType,
}: Props) {
  const [schoolType, setSchoolType] = useState(defaultSchoolType ?? 'AHS_UNTER');
  const applyMutation = useApplyStundentafel(classId);

  const template = useMemo(
    () =>
      AUSTRIAN_STUNDENTAFELN.find(
        (t) => t.schoolType === schoolType && t.yearLevel === yearLevel,
      ),
    [schoolType, yearLevel],
  );

  const handleConfirm = async () => {
    try {
      await applyMutation.mutateAsync({ schoolType });
      onOpenChange(false);
    } catch {
      // toast fired by hook onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stundentafel aus Vorlage übernehmen</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="school-type">Schultyp</Label>
            <Select value={schoolType} onValueChange={setSchoolType}>
              <SelectTrigger id="school-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Jahrgangsstufe</Label>
            <div className="text-sm text-muted-foreground">{yearLevel}. Klasse</div>
          </div>

          <div>
            <Label>Vorschau</Label>
            {template ? (
              <div className="overflow-x-auto rounded-md border max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left">
                    <tr>
                      <th className="px-3 py-2">Fach</th>
                      <th className="px-3 py-2 tabular-nums">Wochenstunden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.subjects.map((s) => (
                      <tr key={s.shortName} className="border-t">
                        <td className="px-3 py-2">
                          <span className="font-medium">{s.shortName}</span>
                          <span className="text-muted-foreground ml-2">{s.name}</span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{s.weeklyHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Keine Vorlage für diese Kombination verfügbar.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!template || applyMutation.isPending}
          >
            Stundentafel übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
