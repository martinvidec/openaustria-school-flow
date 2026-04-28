import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ConsentsTab } from './ConsentsTab';
import { DsfaTable } from './DsfaTable';
import { JobsTab } from './JobsTab';
import { RetentionTab } from './RetentionTab';
import { VvzTable } from './VvzTable';

/**
 * Phase 15-05 foundation: 4-tab shell for /admin/dsgvo. All four tabs are
 * now LIVE — the previous PlaceholderPanel + `data-dsgvo-tab-placeholder`
 * marker has been removed.
 *
 * Owns:
 *  - Tab state (URL-synced via Route search-params per D-04 + D-26)
 *  - Sub-tab state for DSFA/VVZ
 *  - Mobile fallback (ToggleGroup below md)
 *
 * Wiring history:
 *  - Tab "Einwilligungen" / "Aufbewahrung" → plan 15-06 (ConsentsTab + RetentionTab)
 *  - Tab "DSFA & VVZ" → plan 15-07 (DsfaTable + VvzTable inline sub-tabs)
 *  - Tab "Jobs" → plan 15-08 (JobsTab)
 */

export type DsgvoTabValue = 'consents' | 'retention' | 'dsfa-vvz' | 'jobs';
export type DsfaVvzSubValue = 'dsfa' | 'vvz';

interface Props {
  schoolId: string;
  initialTab?: DsgvoTabValue;
  initialSub?: DsfaVvzSubValue;
}

const DEFAULT_TAB: DsgvoTabValue = 'consents';
const DEFAULT_SUB: DsfaVvzSubValue = 'dsfa';

export function DsgvoTabs({ schoolId, initialTab, initialSub }: Props) {
  const navigate = useNavigate();
  const active: DsgvoTabValue = initialTab ?? DEFAULT_TAB;
  const sub: DsfaVvzSubValue = initialSub ?? DEFAULT_SUB;

  const setTab = useCallback(
    (next: DsgvoTabValue) => {
      if (next === active) return;
      navigate({
        to: '/admin/dsgvo',
        search: (prev) => ({
          ...prev,
          tab: next,
          ...(next !== 'dsfa-vvz' ? { sub: undefined } : {}),
        }),
      });
    },
    [active, navigate],
  );

  const setSub = useCallback(
    (next: DsfaVvzSubValue) => {
      if (next === sub) return;
      navigate({
        to: '/admin/dsgvo',
        search: (prev) => ({ ...prev, tab: 'dsfa-vvz', sub: next }),
      });
    },
    [sub, navigate],
  );

  return (
    <div className="space-y-6">
      {/* Mobile: ToggleGroup */}
      <div className="md:hidden">
        <ToggleGroup
          type="single"
          value={active}
          onValueChange={(v) => v && setTab(v as DsgvoTabValue)}
          className="w-full"
        >
          <ToggleGroupItem value="consents">Einwilligungen</ToggleGroupItem>
          <ToggleGroupItem value="retention">Aufbewahrung</ToggleGroupItem>
          <ToggleGroupItem value="dsfa-vvz">DSFA &amp; VVZ</ToggleGroupItem>
          <ToggleGroupItem value="jobs">Jobs</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Desktop: Tabs */}
      <Tabs
        value={active}
        onValueChange={(v) => setTab(v as DsgvoTabValue)}
        className="hidden md:block"
      >
        <TabsList>
          <TabsTrigger value="consents">Einwilligungen</TabsTrigger>
          <TabsTrigger value="retention">Aufbewahrung</TabsTrigger>
          <TabsTrigger value="dsfa-vvz">DSFA &amp; VVZ</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="consents" className="pt-6">
          <ConsentsTab schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="retention" className="pt-6">
          <RetentionTab schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="dsfa-vvz" className="pt-6">
          <Tabs
            value={sub}
            onValueChange={(v) => setSub(v as DsfaVvzSubValue)}
          >
            <TabsList>
              <TabsTrigger value="dsfa">DSFA</TabsTrigger>
              <TabsTrigger value="vvz">VVZ</TabsTrigger>
            </TabsList>
            <TabsContent value="dsfa" className="pt-4">
              <DsfaTable schoolId={schoolId} />
            </TabsContent>
            <TabsContent value="vvz" className="pt-4">
              <VvzTable schoolId={schoolId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="jobs" className="pt-6">
          <JobsTab schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
