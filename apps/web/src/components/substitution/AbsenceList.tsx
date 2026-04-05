import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  TeacherAbsenceDto,
  AbsenceReason,
  AbsenceStatus,
} from '@schoolflow/shared';

interface AbsenceListProps {
  absences: TeacherAbsenceDto[];
  onCancel: (id: string) => void;
  isCancelling?: boolean;
}

/**
 * Copy mapping preserved verbatim from 06-UI-SPEC.md Copywriting Contract.
 */
const REASON_LABELS: Record<AbsenceReason, string> = {
  KRANK: 'Krank',
  FORTBILDUNG: 'Fortbildung',
  DIENSTREISE: 'Dienstreise',
  SCHULVERANSTALTUNG: 'Schulveranstaltung',
  ARZTTERMIN: 'Arzttermin',
  SONSTIGES: 'Sonstiges',
};

const STATUS_LABELS: Record<AbsenceStatus, string> = {
  ACTIVE: 'Aktiv',
  CANCELLED: 'Storniert',
  COMPLETED: 'Abgeschlossen',
};

const STATUS_VARIANT: Record<
  AbsenceStatus,
  'default' | 'outline' | 'secondary'
> = {
  ACTIVE: 'default',
  CANCELLED: 'outline',
  COMPLETED: 'secondary',
};

function formatDate(iso: string): string {
  // Accepts full ISO ("2026-04-05T00:00:00.000Z") or date-only ("2026-04-05")
  return iso.slice(0, 10);
}

/**
 * Inline HTML table (Phase 4/5 precedent — no shadcn Table primitive).
 * Includes empty-state copy from UI-SPEC.
 */
export function AbsenceList({
  absences,
  onCancel,
  isCancelling,
}: AbsenceListProps) {
  if (absences.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-md">
        <h3 className="text-lg font-semibold">Keine Abwesenheiten erfasst</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Erfassen Sie die erste Abwesenheit ueber &quot;Neue Abwesenheit
          erfassen&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 font-semibold">Lehrer/in</th>
            <th className="text-left p-3 font-semibold">Zeitraum</th>
            <th className="text-left p-3 font-semibold">Stunden</th>
            <th className="text-left p-3 font-semibold">Grund</th>
            <th className="text-left p-3 font-semibold">Status</th>
            <th className="text-left p-3 font-semibold">Betroffen</th>
            <th className="text-right p-3 font-semibold">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {absences.map((a) => (
            <tr
              key={a.id}
              className="border-t border-border hover:bg-muted/30"
            >
              <td className="p-3 font-medium">{a.teacherName}</td>
              <td className="p-3">
                {formatDate(a.dateFrom)}
                {formatDate(a.dateFrom) !== formatDate(a.dateTo) && (
                  <> &ndash; {formatDate(a.dateTo)}</>
                )}
              </td>
              <td className="p-3 text-muted-foreground">
                {a.periodFrom && a.periodTo
                  ? `${a.periodFrom}. – ${a.periodTo}.`
                  : 'Ganztaegig'}
              </td>
              <td className="p-3">
                <Badge variant="outline">{REASON_LABELS[a.reason]}</Badge>
              </td>
              <td className="p-3">
                <Badge variant={STATUS_VARIANT[a.status]}>
                  {STATUS_LABELS[a.status]}
                </Badge>
              </td>
              <td className="p-3 text-muted-foreground">
                {a.affectedLessonCount} Stunden
              </td>
              <td className="p-3 text-right">
                {a.status === 'ACTIVE' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(a.id)}
                    disabled={isCancelling}
                  >
                    Stornieren
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
