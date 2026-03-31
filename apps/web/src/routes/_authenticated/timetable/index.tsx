import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/timetable/')({
  component: TimetablePage,
});

function TimetablePage() {
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-[1.2] mb-6">
        Stundenplan
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Kein Stundenplan vorhanden</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Es wurde noch kein Stundenplan generiert. Starten Sie die
            automatische Erstellung unter Verwaltung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
