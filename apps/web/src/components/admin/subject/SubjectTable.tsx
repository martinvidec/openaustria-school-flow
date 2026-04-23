import { MoreVertical } from 'lucide-react';
import { getSubjectColor } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SubjectDto } from '@/hooks/useSubjects';

interface Props {
  subjects: SubjectDto[];
  onEdit: (s: SubjectDto) => void;
  onDelete: (s: SubjectDto) => void;
  onShowAffected: (s: SubjectDto) => void;
}

/**
 * SubjectTable — desktop dense Fach-Liste (UI-SPEC §3.2).
 * Schultyp column shows '—' since no schoolType mapping lives on
 * Subject in v1.0 (post-research descope, A4 rolled back).
 */
export function SubjectTable({ subjects, onEdit, onDelete, onShowAffected }: Props) {
  return (
    <div className="hidden md:block overflow-x-auto" data-testid="subject-table">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-center py-2 px-3 w-16 font-medium">Farbe</th>
            <th className="text-left py-2 px-3 font-medium">Name</th>
            <th className="text-left py-2 px-3 w-24 font-medium">Kürzel</th>
            <th className="text-left py-2 px-3 w-40 font-medium">Schultyp</th>
            <th className="text-right py-2 px-3 w-32 font-medium">Nutzung</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => {
            const color = getSubjectColor(s.id);
            const usageCount = s._count?.classSubjects ?? 0;
            return (
              <tr
                key={s.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={(e) => {
                  // Avoid hijacking clicks on the dropdown or the Nutzung button
                  if ((e.target as HTMLElement).closest('[data-row-action]')) return;
                  onEdit(s);
                }}
                data-testid={`subject-row-${s.shortName}`}
              >
                <td className="py-2 px-3 text-center">
                  <span
                    aria-label={`Farbe ${color.bg}`}
                    className="inline-block h-3 w-3 rounded-sm border border-border align-middle"
                    style={{ backgroundColor: color.bg }}
                  />
                  <span className="hidden lg:inline ml-2 text-xs font-mono text-muted-foreground">
                    {color.bg}
                  </span>
                </td>
                <td className="py-2 px-3 font-medium">{s.name}</td>
                <td className="py-2 px-3">
                  <span
                    className="inline-block rounded px-2 py-1 text-xs font-semibold"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {s.shortName}
                  </span>
                </td>
                <td className="py-2 px-3 text-muted-foreground">—</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  <button
                    type="button"
                    data-row-action
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowAffected(s);
                    }}
                    className="text-primary underline-offset-2 hover:underline"
                    aria-label={`${usageCount} Zuordnungen anzeigen`}
                  >
                    {usageCount} Zuordnungen
                  </button>
                </td>
                <td className="py-2 px-3 text-right" data-row-action>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label="Aktionen">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(s)}>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(s)}
                        className="text-destructive"
                      >
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
