import type { ImportProgressEvent } from '@schoolflow/shared';

interface ImportProgressPanelProps {
  progress: ImportProgressEvent | null;
}

/**
 * ImportProgressPanel -- Step 4 of ImportWizard.
 *
 * Progress bar: 8px height div with accent fill (width transition animated).
 * role="progressbar" aria-valuenow/min/max per UI-SPEC.
 * Percentage text (12px semibold).
 * Counter: "Importiere... {current} von {total} ({percent}%)"
 *
 * Driven by useImportSocket progress state.
 */
export function ImportProgressPanel({ progress }: ImportProgressPanelProps) {
  const current = progress?.current ?? 0;
  const total = progress?.total ?? 0;
  const percent = progress?.percent ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-semibold leading-[1.2] mb-2">
          Import laeuft
        </h3>
        <p className="text-sm text-muted-foreground">
          Importiere... {current} von {total} ({percent}%)
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full bg-muted rounded-full overflow-hidden"
          style={{ height: '8px' }}
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-right">{percent}%</p>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Bitte warten Sie, bis der Import abgeschlossen ist. Schliessen Sie
        diese Seite nicht.
      </p>
    </div>
  );
}
