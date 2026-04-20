import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { SchoolDto } from '@schoolflow/shared';
import { InfoBanner } from '@/components/admin/shared/InfoBanner';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useActiveTimetableRun } from '@/hooks/useActiveTimetableRun';
import { schoolKeys, useSchool } from '@/hooks/useSchool';
import { apiFetch } from '@/lib/api';

interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

export function OptionsTab({ schoolId, onDirtyChange }: Props) {
  const schoolQuery = useSchool(schoolId);
  const runQuery = useActiveTimetableRun(schoolId);
  const qc = useQueryClient();

  // Dedicated inline mutation — toasts "Option gespeichert." per UI-SPEC §6.3.
  // The shared school-update hook toasts "Aenderungen gespeichert." (wrong
  // copy for this tab), so this tab owns its own mutation deliberately.
  const updateAbMut = useMutation({
    mutationFn: async (abWeekEnabled: boolean): Promise<SchoolDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}`, {
        method: 'PUT',
        body: JSON.stringify({ abWeekEnabled }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolKeys.one(schoolId) });
      qc.invalidateQueries({ queryKey: ['timetable-run:active', schoolId] });
      toast.success('Option gespeichert.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-save tab: never reports dirty state to the parent shell.
  useEffect(() => onDirtyChange?.(false), [onDirtyChange]);

  const school = schoolQuery.data;
  const run = runQuery.data;

  const statusLine = !run
    ? 'Es existiert noch kein Stundenplan.'
    : run.abWeekEnabled
      ? 'A/B-Wochen sind im aktuellen Stundenplan aktiviert.'
      : 'A/B-Wochen sind im aktuellen Stundenplan deaktiviert.';

  const handleToggle = (next: boolean) => {
    updateAbMut.mutate(next);
  };

  if (!school) return null;

  return (
    <Card className="border-none shadow-none md:border md:shadow-sm p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Optionen</h2>
        <p className="text-sm text-muted-foreground">
          Schulweite Einstellungen, die den Stundenplan-Solver beeinflussen.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 py-3">
        <div className="flex flex-col">
          <Label htmlFor="ab-toggle" className="text-sm font-medium">
            A/B-Wochen-Modus
          </Label>
          <span className="text-xs text-muted-foreground mt-1">{statusLine}</span>
        </div>
        <Switch
          id="ab-toggle"
          checked={!!school.abWeekEnabled}
          onCheckedChange={handleToggle}
          disabled={updateAbMut.isPending}
          aria-label="A/B-Wochen-Modus aktivieren"
        />
      </div>

      <div className="mt-3">
        <InfoBanner>
          Eine Aenderung gilt ab dem naechsten Stundenplan-Lauf. Bestehende Stundenplaene bleiben
          unveraendert.
        </InfoBanner>
      </div>
    </Card>
  );
}
