import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StudentStammdatenTab, type StudentStammdatenFormValues } from './StudentStammdatenTab';
import { useCreateStudent } from '@/hooks/useStudents';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes?: Array<{ id: string; name: string }>;
}

export function StudentCreateDialog({ open, onOpenChange, schoolId, classes = [] }: Props) {
  const createMutation = useCreateStudent(schoolId);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (values: StudentStammdatenFormValues) => {
    setIsSaving(true);
    try {
      const created = await createMutation.mutateAsync({
        schoolId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        dateOfBirth: values.dateOfBirth,
        socialSecurityNumber: values.socialSecurityNumber,
        studentNumber: values.studentNumber,
        classId: values.classId,
        enrollmentDate: values.enrollmentDate,
      });
      onOpenChange(false);
      const studentId = (created as any)?.student?.id ?? (created as any)?.id;
      if (studentId) {
        navigate({
          to: '/admin/students/$studentId',
          params: { studentId },
          search: { tab: 'stammdaten' },
        });
      }
    } catch {
      // hook onError already fired a toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schüler:in anlegen</DialogTitle>
          <DialogDescription>
            Stammdaten werden erfasst. Erziehungsberechtigte können später auf der Detail-Seite verknüpft werden.
          </DialogDescription>
        </DialogHeader>
        <StudentStammdatenTab
          classes={classes}
          onSave={handleSave}
          submitLabel="Schüler:in anlegen"
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
