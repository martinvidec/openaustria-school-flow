import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UnsavedChangesDialog } from '@/components/admin/shared/UnsavedChangesDialog';
import { UserStammdatenTab } from './UserStammdatenTab';
import { UserRolesTab } from './UserRolesTab';
import { EffectivePermissionsTab } from './EffectivePermissionsTab';
import { OverridesPersonLinkTab } from './OverridesPersonLinkTab';
import type { UserDirectoryDetail } from '@/features/users/types';

/**
 * Phase 13-02 — User-Detail 4-tab container.
 *
 * Tabs (UI-SPEC §271-274):
 *   1. Stammdaten
 *   2. Rollen
 *   3. Berechtigungen
 *   4. Overrides & Verknüpfung
 *
 * Per-tab dirty-state intercepts tab-switch with `UnsavedChangesDialog`.
 * Only Tab 2 (Rollen) and Tab 4 (Overrides & Verknüpfung) own dirty
 * state; Tab 1 (Stammdaten) uses optimistic mutation; Tab 3 is read-only.
 */

export type UserDetailTab = 'stammdaten' | 'rollen' | 'berechtigungen' | 'overrides';

const TAB_LABELS: Record<UserDetailTab, string> = {
  stammdaten: 'Stammdaten',
  rollen: 'Rollen',
  berechtigungen: 'Berechtigungen',
  overrides: 'Overrides & Verknüpfung',
};

interface Props {
  user: UserDirectoryDetail;
  currentUserId: string;
  activeTab: UserDetailTab;
  onTabChange: (tab: UserDetailTab) => void;
}

export function UserDetailTabs({ user, currentUserId, activeTab, onTabChange }: Props) {
  const [rolesDirty, setRolesDirty] = useState(false);
  const [overridesDirty, setOverridesDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<UserDetailTab | null>(null);

  const requestTabChange = (next: string) => {
    const target = next as UserDetailTab;
    const currentDirty =
      (activeTab === 'rollen' && rolesDirty) ||
      (activeTab === 'overrides' && overridesDirty);
    if (currentDirty) {
      setPendingTab(target);
      return;
    }
    onTabChange(target);
  };

  const discardAndSwitch = () => {
    if (pendingTab) {
      // Reset dirty for the leaving tab; child components own state and
      // will re-derive from server data on remount.
      if (activeTab === 'rollen') setRolesDirty(false);
      if (activeTab === 'overrides') setOverridesDirty(false);
      onTabChange(pendingTab);
      setPendingTab(null);
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={requestTabChange}>
        <TabsList className="hidden md:flex">
          {(Object.keys(TAB_LABELS) as UserDetailTab[]).map((t) => (
            <TabsTrigger key={t} value={t} className="min-h-9">
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mobile select replacing horizontal-scroll tabs row */}
        <div className="md:hidden mb-3">
          <Select value={activeTab} onValueChange={requestTabChange}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAB_LABELS) as UserDetailTab[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TAB_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="stammdaten" className="pt-4">
          <UserStammdatenTab user={user} />
        </TabsContent>

        <TabsContent value="rollen" className="pt-4">
          <UserRolesTab
            user={user}
            currentUserId={currentUserId}
            onDirtyChange={setRolesDirty}
          />
        </TabsContent>

        <TabsContent value="berechtigungen" className="pt-4">
          <EffectivePermissionsTab userId={user.id} />
        </TabsContent>

        <TabsContent value="overrides" className="pt-4">
          <OverridesPersonLinkTab user={user} onDirtyChange={setOverridesDirty} />
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={pendingTab !== null}
        onCancel={() => setPendingTab(null)}
        onDiscard={discardAndSwitch}
        onSaveAndContinue={discardAndSwitch}
      />
    </div>
  );
}
