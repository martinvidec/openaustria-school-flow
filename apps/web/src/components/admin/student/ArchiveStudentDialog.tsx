import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useArchiveStudent } from '@/hooks/useStudents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  studentId: string;
  studentName: string;
}

export function ArchiveStudentDialog({
  open,
  onOpenChange,
  schoolId,
  studentId,
  studentName,
}: Props) {
  const archiveMutation = useArchiveStudent(schoolId, studentId);

  const handleArchive = async () => {
    await archiveMutation.mutateAsync();
    onOpenChange(false);
  };

  return (
    <WarnDialog
      open={open}
      title="Schüler:in archivieren?"
      description={
        <span>
          <strong>{studentName}</strong> wird als archiviert markiert und scheint nicht mehr in der
          Standardliste auf. Die Daten bleiben erhalten und die Person kann jederzeit reaktiviert
          werden.
        </span>
      }
      actions={[
        { label: 'Abbrechen', variant: 'ghost', onClick: () => onOpenChange(false) },
        { label: 'Archivieren', variant: 'destructive', onClick: handleArchive },
      ]}
      onClose={() => onOpenChange(false)}
    />
  );
}
