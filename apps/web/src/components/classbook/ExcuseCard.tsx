import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AbsenceExcuseDto, ExcuseReason, ExcuseStatus } from '@schoolflow/shared';

interface ExcuseCardProps {
  excuse: AbsenceExcuseDto;
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
}

const STATUS_CONFIG: Record<
  ExcuseStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Ausstehend',
    className: 'bg-[hsl(38_92%_50%/0.15)] text-[hsl(38,92%,50%)] border-transparent',
  },
  ACCEPTED: {
    label: 'Akzeptiert',
    className: 'bg-[hsl(142_71%_45%/0.15)] text-[hsl(142,71%,45%)] border-transparent',
  },
  REJECTED: {
    label: 'Abgelehnt',
    className: 'bg-[hsl(0_84%_60%/0.15)] text-[hsl(0,84%,60%)] border-transparent',
  },
};

const REASON_LABELS: Record<ExcuseReason, string> = {
  KRANK: 'Krank',
  ARZTTERMIN: 'Arzttermin',
  FAMILIAER: 'Familiaer',
  SONSTIG: 'Sonstig',
};

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return isoDate;
  }
}

export function ExcuseCard({
  excuse,
  showActions = false,
  onAccept,
  onReject,
}: ExcuseCardProps) {
  const statusCfg = STATUS_CONFIG[excuse.status];

  return (
    <Card
      aria-label={`Entschuldigung fuer ${excuse.studentName}, ${formatDate(excuse.startDate)} - ${formatDate(excuse.endDate)}, Status: ${statusCfg.label}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: student name + status badge */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold truncate">{excuse.studentName}</h3>
          <Badge className={cn('shrink-0', statusCfg.className)}>
            {statusCfg.label}
          </Badge>
        </div>

        {/* Date range + reason */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            {formatDate(excuse.startDate)} - {formatDate(excuse.endDate)}
          </span>
          <span>{REASON_LABELS[excuse.reason]}</span>
        </div>

        {/* Parent note */}
        {excuse.note && (
          <p className="text-sm text-foreground">{excuse.note}</p>
        )}

        {/* Review note (if rejected or accepted with note) */}
        {excuse.reviewNote && (
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Anmerkung {excuse.reviewedBy ? `von ${excuse.reviewedBy}` : ''}
            </p>
            <p className="text-sm">{excuse.reviewNote}</p>
          </div>
        )}

        {/* Attachments */}
        {excuse.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excuse.attachments.map((att) => (
              <a
                key={att.id}
                href={`/api/v1/schools/${excuse.schoolId}/classbook/excuses/${excuse.id}/attachment/${att.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{att.filename}</span>
                <Download className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}

        {/* Actions for Klassenvorstand */}
        {showActions && excuse.status === 'PENDING' && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onAccept?.(excuse.id)}
            >
              Akzeptieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => onReject?.(excuse.id)}
            >
              Ablehnen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
