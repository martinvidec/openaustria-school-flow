import { Separator } from '@/components/ui/separator';
import { OverridesSection } from './OverridesSection';
import { PersonLinkSection } from './PersonLinkSection';
import type { UserDirectoryDetail } from '@/features/users/types';

/**
 * Phase 13-02 D-15 — Merged Tab 4: Overrides & Verknüpfung.
 *
 * UI-SPEC §471-482: top half = OverridesSection (per-user ACL overrides);
 * bottom half = PersonLinkSection (Teacher/Student/Parent person link).
 * Sections separated by `Separator`. Both sections full-width on mobile;
 * `+ Override hinzufügen` becomes full-width inside OverridesSection.
 */

interface Props {
  user: UserDirectoryDetail;
  onDirtyChange?: (dirty: boolean) => void;
}

export function OverridesPersonLinkTab({ user, onDirtyChange }: Props) {
  return (
    <div className="space-y-6">
      <OverridesSection userId={user.id} onDirtyChange={onDirtyChange} />
      <Separator />
      <PersonLinkSection user={user} />
    </div>
  );
}
