import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, ArrowUpDown } from 'lucide-react';
import { useAbsenceStatistics } from '@/hooks/useExcuses';
import { useClasses } from '@/hooks/useTimetable';
import { cn } from '@/lib/utils';
import type { AbsenceStatisticsDto } from '@schoolflow/shared';

interface AbsenceStatisticsPanelProps {
  schoolId: string;
  classId: string;
}

type SortKey = keyof AbsenceStatisticsDto;
type SortDirection = 'asc' | 'desc';

/** Returns the current Austrian semester date range (Sep-Jan or Feb-Jun). */
function getSemesterDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let startDate: string;
  let endDate: string;

  if (month >= 2 && month <= 8) {
    // Second semester: Feb 1 to Jun 30
    startDate = `${year}-02-01`;
    endDate = `${year}-06-30`;
  } else {
    // First semester: Sep 1 to Jan 31
    const startYear = month >= 9 ? year : year - 1;
    startDate = `${startYear}-09-01`;
    endDate = `${startYear + 1}-01-31`;
  }

  return { startDate, endDate };
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function AbsenceStatisticsPanel({ schoolId, classId: initialClassId }: AbsenceStatisticsPanelProps) {
  const defaults = getSemesterDateRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [sortKey, setSortKey] = useState<SortKey>('studentName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: classes = [] } = useClasses(schoolId);
  const { data: statistics = [], isLoading, isError } = useAbsenceStatistics(
    schoolId,
    selectedClassId,
    startDate,
    endDate,
  );

  const sortedStatistics = useMemo(() => {
    const sorted = [...statistics].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'de')
          : bVal.localeCompare(aVal, 'de');
      }

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    return sorted;
  }, [statistics, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExportPdf = () => {
    const params = new URLSearchParams();
    params.set('classId', selectedClassId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('format', 'pdf');
    window.open(
      `/api/v1/schools/${schoolId}/classbook/statistics/class?${params}`,
      '_blank',
    );
  };

  const columns: Array<{ key: SortKey; label: string; align?: string }> = [
    { key: 'studentName', label: 'Schueler/in' },
    { key: 'totalLessons', label: 'Stunden gesamt', align: 'right' },
    { key: 'presentCount', label: 'Anwesend', align: 'right' },
    { key: 'absentUnexcusedCount', label: 'Abwesend (unentsch.)', align: 'right' },
    { key: 'absentExcusedCount', label: 'Abwesend (entsch.)', align: 'right' },
    { key: 'lateCount', label: 'Verspaetet', align: 'right' },
    { key: 'lateOver15MinCount', label: 'Verspaetet >15 Min.', align: 'right' },
    { key: 'absenceRate', label: 'Fehlquote', align: 'right' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Class selector */}
            <div className="space-y-1.5">
              <Label>Klasse</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Klasse auswaehlen" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1.5">
              <Label>Zeitraum</Label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span className="text-sm text-muted-foreground">bis</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            {/* PDF export */}
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <Download className="h-4 w-4" />
              Als PDF exportieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-sm text-muted-foreground">
                Statistiken werden geladen...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-destructive text-center">
              Statistiken konnten nicht geladen werden. Bitte versuchen Sie es spaeter erneut.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && statistics.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Keine Daten vorhanden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fuer den gewaehlten Zeitraum liegen keine Anwesenheitsdaten vor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics table */}
      {!isLoading && !isError && statistics.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground transition-colors select-none',
                          col.align === 'right' ? 'text-right' : 'text-left',
                        )}
                        onClick={() => handleSort(col.key)}
                        aria-sort={
                          sortKey === col.key
                            ? sortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStatistics.map((row) => (
                    <tr
                      key={row.studentId}
                      className={cn(
                        'border-b last:border-0 hover:bg-muted/30 transition-colors',
                        row.absenceRate > 20 && 'bg-destructive/5',
                      )}
                    >
                      <td className="px-4 py-3 font-medium">{row.studentName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.totalLessons}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.presentCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.absentUnexcusedCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.absentExcusedCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.lateCount}</td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right tabular-nums',
                          row.lateOver15MinCount > 0 && 'text-[hsl(38,92%,50%)] font-semibold',
                        )}
                      >
                        {row.lateOver15MinCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatPercentage(row.absenceRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
