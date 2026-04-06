import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useOfferedSubstitutions } from '@/hooks/useOfferedSubstitutions';
import { useMyAbsenceSubstitutions } from '@/hooks/useMyAbsenceSubstitutions';
import { SubstituteOfferCard } from '@/components/substitution/SubstituteOfferCard';
import { HandoverNoteEditor } from '@/components/substitution/HandoverNoteEditor';
import { useSchoolContext } from '@/stores/school-context-store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/teacher/substitutions')({
  component: TeacherSubstitutionsPage,
});

function TeacherSubstitutionsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId);
  const teacherId = useSchoolContext((s) => s.teacherId);

  const {
    data: offered = [],
    isLoading: offeredLoading,
  } = useOfferedSubstitutions(schoolId, teacherId);

  const {
    data: myAbsences = [],
    isLoading: absencesLoading,
  } = useMyAbsenceSubstitutions(schoolId);

  const [editorSubId, setEditorSubId] = useState<string | null>(null);

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-8">
      {/* Section 1: Offered substitutions (Accept/Decline) */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Meine Vertretungen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Offene Anfragen</p>
        </div>

        {offeredLoading && (
          <p className="text-sm text-muted-foreground">Wird geladen...</p>
        )}

        {!offeredLoading && offered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Keine offenen Vertretungsanfragen.
          </p>
        )}

        {schoolId &&
          offered.map((s) => (
            <SubstituteOfferCard
              key={s.id}
              schoolId={schoolId}
              substitution={s}
            />
          ))}
      </div>

      {/* Section 2: My absences — write handover notes */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Meine Abwesenheiten</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Uebergabenotizen fuer Ihre Vertretungen
          </p>
        </div>

        {absencesLoading && (
          <p className="text-sm text-muted-foreground">Wird geladen...</p>
        )}

        {!absencesLoading && myAbsences.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Keine aktiven Abwesenheiten.
          </p>
        )}

        {myAbsences.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">
                    {new Date(s.date).toLocaleDateString('de-AT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    , {s.periodNumber}. Stunde
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.subjectAbbreviation} · {s.className}
                  </span>
                  <Badge variant="outline">{s.status}</Badge>
                </div>
                {s.substituteTeacherName && (
                  <p className="text-sm text-muted-foreground">
                    Vertretung: {s.substituteTeacherName}
                  </p>
                )}
              </div>
              <Button
                variant={(s as any).hasHandoverNote ? 'outline' : 'default'}
                size="sm"
                onClick={() => setEditorSubId(s.id)}
              >
                {(s as any).hasHandoverNote
                  ? 'Notiz bearbeiten'
                  : 'Uebergabenotiz'}
              </Button>
            </div>
          </Card>
        ))}

        <HandoverNoteEditor
          substitutionId={editorSubId ?? ''}
          existingNote={null}
          open={!!editorSubId}
          onOpenChange={(open) => {
            if (!open) setEditorSubId(null);
          }}
        />
      </div>
    </div>
  );
}
