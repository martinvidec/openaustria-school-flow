import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnsavedChangesDialog } from '@/components/admin/shared/UnsavedChangesDialog';
import type { ClassDetailDto } from '@/hooks/useClasses';
import { ClassStammdatenTab } from './ClassStammdatenTab';
import { StundentafelTab } from './StundentafelTab';
import { ClassStudentsTab } from './ClassStudentsTab';
import { ClassGroupsTab } from './ClassGroupsTab';

type TabValue = 'stammdaten' | 'stundentafel' | 'students' | 'groups';

interface Props {
  schoolId: string;
  cls: ClassDetailDto;
  tab: TabValue;
  onTabChange: (t: TabValue) => void;
}

export function ClassDetailTabs({ schoolId, cls, tab, onTabChange }: Props) {
  const [stammdatenDirty, setStammdatenDirty] = useState(false);
  const [stundentafelDirty, setStundentafelDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabValue | null>(null);

  const currentDirty =
    (tab === 'stammdaten' && stammdatenDirty) ||
    (tab === 'stundentafel' && stundentafelDirty);

  const handleTabChange = (next: string) => {
    const nextTab = next as TabValue;
    if (currentDirty) {
      setPendingTab(nextTab);
      return;
    }
    onTabChange(nextTab);
  };

  return (
    <>
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="stundentafel">Stundentafel</TabsTrigger>
          <TabsTrigger value="students">Schüler:innen</TabsTrigger>
          <TabsTrigger value="groups">Gruppen</TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten" className="mt-4">
          <ClassStammdatenTab
            schoolId={schoolId}
            cls={cls}
            onDirtyChange={setStammdatenDirty}
          />
        </TabsContent>

        <TabsContent value="stundentafel" className="mt-4">
          <StundentafelTab
            schoolId={schoolId}
            cls={cls}
            onDirtyChange={setStundentafelDirty}
          />
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <ClassStudentsTab schoolId={schoolId} classId={cls.id} className={cls.name} />
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <ClassGroupsTab schoolId={schoolId} classId={cls.id} cls={cls} />
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={!!pendingTab}
        onDiscard={() => {
          if (pendingTab) onTabChange(pendingTab);
          setPendingTab(null);
          setStammdatenDirty(false);
          setStundentafelDirty(false);
        }}
        onCancel={() => setPendingTab(null)}
        onSaveAndContinue={() => {
          // Save currently orchestrated by the tab's own Save button; prompt user to save there first.
          setPendingTab(null);
        }}
      />
    </>
  );
}
