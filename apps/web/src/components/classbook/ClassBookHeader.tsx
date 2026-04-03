import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * German day names for display in classbook header.
 * Maps backend dayOfWeek enum values to localized strings.
 */
const DAY_NAMES: Record<string, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
  SATURDAY: 'Samstag',
};

interface ClassBookHeaderProps {
  subjectName: string;
  className: string;
  teacherName: string;
  dayOfWeek: string;
  periodNumber: number;
  date: string; // ISO date string
}

/**
 * Lesson context header for the classbook lesson detail page.
 *
 * Renders the heading in the format specified by UI-SPEC:
 * "{subjectName} - {className} - {dayName}, {periodNumber}. Stunde - {date}"
 *
 * Includes a back-link "Zurueck zum Stundenplan" using accent color (primary)
 * per UI-SPEC color reserved-for list item 4.
 *
 * Heading uses 20px semibold per UI-SPEC typography Heading role.
 */
export function ClassBookHeader({
  subjectName,
  className,
  teacherName,
  dayOfWeek,
  periodNumber,
  date,
}: ClassBookHeaderProps) {
  const dayName = DAY_NAMES[dayOfWeek] ?? dayOfWeek;
  const formattedDate = new Date(date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-2 mb-6">
      <Link
        to="/timetable"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zum Stundenplan
      </Link>
      <h1 className="text-[20px] font-semibold leading-[1.2]">
        {subjectName} - {className} - {dayName}, {periodNumber}. Stunde - {formattedDate}
      </h1>
      <p className="text-sm text-muted-foreground">{teacherName}</p>
    </div>
  );
}
