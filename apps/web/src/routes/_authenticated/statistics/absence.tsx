import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AbsenceStatisticsPanel } from '@/components/classbook/AbsenceStatisticsPanel';
import { useSchoolContext } from '@/stores/school-context-store';
import { useClasses } from '@/hooks/useTimetable';

export const Route = createFileRoute('/_authenticated/statistics/absence')({
  component: AbsenceStatisticsPage,
});

function AbsenceStatisticsPage() {
  const schoolId = useSchoolContext((s) => s.schoolId) ?? '';
  const { data: classes = [], isLoading: classesLoading } = useClasses(schoolId);

  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Auto-select first class once loaded
  if (!selectedClassId && classes.length > 0) {
    setSelectedClassId(classes[0].id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] font-semibold leading-[1.2]">
        Abwesenheitsstatistik
      </h1>

      {classesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-muted-foreground">
            Klassen werden geladen...
          </span>
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine Klassen verfuegbar.
        </p>
      ) : selectedClassId ? (
        <AbsenceStatisticsPanel
          schoolId={schoolId}
          classId={selectedClassId}
        />
      ) : null}
    </div>
  );
}
