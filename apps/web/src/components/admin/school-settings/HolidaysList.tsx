import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateHoliday, useDeleteHoliday } from '@/hooks/useSchoolYears';

interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Props {
  schoolId: string;
  yearId: string;
  holidays: Holiday[];
}

export function HolidaysList({ schoolId, yearId, holidays }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', startDate: '', endDate: '' });
  const createMut = useCreateHoliday(schoolId);
  const deleteMut = useDeleteHoliday(schoolId);

  const handleSubmit = async () => {
    if (!draft.startDate || !draft.endDate) return;
    await createMut.mutateAsync({
      yearId,
      dto: {
        name: draft.name || 'Ferien',
        startDate: draft.startDate,
        endDate: draft.endDate,
      },
    });
    setDraft({ name: '', startDate: '', endDate: '' });
    setAdding(false);
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Ferien</h4>
      <div className="space-y-1">
        {holidays.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">Keine Ferieneintraege.</p>
        )}
        {holidays.map((h) => (
          <div
            key={h.id}
            className="flex items-center gap-2 py-2 border-b last:border-b-0 text-sm"
          >
            <span className="flex-1">
              {format(new Date(h.startDate), 'dd.MM.yyyy')} –{' '}
              {format(new Date(h.endDate), 'dd.MM.yyyy')}
              {h.name && <span className="text-muted-foreground ml-2">{h.name}</span>}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:h-8 md:w-8"
              onClick={() =>
                deleteMut.mutate({ yearId, holidayId: h.id })
              }
              aria-label="Ferieneintrag entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 p-3 border rounded-md space-y-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label htmlFor={`h-${yearId}-name`}>Bezeichnung (optional)</Label>
            <Input
              id={`h-${yearId}-name`}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Herbstferien"
              className="h-11 md:h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`h-${yearId}-start`}>Von</Label>
              <Input
                id={`h-${yearId}-start`}
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="h-11 md:h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`h-${yearId}-end`}>Bis</Label>
              <Input
                id={`h-${yearId}-end`}
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="h-11 md:h-10"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setDraft({ name: '', startDate: '', endDate: '' });
                setAdding(false);
              }}
              disabled={createMut.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMut.isPending || !draft.startDate || !draft.endDate}
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
