import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EntityOption {
  id: string;
  name: string;
}

interface PerspectiveSelectorProps {
  role: string;
  teachers: EntityOption[];
  classes: EntityOption[];
  rooms: EntityOption[];
  selected: {
    perspective: 'teacher' | 'class' | 'room';
    id: string;
    name: string;
  };
  onSelect: (
    perspective: 'teacher' | 'class' | 'room',
    id: string,
    name: string,
  ) => void;
}

/**
 * Role-aware perspective selector for the timetable view.
 * - admin / schulleitung: Dropdown with 3 option groups (Lehrer, Klassen, Raeume)
 * - lehrer: Static text "Mein Stundenplan" (no dropdown)
 * - schueler / eltern: Nothing rendered (class timetable auto-selected)
 * Per UI-SPEC D-04.
 */
export function PerspectiveSelector({
  role,
  teachers,
  classes,
  rooms,
  selected,
  onSelect,
}: PerspectiveSelectorProps) {
  // Teachers see static label -- no perspective switching
  if (role === 'lehrer') {
    return (
      <div className="flex items-center h-10 px-3 text-sm font-semibold">
        Mein Stundenplan
      </div>
    );
  }

  // Students and parents see nothing -- class timetable is auto-selected
  if (role === 'schueler' || role === 'eltern') {
    return null;
  }

  // Admin and Schulleitung get the full dropdown
  // Encode perspective + id together as value: "teacher:uuid" / "class:uuid" / "room:uuid"
  const currentValue = `${selected.perspective}:${selected.id}`;

  function handleValueChange(value: string) {
    const [perspective, id] = value.split(':') as [
      'teacher' | 'class' | 'room',
      string,
    ];

    let name = '';
    if (perspective === 'teacher') {
      name = teachers.find((t) => t.id === id)?.name ?? '';
    } else if (perspective === 'class') {
      name = classes.find((c) => c.id === id)?.name ?? '';
    } else if (perspective === 'room') {
      name = rooms.find((r) => r.id === id)?.name ?? '';
    }

    onSelect(perspective, id, name);
  }

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[240px] min-h-[44px]">
        <SelectValue placeholder="Ansicht waehlen..." />
      </SelectTrigger>
      <SelectContent>
        {teachers.length > 0 && (
          <SelectGroup>
            <SelectLabel>Lehrer</SelectLabel>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={`teacher:${teacher.id}`}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {teachers.length > 0 && classes.length > 0 && <SelectSeparator />}

        {classes.length > 0 && (
          <SelectGroup>
            <SelectLabel>Klassen</SelectLabel>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={`class:${cls.id}`}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {(teachers.length > 0 || classes.length > 0) && rooms.length > 0 && (
          <SelectSeparator />
        )}

        {rooms.length > 0 && (
          <SelectGroup>
            <SelectLabel>Raeume</SelectLabel>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={`room:${room.id}`}>
                {room.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
