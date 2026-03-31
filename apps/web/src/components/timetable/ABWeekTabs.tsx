import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ABWeekTabsProps {
  weekType: 'A' | 'B' | 'BOTH';
  onChange: (weekType: 'A' | 'B') => void;
  isABMode: boolean;
}

/**
 * A/B week tab switcher. Only renders when the school has A/B week mode enabled.
 * Default shows current week type. Per UI-SPEC D-05.
 */
export function ABWeekTabs({ weekType, onChange, isABMode }: ABWeekTabsProps) {
  if (!isABMode) {
    return null;
  }

  // When weekType is 'BOTH', default the tab display to 'A'
  const activeTab = weekType === 'BOTH' ? 'A' : weekType;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onChange(v as 'A' | 'B')}
    >
      <TabsList className="min-h-[44px]">
        <TabsTrigger value="A" className="min-h-[40px] min-w-[80px]">
          A-Woche
        </TabsTrigger>
        <TabsTrigger value="B" className="min-h-[40px] min-w-[80px]">
          B-Woche
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
