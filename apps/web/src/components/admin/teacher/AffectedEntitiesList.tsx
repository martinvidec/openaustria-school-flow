import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Teacher-side affected-entities payload.
 * Mirrors TeacherService.remove's extensions.affectedEntities
 * (apps/api/.../teacher.service.ts).
 */
export interface TeacherAffectedEntities {
  klassenvorstandFor: Array<{ id: string; name: string }>;
  lessonCount: number;
  classbookCount: number;
  gradeCount: number;
  substitutionCount: number;
}

/**
 * Subject-side affected-entities payload (Phase 11 Plan 11-02 SUBJECT-05).
 * Mirrors SubjectService.remove's extensions.affectedEntities
 * (apps/api/.../subject.service.ts).
 */
export interface SubjectAffectedEntities {
  affectedClasses: Array<{ id: string; name: string }>;
  affectedTeachers: Array<{ id: string; name: string }>;
  lessonCount: number;
  homeworkCount: number;
  examCount: number;
}

/** Back-compat alias for Plan 11-01 callers. */
export type AffectedEntities = TeacherAffectedEntities;

type Props =
  | { kind?: 'teacher'; entities: TeacherAffectedEntities }
  | { kind: 'subject'; entities: SubjectAffectedEntities };

export function AffectedEntitiesList(props: Props) {
  if (props.kind === 'subject') {
    return <SubjectAffected entities={props.entities} />;
  }
  return <TeacherAffected entities={props.entities} />;
}

function TeacherAffected({ entities }: { entities: TeacherAffectedEntities }) {
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

function SubjectAffected({ entities }: { entities: SubjectAffectedEntities }) {
  const scalarCategories: Array<{ label: string; count: number; helper: string }> = [
    {
      label: 'Stundenplan-Einträge',
      count: entities.lessonCount,
      helper: 'Verfügbar ab Phase 12',
    },
    {
      label: 'Hausübungen',
      count: entities.homeworkCount,
      helper: 'Verfügbar ab Phase 12',
    },
    {
      label: 'Prüfungen',
      count: entities.examCount,
      helper: 'Verfügbar ab Phase 12',
    },
  ];

  return (
    <ScrollArea className="max-h-64 pr-2">
      <div className="space-y-3">
        {entities.affectedTeachers.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold mb-1">
              Fachzuordnungen ({entities.affectedTeachers.length})
            </h4>
            <ul className="space-y-1 text-sm">
              {entities.affectedTeachers.map((t) => (
                <li key={t.id}>
                  <a
                    href={`/admin/teachers/${t.id}?tab=lehrverpflichtung`}
                    className="text-primary hover:underline"
                  >
                    {t.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entities.affectedClasses.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold">
                Klassen-Fach-Zuordnungen ({entities.affectedClasses.length})
              </h4>
              <span
                className="text-xs text-muted-foreground"
                title="Verfügbar ab Phase 12"
              >
                Verfügbar ab Phase 12
              </span>
            </div>
            <ul className="space-y-1 text-sm">
              {entities.affectedClasses.map((c) => (
                <li
                  key={c.id}
                  className="text-muted-foreground cursor-not-allowed"
                  title="Verfügbar ab Phase 12"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {scalarCategories
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
