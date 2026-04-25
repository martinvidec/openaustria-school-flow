import { useMemo, useState } from 'react';
import { CalendarClock, Plus, Sun } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import {
  useConstraintTemplates,
  useCreateConstraintTemplate,
  useUpdateConstraintTemplate,
  useDeleteConstraintTemplate,
  useSetTemplateActive,
} from '@/lib/hooks/useConstraintTemplates';
import { useSubjects } from '@/hooks/useSubjects';
import { MultiRowConflictBanner } from './MultiRowConflictBanner';
import {
  SubjectMorningPreferenceTable,
  type SubjectMorningRow,
} from './SubjectMorningPreferenceTable';
import { AddEditSubjectMorningPreferenceDialog } from './AddEditSubjectMorningPreferenceDialog';
import {
  SubjectPreferredSlotTable,
  type SubjectPreferredSlotRow,
} from './SubjectPreferredSlotTable';
import { AddEditSubjectPreferredSlotDialog } from './AddEditSubjectPreferredSlotDialog';
import { WOCHENTAG_FULL_LABELS, type WochentagDay } from './WochentagBadge';
import type { ConstraintTemplateParams } from '@schoolflow/shared';

/**
 * Phase 14-02 Tab 4 "Fach-Präferenzen" (SOLVER-05).
 *
 * Hosts two sub-tabs:
 *   a) Vormittags-Präferenzen   (SUBJECT_MORNING)
 *   b) Bevorzugte Slots         (SUBJECT_PREFERRED_SLOT)
 *
 * Mobile (`<sm`): Sub-Tabs collapse to a vertical ToggleGroup per UI-SPEC.
 *
 * Both sub-tabs render their own MultiRowConflictBanner per D-14:
 *   a) min(latestPeriod) per subjectId   → strictest-wins
 *   b) ≥2 identical (subjectId, day, period) triples → cumulative-evaluation
 */
type SubTab = 'morning' | 'preferred-slot';

interface Props {
  schoolId: string;
}

export function SubjectPreferencesTab({ schoolId }: Props) {
  const [active, setActive] = useState<SubTab>('morning');

  const { data: subjectListResp } = useSubjects(schoolId, { limit: 200 });
  const subjectNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjectListResp?.data ?? []) {
      m[s.id] = s.name;
    }
    return m;
  }, [subjectListResp]);

  return (
    <div className="space-y-4">
      {/* Desktop sub-tabs */}
      <div className="hidden sm:block">
        <Tabs value={active} onValueChange={(v) => setActive(v as SubTab)}>
          <TabsList>
            <TabsTrigger value="morning" className="min-h-11 sm:min-h-9">
              <Sun className="h-4 w-4 mr-2" />
              Vormittags-Präferenzen
            </TabsTrigger>
            <TabsTrigger value="preferred-slot" className="min-h-11 sm:min-h-9">
              <CalendarClock className="h-4 w-4 mr-2" />
              Bevorzugte Slots
            </TabsTrigger>
          </TabsList>
          <TabsContent value="morning" className="pt-4">
            <SubjectMorningSubTab schoolId={schoolId} subjectNames={subjectNames} />
          </TabsContent>
          <TabsContent value="preferred-slot" className="pt-4">
            <SubjectPreferredSlotSubTab schoolId={schoolId} subjectNames={subjectNames} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile ToggleGroup fallback */}
      <div className="sm:hidden space-y-3">
        <ToggleGroup
          type="single"
          value={active}
          onValueChange={(v) => v && setActive(v as SubTab)}
          variant="outline"
          className="flex-col w-full gap-1"
        >
          <ToggleGroupItem value="morning" className="w-full min-h-11">
            <Sun className="h-4 w-4 mr-2" />
            Vormittags-Präferenzen
          </ToggleGroupItem>
          <ToggleGroupItem value="preferred-slot" className="w-full min-h-11">
            <CalendarClock className="h-4 w-4 mr-2" />
            Bevorzugte Slots
          </ToggleGroupItem>
        </ToggleGroup>
        {active === 'morning' ? (
          <SubjectMorningSubTab schoolId={schoolId} subjectNames={subjectNames} />
        ) : (
          <SubjectPreferredSlotSubTab schoolId={schoolId} subjectNames={subjectNames} />
        )}
      </div>
    </div>
  );
}

function SubjectMorningSubTab({
  schoolId,
  subjectNames,
}: {
  schoolId: string;
  subjectNames: Record<string, string>;
}) {
  const { data, isLoading } = useConstraintTemplates(schoolId, 'SUBJECT_MORNING');
  const create = useCreateConstraintTemplate(schoolId, 'SUBJECT_MORNING');
  const update = useUpdateConstraintTemplate(schoolId, 'SUBJECT_MORNING');
  const remove = useDeleteConstraintTemplate(schoolId, 'SUBJECT_MORNING');
  const setActive = useSetTemplateActive(schoolId, 'SUBJECT_MORNING');

  const rows: SubjectMorningRow[] = useMemo(
    () => (data ?? []).map((t) => ({ ...t, templateType: 'SUBJECT_MORNING' })),
    [data],
  );

  const conflictMessages = useMemo(() => {
    const groups = new Map<string, SubjectMorningRow[]>();
    for (const r of rows) {
      if (!r.isActive) continue;
      const sid = String(r.params.subjectId ?? '');
      if (!groups.has(sid)) groups.set(sid, []);
      groups.get(sid)!.push(r);
    }
    const out: string[] = [];
    for (const [sid, grp] of groups.entries()) {
      if (grp.length < 2) continue;
      const minLatest = Math.min(
        ...grp.map((r) => Number(r.params.latestPeriod ?? 0)),
      );
      const name = subjectNames[sid] ?? sid;
      out.push(
        `Mehrfache Einträge für ${name} vorhanden — Solver verwendet die strengste Vormittags-Präferenz (Periode ${minLatest}).`,
      );
    }
    return out;
  }, [rows, subjectNames]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectMorningRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectMorningRow | null>(null);

  const handleSubmit = (
    params: ConstraintTemplateParams & { templateType: 'SUBJECT_MORNING' },
    isActive: boolean,
  ) => {
    if (editing) {
      update.mutate(
        { id: editing.id, params },
        {
          onSuccess: () => {
            if (editing.isActive !== isActive) {
              setActive.mutate({ id: editing.id, isActive });
            }
            setDialogOpen(false);
            setEditing(null);
          },
        },
      );
    } else {
      create.mutate(params, {
        onSuccess: (created) => {
          if (!isActive) {
            setActive.mutate({ id: created.id, isActive: false });
          }
          setDialogOpen(false);
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {conflictMessages.length > 0 && (
        <MultiRowConflictBanner messages={conflictMessages} />
      )}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="w-full sm:w-auto min-h-11 sm:min-h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          Vormittags-Präferenz hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-sm text-muted-foreground text-center">
          Lade Präferenzen …
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center space-y-3">
          <Sun className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-semibold">Keine Vormittags-Präferenzen</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Vormittags-Präferenzen halten ein Fach möglichst vor einer
            bestimmten Periode. Legen Sie eine Präferenz an, um z. B.
            Mathematik bevorzugt vormittags zu legen.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="min-h-11 sm:min-h-9"
          >
            Vormittags-Präferenz anlegen
          </Button>
        </div>
      ) : (
        <SubjectMorningPreferenceTable
          rows={rows}
          subjectNames={subjectNames}
          onEdit={(row) => {
            setEditing(row);
            setDialogOpen(true);
          }}
          onDelete={(row) => setDeleteTarget(row)}
          onToggleActive={(row, next) =>
            setActive.mutate({ id: row.id, isActive: next })
          }
        />
      )}

      <AddEditSubjectMorningPreferenceDialog
        open={dialogOpen}
        mode={editing ? 'edit' : 'create'}
        schoolId={schoolId}
        initial={editing}
        subjectNames={subjectNames}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <WarnDialog
        open={deleteTarget !== null}
        title="Vormittags-Präferenz löschen?"
        description={
          deleteTarget
            ? `Die Vormittags-Präferenz für ${
                subjectNames[String(deleteTarget.params.subjectId ?? '')] ??
                String(deleteTarget.params.subjectId ?? '')
              } (spätestens Periode ${Number(
                deleteTarget.params.latestPeriod ?? 0,
              )}) wird gelöscht. Beim nächsten Solve-Run gibt es keine Vormittags-Bevorzugung mehr für dieses Fach.`
            : ''
        }
        actions={[
          {
            label: 'Abbrechen',
            variant: 'ghost',
            onClick: () => setDeleteTarget(null),
            autoFocus: true,
          },
          {
            label: 'Löschen',
            variant: 'destructive',
            onClick: () => {
              if (!deleteTarget) return;
              const id = deleteTarget.id;
              setDeleteTarget(null);
              remove.mutate(id);
            },
          },
        ]}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SubjectPreferredSlotSubTab({
  schoolId,
  subjectNames,
}: {
  schoolId: string;
  subjectNames: Record<string, string>;
}) {
  const { data, isLoading } = useConstraintTemplates(schoolId, 'SUBJECT_PREFERRED_SLOT');
  const create = useCreateConstraintTemplate(schoolId, 'SUBJECT_PREFERRED_SLOT');
  const update = useUpdateConstraintTemplate(schoolId, 'SUBJECT_PREFERRED_SLOT');
  const remove = useDeleteConstraintTemplate(schoolId, 'SUBJECT_PREFERRED_SLOT');
  const setActive = useSetTemplateActive(schoolId, 'SUBJECT_PREFERRED_SLOT');

  const rows: SubjectPreferredSlotRow[] = useMemo(
    () =>
      (data ?? []).map((t) => ({
        ...t,
        templateType: 'SUBJECT_PREFERRED_SLOT',
      })),
    [data],
  );

  // D-14 cumulative-evaluation: ≥2 identical (subjectId, dayOfWeek, period).
  const conflictMessages = useMemo(() => {
    const groups = new Map<string, SubjectPreferredSlotRow[]>();
    for (const r of rows) {
      if (!r.isActive) continue;
      const sid = String(r.params.subjectId ?? '');
      const day = String(r.params.dayOfWeek ?? '');
      const p = String(r.params.period ?? '');
      const key = `${sid}|${day}|${p}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const out: string[] = [];
    for (const [, grp] of groups.entries()) {
      if (grp.length < 2) continue;
      const first = grp[0];
      const sid = String(first.params.subjectId ?? '');
      const day = String(first.params.dayOfWeek ?? 'MONDAY') as WochentagDay;
      const p = Number(first.params.period ?? 0);
      const name = subjectNames[sid] ?? sid;
      out.push(
        `Mehrfache identische Slot-Einträge für ${name} (${WOCHENTAG_FULL_LABELS[day]} · Periode ${p}) vorhanden — Solver wertet sie kumulativ aus.`,
      );
    }
    return out;
  }, [rows, subjectNames]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectPreferredSlotRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<SubjectPreferredSlotRow | null>(null);

  const handleSubmit = (
    params: ConstraintTemplateParams & { templateType: 'SUBJECT_PREFERRED_SLOT' },
    isActive: boolean,
  ) => {
    if (editing) {
      update.mutate(
        { id: editing.id, params },
        {
          onSuccess: () => {
            if (editing.isActive !== isActive) {
              setActive.mutate({ id: editing.id, isActive });
            }
            setDialogOpen(false);
            setEditing(null);
          },
        },
      );
    } else {
      create.mutate(params, {
        onSuccess: (created) => {
          if (!isActive) {
            setActive.mutate({ id: created.id, isActive: false });
          }
          setDialogOpen(false);
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {conflictMessages.length > 0 && (
        <MultiRowConflictBanner messages={conflictMessages} />
      )}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="w-full sm:w-auto min-h-11 sm:min-h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          Bevorzugten Slot hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-sm text-muted-foreground text-center">
          Lade Slots …
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center space-y-3">
          <CalendarClock className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-semibold">Keine bevorzugten Slots</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Bevorzugte Slots legen ein Fach idealerweise auf einen festen
            Wochentag und eine feste Periode. Legen Sie einen Slot an, um z. B.
            Sport am Dienstag in der ersten Periode zu bevorzugen.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="min-h-11 sm:min-h-9"
          >
            Bevorzugten Slot anlegen
          </Button>
        </div>
      ) : (
        <SubjectPreferredSlotTable
          rows={rows}
          subjectNames={subjectNames}
          onEdit={(row) => {
            setEditing(row);
            setDialogOpen(true);
          }}
          onDelete={(row) => setDeleteTarget(row)}
          onToggleActive={(row, next) =>
            setActive.mutate({ id: row.id, isActive: next })
          }
        />
      )}

      <AddEditSubjectPreferredSlotDialog
        open={dialogOpen}
        mode={editing ? 'edit' : 'create'}
        schoolId={schoolId}
        initial={editing}
        subjectNames={subjectNames}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={create.isPending || update.isPending}
      />

      <WarnDialog
        open={deleteTarget !== null}
        title="Bevorzugten Slot löschen?"
        description={
          deleteTarget
            ? `Der bevorzugte Slot für ${
                subjectNames[String(deleteTarget.params.subjectId ?? '')] ??
                String(deleteTarget.params.subjectId ?? '')
              } (${
                WOCHENTAG_FULL_LABELS[
                  String(deleteTarget.params.dayOfWeek ?? 'MONDAY') as WochentagDay
                ]
              } · Periode ${Number(
                deleteTarget.params.period ?? 0,
              )}) wird gelöscht. Beim nächsten Solve-Run gibt es keine Slot-Bevorzugung mehr für dieses Fach an diesem Tag/Periode.`
            : ''
        }
        actions={[
          {
            label: 'Abbrechen',
            variant: 'ghost',
            onClick: () => setDeleteTarget(null),
            autoFocus: true,
          },
          {
            label: 'Löschen',
            variant: 'destructive',
            onClick: () => {
              if (!deleteTarget) return;
              const id = deleteTarget.id;
              setDeleteTarget(null);
              remove.mutate(id);
            },
          },
        ]}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
