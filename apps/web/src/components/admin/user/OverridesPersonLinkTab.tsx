// Phase 13-02 — Overrides & Verknüpfung Tab placeholder. Replaced in Task 3.
import type { UserDirectoryDetail } from '@/features/users/types';

interface Props {
  user: UserDirectoryDetail;
  onDirtyChange?: (dirty: boolean) => void;
}
export function OverridesPersonLinkTab({ user: _user, onDirtyChange: _onDirtyChange }: Props) {
  void _user;
  void _onDirtyChange;
  return (
    <div className="text-sm text-muted-foreground">
      Tab wird in Plan 13-02 Task 3 implementiert
    </div>
  );
}
