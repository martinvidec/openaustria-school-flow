import { MoreVertical } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClassListItemDto } from '@/hooks/useClasses';

interface Props {
  classes: ClassListItemDto[];
  onDelete: (cls: ClassListItemDto) => void;
}

export function ClassListTable({ classes, onDelete }: Props) {
  if (classes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center">
        Keine Klassen gefunden.
      </div>
    );
  }

  return (
    <div className="hidden sm:block overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">Name</th>
            <th className="px-3 py-2 font-semibold">Jahrgangsstufe</th>
            <th className="px-3 py-2 font-semibold">Klassenvorstand</th>
            <th className="px-3 py-2 font-semibold tabular-nums">Schülerzahl</th>
            <th className="px-3 py-2 font-semibold">Stundentafel</th>
            <th className="px-3 py-2 font-semibold w-10" aria-label="Aktionen"></th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c) => {
            const kv = c.klassenvorstand;
            const kvName = kv
              ? `${kv.person.firstName} ${kv.person.lastName}`
              : '—';
            const subjectCount = (c._count as any)?.classSubjects ?? 0;
            return (
              <tr key={c.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link
                    to="/admin/classes/$classId"
                    params={{ classId: c.id }}
                    className="text-primary hover:underline font-medium"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">{c.yearLevel}</td>
                <td className="px-3 py-2">{kvName}</td>
                <td className="px-3 py-2 tabular-nums">{c._count?.students ?? 0}</td>
                <td className="px-3 py-2">
                  {subjectCount > 0 ? (
                    <Badge className="bg-green-100 text-green-900 hover:bg-green-100">
                      Angewendet
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nicht angewendet</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Aktionen">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin/classes/$classId"
                          params={{ classId: c.id }}
                        >
                          Bearbeiten
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(c)}>
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
