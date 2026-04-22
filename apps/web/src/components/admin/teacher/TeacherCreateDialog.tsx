import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StammdatenTab } from './StammdatenTab';
import { useCreateTeacher } from '@/hooks/useTeachers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

export function TeacherCreateDialog({ open, onOpenChange, schoolId }: Props) {
  const createMutation = useCreateTeacher(schoolId);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }) => {
    setIsSaving(true);
    try {
      const created = await createMutation.mutateAsync({
        schoolId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
      });
      onOpenChange(false);
      if (created?.id) {
        navigate({
          to: '/admin/teachers/$teacherId',
          params: { teacherId: created.id },
          search: { tab: 'stammdaten' },
        });
      }
    } catch {
      // toast fired inside the mutation hook's onError
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lehrperson anlegen</DialogTitle>
          <DialogDescription>
            Stammdaten werden später im Detail-Tab ergänzt (Werteinheiten, Verfügbarkeit, …).
          </DialogDescription>
        </DialogHeader>
        <StammdatenTab onSave={handleSave} submitLabel="Lehrperson anlegen" isSaving={isSaving} />
      </DialogContent>
    </Dialog>
  );
}
