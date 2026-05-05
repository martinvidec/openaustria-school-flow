import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DayWeekToggleProps {
  value: 'day' | 'week';
  onChange: (mode: 'day' | 'week') => void;
}

/**
 * Toggle between day view ("Tag") and week view ("Woche").
 * Uses shadcn Tabs component with 44px minimum touch target on mobile.
 * Per UI-SPEC D-03.
 */
export function DayWeekToggle({ value, onChange }: DayWeekToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as 'day' | 'week')}
    >
      <TabsList className="min-h-[44px]">
        <TabsTrigger value="day" className="min-w-[60px]">
          Tag
        </TabsTrigger>
        <TabsTrigger value="week" className="min-w-[60px]">
          Woche
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
