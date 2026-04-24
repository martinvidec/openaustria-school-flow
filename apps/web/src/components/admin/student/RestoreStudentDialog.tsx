import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useRestoreStudent } from '@/hooks/useStudents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  studentId: string;
  studentName: string;
}

export function RestoreStudentDialog({
  open,
  onOpenChange,
  schoolId,
  studentId,
  studentName,
}: Props) {
  const restoreMutation = useRestoreStudent(schoolId, studentId);

  const handleRestore = async () => {
    await restoreMutation.mutateAsync();
    onOpenChange(false);
  };

  return (
    <WarnDialog
      open={open}
      title="Schüler:in reaktivieren?"
      description={
        <span>
          <strong>{studentName}</strong> wird wieder als aktiv markiert und erscheint erneut in der
          Standardliste.
        </span>
      }
      actions={[
        { label: 'Abbrechen', variant: 'ghost', onClick: () => onOpenChange(false) },
        { label: 'Reaktivieren', onClick: handleRestore },
      ]}
      onClose={() => onOpenChange(false)}
    />
  );
}
