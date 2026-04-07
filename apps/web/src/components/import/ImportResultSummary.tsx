import { CheckCircle, AlertTriangle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ImportJobDto } from '@schoolflow/shared';

interface ImportResultSummaryProps {
  result: ImportJobDto;
  onNewImport: () => void;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Erfolgreich',
        icon: CheckCircle,
        colorClass: 'bg-[hsl(142_71%_45%)]/15 text-[hsl(142_71%_45%)]',
        badgeClass: 'bg-[hsl(142_71%_45%)]/15 text-[hsl(142_71%_45%)] border-[hsl(142_71%_45%)]/30',
      };
    case 'PARTIAL':
      return {
        label: 'Teilweise',
        icon: AlertTriangle,
        colorClass: 'bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_50%)]',
        badgeClass: 'bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_50%)] border-[hsl(38_92%_50%)]/30',
      };
    case 'FAILED':
    default:
      return {
        label: 'Fehlgeschlagen',
        icon: XCircle,
        colorClass: 'bg-destructive/15 text-destructive',
        badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
      };
  }
}

/**
 * ImportResultSummary -- Step 5 of ImportWizard.
 *
 * Card with status badge (success/partial/failed per UI-SPEC state colors).
 * Counts: "{imported} von {total} Datensaetzen erfolgreich importiert" or variants.
 * "Importbericht herunterladen" button for error CSV.
 * "Neuer Import" button resets wizard.
 */
export function ImportResultSummary({
  result,
  onNewImport,
}: ImportResultSummaryProps) {
  const statusConfig = getStatusConfig(result.status);
  const StatusIcon = statusConfig.icon;

  const imported = result.importedRows ?? 0;
  const total = result.totalRows ?? 0;
  const skipped = result.skippedRows ?? 0;
  const errors = result.errorRows ?? 0;

  function getResultText() {
    if (result.status === 'COMPLETED') {
      return `${imported} von ${total} Datensaetzen erfolgreich importiert.`;
    }
    if (result.status === 'PARTIAL') {
      return `${imported} von ${total} importiert. ${skipped} uebersprungen, ${errors} fehlerhaft. Details im Importbericht.`;
    }
    return `Import fehlgeschlagen. Bitte pruefen Sie die Datei und versuchen Sie es erneut.`;
  }

  function handleDownloadReport() {
    if (!result.errorDetails || result.errorDetails.length === 0) return;

    const header = 'Zeile;Feld;Fehler\n';
    const rows = result.errorDetails
      .map((e) => `${e.row};${e.field};${e.message}`)
      .join('\n');
    const csv = header + rows;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `importbericht-${result.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${statusConfig.colorClass}`}>
          <StatusIcon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-[20px] font-semibold leading-[1.2]">
            Import abgeschlossen
          </h3>
          <Badge variant="outline" className={statusConfig.badgeClass}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      <p className="text-sm">{getResultText()}</p>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xl font-semibold">{total}</p>
          <p className="text-xs text-muted-foreground">Gesamt</p>
        </div>
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xl font-semibold text-[hsl(142_71%_45%)]">
            {imported}
          </p>
          <p className="text-xs text-muted-foreground">Importiert</p>
        </div>
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xl font-semibold text-[hsl(38_92%_50%)]">
            {skipped}
          </p>
          <p className="text-xs text-muted-foreground">Uebersprungen</p>
        </div>
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xl font-semibold text-destructive">{errors}</p>
          <p className="text-xs text-muted-foreground">Fehler</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {result.errorDetails && result.errorDetails.length > 0 && (
          <Button variant="secondary" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Importbericht herunterladen
          </Button>
        )}
        <Button onClick={onNewImport}>Neuer Import</Button>
      </div>
    </div>
  );
}
