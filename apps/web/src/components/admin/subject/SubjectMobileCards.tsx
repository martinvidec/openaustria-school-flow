import { MoreVertical } from 'lucide-react';
import { getSubjectColor } from '@schoolflow/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
}

/**
 * SubjectMobileCards — UI-SPEC §3.2.1.
 * Tap-area: whole card opens edit dialog; trailing 11×11 icon-button
 * dropdown for explicit actions.
 */
export function SubjectMobileCards({ subjects, onEdit, onDelete }: Props) {
  return (
    <div className="md:hidden space-y-3" data-testid="subject-mobile-cards">
      {subjects.map((s) => {
        const color = getSubjectColor(s.id);
        const usageCount = s._count?.classSubjects ?? 0;
        return (
          <Card
            key={s.id}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-card-action]')) return;
              onEdit(s);
            }}
            className="cursor-pointer"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <span
                aria-label={`Farbe ${color.bg}`}
                className="h-10 w-10 rounded-md shrink-0 border border-border"
                style={{ backgroundColor: color.bg }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{s.name}</span>
                  <span
                    className="inline-block rounded px-2 py-0.5 text-xs font-semibold shrink-0"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {s.shortName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  — · {usageCount} Zuordnungen
                </div>
              </div>
              <div data-card-action>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      aria-label="Aktionen"
                    >
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
