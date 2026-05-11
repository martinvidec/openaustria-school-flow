import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
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
import { SchoolClassUpdateSchema } from '@schoolflow/shared';
import { useUpdateClass, type ClassDetailDto } from '@/hooks/useClasses';
import { useRooms } from '@/hooks/useTimetable';
import { TeacherSearchPopover } from './TeacherSearchPopover';
import { SolverReRunBanner } from './SolverReRunBanner';

// Sentinel for the Radix Select — empty string is not allowed as a value.
const NO_HOME_ROOM = '__no_home_room__';

interface Props {
  schoolId: string;
  cls: ClassDetailDto;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ClassStammdatenTab({ schoolId, cls, onDirtyChange }: Props) {
  const [name, setName] = useState(cls.name);
  const [klassenvorstand, setKlassenvorstand] = useState<
    { id: string; firstName: string; lastName: string } | null
  >(
    cls.klassenvorstand
      ? {
          id: cls.klassenvorstand.id,
          firstName: cls.klassenvorstand.person.firstName,
          lastName: cls.klassenvorstand.person.lastName,
        }
      : null,
  );
  const [homeRoomId, setHomeRoomId] = useState<string | null>(
    cls.homeRoomId ?? null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedOnce, setSavedOnce] = useState(false);

  const roomsQuery = useRooms(schoolId);
  const rooms = roomsQuery.data ?? [];

  const dirty =
    name !== cls.name ||
    (klassenvorstand?.id ?? null) !== (cls.klassenvorstandId ?? null) ||
    (homeRoomId ?? null) !== (cls.homeRoomId ?? null);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const updateMutation = useUpdateClass(schoolId, cls.id);

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      klassenvorstandId: klassenvorstand?.id ?? null,
      homeRoomId: homeRoomId ?? null,
    };
    const parsed = SchoolClassUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join('.')] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      await updateMutation.mutateAsync(parsed.data);
      setSavedOnce(true);
    } catch {
      // toast fired in hook onError
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="class-stammdaten-name">Name</Label>
        <Input
          id="class-stammdaten-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label>Jahrgangsstufe</Label>
        <div className="text-sm text-muted-foreground">
          {cls.yearLevel}. Klasse (nach Anlegen nicht mehr änderbar)
        </div>
      </div>

      <div>
        <Label>Schuljahr</Label>
        <div className="text-sm text-muted-foreground">
          {cls.schoolYearId} (nach Anlegen nicht mehr änderbar)
        </div>
      </div>

      <div>
        <Label>Klassenvorstand</Label>
        <TeacherSearchPopover
          schoolId={schoolId}
          value={klassenvorstand}
          onSelect={setKlassenvorstand}
        />
      </div>

      <div>
        <Label htmlFor="class-stammdaten-home-room">Heimraum</Label>
        <Select
          value={homeRoomId ?? NO_HOME_ROOM}
          onValueChange={(v) =>
            setHomeRoomId(v === NO_HOME_ROOM ? null : v)
          }
        >
          <SelectTrigger
            id="class-stammdaten-home-room"
            aria-label="Heimraum"
          >
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
        <p className="text-xs text-muted-foreground mt-1">
          Der Solver bevorzugt diesen Raum für die Klasse (#67).
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={!dirty || updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Speichern
        </Button>
      </div>

      {savedOnce && !dirty && <SolverReRunBanner />}
    </div>
  );
}
