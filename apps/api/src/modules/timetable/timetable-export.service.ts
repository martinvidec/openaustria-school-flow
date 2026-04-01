import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { TimetableService } from './timetable.service';
import { TimetableViewQueryDto } from './dto/timetable-view.dto';

/** Days of the week labels for PDF header */
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
};

/** Map day names to JS getDay() indices for iCal recurrence */
const DAY_INDEX: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** iCal day abbreviations for RRULE BYDAY */
const ICAL_DAYS: Record<string, string> = {
  MONDAY: 'MO',
  TUESDAY: 'TU',
  WEDNESDAY: 'WE',
  THURSDAY: 'TH',
  FRIDAY: 'FR',
  SATURDAY: 'SA',
};

/**
 * Service for exporting timetable data as PDF and iCal (.ics) files.
 *
 * PDF: A4 landscape grid with subject-colored cells, periods as rows, days as columns.
 * iCal: RFC 5545 compliant with RRULE weekly recurrence in Europe/Vienna timezone.
 */
@Injectable()
export class TimetableExportService {
  private readonly logger = new Logger(TimetableExportService.name);

  constructor(private timetableService: TimetableService) {}

  /**
   * Generate a PDF export of the timetable.
   * Layout: A4 landscape, grid table with periods as rows, days as columns.
   *
   * @param schoolId - School identifier
   * @param perspective - View type: 'teacher' | 'class' | 'room'
   * @param perspectiveId - Entity ID for the view
   * @param weekType - Optional A/B week filter
   * @returns Buffer containing the PDF document
   */
  async exportPdf(
    schoolId: string,
    perspective: string,
    perspectiveId: string,
    weekType?: string,
  ): Promise<Buffer> {
    const query: TimetableViewQueryDto = {
      perspective: perspective as 'teacher' | 'class' | 'room',
      perspectiveId,
      weekType: weekType as 'A' | 'B' | 'BOTH' | undefined,
    };

    const viewData = await this.timetableService.getView(schoolId, query);

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 30,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        const titleText = `Stundenplan - ${viewData.perspectiveName || perspective}`;
        doc.fontSize(16).font('Helvetica-Bold').text(titleText, { align: 'center' });
        doc.moveDown(0.5);

        // Filter non-break periods
        const regularPeriods = viewData.periods.filter((p) => !p.isBreak);
        const breakPeriods = viewData.periods.filter((p) => p.isBreak);
        const allPeriods = viewData.periods;
        const days = viewData.activeDays;

        if (days.length === 0 || allPeriods.length === 0) {
          doc.fontSize(12).font('Helvetica').text('Keine Stundenplandaten vorhanden.', {
            align: 'center',
          });
          doc.end();
          return;
        }

        // Grid dimensions
        const pageWidth = doc.page.width - 60; // margins
        const periodColWidth = 60;
        const dayColWidth = (pageWidth - periodColWidth) / days.length;
        const rowHeight = 40;
        const breakRowHeight = 16;
        const startX = 30;
        let startY = doc.y + 10;

        // Header row: day labels
        doc.fontSize(10).font('Helvetica-Bold');
        doc
          .rect(startX, startY, periodColWidth, 20)
          .fill('#f4f4f5')
          .stroke();
        doc.fill('#000000');
        doc
          .text('Std.', startX + 4, startY + 5, {
            width: periodColWidth - 8,
            align: 'center',
          });

        for (let d = 0; d < days.length; d++) {
          const x = startX + periodColWidth + d * dayColWidth;
          doc.rect(x, startY, dayColWidth, 20).fill('#f4f4f5').stroke();
          doc.fill('#000000');
          doc.text(DAY_LABELS[days[d]] ?? days[d], x + 4, startY + 5, {
            width: dayColWidth - 8,
            align: 'center',
          });
        }

        startY += 20;

        // Render rows for each period
        for (const period of allPeriods) {
          const isBreak = period.isBreak;
          const currentRowHeight = isBreak ? breakRowHeight : rowHeight;

          // Period label column
          const bgColor = isBreak ? '#e5e5e5' : '#f9fafb';
          doc
            .rect(startX, startY, periodColWidth, currentRowHeight)
            .fill(bgColor)
            .stroke();
          doc.fill('#000000');

          if (isBreak) {
            doc.fontSize(7).font('Helvetica');
            doc.text(
              period.label ?? 'Pause',
              startX + 2,
              startY + 3,
              { width: periodColWidth - 4, align: 'center' },
            );
          } else {
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text(
              `${period.periodNumber}.`,
              startX + 2,
              startY + 4,
              { width: periodColWidth - 4, align: 'center' },
            );
            doc.fontSize(7).font('Helvetica');
            doc.text(
              `${period.startTime}-${period.endTime}`,
              startX + 2,
              startY + 16,
              { width: periodColWidth - 4, align: 'center' },
            );
          }

          // Day columns
          for (let d = 0; d < days.length; d++) {
            const x = startX + periodColWidth + d * dayColWidth;

            if (isBreak) {
              doc.rect(x, startY, dayColWidth, currentRowHeight).fill('#e5e5e5').stroke();
              doc.fill('#000000');
            } else {
              // Find lesson for this day + period
              const lesson = viewData.lessons.find(
                (l) =>
                  l.dayOfWeek === days[d] &&
                  l.periodNumber === period.periodNumber,
              );

              if (lesson) {
                // Lesson cell with subject info
                doc.rect(x, startY, dayColWidth, currentRowHeight).fill('#eef2ff').stroke();
                doc.fill('#000000');

                // Subject abbreviation (line 1)
                doc.fontSize(9).font('Helvetica-Bold');
                doc.text(lesson.subjectAbbreviation, x + 3, startY + 3, {
                  width: dayColWidth - 6,
                  align: 'center',
                });

                // Teacher surname (line 2)
                doc.fontSize(7).font('Helvetica');
                doc.text(lesson.teacherSurname, x + 3, startY + 15, {
                  width: dayColWidth - 6,
                  align: 'center',
                });

                // Room name (line 3)
                doc.text(lesson.roomName, x + 3, startY + 25, {
                  width: dayColWidth - 6,
                  align: 'center',
                });
              } else {
                // Empty slot
                doc.rect(x, startY, dayColWidth, currentRowHeight).fill('#ffffff').stroke();
                doc.fill('#000000');
              }
            }
          }

          startY += currentRowHeight;
        }

        // Footer
        doc.moveDown(1);
        doc.fontSize(8).font('Helvetica').fill('#888888');
        const footerDate = new Date().toLocaleDateString('de-AT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        doc.text(`Erstellt am ${footerDate} | SchoolFlow`, startX, startY + 10, {
          align: 'center',
          width: pageWidth,
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate an iCal (.ics) export of the timetable.
   * Creates recurring weekly events in Europe/Vienna timezone.
   *
   * @param schoolId - School identifier
   * @param perspective - View type: 'teacher' | 'class' | 'room'
   * @param perspectiveId - Entity ID for the view
   * @param weekType - Optional A/B week filter
   * @returns RFC 5545 compliant iCal string
   */
  async exportIcal(
    schoolId: string,
    perspective: string,
    perspectiveId: string,
    weekType?: string,
  ): Promise<string> {
    const query: TimetableViewQueryDto = {
      perspective: perspective as 'teacher' | 'class' | 'room',
      perspectiveId,
      weekType: weekType as 'A' | 'B' | 'BOTH' | undefined,
    };

    const viewData = await this.timetableService.getView(schoolId, query);

    const cal = ical({
      name: `Stundenplan - ${viewData.perspectiveName || perspective}`,
      timezone: 'Europe/Vienna',
      prodId: {
        company: 'SchoolFlow',
        product: 'Stundenplan',
        language: 'DE',
      },
      method: ICalCalendarMethod.PUBLISH,
    });

    // Build a map of period times for looking up start/end
    const periodTimeMap = new Map(
      viewData.periods
        .filter((p) => !p.isBreak)
        .map((p) => [p.periodNumber, { start: p.startTime, end: p.endTime }]),
    );

    // Find the next occurrence of a given day of week
    const getNextDayDate = (dayName: string): Date => {
      const now = new Date();
      const targetDay = DAY_INDEX[dayName] ?? 1;
      const currentDay = now.getDay();
      const daysUntil = (targetDay - currentDay + 7) % 7;
      const date = new Date(now);
      date.setDate(date.getDate() + daysUntil);
      return date;
    };

    for (const lesson of viewData.lessons) {
      const periodTime = periodTimeMap.get(lesson.periodNumber);
      if (!periodTime) continue;

      // Parse time strings (HH:MM format)
      const [startHour, startMin] = periodTime.start.split(':').map(Number);
      const [endHour, endMin] = periodTime.end.split(':').map(Number);

      // Calculate the first occurrence date
      const startDate = getNextDayDate(lesson.dayOfWeek);
      startDate.setHours(startHour, startMin, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(endHour, endMin, 0, 0);

      // Determine recurrence interval (A/B week = biweekly)
      const isABWeek = lesson.weekType === 'A' || lesson.weekType === 'B';
      const interval = isABWeek ? 2 : 1;

      const icalDay = ICAL_DAYS[lesson.dayOfWeek];

      const event = cal.createEvent({
        start: startDate,
        end: endDate,
        summary: `${lesson.subjectName} (${lesson.subjectAbbreviation})`,
        location: lesson.roomName,
        description: `Lehrer: ${lesson.teacherSurname}`,
        timezone: 'Europe/Vienna',
        repeating: {
          freq: 'WEEKLY' as any,
          interval,
          byDay: icalDay ? [icalDay] : undefined,
        },
      });

      // Add week type info to description if A/B week
      if (isABWeek) {
        event.description(`Lehrer: ${lesson.teacherSurname} | ${lesson.weekType}-Woche`);
      }
    }

    this.logger.debug(
      `Generated iCal for ${perspective}/${perspectiveId} with ${viewData.lessons.length} events`,
    );

    return cal.toString();
  }
}
