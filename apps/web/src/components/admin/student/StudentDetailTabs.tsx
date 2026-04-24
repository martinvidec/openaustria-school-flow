import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnsavedChangesDialog } from '@/components/admin/shared/UnsavedChangesDialog';
import { StudentStammdatenTab, type StudentStammdatenFormValues } from './StudentStammdatenTab';
import { StudentParentsTab } from './StudentParentsTab';
import { StudentGroupsTab } from './StudentGroupsTab';
import { useUpdateStudent, type StudentDto } from '@/hooks/useStudents';

export type StudentDetailTab = 'stammdaten' | 'parents' | 'groups';

const TAB_LABELS: Record<StudentDetailTab, string> = {
  stammdaten: 'Stammdaten',
  parents: 'Erziehungsberechtigte',
  groups: 'Gruppen',
};

interface Props {
  student: StudentDto;
  schoolId: string;
  classes?: Array<{ id: string; name: string }>;
  activeTab: StudentDetailTab;
  onTabChange: (tab: StudentDetailTab) => void;
}

export function StudentDetailTabs({
  student,
  schoolId,
  classes,
  activeTab,
  onTabChange,
}: Props) {
  const updateMutation = useUpdateStudent(schoolId, student.id);

  const [stammdatenDirty, setStammdatenDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<StudentDetailTab | null>(null);

  const handleTabChange = (v: string) => {
    const next = v as StudentDetailTab;
    if (stammdatenDirty && activeTab === 'stammdaten' && next !== 'stammdaten') {
      setPendingTab(next);
      return;
    }
    onTabChange(next);
  };

  const handleDiscard = () => {
    if (!pendingTab) return;
    setStammdatenDirty(false);
    onTabChange(pendingTab);
    setPendingTab(null);
  };

  const handleCancel = () => {
    setPendingTab(null);
  };

  const handleSaveAndContinue = async () => {
    // Stammdaten tab owns its own submit; we can't directly trigger it here —
    // simplest: cancel dialog, user saves via StickyMobileSaveBar or desktop save button.
    setPendingTab(null);
  };

  const handleStammdatenSave = async (values: StudentStammdatenFormValues) => {
    await updateMutation.mutateAsync(values);
    setStammdatenDirty(false);
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="hidden md:flex">
          {(Object.keys(TAB_LABELS) as StudentDetailTab[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="md:hidden mb-3">
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAB_LABELS) as StudentDetailTab[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TAB_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="stammdaten" className="pt-4">
          <StudentStammdatenTab
            student={student}
            classes={classes}
            onSave={handleStammdatenSave}
            onDirtyChange={setStammdatenDirty}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="parents" className="pt-4">
          <StudentParentsTab student={student} schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="groups" className="pt-4">
          <StudentGroupsTab student={student} />
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={!!pendingTab}
        isSaving={updateMutation.isPending}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
        onSaveAndContinue={handleSaveAndContinue}
      />
    </div>
  );
}
