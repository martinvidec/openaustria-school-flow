import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * Phase 15-05 foundation: 4-tab shell for /admin/dsgvo.
 *
 * Owns:
 *  - Tab state (URL-synced via Route search-params per D-04 + D-26)
 *  - Sub-tab state for DSFA/VVZ
 *  - Mobile fallback (ToggleGroup below md)
 *
 * Each tab body is a placeholder. Wiring lands in:
 *  - Tab "Einwilligungen" / "Aufbewahrung" → plan 15-06
 *  - Tab "DSFA & VVZ" → plan 15-07
 *  - Tab "Jobs" → plan 15-08
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
          <PlaceholderPanel plan="15-06" title="Einwilligungen" schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="retention" className="pt-6">
          <PlaceholderPanel plan="15-06" title="Aufbewahrung" schoolId={schoolId} />
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
              <PlaceholderPanel plan="15-07" title="DSFA" schoolId={schoolId} />
            </TabsContent>
            <TabsContent value="vvz" className="pt-4">
              <PlaceholderPanel plan="15-07" title="VVZ" schoolId={schoolId} />
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="jobs" className="pt-6">
          <PlaceholderPanel plan="15-08" title="Jobs" schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaceholderPanel({
  plan,
  title,
  schoolId,
}: {
  plan: string;
  title: string;
  schoolId: string;
}) {
  return (
    <div
      data-dsgvo-tab-placeholder={plan}
      className="rounded-md border border-dashed p-8 text-sm text-muted-foreground"
    >
      <p className="font-semibold text-foreground">{title}</p>
      <p>
        Wird in Plan {plan} ausgeliefert (schoolId: {schoolId.slice(0, 8)}…).
      </p>
    </div>
  );
}
