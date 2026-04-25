import { useCallback, useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { UnsavedChangesDialog } from '@/components/admin/shared/UnsavedChangesDialog';
import { ConstraintCatalogTab } from './ConstraintCatalogTab';
import { ConstraintWeightsTab } from './ConstraintWeightsTab';
import { ClassRestrictionsTab } from './ClassRestrictionsTab';
import { SubjectPreferencesTab } from './SubjectPreferencesTab';

/**
 * Phase 14-02: 4-tab container for /admin/solver-tuning.
 *
 * Owns tab navigation + dirty-state interception:
 *  - Tab 2 ("Gewichtungen") is the only dirty-tracking tab. When the user
 *    tries to leave with unsaved weights, an UnsavedChangesDialog opens.
 *    Confirm "Verwerfen" → switch tab; Cancel → stay.
 *  - Tab 1 ("Constraints") deep-link "Gewichtung bearbeiten" switches to
 *    Tab 2 and passes the constraintName to scroll-into-view + flash.
 *
 * Tabs 3+4 are wired in Task 3.
 */

export type SolverTuningTabValue =
  | 'constraints'
  | 'weights'
  | 'restrictions'
  | 'preferences';

interface Props {
  schoolId: string;
  initialTab?: string;
}

export function SolverTuningTabs({ schoolId, initialTab }: Props) {
  const safeInitial: SolverTuningTabValue =
    initialTab === 'weights' ||
    initialTab === 'restrictions' ||
    initialTab === 'preferences'
      ? initialTab
      : 'constraints';
  const [active, setActive] = useState<SolverTuningTabValue>(safeInitial);
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<SolverTuningTabValue | null>(null);
  const [pendingFocusName, setPendingFocusName] = useState<string | null>(null);
  const [discardSignal, setDiscardSignal] = useState(0);

  const requestTab = useCallback(
    (next: SolverTuningTabValue) => {
      if (active === next) return;
      if (active === 'weights' && weightsDirty) {
        setPendingTab(next);
        return;
      }
      setActive(next);
    },
    [active, weightsDirty],
  );

  const handleEditWeight = useCallback((constraintName: string) => {
    setPendingFocusName(constraintName);
    setActive('weights');
  }, []);

  // Bump discardSignal so ConstraintWeightsTab can react to "discard then switch".
  const handleDiscardAndSwitch = () => {
    setDiscardSignal((s) => s + 1);
    setWeightsDirty(false);
    if (pendingTab) {
      setActive(pendingTab);
      setPendingTab(null);
    }
  };

  return (
    <>
      <Tabs
        value={active}
        onValueChange={(v) => requestTab(v as SolverTuningTabValue)}
        className="w-full"
      >
        <TabsList className="overflow-x-auto h-auto flex w-full justify-start sm:w-auto sm:inline-flex">
          <TabsTrigger value="constraints" className="min-h-11">
            Constraints
          </TabsTrigger>
          <TabsTrigger value="weights" className="min-h-11">
            Gewichtungen
          </TabsTrigger>
          <TabsTrigger value="restrictions" className="min-h-11">
            Klassen-Sperrzeiten
          </TabsTrigger>
          <TabsTrigger value="preferences" className="min-h-11">
            Fach-Präferenzen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="constraints" className="pt-4">
          <ConstraintCatalogTab
            schoolId={schoolId}
            onNavigateToWeight={handleEditWeight}
          />
        </TabsContent>

        <TabsContent value="weights" className="pt-4">
          <ConstraintWeightsTab
            key={`weights-${discardSignal}`}
            schoolId={schoolId}
            onDirtyChange={setWeightsDirty}
            focusName={pendingFocusName}
            onFocusConsumed={() => setPendingFocusName(null)}
          />
        </TabsContent>

        <TabsContent value="restrictions" className="pt-4">
          <ClassRestrictionsTab schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="preferences" className="pt-4">
          <SubjectPreferencesTab schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      <UnsavedChangesDialog
        open={pendingTab !== null}
        onCancel={() => setPendingTab(null)}
        onDiscard={handleDiscardAndSwitch}
        onSaveAndContinue={handleDiscardAndSwitch}
      />
    </>
  );
}
