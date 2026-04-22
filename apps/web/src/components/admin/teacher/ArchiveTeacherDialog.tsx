import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useUpdateTeacher } from '@/hooks/useTeachers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  teacherId: string;
  teacherName: string;
}

export function ArchiveTeacherDialog({ open, onOpenChange, schoolId, teacherId, teacherName }: Props) {
  const updateMutation = useUpdateTeacher(schoolId, teacherId);

  const handleArchive = async () => {
    // Status is a UI-level concept (see teacher.schema.ts) — until we add a
    // real archive column, archive = set employmentPercentage to 0 as a
    // pragmatic stand-in so the teacher is not considered for solver passes.
    await updateMutation.mutateAsync({ employmentPercentage: 0 });
    onOpenChange(false);
  };

  return (
    <WarnDialog
      open={open}
      title="Lehrperson archivieren?"
      description={
        <span>
          <strong>{teacherName}</strong> wird archiviert und wird für zukünftige
          Stundenplan-Läufe nicht mehr berücksichtigt. Die Daten bleiben erhalten und die
          Lehrperson kann jederzeit reaktiviert werden.
        </span>
      }
      actions={[
        { label: 'Abbrechen', variant: 'ghost', onClick: () => onOpenChange(false) },
        { label: 'Archivieren', onClick: handleArchive },
      ]}
      onClose={() => onOpenChange(false)}
    />
  );
}
