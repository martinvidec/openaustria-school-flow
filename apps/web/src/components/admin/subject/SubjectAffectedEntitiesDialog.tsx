import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AffectedEntitiesList,
  type SubjectAffectedEntities,
} from '@/components/admin/teacher/AffectedEntitiesList';
import { useSubject } from '@/hooks/useSubjects';

/**
 * SubjectAffectedEntitiesDialog — UI-SPEC §4.4 (informational variant of
 * the Orphan-Guard dialog). Triggered from the Nutzung column click in
 * SubjectTable / Mobile Cards. Non-destructive: Info icon, neutral
 * framing, single Schließen footer.
 *
 * For Phase 11 the payload is reconstructed from `useSubject(id)` —
 * which returns `classSubjects` + `teacherSubjects` via the existing
 * findOne include — so no new API endpoint is needed. lessonCount /
 * homeworkCount / examCount are NOT available here (they would require
 * a dedicated /subjects/:id/affected-entities endpoint); we render
 * scalar zero for those, which is acceptable for an informational
 * preview (the destructive Delete dialog still surfaces them on 409).
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
}

export function SubjectAffectedEntitiesDialog({
  open,
  onOpenChange,
  subjectId,
  subjectName,
}: Props) {
  const { data: subject, isLoading } = useSubject(open ? subjectId : undefined);

  // Build the affected-entities payload from the findOne include.
  const classSubjects = subject?.classSubjects ?? [];
  const teacherSubjects = subject?.teacherSubjects ?? [];

  // Distinct classes (a subject can be in multiple ClassSubject rows for
  // the same class via groups) — capped to 50 to mirror the 409 contract.
  const uniqueClassMap = new Map<string, { id: string; name: string }>();
  for (const cs of classSubjects) {
    if (cs.schoolClass && !uniqueClassMap.has(cs.schoolClass.id)) {
      uniqueClassMap.set(cs.schoolClass.id, cs.schoolClass);
    }
  }
  const affectedClasses = Array.from(uniqueClassMap.values()).slice(0, 50);

  // Teacher detail rows — for the informational preview we only have
  // `teacherId` from the include. Without a teacher.person fetch, we
  // can't render names; show count-only when possible. Phase 11 ships
  // the deep-linkable affectedTeachers in the destructive 409 path.
  const affectedTeachers: Array<{ id: string; name: string }> = teacherSubjects
    .slice(0, 50)
    .map((ts) => ({ id: ts.teacherId, name: ts.teacherId.slice(0, 8) }));

  const totalCount = affectedClasses.length + affectedTeachers.length;

  const entities: SubjectAffectedEntities = {
    affectedClasses,
    affectedTeachers,
    lessonCount: 0,
    homeworkCount: 0,
    examCount: 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Info className="h-6 w-6 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <DialogTitle>Zuordnungen zu "{subjectName}"</DialogTitle>
              <DialogDescription asChild>
                <div>
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Lade…</p>
                  ) : (
                    <>
                      <p className="mb-3">
                        "{subjectName}" ist mit {totalCount} Einträgen
                        verknüpft.
                      </p>
                      {totalCount > 0 ? (
                        <AffectedEntitiesList kind="subject" entities={entities} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Keine Zuordnungen vorhanden.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
