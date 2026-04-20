import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SchoolYearDto, SchoolYearInput } from '@schoolflow/shared';
import { InfoBanner } from '@/components/admin/shared/InfoBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  SchoolYearOrphanError,
  useActivateSchoolYear,
  useCreateSchoolYear,
  useDeleteSchoolYear,
  useSchoolYears,
} from '@/hooks/useSchoolYears';
import { ActivateSchoolYearDialog } from './ActivateSchoolYearDialog';
import { CreateSchoolYearDialog } from './CreateSchoolYearDialog';
import { DeleteSchoolYearDialog } from './DeleteSchoolYearDialog';
import { SchoolYearCard } from './SchoolYearCard';

interface Props {
  schoolId: string;
  onDirtyChange?: (d: boolean) => void;
}

export function SchoolYearsTab({ schoolId, onDirtyChange }: Props) {
  const yearsQuery = useSchoolYears(schoolId);
  const createMut = useCreateSchoolYear(schoolId);
  const activateMut = useActivateSchoolYear(schoolId);
  const deleteMut = useDeleteSchoolYear(schoolId);
  const [createOpen, setCreateOpen] = useState(false);
  const [activate, setActivate] = useState<SchoolYearDto | null>(null);
  const [del, setDel] = useState<SchoolYearDto | null>(null);

  // Auto-save tab — every mutation round-trips to the server on confirm, so
  // the parent route shell never needs to block navigation for unsaved state.
  useEffect(() => onDirtyChange?.(false), [onDirtyChange]);

  const years = yearsQuery.data ?? [];
  const active = years.find((y) => y.isActive) ?? null;

  const handleCreate = async (dto: SchoolYearInput) => {
    await createMut.mutateAsync(dto);
    setCreateOpen(false);
  };
  const handleActivate = async () => {
    if (!activate) return;
    await activateMut.mutateAsync(activate.id);
    setActivate(null);
  };
  const handleDelete = async () => {
    if (!del) return;
    try {
      await deleteMut.mutateAsync(del.id);
      setDel(null);
    } catch (e) {
      // SchoolYearOrphanError is handled by the hook's onError toast.
      // The dialog closes either way — the toast carries the count.
      if (e instanceof SchoolYearOrphanError) setDel(null);
    }
  };

  return (
    <Card className="border-none shadow-none md:border md:shadow-sm p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Schuljahre</h2>
        <p className="text-sm text-muted-foreground">
          Pflegen Sie Start- und Endzeitpunkte, Ferien und schulautonome Tage.
        </p>
      </div>

      {active && (
        <div className="mb-4">
          <InfoBanner>
            <strong>{active.name}</strong> ist aktiv seit{' '}
            {format(new Date(active.startDate), 'dd.MM.yyyy')}. Neue Stundenplaene und Eintraege
            ordnen sich diesem Schuljahr zu.
          </InfoBanner>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-11 md:h-10 w-full md:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Neues Schuljahr anlegen
        </Button>
      </div>

      {years.length === 0 ? (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Noch kein Schuljahr angelegt</h3>
          <p className="text-sm text-muted-foreground">
            Legen Sie das erste Schuljahr an, um mit der Planung zu beginnen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map((y) => (
            <SchoolYearCard
              key={y.id}
              schoolId={schoolId}
              year={y}
              onActivate={() => setActivate(y)}
              onDelete={() => setDel(y)}
            />
          ))}
        </div>
      )}

      <CreateSchoolYearDialog
        open={createOpen}
        isSubmitting={createMut.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <ActivateSchoolYearDialog
        open={!!activate}
        yearName={activate?.name ?? ''}
        isSubmitting={activateMut.isPending}
        onCancel={() => setActivate(null)}
        onConfirm={handleActivate}
      />
      <DeleteSchoolYearDialog
        open={!!del}
        yearName={del?.name ?? ''}
        isSubmitting={deleteMut.isPending}
        onCancel={() => setDel(null)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
