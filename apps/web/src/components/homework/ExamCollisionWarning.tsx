import { AlertTriangle } from 'lucide-react';
import type { ExamDto } from '@schoolflow/shared';

interface ExamCollisionWarningProps {
  existingExam: ExamDto;
  onOverride: () => void;
}

/**
 * Inline warning banner inside ExamDialog when collision detected.
 * Yellow/warning background at 15% opacity, AlertTriangle icon.
 *
 * Per UI-SPEC D-03:
 * - Text: "Achtung: Am {date} ist bereits eine Pruefung fuer diese Klasse
 *   eingetragen ({existingExamTitle}). Trotzdem eintragen?"
 * - "Trotzdem eintragen" secondary button calls onOverride
 * - role="alert" aria-live="polite"
 */
export function ExamCollisionWarning({
  existingExam,
  onOverride,
}: ExamCollisionWarningProps) {
  const examDate = new Date(existingExam.date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-md p-3"
      style={{ backgroundColor: 'hsla(38, 92%, 50%, 0.15)' }}
    >
      <AlertTriangle
        className="h-4 w-4 mt-0.5 shrink-0"
        style={{ color: 'hsl(38 92% 50%)' }}
      />
      <div className="flex-1 space-y-2">
        <p className="text-xs font-semibold leading-[1.3]">
          Achtung: Am {examDate} ist bereits eine Pruefung fuer diese Klasse
          eingetragen ({existingExam.title}). Trotzdem eintragen?
        </p>
        <button
          type="button"
          onClick={onOverride}
          className="text-xs font-medium underline underline-offset-2 hover:no-underline"
          style={{ color: 'hsl(38 92% 50%)' }}
        >
          Trotzdem eintragen
        </button>
      </div>
    </div>
  );
}
