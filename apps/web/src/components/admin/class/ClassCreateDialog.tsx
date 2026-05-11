import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { SchoolClassCreateSchema } from '@schoolflow/shared';
import { useCreateClass } from '@/hooks/useClasses';
import { useRooms } from '@/hooks/useTimetable';
import { TeacherSearchPopover } from './TeacherSearchPopover';

const NO_HOME_ROOM = '__no_home_room__';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolYears: Array<{ id: string; name: string; isActive?: boolean }>;
  defaultSchoolYearId?: string;
}

export function ClassCreateDialog({
  open,
  onOpenChange,
  schoolId,
  schoolYears,
  defaultSchoolYearId,
}: Props) {
  const [name, setName] = useState('');
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [schoolYearId, setSchoolYearId] = useState<string>(defaultSchoolYearId ?? '');
  const [klassenvorstand, setKlassenvorstand] = useState<
    { id: string; firstName: string; lastName: string } | null
  >(null);
  const [homeRoomId, setHomeRoomId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateClass(schoolId);
  const roomsQuery = useRooms(schoolId);
  const rooms = roomsQuery.data ?? [];

  const handleSubmit = async () => {
    const payload = {
      schoolId,
      name: name.trim(),
      yearLevel,
      schoolYearId,
      klassenvorstandId: klassenvorstand?.id,
      homeRoomId: homeRoomId ?? undefined,
    };
    const parsed = SchoolClassCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path.join('.')] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await createMutation.mutateAsync(parsed.data);
      onOpenChange(false);
      // reset form
      setName('');
      setYearLevel(1);
      setKlassenvorstand(null);
      setHomeRoomId(null);
    } catch {
      // toast fired in hook onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Klasse anlegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. 3B"
              autoFocus
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="class-year-level">Jahrgangsstufe</Label>
            <Select
              value={String(yearLevel)}
              onValueChange={(v) => setYearLevel(Number(v))}
            >
              <SelectTrigger id="class-year-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}. Klasse
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.yearLevel && (
              <p className="text-xs text-destructive mt-1">{errors.yearLevel}</p>
            )}
          </div>

          <div>
            <Label htmlFor="class-school-year">Schuljahr</Label>
            <Select value={schoolYearId} onValueChange={setSchoolYearId}>
              <SelectTrigger id="class-school-year">
                <SelectValue placeholder="Schuljahr wählen" />
              </SelectTrigger>
              <SelectContent>
                {schoolYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? ' (aktiv)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.schoolYearId && (
              <p className="text-xs text-destructive mt-1">{errors.schoolYearId}</p>
            )}
          </div>

          <div>
            <Label>Klassenvorstand (optional)</Label>
            <TeacherSearchPopover
              schoolId={schoolId}
              value={klassenvorstand}
              onSelect={setKlassenvorstand}
            />
          </div>

          <div>
            <Label htmlFor="class-home-room">Heimraum (optional)</Label>
            <Select
              value={homeRoomId ?? NO_HOME_ROOM}
              onValueChange={(v) =>
                setHomeRoomId(v === NO_HOME_ROOM ? null : v)
              }
            >
              <SelectTrigger id="class-home-room" aria-label="Heimraum">
                <SelectValue placeholder="Heimraum wählen …" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_HOME_ROOM}>Kein Heimraum</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Klasse anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
