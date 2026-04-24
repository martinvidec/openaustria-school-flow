import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ClassListItemDto } from '@/hooks/useClasses';

interface Props {
  classes: ClassListItemDto[];
}

export function ClassMobileCards({ classes }: Props) {
  if (classes.length === 0) return null;
  return (
    <div className="sm:hidden space-y-2">
      {classes.map((c) => {
        const kv = c.klassenvorstand;
        const kvName = kv ? `${kv.person.firstName} ${kv.person.lastName}` : '—';
        const subjectCount = (c._count as any)?.classSubjects ?? 0;
        return (
          <Link
            key={c.id}
            to="/admin/classes/$classId"
            params={{ classId: c.id }}
            className="block rounded-md border bg-card p-3 hover:bg-muted/20"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {c.yearLevel}. Klasse · {c._count?.students ?? 0} Schüler:innen · {kvName}
            </div>
            <div className="mt-2">
              {subjectCount > 0 ? (
                <Badge className="bg-green-100 text-green-900 hover:bg-green-100">
                  Stundentafel angewendet
                </Badge>
              ) : (
                <Badge variant="secondary">Stundentafel nicht angewendet</Badge>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
