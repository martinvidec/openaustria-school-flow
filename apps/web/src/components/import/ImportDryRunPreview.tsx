import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImportDryRunResult, ImportErrorDetail } from '@schoolflow/shared';

interface ImportDryRunPreviewProps {
  dryRunResult: ImportDryRunResult;
  conflictModeLabel: string;
  onCommit: () => void;
  onBack: () => void;
}

/**
 * ImportDryRunPreview -- Step 3 of ImportWizard.
 *
 * Summary card: "{totalRows} Datensaetze erkannt. {newRows} neu,
 * {duplicateRows} Duplikate ({conflictMode}). Moechten Sie den Import starten?"
 *
 * Error rows list with expandable detail (destructive color).
 * "Daten importieren" primary CTA and "Zurueck" secondary button.
 */
export function ImportDryRunPreview({
  dryRunResult,
  conflictModeLabel,
  onCommit,
  onBack,
}: ImportDryRunPreviewProps) {
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  const hasErrors = dryRunResult.errorRows > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[20px] font-semibold leading-[1.2] mb-2">
          Vorschau
        </h3>
        <p className="text-sm text-muted-foreground">
          {dryRunResult.totalRows} Datensaetze erkannt. {dryRunResult.newRows}{' '}
          neu, {dryRunResult.duplicateRows} Duplikate ({conflictModeLabel}).
          Moechten Sie den Import starten?
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-semibold">{dryRunResult.newRows}</p>
          <p className="text-xs text-muted-foreground">Neu</p>
        </div>
        <div className="rounded-md border border-border p-4 text-center">
          <p className="text-2xl font-semibold">{dryRunResult.duplicateRows}</p>
          <p className="text-xs text-muted-foreground">Duplikate</p>
        </div>
        <div
          className={`rounded-md border p-4 text-center ${
            hasErrors
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-border'
          }`}
        >
          <p
            className={`text-2xl font-semibold ${
              hasErrors ? 'text-destructive' : ''
            }`}
          >
            {dryRunResult.errorRows}
          </p>
          <p className="text-xs text-muted-foreground">Fehler</p>
        </div>
      </div>

      {/* Error details */}
      {hasErrors && (
        <div className="border border-destructive/50 rounded-md bg-destructive/5">
          <button
            type="button"
            onClick={() => setErrorsExpanded(!errorsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-destructive"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {errorsExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <span>{dryRunResult.errors.length} Fehler gefunden</span>
          </button>

          {errorsExpanded && (
            <div className="border-t border-destructive/30 px-3 py-2 space-y-1">
              {dryRunResult.errors.map((error: ImportErrorDetail, idx: number) => (
                <div
                  key={idx}
                  className="text-xs text-destructive/80 flex gap-2"
                >
                  <span className="font-semibold shrink-0">
                    Zeile {error.row}:
                  </span>
                  <span>
                    {error.field} &mdash; {error.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack}>
          Zurueck
        </Button>
        <Button onClick={onCommit}>Daten importieren</Button>
      </div>
    </div>
  );
}
