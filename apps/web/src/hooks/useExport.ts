import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Triggers a timetable export as PDF or iCal, downloads the result as a file.
 *
 * Uses blob download pattern: fetches the file from the API, creates an
 * object URL, triggers a hidden anchor click for download, then revokes the URL.
 *
 * @param schoolId - School identifier
 * @param format - Export format: 'pdf' or 'ical'
 * @param perspective - Current timetable perspective: 'teacher' | 'class' | 'room'
 * @param perspectiveId - Entity ID being viewed
 * @param weekType - Optional A/B week filter
 */
export async function exportTimetable(
  schoolId: string,
  format: 'pdf' | 'ical',
  perspective: string,
  perspectiveId: string,
  weekType?: string,
): Promise<void> {
  toast.info('Export wird erstellt...');
  try {
    const params = new URLSearchParams({ perspective, perspectiveId });
    if (weekType) params.set('weekType', weekType);

    const res = await apiFetch(
      `/api/v1/schools/${schoolId}/timetable/export/${format}?${params}`,
    );
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      format === 'pdf'
        ? `stundenplan-${perspective}-${new Date().toISOString().split('T')[0]}.pdf`
        : 'stundenplan.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
  }
}
