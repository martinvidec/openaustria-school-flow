import { Link as RouterLink } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { StudentDto } from '@/hooks/useStudents';

interface Props {
  students: StudentDto[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}

export function StudentMobileCards({ students, selectedIds, onToggleSelection }: Props) {
  return (
    <div className="md:hidden space-y-2">
      {students.map((s) => {
        const isSelected = selectedIds.has(s.id);
        const statusClass = s.isArchived
          ? 'bg-destructive/10 text-destructive'
          : 'bg-green-500/10 text-green-700 dark:text-green-400';
        return (
          <Card key={s.id} data-testid={`student-card-${s.id}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <label
                className="h-11 w-11 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(s.id)}
                  aria-label={`${s.person.lastName}, ${s.person.firstName} auswählen`}
                />
              </label>
              <RouterLink
                to="/admin/students/$studentId"
                params={{ studentId: s.id }}
                search={{ tab: 'stammdaten' }}
                className="flex-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {s.person.lastName}, {s.person.firstName}
                    </div>
                    {s.person.email && (
                      <div className="text-xs text-muted-foreground">{s.person.email}</div>
                    )}
                  </div>
                  <Badge className={`${statusClass} border-0`} variant="outline">
                    {s.isArchived ? 'Archiviert' : 'Aktiv'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.schoolClass?.name ?? 'Ohne Stammklasse'}
                </div>
              </RouterLink>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
