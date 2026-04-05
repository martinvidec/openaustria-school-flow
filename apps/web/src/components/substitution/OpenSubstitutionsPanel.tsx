import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CandidateList } from './CandidateList';
import { AssignmentActions } from './AssignmentActions';
import type {
  SubstitutionDto,
  SubstitutionStatus,
} from '@schoolflow/shared';

interface OpenSubstitutionsPanelProps {
  schoolId: string | undefined;
  substitutions: SubstitutionDto[];
  onAssign: (
    substitutionId: string,
    candidateTeacherId: string,
  ) => Promise<void>;
  onSetEntfall: (substitutionId: string) => Promise<void>;
  onSetStillarbeit: (
    substitutionId: string,
    supervisorTeacherId?: string,
  ) => Promise<void>;
}

const STATUS_LABELS: Record<SubstitutionStatus, string> = {
  PENDING: 'Offen',
  OFFERED: 'Angeboten',
  CONFIRMED: 'Bestaetigt',
  DECLINED: 'Abgelehnt',
};

const STATUS_VARIANT: Record<
  SubstitutionStatus,
  'default' | 'outline' | 'secondary' | 'destructive'
> = {
  PENDING: 'outline',
  OFFERED: 'secondary',
  CONFIRMED: 'default',
  DECLINED: 'destructive',
};

function formatDateHeading(iso: string): string {
  // YYYY-MM-DD (first 10 chars), convert to "Mo, 14. Mai 2026"
  const date = new Date(iso.slice(0, 10));
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('de-AT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Groups pending/offered/declined Substitution rows by date and renders
 * an expandable card per row. Each card reveals CandidateList +
 * AssignmentActions inline (D-21).
 */
export function OpenSubstitutionsPanel({
  schoolId,
  substitutions,
  onAssign,
  onSetEntfall,
  onSetStillarbeit,
}: OpenSubstitutionsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (substitutions.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-md">
        <h3 className="text-lg font-semibold">Keine offenen Vertretungen</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Alle Vertretungen sind vergeben oder als Entfall/Stillarbeit markiert.
        </p>
      </div>
    );
  }

  // Group by YYYY-MM-DD.
  const byDate = substitutions.reduce<Record<string, SubstitutionDto[]>>(
    (acc, s) => {
      const key = s.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    },
    {},
  );

  // Sort dates ascending for deterministic rendering.
  const sortedDateKeys = Object.keys(byDate).sort();

  return (
    <div className="space-y-6">
      {sortedDateKeys.map((dateKey) => {
        const subs = byDate[dateKey];
        return (
          <div key={dateKey}>
            <h3 className="text-base font-semibold mb-3">
              {formatDateHeading(dateKey)}
            </h3>
            <div className="space-y-3">
              {subs
                .slice()
                .sort((a, b) => a.periodNumber - b.periodNumber)
                .map((s) => {
                  const isOpen = !!expanded[s.id];
                  const isPending = s.status === 'PENDING';
                  return (
                    <Card key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[240px]">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">
                              {s.periodNumber}. Stunde
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {s.subjectAbbreviation} &middot; {s.className}
                            </span>
                            <Badge variant={STATUS_VARIANT[s.status]}>
                              {STATUS_LABELS[s.status]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Vertretung fuer: {s.originalTeacherName}
                          </p>
                          {s.substituteTeacherName && (
                            <p className="text-sm text-muted-foreground">
                              Vertretungslehrkraft: {s.substituteTeacherName}
                            </p>
                          )}
                        </div>
                        {isPending && (
                          <AssignmentActions
                            onToggleCandidates={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [s.id]: !prev[s.id],
                              }))
                            }
                            onSetEntfall={() => onSetEntfall(s.id)}
                            onSetStillarbeit={(sup) =>
                              onSetStillarbeit(s.id, sup)
                            }
                            isCandidatesOpen={isOpen}
                          />
                        )}
                      </div>
                      {isPending && isOpen && (
                        <div className="mt-4">
                          <CandidateList
                            schoolId={schoolId}
                            substitutionId={s.id}
                            onOffer={(cid) => onAssign(s.id, cid)}
                          />
                        </div>
                      )}
                    </Card>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
