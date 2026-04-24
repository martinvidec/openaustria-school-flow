import type { ReactElement } from 'react';
import { Link2, ShieldCheck, UserCircle, UsersRound } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AffectedEntitiesList as TeacherFamilyList,
  type ClassAffectedEntities,
  type StudentAffectedEntities,
  type SubjectAffectedEntities,
  type TeacherAffectedEntities,
} from '@/components/admin/teacher/AffectedEntitiesList';

/**
 * Phase 13-02 — shared AffectedEntitiesList wrapper.
 *
 * Existing Phase 11/12 callers use the four legacy `kind`s
 * (`teacher | subject | student | class`) which carry counts-of-relations
 * payloads and live in the original `components/admin/teacher/` file.
 * Phase 13 adds four NEW `kind`s for the user/permission domain:
 *
 *   - `user`           → renders a list of Keycloak-User chips (id, email)
 *                        WITHOUT a deep-link (UI-SPEC RESEARCH OQ-04 — circular UX)
 *   - `person-teacher` → deep-links to /admin/teachers/$id
 *   - `person-student` → deep-links to /admin/students/$id
 *   - `person-parent`  → deep-links to /admin/students/$studentId?tab=parents
 *                        (parents have no standalone admin route in v1.1)
 *
 * For the four legacy kinds we delegate to the original Phase 11/12
 * implementation to avoid duplicating count-bucket logic.
 */

export type {
  TeacherAffectedEntities,
  SubjectAffectedEntities,
  StudentAffectedEntities,
  ClassAffectedEntities,
};

export interface UserAffectedEntity {
  id: string;
  email?: string | null;
  name?: string | null;
}

export interface PersonAffectedEntity {
  id: string;
  name: string;
}

type Props =
  | { kind?: 'teacher'; entities: TeacherAffectedEntities }
  | { kind: 'subject'; entities: SubjectAffectedEntities }
  | { kind: 'student'; entities: StudentAffectedEntities }
  | { kind: 'class'; entities: ClassAffectedEntities }
  | { kind: 'user'; entities: UserAffectedEntity[]; heading?: string }
  | { kind: 'person-teacher'; entities: PersonAffectedEntity[]; heading?: string }
  | { kind: 'person-student'; entities: PersonAffectedEntity[]; heading?: string }
  | { kind: 'person-parent'; entities: PersonAffectedEntity[]; heading?: string };

export function AffectedEntitiesList(props: Props): ReactElement {
  switch (props.kind) {
    case undefined:
    case 'teacher':
      return <TeacherFamilyList kind="teacher" entities={props.entities} />;
    case 'subject':
      return <TeacherFamilyList kind="subject" entities={props.entities} />;
    case 'student':
      return <TeacherFamilyList kind="student" entities={props.entities} />;
    case 'class':
      return <TeacherFamilyList kind="class" entities={props.entities} />;
    case 'user':
      return (
        <UserAffected
          entities={props.entities}
          heading={props.heading ?? 'Betroffene User'}
        />
      );
    case 'person-teacher':
      return (
        <PersonAffected
          entities={props.entities}
          heading={props.heading ?? 'Betroffene Lehrkräfte'}
          href={(id) => `/admin/teachers/${id}`}
        />
      );
    case 'person-student':
      return (
        <PersonAffected
          entities={props.entities}
          heading={props.heading ?? 'Betroffene Schüler:innen'}
          href={(id) => `/admin/students/${id}`}
        />
      );
    case 'person-parent':
      // Parents have no standalone admin route in v1.1 — deep-link to the
      // students list (UI-SPEC §Ambiguity).
      return (
        <PersonAffected
          entities={props.entities}
          heading={props.heading ?? 'Betroffene Erziehungsberechtigte'}
          href={() => `/admin/students`}
        />
      );
  }
}

function UserAffected({
  entities,
  heading,
}: {
  entities: UserAffectedEntity[];
  heading: string;
}) {
  if (entities.length === 0) return null;
  return (
    <ScrollArea className="max-h-64 pr-2">
      <div className="space-y-3">
        <section>
          <h4 className="text-sm font-semibold mb-1 inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
            {heading} ({entities.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {entities.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2 text-muted-foreground"
                title={u.id}
              >
                <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {u.name ?? u.email ?? u.id.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ScrollArea>
  );
}

function PersonAffected({
  entities,
  heading,
  href,
}: {
  entities: PersonAffectedEntity[];
  heading: string;
  href: (id: string) => string;
}) {
  if (entities.length === 0) return null;
  return (
    <ScrollArea className="max-h-64 pr-2">
      <div className="space-y-3">
        <section>
          <h4 className="text-sm font-semibold mb-1 inline-flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" aria-hidden />
            {heading} ({entities.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {entities.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <a
                  href={href(p.id)}
                  className="text-primary hover:underline"
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ScrollArea>
  );
}
