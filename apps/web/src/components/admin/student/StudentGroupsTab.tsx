import { Badge } from '@/components/ui/badge';
import type { StudentDto } from '@/hooks/useStudents';

interface Props {
  student: StudentDto;
}

const GROUP_TYPE_LABELS: Record<string, string> = {
  RELIGION: 'Religion',
  WAHLPFLICHT: 'Wahlpflicht',
  LEISTUNG: 'Leistungsgruppe',
  LANGUAGE: 'Sprache',
  CUSTOM: 'Benutzerdefiniert',
};

export function StudentGroupsTab({ student }: Props) {
  const memberships = student.groupMemberships ?? [];

  if (memberships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border rounded-md">
        <h3 className="font-semibold">Keine Gruppen-Mitgliedschaften</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Diese:r Schüler:in ist keiner Gruppe zugeordnet.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y border rounded-md" aria-label="Gruppen-Mitgliedschaften">
      {memberships.map((m) => {
        const group = m.group;
        const typeLabel = group?.groupType
          ? GROUP_TYPE_LABELS[group.groupType] ?? group.groupType
          : '—';
        const autoBadge = m.isAutoAssigned ? (
          <Badge className="bg-green-500/10 text-green-700 border-0" variant="outline">
            Auto
          </Badge>
        ) : (
          <Badge className="bg-amber-500/10 text-amber-700 border-0" variant="outline">
            Manuell
          </Badge>
        );
        return (
          <li key={m.id} className="flex items-center justify-between p-3 gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{group?.name ?? 'Gruppe'}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{typeLabel}</span>
                {group?.level && <span>· {group.level}</span>}
              </div>
            </div>
            {autoBadge}
          </li>
        );
      })}
    </ul>
  );
}
