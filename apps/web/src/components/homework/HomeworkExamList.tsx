import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useHomework, useDeleteHomework } from '@/hooks/useHomework';
import { useExams, useDeleteExam } from '@/hooks/useExams';
import { HomeworkDialog } from './HomeworkDialog';
import { ExamDialog } from './ExamDialog';
import type { HomeworkDto, ExamDto } from '@schoolflow/shared';

interface HomeworkExamListProps {
  schoolId: string;
  classId?: string;
  classSubjectId?: string;
  role: string;
}

/**
 * Tabbed list of homework and exams for a class/subject.
 *
 * Per UI-SPEC HW-01, HW-02, HW-03:
 * - Tabs: "Hausaufgaben" / "Pruefungen"
 * - Each item: title, subject, date, action dropdown (teacher/admin: edit/delete)
 * - Empty states per tab with UI-SPEC copywriting
 * - Read-only for students/parents (no dropdown actions)
 */
export function HomeworkExamList({
  schoolId,
  classId,
  classSubjectId,
  role,
}: HomeworkExamListProps) {
  const { data: homework = [] } = useHomework(schoolId, classSubjectId);
  const { data: exams = [] } = useExams(schoolId, classId);
  const deleteHomework = useDeleteHomework(schoolId);
  const deleteExam = useDeleteExam(schoolId);

  const [editingHomework, setEditingHomework] = useState<HomeworkDto | null>(null);
  const [editingExam, setEditingExam] = useState<ExamDto | null>(null);

  const canEdit = ['lehrer', 'admin', 'schulleitung'].includes(role);

  return (
    <>
      <Tabs defaultValue="hausaufgaben">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="hausaufgaben" className="min-w-[44px]">
            Hausaufgaben
          </TabsTrigger>
          <TabsTrigger value="pruefungen" className="min-w-[44px]">
            Pruefungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hausaufgaben" className="mt-4">
          {homework.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-semibold">Keine Hausaufgaben</p>
              <p className="text-xs mt-1">
                Fuer diese Stunde wurden noch keine Hausaufgaben eingetragen.
                {canEdit &&
                  " Klicken Sie auf 'Hausaufgabe erstellen', um eine zuzuweisen."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {homework.map((hw) => (
                <HomeworkListItem
                  key={hw.id}
                  homework={hw}
                  canEdit={canEdit}
                  onEdit={() => setEditingHomework(hw)}
                  onDelete={() => deleteHomework.mutate(hw.id)}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="pruefungen" className="mt-4">
          {exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-semibold">Keine Pruefungen geplant</p>
              <p className="text-xs mt-1">
                Es sind keine Pruefungen fuer diesen Zeitraum eingetragen.
                {canEdit &&
                  " Klicken Sie auf 'Pruefung eintragen', um einen Termin zu planen."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {exams.map((exam) => (
                <ExamListItem
                  key={exam.id}
                  exam={exam}
                  canEdit={canEdit}
                  onEdit={() => setEditingExam(exam)}
                  onDelete={() => deleteExam.mutate(exam.id)}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit dialogs */}
      {editingHomework && (
        <HomeworkDialog
          open={!!editingHomework}
          mode="edit"
          schoolId={schoolId}
          classSubjectId={editingHomework.classSubjectId}
          homework={editingHomework}
          onClose={() => setEditingHomework(null)}
        />
      )}
      {editingExam && (
        <ExamDialog
          open={!!editingExam}
          mode="edit"
          schoolId={schoolId}
          classId={editingExam.classId}
          classSubjectId={editingExam.classSubjectId}
          exam={editingExam}
          onClose={() => setEditingExam(null)}
        />
      )}
    </>
  );
}

/** Single homework list item with optional action dropdown */
function HomeworkListItem({
  homework,
  canEdit,
  onEdit,
  onDelete,
}: {
  homework: HomeworkDto;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dueDate = new Date(homework.dueDate).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <li className="flex items-center justify-between rounded-md border p-2 sm:p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-[1.4] truncate">
          {homework.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {homework.subjectName && <span>{homework.subjectName}</span>}
          <span>Faellig: {dueDate}</span>
        </div>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1 rounded hover:bg-muted"
              aria-label="Aktionen"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

/** Single exam list item with optional action dropdown */
function ExamListItem({
  exam,
  canEdit,
  onEdit,
  onDelete,
}: {
  exam: ExamDto;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const examDate = new Date(exam.date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <li className="flex items-center justify-between rounded-md border p-2 sm:p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-[1.4] truncate">
          {exam.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {exam.subjectName && <span>{exam.subjectName}</span>}
          <span>{examDate}</span>
          {exam.duration && <span>{exam.duration} Min.</span>}
        </div>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1 rounded hover:bg-muted"
              aria-label="Aktionen"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Loeschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
