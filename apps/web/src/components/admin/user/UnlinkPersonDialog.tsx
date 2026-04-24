import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useUnlinkPerson } from '@/features/users/hooks/use-unlink-person';
import type { UserDirectoryDetail } from '@/features/users/types';

/**
 * Phase 13-02 — Verknüpfung lösen Dialog.
 * Copy verbatim per UI-SPEC §232.
 */

const PERSON_TYPE_LABEL: Record<string, string> = {
  TEACHER: 'Lehrkraft',
  STUDENT: 'Schüler:in',
  PARENT: 'Erziehungsberechtigte:n',
};

interface Props {
  open: boolean;
  user: UserDirectoryDetail;
  onClose: () => void;
}

export function UnlinkPersonDialog({ open, user, onClose }: Props) {
  const mutation = useUnlinkPerson(user.id);
  if (!user.personLink) {
    return null;
  }
  const personTypeLabel =
    PERSON_TYPE_LABEL[user.personLink.personType] ?? user.personLink.personType;
  return (
    <WarnDialog
      open={open}
      onClose={onClose}
      title="Verknüpfung lösen?"
      description={
        <p>
          Die Verknüpfung zwischen {user.email} und {personTypeLabel} {user.personLink.firstName}{' '}
          {user.personLink.lastName} wird gelöst. Der User behält seine Rollen und Overrides, aber
          person-basierte Views (z.B. eigener Stundenplan) sehen ihn nicht mehr als{' '}
          {personTypeLabel}.
        </p>
      }
      actions={[
        {
          label: 'Abbrechen',
          variant: 'ghost',
          onClick: onClose,
          autoFocus: true,
        },
        {
          label: mutation.isPending ? 'Wird gelöst …' : 'Verknüpfung lösen',
          variant: 'destructive',
          onClick: () => {
            mutation.mutate(undefined, { onSuccess: () => onClose() });
          },
        },
      ]}
    />
  );
}
