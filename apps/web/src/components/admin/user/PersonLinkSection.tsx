import { useState } from 'react';
import { ArrowRight, Link2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkPersonDialog } from './LinkPersonDialog';
import { UnlinkPersonDialog } from './UnlinkPersonDialog';
import { ReLinkConflictDialog } from './ReLinkConflictDialog';
import type {
  PersonType,
  ProblemDetail,
  UserDirectoryDetail,
} from '@/features/users/types';

/**
 * Phase 13-02 — Person-Verknüpfung section (Tab 4 bottom half).
 *
 * UI-SPEC §479-481:
 *   - Unlinked: icon Link2Off + heading + body + CTA `Mit Person verknüpfen`
 *   - Linked: icon Link2 + sentence + deep-link + actions
 *     `Verknüpfung ändern` (primary) / `Verknüpfung lösen` (destructive ghost)
 */

const PERSON_TYPE_LABEL: Record<string, string> = {
  TEACHER: 'Lehrkraft',
  STUDENT: 'Schüler:in',
  PARENT: 'Erziehungsberechtigte:n',
};

function deepLinkFor(personType: string, personId: string): string {
  switch (personType) {
    case 'TEACHER':
      return `/admin/teachers/${personId}`;
    case 'STUDENT':
      return `/admin/students/${personId}`;
    case 'PARENT':
      // Parents have no standalone admin route in v1.1 — defer to students list.
      return `/admin/students`;
    default:
      return '#';
  }
}

interface Props {
  user: UserDirectoryDetail;
}

export function PersonLinkSection({ user }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [conflictProblem, setConflictProblem] = useState<ProblemDetail | null>(null);
  const [conflictAttempt, setConflictAttempt] = useState<{
    personType: PersonType;
    personId: string;
  } | null>(null);

  const link = user.personLink;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Person-Verknüpfung</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {link ? (
              <>
                <Link2 className="h-4 w-4 text-primary" aria-hidden /> Verknüpft
              </>
            ) : (
              <>
                <Link2Off className="h-4 w-4 text-muted-foreground" aria-hidden /> Nicht verknüpft
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {link ? (
            <>
              <p className="text-sm">
                Verknüpft mit{' '}
                <span className="font-semibold">
                  {PERSON_TYPE_LABEL[link.personType] ?? link.personType}{' '}
                  {link.firstName} {link.lastName}
                </span>{' '}
                <a
                  href={deepLinkFor(link.personType, link.id)}
                  className="text-primary hover:underline inline-flex items-center"
                  aria-label="Zum Personen-Datensatz"
                >
                  <ArrowRight className="h-3 w-3 ml-1" aria-hidden />
                </a>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setLinkOpen(true)} className="min-h-11 sm:min-h-9">
                  Verknüpfung ändern
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setUnlinkOpen(true)}
                  className="text-destructive hover:text-destructive min-h-11 sm:min-h-9"
                >
                  Verknüpfung lösen
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Dieser User ist mit keinem Lehrer-, Schüler- oder Eltern-Record verknüpft. Ohne
                Verknüpfung sehen rollen-basierte Personen-Views keine Daten.
              </p>
              <Button onClick={() => setLinkOpen(true)} className="min-h-11 sm:min-h-9">
                Mit Person verknüpfen
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <LinkPersonDialog
        open={linkOpen}
        userId={user.id}
        changeMode={!!link}
        onClose={() => setLinkOpen(false)}
        onConflict={(problem, attempted) => {
          setConflictProblem(problem);
          setConflictAttempt(attempted);
        }}
      />

      {link && (
        <UnlinkPersonDialog
          open={unlinkOpen}
          user={user}
          onClose={() => setUnlinkOpen(false)}
        />
      )}

      <ReLinkConflictDialog
        open={!!conflictProblem}
        problem={conflictProblem}
        userId={user.id}
        attempt={conflictAttempt}
        onClose={() => {
          setConflictProblem(null);
          setConflictAttempt(null);
        }}
      />
    </section>
  );
}
