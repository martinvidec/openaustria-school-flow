import { cn } from '@/lib/utils';

/**
 * All valid Austrian grade options in display order.
 * Decimal encoding per RESEARCH.md:
 * 1+ = 0.75, 1 = 1.0, 1- = 1.25 ... 5+ = 4.75, 5 = 5.0, 5- = 5.25
 */
const GRADE_OPTIONS: Array<{ display: string; value: number }> = [
  { display: '1+', value: 0.75 },
  { display: '1', value: 1.0 },
  { display: '1-', value: 1.25 },
  { display: '2+', value: 1.75 },
  { display: '2', value: 2.0 },
  { display: '2-', value: 2.25 },
  { display: '3+', value: 2.75 },
  { display: '3', value: 3.0 },
  { display: '3-', value: 3.25 },
  { display: '4+', value: 3.75 },
  { display: '4', value: 4.0 },
  { display: '4-', value: 4.25 },
  { display: '5+', value: 4.75 },
  { display: '5', value: 5.0 },
  { display: '5-', value: 5.25 },
];

/** Returns the background tint class for a given grade value per UI-SPEC grade color scale. */
function getGradeColorClass(value: number): string {
  const base = Math.ceil(value);
  switch (base) {
    case 1:
      return 'bg-green-600/10';
    case 2:
      return 'bg-green-600/5';
    case 3:
      return 'bg-transparent';
    case 4:
      return 'bg-amber-500/10';
    case 5:
      return 'bg-red-500/10';
    default:
      return 'bg-transparent';
  }
}

interface GradeValuePickerProps {
  value: number | null;
  onChange: (value: number) => void;
}

/**
 * Custom input for Austrian grade notation (1+ through 5-).
 * Renders as a 5x3 grid (5 base grades, 3 modifiers: +, base, -).
 * Selected value has accent border. Each button has 44px minimum touch target.
 *
 * Per D-05, UI-SPEC grade color scale.
 */
export function GradeValuePicker({ value, onChange }: GradeValuePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Notenwert auswaehlen">
      {GRADE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Note ${option.display}`}
            className={cn(
              'flex items-center justify-center rounded-md text-sm font-semibold transition-colors',
              'min-h-[44px] min-w-[44px]',
              'border-2',
              'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : cn('border-transparent', getGradeColorClass(option.value)),
            )}
            onClick={() => onChange(option.value)}
          >
            {option.display}
          </button>
        );
      })}
    </div>
  );
}

export { GRADE_OPTIONS, getGradeColorClass };
