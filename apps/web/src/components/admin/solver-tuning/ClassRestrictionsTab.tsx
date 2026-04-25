import { useMemo, useState } from 'react';
import { CalendarOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WarnDialog } from '@/components/admin/shared/WarnDialog';
import {
  useConstraintTemplates,
  useCreateConstraintTemplate,
  useUpdateConstraintTemplate,
  useDeleteConstraintTemplate,
  useSetTemplateActive,
} from '@/lib/hooks/useConstraintTemplates';
import { useClasses } from '@/hooks/useClasses';
import {
  ClassRestrictionsTable,
  type ClassRestrictionRow,
} from './ClassRestrictionsTable';
import { AddEditClassRestrictionDialog } from './AddEditClassRestrictionDialog';
import { MultiRowConflictBanner } from './MultiRowConflictBanner';
import type { ConstraintTemplateParams } from '@schoolflow/shared';

/**
 * Phase 14-02 Tab 3 "Klassen-Sperrzeiten" (SOLVER-04).
 *
 * Renders the NO_LESSONS_AFTER ConstraintTemplate list with full CRUD,
 * plus the multi-row strictest-wins InfoBanner (D-14) when ≥2 active
 * rows share a classId.
 */
interface Props {
  schoolId: string;
}

export function ClassRestrictionsTab({ schoolId }: Props) {
  const { data, isLoading } = useConstraintTemplates(schoolId, 'NO_LESSONS_AFTER');
  const create = useCreateConstraintTemplate(schoolId, 'NO_LESSONS_AFTER');
  const update = useUpdateConstraintTemplate(schoolId, 'NO_LESSONS_AFTER');
  const remove = useDeleteConstraintTemplate(schoolId, 'NO_LESSONS_AFTER');
  const setActive = useSetTemplateActive(schoolId, 'NO_LESSONS_AFTER');

  const { data: classListResp } = useClasses(schoolId, { limit: 200 });
  const classNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of classListResp?.data ?? []) {
      map[c.id] = c.name;
    }
    return map;
  }, [classListResp]);

  const rows: ClassRestrictionRow[] = useMemo(
    () => (data ?? []).map((t) => ({ ...t, templateType: 'NO_LESSONS_AFTER' })),
    [data],
  );

  // D-14 strictest-wins banner messages.
  const conflictMessages = useMemo(() => {
    const groups = new Map<string, ClassRestrictionRow[]>();
    for (const r of rows) {
      if (!r.isActive) continue;
      const cid = String(r.params.classId ?? '');
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(r);
    }
    const out: string[] = [];
    for (const [cid, grp] of groups.entries()) {
      if (grp.length < 2) continue;
      const minMax = Math.min(...grp.map((r) => Number(r.params.maxPeriod ?? 0)));
      const name = classNames[cid] ?? cid;
      out.push(
        `Mehrfache Einträge für Klasse ${name} vorhanden — Solver verwendet die strengste Sperrzeit (Periode ${minMax}).`,
      );
    }
    return out;
  }, [rows, classNames]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRestrictionRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassRestrictionRow | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const handleEdit = (row: ClassRestrictionRow) => {
    setEditing(row);
    setDialogOpen(true);
  };
  const handleSubmit = (
    params: ConstraintTemplateParams & { templateType: 'NO_LESSONS_AFTER' },
    isActive: boolean,
  ) => {
    if (editing) {
      update.mutate(
        { id: editing.id, params },
        {
          onSuccess: () => {
            // Also sync isActive if it changed (separate endpoint).
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
          // The create payload includes isActive=true by default; if the user
          // toggled it off in the dialog, sync via PATCH /:id/active.
          if (!isActive) {
            setActive.mutate({ id: created.id, isActive: false });
          }
          setDialogOpen(false);
        },
      });
    }
  };

  const isSubmitting = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      {conflictMessages.length > 0 && (
        <MultiRowConflictBanner messages={conflictMessages} />
      )}

      <div className="flex items-center justify-end">
        <Button
          onClick={handleAdd}
          className="w-full sm:w-auto min-h-11 sm:min-h-9"
        >
          <Plus className="h-4 w-4 mr-1" />
          Sperrzeit hinzufügen
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-sm text-muted-foreground text-center">
          Lade Sperrzeiten …
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center space-y-3">
          <CalendarOff className="h-6 w-6 mx-auto text-muted-foreground" aria-hidden />
          <h3 className="text-lg font-semibold">Keine Sperrzeiten gesetzt</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Klassen-Sperrzeiten begrenzen, bis zu welcher Periode eine Klasse
            Unterricht haben darf. Legen Sie eine Sperrzeit an, um ab der
            nächsten Stundenplan-Generierung zu wirken.
          </p>
          <Button onClick={handleAdd} className="min-h-11 sm:min-h-9">
            Sperrzeit anlegen
          </Button>
        </div>
      ) : (
        <ClassRestrictionsTable
          rows={rows}
          classNames={classNames}
          onEdit={handleEdit}
          onDelete={(row) => setDeleteTarget(row)}
          onToggleActive={(row, next) =>
            setActive.mutate({ id: row.id, isActive: next })
          }
        />
      )}

      <AddEditClassRestrictionDialog
        open={dialogOpen}
        mode={editing ? 'edit' : 'create'}
        schoolId={schoolId}
        initial={editing}
        classNames={classNames}
        onCancel={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <WarnDialog
        open={deleteTarget !== null}
        title="Sperrzeit löschen?"
        description={
          deleteTarget
            ? `Die Sperrzeit für Klasse ${
                classNames[String(deleteTarget.params.classId ?? '')] ??
                String(deleteTarget.params.classId ?? '')
              } (bis Periode ${Number(
                deleteTarget.params.maxPeriod ?? 0,
              )}) wird gelöscht. Beim nächsten Solve-Run hat die Klasse keine Periode-Beschränkung mehr.`
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
