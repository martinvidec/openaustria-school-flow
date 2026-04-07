import { MoreHorizontal, FileText, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ImportJobDto, ImportStatus } from '@schoolflow/shared';

interface ImportHistoryListProps {
  imports: ImportJobDto[];
  onViewReport?: (job: ImportJobDto) => void;
  onDelete?: (job: ImportJobDto) => void;
}

function getStatusBadge(status: ImportStatus) {
  switch (status) {
    case 'QUEUED':
      return (
        <Badge
          variant="outline"
          className="bg-muted/50 text-muted-foreground border-muted-foreground/30"
        >
          Wartend
        </Badge>
      );
    case 'DRY_RUN':
      return (
        <Badge
          variant="outline"
          className="bg-primary/15 text-primary border-primary/30"
        >
          Vorschau
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge
          variant="outline"
          className="bg-primary/15 text-primary border-primary/30"
        >
          Verarbeitung
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge
          variant="outline"
          className="bg-[hsl(142_71%_45%)]/15 text-[hsl(142_71%_45%)] border-[hsl(142_71%_45%)]/30"
        >
          Erfolgreich
        </Badge>
      );
    case 'PARTIAL':
      return (
        <Badge
          variant="outline"
          className="bg-[hsl(38_92%_50%)]/15 text-[hsl(38_92%_50%)] border-[hsl(38_92%_50%)]/30"
        >
          Teilweise
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge
          variant="outline"
          className="bg-destructive/15 text-destructive border-destructive/30"
        >
          Fehlgeschlagen
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getFileTypeIcon(fileType: string) {
  if (fileType === 'CSV') {
    return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * ImportHistoryList -- List of past imports from useImportHistory.
 *
 * Each row: date, fileName, fileType badge, entityType, record count,
 * status badge, DropdownMenu (view report, delete).
 *
 * Empty state: "Noch keine Importe durchgefuehrt."
 * Sorted by createdAt descending.
 */
export function ImportHistoryList({
  imports,
  onViewReport,
  onDelete,
}: ImportHistoryListProps) {
  const sorted = [...imports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Noch keine Importe durchgefuehrt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[20px] font-semibold leading-[1.2]">
        Bisherige Importe
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Datum
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Datei
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Typ
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Entitaet
              </th>
              <th className="text-right py-2 px-3 font-semibold text-xs">
                Datensaetze
              </th>
              <th className="text-left py-2 px-3 font-semibold text-xs">
                Status
              </th>
              <th className="py-2 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((job) => (
              <tr key={job.id} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(job.createdAt)}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    {getFileTypeIcon(job.fileType)}
                    <span className="truncate max-w-[200px]">
                      {job.fileName}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-3">
                  <Badge variant="outline" className="text-xs">
                    {job.fileType === 'CSV'
                      ? 'CSV'
                      : job.fileType === 'UNTIS_DIF'
                        ? 'DIF'
                        : 'XML'}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-muted-foreground">
                  {job.entityType}
                </td>
                <td className="py-2 px-3 text-right">
                  {job.totalRows ?? '-'}
                </td>
                <td className="py-2 px-3">{getStatusBadge(job.status)}</td>
                <td className="py-2 px-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onViewReport && (
                        <DropdownMenuItem onClick={() => onViewReport(job)}>
                          Bericht anzeigen
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(job)}
                        >
                          Loeschen
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
