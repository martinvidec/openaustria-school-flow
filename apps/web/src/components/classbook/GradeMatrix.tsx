import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { GradeEntryDialog } from './GradeEntryDialog';
import { getGradeColorClass } from './GradeValuePicker';
import {
  useGradeMatrix,
  useDeleteGrade,
  useGradeWeights,
  useUpdateGradeWeights,
} from '@/hooks/useGrades';
import type {
  GradeCategory,
  GradeEntryDto,
  GradeMatrixRow,
  GradeWeightDto,
} from '@schoolflow/shared';
import {
  Plus,
  Pen,
  MessageSquare,
  Hand,
  ArrowUpDown,
  Loader2,
  Trash2,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradeMatrixProps {
  classSubjectId: string;
  schoolId: string;
}

type SortField = 'name' | 'average';
type SortDirection = 'asc' | 'desc';
type CategoryFilter = 'all' | GradeCategory;

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Alle',
  SCHULARBEIT: 'Schularbeit',
  MUENDLICH: 'Muendlich',
  MITARBEIT: 'Mitarbeit',
};

/** Icon for each grade category per UI-SPEC. */
function CategoryIcon({ category, className }: { category: GradeCategory; className?: string }) {
  switch (category) {
    case 'SCHULARBEIT':
      return <Pen className={cn('h-3 w-3', className)} />;
    case 'MUENDLICH':
      return <MessageSquare className={cn('h-3 w-3', className)} />;
    case 'MITARBEIT':
      return <Hand className={cn('h-3 w-3', className)} />;
  }
}

/** Format date as dd.MM for column headers. */
function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return dateStr;
  }
}

/** Format weighted average to 1 decimal place. */
function formatAverage(avg: number | null): string {
  if (avg === null || avg === undefined) return '-';
  return avg.toFixed(1);
}

/**
 * Spreadsheet-like grade matrix with students as rows and grade entries as columns.
 *
 * Per D-07, UI-SPEC:
 * - Category filter badges: Alle, Schularbeit, Muendlich, Mitarbeit
 * - Weight display with "Anpassen" button
 * - "Note hinzufuegen" primary button
 * - Sortable by name or average
 * - Grade cell click opens edit dialog
 * - Horizontal scroll on mobile with sticky name/average columns
 * - Empty state when no grades exist
 */
export function GradeMatrix({ classSubjectId, schoolId }: GradeMatrixProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editGrade, setEditGrade] = useState<GradeEntryDto | null>(null);
  const [deleteGrade, setDeleteGrade] = useState<GradeEntryDto | null>(null);
  const [weightEditOpen, setWeightEditOpen] = useState(false);

  // Data fetching
  const { data: matrixData, isLoading } = useGradeMatrix(
    schoolId,
    classSubjectId,
    categoryFilter === 'all' ? undefined : categoryFilter,
  );
  const { data: weights } = useGradeWeights(schoolId, classSubjectId);
  const deleteMutation = useDeleteGrade(schoolId);

  // Derive all unique grade columns (chronologically) from all students
  const gradeColumns = useMemo(() => {
    if (!matrixData?.rows) return [];
    const seen = new Map<string, GradeEntryDto>();
    for (const row of matrixData.rows) {
      for (const grade of row.grades) {
        if (!seen.has(grade.id)) {
          seen.set(grade.id, grade);
        }
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [matrixData]);

  // Build grade lookup for efficient cell rendering
  const gradeLookup = useMemo(() => {
    if (!matrixData?.rows) return new Map<string, GradeEntryDto>();
    const map = new Map<string, GradeEntryDto>();
    for (const row of matrixData.rows) {
      for (const grade of row.grades) {
        map.set(`${row.studentId}:${grade.id}`, grade);
      }
    }
    return map;
  }, [matrixData]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!matrixData?.rows) return [];
    return [...matrixData.rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        return a.studentName.localeCompare(b.studentName, 'de') * dir;
      }
      // Sort by average -- nulls go last
      const aAvg = a.weightedAverage ?? 999;
      const bAvg = b.weightedAverage ?? 999;
      return (aAvg - bAvg) * dir;
    });
  }, [matrixData?.rows, sortField, sortDir]);

  // Extract student list for dialog
  const studentList = useMemo(() => {
    if (!matrixData?.rows) return [];
    return matrixData.rows.map((r) => ({ id: r.studentId, name: r.studentName }));
  }, [matrixData?.rows]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDeleteGrade = async () => {
    if (!deleteGrade) return;
    try {
      await deleteMutation.mutateAsync(deleteGrade.id);
      toast.success('Note geloescht');
      setDeleteGrade(null);
    } catch {
      toast.error('Note konnte nicht geloescht werden.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (!matrixData?.rows || matrixData.rows.length === 0 || gradeColumns.length === 0) {
    return (
      <div className="space-y-4">
        {/* Action bar even in empty state */}
        <div className="flex items-center justify-between">
          <div />
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Note hinzufuegen
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">Noch keine Noten erfasst</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Erfassen Sie die erste Note fuer diese Klasse mit &apos;Note hinzufuegen&apos;.
          </p>
        </div>

        <GradeEntryDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          schoolId={schoolId}
          classSubjectId={classSubjectId}
          students={studentList}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter badges */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategorie-Filter">
          {(Object.entries(CATEGORY_LABELS) as [CategoryFilter, string][]).map(([key, label]) => (
            <Badge
              key={key}
              variant={categoryFilter === key ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer select-none transition-colors',
                categoryFilter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent',
              )}
              onClick={() => setCategoryFilter(key)}
              role="radio"
              aria-checked={categoryFilter === key}
            >
              {label}
            </Badge>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Note hinzufuegen
          </Button>
        </div>
      </div>

      {/* Weight display */}
      {weights && (
        <WeightDisplay
          weights={weights}
          schoolId={schoolId}
          classSubjectId={classSubjectId}
          open={weightEditOpen}
          onOpenChange={setWeightEditOpen}
        />
      )}

      {/* Matrix table with horizontal scroll */}
      <ScrollArea orientation="horizontal" className="rounded-md border">
        <div className="min-w-max">
          <table className="w-full border-collapse text-sm" role="grid" aria-label="Notenmatrix">
            <thead>
              <tr className="border-b bg-muted/50">
                {/* Sticky name column header */}
                <th
                  className="sticky left-0 z-20 min-w-[120px] cursor-pointer select-none border-r bg-muted/50 px-3 py-2 text-left font-semibold sm:min-w-[160px]"
                  onClick={() => handleSort('name')}
                  aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className="flex items-center gap-1">
                    Schueler/in
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </span>
                </th>

                {/* Grade columns */}
                {gradeColumns.map((grade) => (
                  <th
                    key={grade.id}
                    className="min-w-[56px] px-2 py-2 text-center font-semibold"
                    title={`${grade.category} - ${grade.date}${grade.description ? `: ${grade.description}` : ''}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <CategoryIcon category={grade.category} />
                      <span className="text-xs">{formatDateShort(grade.date)}</span>
                    </div>
                  </th>
                ))}

                {/* Sticky average column header */}
                <th
                  className="sticky right-0 z-20 min-w-[64px] cursor-pointer select-none border-l bg-muted/50 px-2 py-2 text-center font-semibold"
                  onClick={() => handleSort('average')}
                  aria-sort={sortField === 'average' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className="flex items-center justify-center gap-1">
                    Schnitt
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-muted/30">
                  {/* Sticky student name */}
                  <td className="sticky left-0 z-10 min-w-[120px] border-r bg-background px-3 py-1.5 font-medium sm:min-w-[160px]">
                    <span className="line-clamp-1">{row.studentName}</span>
                  </td>

                  {/* Grade cells */}
                  {gradeColumns.map((col) => {
                    const grade = gradeLookup.get(`${row.studentId}:${col.id}`);
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          'min-w-[56px] px-2 py-1.5 text-center',
                          grade && getGradeColorClass(grade.value),
                        )}
                      >
                        {grade ? (
                          <GradeCell
                            grade={grade}
                            onEdit={() => setEditGrade(grade)}
                            onDelete={() => setDeleteGrade(grade)}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Sticky average */}
                  <td className="sticky right-0 z-10 min-w-[64px] border-l bg-background px-2 py-1.5 text-center font-semibold">
                    {formatAverage(row.weightedAverage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* Add grade dialog */}
      <GradeEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        schoolId={schoolId}
        classSubjectId={classSubjectId}
        students={studentList}
      />

      {/* Edit grade dialog */}
      {editGrade && (
        <GradeEntryDialog
          open={!!editGrade}
          onOpenChange={(open) => {
            if (!open) setEditGrade(null);
          }}
          schoolId={schoolId}
          classSubjectId={classSubjectId}
          students={studentList}
          existingGrade={editGrade}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteGrade} onOpenChange={(open) => { if (!open) setDeleteGrade(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Note loeschen</DialogTitle>
            <DialogDescription>
              Moechten Sie diese Note unwiderruflich loeschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGrade(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGrade}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Loeschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Grade Cell Sub-component ---

function GradeCell({
  grade,
  onEdit,
  onDelete,
}: {
  grade: GradeEntryDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded text-sm font-semibold transition-colors hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onEdit}
        aria-label={`Note ${grade.displayValue} in ${grade.category} vom ${grade.date}`}
      >
        {grade.displayValue}
      </button>
      {/* Context action for delete */}
      <button
        type="button"
        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 transition-opacity group-hover:flex group-hover:opacity-100 focus-visible:flex focus-visible:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Note loeschen"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// --- Weight Display Sub-component ---

function WeightDisplay({
  weights,
  schoolId,
  classSubjectId,
  open,
  onOpenChange,
}: {
  weights: GradeWeightDto;
  schoolId: string;
  classSubjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateWeights = useUpdateGradeWeights(schoolId, classSubjectId);
  const [sa, setSa] = useState(weights.schularbeitPct);
  const [m, setM] = useState(weights.muendlichPct);
  const [ma, setMa] = useState(weights.mitarbeitPct);

  // Sync from props
  useState(() => {
    setSa(weights.schularbeitPct);
    setM(weights.muendlichPct);
    setMa(weights.mitarbeitPct);
  });

  const total = sa + m + ma;
  const isValid = total === 100;

  const handleSave = async () => {
    if (!isValid) return;
    try {
      await updateWeights.mutateAsync({
        schularbeitPct: sa,
        muendlichPct: m,
        mitarbeitPct: ma,
      });
      toast.success('Gewichtung gespeichert');
      onOpenChange(false);
    } catch {
      toast.error('Gewichtung konnte nicht gespeichert werden.');
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>
        Gewichtung: SA {weights.schularbeitPct}% / M {weights.muendlichPct}% / MA{' '}
        {weights.mitarbeitPct}%
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => onOpenChange(true)}
      >
        <Settings2 className="mr-1 h-3 w-3" />
        Anpassen
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gewichtung anpassen</DialogTitle>
            <DialogDescription>
              Gewichtung muss in Summe 100% ergeben.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm font-medium">Schularbeit</label>
              <input
                type="number"
                min={0}
                max={100}
                value={sa}
                onChange={(e) => setSa(Number(e.target.value))}
                className="flex h-9 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
              <span className="text-sm">%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm font-medium">Muendlich</label>
              <input
                type="number"
                min={0}
                max={100}
                value={m}
                onChange={(e) => setM(Number(e.target.value))}
                className="flex h-9 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
              <span className="text-sm">%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-sm font-medium">Mitarbeit</label>
              <input
                type="number"
                min={0}
                max={100}
                value={ma}
                onChange={(e) => setMa(Number(e.target.value))}
                className="flex h-9 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
              <span className="text-sm">%</span>
            </div>
            {!isValid && (
              <p className="text-sm text-destructive">
                Summe: {total}% (muss 100% ergeben)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!isValid || updateWeights.isPending}>
              {updateWeights.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
