import { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

/**
 * STUB — fleshed out in Tasks 2 & 3.
 *
 * Renders the 4-tab shell (Constraints / Gewichtungen / Klassen-Sperrzeiten /
 * Fach-Präferenzen) so the route loads end-to-end before tab content lands.
 *
 * The dirty-state interception (UnsavedChangesDialog when leaving Tab 2 with
 * unsaved weights) is wired in Task 2 once `ConstraintWeightsTab` exposes
 * `onDirtyChange`.
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

export function SolverTuningTabs({ schoolId: _schoolId, initialTab }: Props) {
  const safeInitial: SolverTuningTabValue =
    initialTab === 'weights' ||
    initialTab === 'restrictions' ||
    initialTab === 'preferences'
      ? initialTab
      : 'constraints';
  const [active, setActive] = useState<SolverTuningTabValue>(safeInitial);

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as SolverTuningTabValue)}
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
      <TabsContent value="constraints">
        <div className="py-6 text-sm text-muted-foreground">TODO Task 2 — Constraint-Catalog</div>
      </TabsContent>
      <TabsContent value="weights">
        <div className="py-6 text-sm text-muted-foreground">TODO Task 2 — Gewichtungen</div>
      </TabsContent>
      <TabsContent value="restrictions">
        <div className="py-6 text-sm text-muted-foreground">TODO Task 3 — Klassen-Sperrzeiten</div>
      </TabsContent>
      <TabsContent value="preferences">
        <div className="py-6 text-sm text-muted-foreground">TODO Task 3 — Fach-Präferenzen</div>
      </TabsContent>
    </Tabs>
  );
}
