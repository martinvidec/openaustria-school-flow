import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Payload shape — mirrors TeacherService.remove's
 * extensions.affectedEntities (apps/api/.../teacher.service.ts).
 */
export interface AffectedEntities {
  klassenvorstandFor: Array<{ id: string; name: string }>;
  lessonCount: number;
  classbookCount: number;
  gradeCount: number;
  substitutionCount: number;
}

interface Props {
  entities: AffectedEntities;
}

export function AffectedEntitiesList({ entities }: Props) {
  const categories: Array<{ label: string; count: number; helper: string }> = [
    {
      label: 'Stundenplan-Einträge',
      count: entities.lessonCount,
      helper: 'Verfügbar ab Phase 12',
    },
    {
      label: 'Klassenbuch-Einträge',
      count: entities.classbookCount,
      helper: 'Verfügbar ab Phase 12',
    },
    {
      label: 'Noten-Einträge',
      count: entities.gradeCount,
      helper: 'Verfügbar ab Phase 12',
    },
    {
      label: 'Vertretungen',
      count: entities.substitutionCount,
      helper: 'Verfügbar ab Phase 12',
    },
  ];

  return (
    <ScrollArea className="max-h-64 pr-2">
      <div className="space-y-3">
        {entities.klassenvorstandFor.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold mb-1">
              Klassenvorstand für ({entities.klassenvorstandFor.length})
            </h4>
            <ul className="space-y-1 text-sm">
              {entities.klassenvorstandFor.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/admin/classes/${c.id}`}
                    className="text-primary hover:underline"
                    title="Verfügbar ab Phase 12"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {categories
          .filter((c) => c.count > 0)
          .map((c) => (
            <section key={c.label}>
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  {c.label} ({c.count})
                </h4>
                <span className="text-xs text-muted-foreground" title={c.helper}>
                  {c.helper}
                </span>
              </div>
            </section>
          ))}
      </div>
    </ScrollArea>
  );
}
