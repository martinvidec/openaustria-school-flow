import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import { useSetUserEnabled } from '@/features/users/hooks/use-set-user-enabled';
import type { UserDirectorySummary } from '@/features/users/types';

/**
 * Phase 13-02 — confirm before disabling a Keycloak user.
 * Copy verbatim per UI-SPEC §234.
 */

interface Props {
  open: boolean;
  user: UserDirectorySummary;
  onClose: () => void;
}

export function DisableUserDialog({ open, user, onClose }: Props) {
  const mutation = useSetUserEnabled(user.id);
  return (
    <WarnDialog
      open={open}
      onClose={onClose}
      title="User sperren?"
      description={
        <div className="space-y-2">
          <p>
            {user.firstName} {user.lastName} ({user.email}) wird deaktiviert und kann sich nicht
            mehr einloggen. Bestehende Sessions bleiben bis zum Ablauf (max. 15 Minuten) aktiv.
            Reaktivierung jederzeit möglich.
          </p>
        </div>
      }
      actions={[
        {
          label: 'Abbrechen',
          variant: 'ghost',
          onClick: onClose,
          autoFocus: true,
        },
        {
          label: mutation.isPending ? 'Wird gesperrt …' : 'Sperren',
          variant: 'destructive',
          onClick: () => {
            mutation.mutate(
              { enabled: false },
              {
                onSuccess: () => onClose(),
              },
            );
          },
        },
      ]}
    />
  );
}
