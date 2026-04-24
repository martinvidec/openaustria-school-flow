import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useSetUserEnabled } from '@/features/users/hooks/use-set-user-enabled';
import type { UserDirectorySummary } from '@/features/users/types';

/**
 * Phase 13-02 — confirm before reactivating a disabled Keycloak user.
 * Copy verbatim per UI-SPEC §235.
 */

interface Props {
  open: boolean;
  user: UserDirectorySummary;
  onClose: () => void;
}

export function EnableUserDialog({ open, user, onClose }: Props) {
  const mutation = useSetUserEnabled(user.id);
  return (
    <WarnDialog
      open={open}
      onClose={onClose}
      title="User reaktivieren?"
      description={
        <p>
          {user.firstName} {user.lastName} ({user.email}) kann sich wieder einloggen.
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
          label: mutation.isPending ? 'Wird reaktiviert …' : 'Reaktivieren',
          variant: 'default',
          onClick: () => {
            mutation.mutate(
              { enabled: true },
              { onSuccess: () => onClose() },
            );
          },
        },
      ]}
    />
  );
}
