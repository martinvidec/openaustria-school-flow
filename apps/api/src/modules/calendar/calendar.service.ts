import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { PrismaService } from '../../config/database/prisma.service';

/**
 * IMPORT-03 -- iCal calendar subscription service.
 *
 * Responsibilities:
 *  - Generate and manage CalendarToken records (one per user per school)
 *  - Generate ICS content combining timetable lessons, homework due dates,
 *    and exam dates for a given user
 *  - All-day events for homework ("HA: ...") and exams ("Pruefung: ...")
 *  - Recurring weekly events for timetable lessons in Europe/Vienna timezone
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Token management
  // ---------------------------------------------------------------------------

  async generateToken(
    userId: string,
    schoolId: string,
  ): Promise<{ id: string; token: string; calendarUrl: string; createdAt: string }> {
    const token = crypto.randomUUID();
    const record = await this.prisma.calendarToken.create({
      data: { userId, schoolId, token },
    });

    return {
      id: record.id,
      token: record.token,
      calendarUrl: `/api/v1/calendar/${record.token}.ics`,
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt),
    };
  }

  async findByToken(token: string) {
    return this.prisma.calendarToken.findUnique({ where: { token } });
  }

  async findTokenForUser(userId: string, schoolId: string) {
    return this.prisma.calendarToken.findFirst({ where: { userId, schoolId } });
  }

  async revokeAndRegenerate(
    userId: string,
    schoolId: string,
  ): Promise<{ id: string; token: string; calendarUrl: string; createdAt: string }> {
    await this.prisma.calendarToken.deleteMany({ where: { userId, schoolId } });
    return this.generateToken(userId, schoolId);
  }

  // ---------------------------------------------------------------------------
  // ICS generation
  // ---------------------------------------------------------------------------

  async generateIcs(userId: string, schoolId: string): Promise<string> {
    const cal = ical({
      name: 'SchoolFlow Kalender',
      timezone: 'Europe/Vienna',
      prodId: {
        company: 'SchoolFlow',
        product: 'Kalender',
        language: 'DE',
      },
      method: ICalCalendarMethod.PUBLISH,
    });

    // Resolve the person for this keycloak user
    const person = await this.prisma.person.findFirst({
      where: { keycloakUserId: userId, schoolId },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!person) {
      this.logger.warn(`No person found for userId=${userId} in school=${schoolId}`);
      return cal.toString();
    }

    // Determine class IDs for this user
    const classIds: string[] = [];
    let teacherId: string | null = null;

    if (person.teacher) {
      teacherId = person.teacher.id;
    }

    if (person.student && person.student.classId) {
      classIds.push(person.student.classId);
    }

    // --- Timetable lessons ---
    const activeRun = await this.prisma.timetableRun.findFirst({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeRun) {
      const lessonWhere: Record<string, unknown> = { runId: activeRun.id };
      if (teacherId) {
        lessonWhere.teacherId = teacherId;
      }

      const lessons = await this.prisma.timetableLesson.findMany({
        where: lessonWhere,
        include: { room: true },
      });

      // Resolve classSubject info for lessons
      const csIds = [...new Set(lessons.map((l: any) => l.classSubjectId))];
      const classSubjects = await this.prisma.classSubject.findMany({
        where: { id: { in: csIds } },
        include: { subject: true, schoolClass: true },
      });
      const csMap = new Map(classSubjects.map((cs: any) => [cs.id, cs]));

      // Add student class IDs from timetable lessons if teacher
      if (teacherId) {
        for (const cs of classSubjects) {
          if ((cs as any).classId && !classIds.includes((cs as any).classId)) {
            classIds.push((cs as any).classId);
          }
        }
      }

      for (const lesson of lessons) {
        const cs = csMap.get((lesson as any).classSubjectId);
        const subjectName = cs?.subject?.name ?? 'Unbekannt';
        const className = cs?.schoolClass?.name ?? '';
        const roomName = (lesson as any).room?.name ?? '';

        cal.createEvent({
          summary: `${subjectName} (${className})`,
          location: roomName,
          description: `Raum: ${roomName}`,
          timezone: 'Europe/Vienna',
          start: new Date(),
          end: new Date(),
          repeating: {
            freq: 'WEEKLY' as any,
            interval: (lesson as any).weekType === 'A' || (lesson as any).weekType === 'B' ? 2 : 1,
          },
        });
      }
    }

    // --- Homework due dates ---
    const homeworkWhere: Record<string, unknown> = { schoolId };
    if (classIds.length > 0) {
      homeworkWhere.classSubject = { classId: { in: classIds } };
    } else if (teacherId) {
      homeworkWhere.createdBy = userId;
    }

    const homeworkItems = await this.prisma.homework.findMany({
      where: homeworkWhere,
      include: { classSubject: { include: { subject: true, schoolClass: true } } },
      orderBy: { dueDate: 'asc' },
    });

    for (const hw of homeworkItems) {
      const subjectName = (hw as any).classSubject?.subject?.name ?? '';
      const dueDate = hw.dueDate instanceof Date ? hw.dueDate : new Date(hw.dueDate as any);

      cal.createEvent({
        summary: `HA: ${hw.title}`,
        description: `Fach: ${subjectName}`,
        allDay: true,
        start: dueDate,
        timezone: 'Europe/Vienna',
      });
    }

    // --- Exam dates ---
    const examWhere: Record<string, unknown> = { schoolId };
    if (classIds.length > 0) {
      examWhere.classId = { in: classIds };
    }

    const exams = await this.prisma.exam.findMany({
      where: examWhere,
      include: { classSubject: { include: { subject: true, schoolClass: true } } },
      orderBy: { date: 'asc' },
    });

    for (const exam of exams) {
      const subjectName = (exam as any).classSubject?.subject?.name ?? '';
      const duration = (exam as any).duration;
      const examDate = exam.date instanceof Date ? exam.date : new Date(exam.date as any);

      cal.createEvent({
        summary: `Pruefung: ${exam.title}`,
        description: `Fach: ${subjectName}, Dauer: ${duration ?? '-'} min`,
        allDay: true,
        start: examDate,
        timezone: 'Europe/Vienna',
      });
    }

    this.logger.debug(
      `Generated ICS for userId=${userId}, schoolId=${schoolId}: ` +
        `${homeworkItems.length} homework, ${exams.length} exams`,
    );

    return cal.toString();
  }
}
