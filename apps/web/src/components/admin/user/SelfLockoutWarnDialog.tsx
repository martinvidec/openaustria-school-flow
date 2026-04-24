import { WarnDialog } from '@/components/admin/shared/WarnDialog';

/**
 * Phase 13-02 D-06 — Self-Lockout-Warn.
 *
 * Fires when the currently-logged-in admin un-ticks their own admin role.
 * The backend's last-admin-guard is authoritative; this dialog is a UX
 * pre-flight that forces an explicit "I really mean it" confirmation.
 *
 * Copy verbatim per UI-SPEC §230.
 */

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SelfLockoutWarnDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <WarnDialog
      open={open}
      onClose={onCancel}
      title="Sich selbst die Admin-Rolle entziehen?"
      description={
        <p>
          Du entziehst dir gerade die Admin-Rolle. Nach Speichern hast du beim nächsten Request
          andere Rechte. Stelle sicher, dass mindestens ein weiterer Admin existiert — andernfalls
          blockiert der Server diese Änderung zum Schutz des Systems.
        </p>
      }
      actions={[
        {
          label: 'Abbrechen',
          variant: 'ghost',
          onClick: onCancel,
          autoFocus: true,
        },
        {
          label: 'Admin-Rolle entziehen',
          variant: 'destructive',
          onClick: onConfirm,
        },
      ]}
    />
  );
}
