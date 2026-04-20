import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateAutonomousDay,
  useDeleteAutonomousDay,
} from '@/hooks/useSchoolYears';

interface AutonomousDay {
  id: string;
  date: string;
  reason: string | null;
}

interface Props {
  schoolId: string;
  yearId: string;
  days: AutonomousDay[];
}

export function AutonomousDaysList({ schoolId, yearId, days }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ date: '', reason: '' });
  const createMut = useCreateAutonomousDay(schoolId);
  const deleteMut = useDeleteAutonomousDay(schoolId);

  const handleSubmit = async () => {
    if (!draft.date) return;
    await createMut.mutateAsync({
      yearId,
      dto: {
        date: draft.date,
        reason: draft.reason || undefined,
      },
    });
    setDraft({ date: '', reason: '' });
    setAdding(false);
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Schulautonome Tage</h4>
      <div className="space-y-1">
        {days.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">Keine schulautonomen Tage.</p>
        )}
        {days.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-2 py-2 border-b last:border-b-0 text-sm"
          >
            <span className="flex-1">
              {format(new Date(d.date), 'dd.MM.yyyy')}
              {d.reason && <span className="text-muted-foreground ml-2">{d.reason}</span>}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-8 md:w-8"
              onClick={() => deleteMut.mutate({ yearId, dayId: d.id })}
              aria-label="Schulautonomer Tag entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 p-3 border rounded-md space-y-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label htmlFor={`a-${yearId}-date`}>Datum</Label>
            <Input
              id={`a-${yearId}-date`}
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="h-11 md:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`a-${yearId}-reason`}>Anlass (optional)</Label>
            <Input
              id={`a-${yearId}-reason`}
              value={draft.reason}
              onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
              placeholder="z. B. Schulfest"
              className="h-11 md:h-10"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDraft({ date: '', reason: '' });
                setAdding(false);
              }}
              disabled={createMut.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMut.isPending || !draft.date}
            >
              {createMut.isPending ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="mt-3 h-11 md:h-10 w-full md:w-auto"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Eintrag hinzufuegen
        </Button>
      )}
    </div>
  );
}
