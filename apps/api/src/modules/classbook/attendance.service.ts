import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { CreateClassBookEntryDto, BulkAttendanceDto, AttendanceStatusEnum } from './dto/attendance.dto';
import { DayOfWeek } from '../../config/database/generated/client.js';
import { ClassBookEventsGateway } from './classbook-events.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classBookEventsGateway: ClassBookEventsGateway,
  ) {}

  /**
   * Get or create a ClassBookEntry by composite key (classSubjectId + date + periodNumber + weekType).
   * This is the create-on-navigate pattern: the entry is created when a teacher first opens the lesson.
   */
  async getOrCreateEntry(schoolId: string, teacherId: string, dto: CreateClassBookEntryDto) {
    const weekType = dto.weekType ?? 'BOTH';
    const date = new Date(dto.date);

    // Validate dayOfWeek is a valid DayOfWeek enum value
    if (!Object.values(DayOfWeek).includes(dto.dayOfWeek as DayOfWeek)) {
      throw new BadRequestException(`Invalid dayOfWeek: ${dto.dayOfWeek}`);
    }

    const entry = await this.prisma.classBookEntry.upsert({
      where: {
        classSubjectId_date_periodNumber_weekType: {
          classSubjectId: dto.classSubjectId,
          date,
          periodNumber: dto.periodNumber,
          weekType,
        },
      },
      update: {},
      create: {
        classSubjectId: dto.classSubjectId,
        dayOfWeek: dto.dayOfWeek as DayOfWeek,
        periodNumber: dto.periodNumber,
        weekType,
        date,
        teacherId,
        schoolId,
      },
    });

    return entry;
  }

  /**
   * Resolve a TimetableLesson ID to a ClassBookEntry.
   * This is the primary entry point when a teacher clicks a timetable cell (D-03).
   * Steps:
   * 1. Look up the TimetableLesson with joined classSubject data
   * 2. Calculate today's date if not provided
   * 3. Call getOrCreateEntry with resolved fields
   * 4. Return entry with joined display fields (subjectName, className, teacherName)
   */
  async getOrCreateEntryByTimetableLesson(
    schoolId: string,
    teacherId: string,
    timetableLessonId: string,
    date?: string,
  ) {
    // Step 1: Resolve the TimetableLesson
    const lesson = await this.prisma.timetableLesson.findUnique({
      where: { id: timetableLessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Stunde nicht gefunden');
    }

    // Step 2: Get the ClassSubject with joined subject and class data
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: lesson.classSubjectId },
      include: {
        subject: true,
        schoolClass: true,
      },
    });

    if (!classSubject) {
      throw new NotFoundException('Klasse/Fach-Zuordnung nicht gefunden');
    }

    // Step 3: Determine date (default to today)
    const entryDate = date ? new Date(date) : new Date();
    // Zero out time portion for date-only comparison
    entryDate.setHours(0, 0, 0, 0);

    // Step 4: Get or create the ClassBookEntry
    const entry = await this.getOrCreateEntry(schoolId, teacherId, {
      classSubjectId: lesson.classSubjectId,
      date: entryDate.toISOString(),
      dayOfWeek: lesson.dayOfWeek,
      periodNumber: lesson.periodNumber,
      weekType: lesson.weekType,
    });

    // Step 5: Get teacher name via Person lookup
    const teacher = await this.prisma.teacher.findFirst({
      where: { schoolId, person: { keycloakUserId: teacherId } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    return {
      ...entry,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      subjectName: classSubject.subject.name,
      className: classSubject.schoolClass.name,
      teacherName: teacher ? `${teacher.person.firstName} ${teacher.person.lastName}` : undefined,
    };
  }

  /**
   * Fetch all AttendanceRecords for a ClassBookEntry, joined with student names.
   * Sorted by lastName, firstName.
   */
  async getAttendanceForEntry(classBookEntryId: string) {
    // Verify entry exists
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: { classBookEntryId },
    });

    // Get the class for this entry via classSubject
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: entry.classSubjectId },
    });

    // Get all students in the class
    const classStudents = classSubject
      ? await this.prisma.student.findMany({
          where: { classId: classSubject.classId },
          include: { person: { select: { firstName: true, lastName: true } } },
        })
      : [];

    // If no records yet, auto-initialize with PRESENT for all class students
    if (records.length === 0 && classStudents.length > 0) {
      const creates = classStudents.map((s) =>
        this.prisma.attendanceRecord.create({
          data: {
            classBookEntryId,
            studentId: s.id,
            status: 'PRESENT',
            recordedBy: 'system',
          },
        }),
      );
      await this.prisma.$transaction(creates);
      // Re-fetch the newly created records
      const newRecords = await this.prisma.attendanceRecord.findMany({
        where: { classBookEntryId },
      });

      const studentMap = new Map(
        classStudents.map((s) => [s.id, `${s.person.firstName} ${s.person.lastName}`]),
      );

      const result = newRecords.map((r) => ({
        id: r.id,
        classBookEntryId: r.classBookEntryId,
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId) ?? 'Unbekannt',
        status: r.status,
        lateMinutes: r.lateMinutes,
        excuseId: r.excuseId,
        recordedBy: r.recordedBy,
        updatedAt: r.updatedAt.toISOString(),
      }));

      result.sort((a, b) => {
        const [aFirst, ...aLastParts] = a.studentName.split(' ');
        const aLast = aLastParts.join(' ');
        const [bFirst, ...bLastParts] = b.studentName.split(' ');
        const bLast = bLastParts.join(' ');
        const lastNameCmp = aLast.localeCompare(bLast, 'de');
        return lastNameCmp !== 0 ? lastNameCmp : aFirst.localeCompare(bFirst, 'de');
      });

      return result;
    }

    // Query student names for existing records
    const studentIds = records.map((r) => r.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    const studentMap = new Map(
      students.map((s) => [s.id, `${s.person.firstName} ${s.person.lastName}`]),
    );

    // Map records with student names and sort by lastName, firstName
    const result = records.map((r) => ({
      id: r.id,
      classBookEntryId: r.classBookEntryId,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId) ?? 'Unbekannt',
      status: r.status,
      lateMinutes: r.lateMinutes,
      excuseId: r.excuseId,
      recordedBy: r.recordedBy,
      updatedAt: r.updatedAt.toISOString(),
    }));

    // Sort by student name (lastName, firstName extracted from full name)
    result.sort((a, b) => {
      const [aFirst, ...aLastParts] = a.studentName.split(' ');
      const aLast = aLastParts.join(' ');
      const [bFirst, ...bLastParts] = b.studentName.split(' ');
      const bLast = bLastParts.join(' ');
      const lastNameCmp = aLast.localeCompare(bLast, 'de');
      return lastNameCmp !== 0 ? lastNameCmp : aFirst.localeCompare(bFirst, 'de');
    });

    return result;
  }

  /**
   * Bulk update attendance records for a ClassBookEntry.
   * Uses Prisma upsert in a transaction for atomicity.
   * Validates: lateMinutes only allowed when status is LATE.
   */
  async bulkUpdateAttendance(
    classBookEntryId: string,
    teacherKeycloakId: string,
    dto: BulkAttendanceDto,
  ) {
    // Verify entry exists
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    // Validate: lateMinutes only for LATE status
    for (const record of dto.records) {
      if (record.status !== AttendanceStatusEnum.LATE && record.lateMinutes != null) {
        throw new BadRequestException(
          `lateMinutes kann nur bei Status LATE angegeben werden (Student: ${record.studentId})`,
        );
      }
    }

    // Upsert all records in a transaction
    const upserts = dto.records.map((record) =>
      this.prisma.attendanceRecord.upsert({
        where: {
          classBookEntryId_studentId: {
            classBookEntryId,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
          lateMinutes: record.status === AttendanceStatusEnum.LATE ? (record.lateMinutes ?? null) : null,
          recordedBy: teacherKeycloakId,
        },
        create: {
          classBookEntryId,
          studentId: record.studentId,
          status: record.status,
          lateMinutes: record.status === AttendanceStatusEnum.LATE ? (record.lateMinutes ?? null) : null,
          recordedBy: teacherKeycloakId,
        },
      }),
    );

    await this.prisma.$transaction(upserts);

    // Emit real-time event for connected clients
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { keycloakUserId: teacherKeycloakId } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const teacherName = teacher
      ? `${teacher.person.firstName} ${teacher.person.lastName}`
      : 'Unbekannt';

    this.classBookEventsGateway.emitAttendanceUpdated(entry.schoolId, {
      lessonId: '',
      classBookEntryId,
      teacherName,
      changeCount: dto.records.length,
    });

    // Return updated records
    return this.getAttendanceForEntry(classBookEntryId);
  }

  /**
   * Set all existing AttendanceRecords for a ClassBookEntry to PRESENT with lateMinutes null.
   * This is the "Alle anwesend" bulk action (D-01).
   */
  async setAllPresent(classBookEntryId: string, teacherKeycloakId: string) {
    // Verify entry exists
    const entry = await this.prisma.classBookEntry.findUnique({
      where: { id: classBookEntryId },
    });
    if (!entry) {
      throw new NotFoundException('Klassenbucheintrag nicht gefunden');
    }

    const updateResult = await this.prisma.attendanceRecord.updateMany({
      where: { classBookEntryId },
      data: {
        status: 'PRESENT',
        lateMinutes: null,
        recordedBy: teacherKeycloakId,
      },
    });

    // Emit real-time event for connected clients
    const teacher = await this.prisma.teacher.findFirst({
      where: { person: { keycloakUserId: teacherKeycloakId } },
      include: { person: { select: { firstName: true, lastName: true } } },
    });
    const teacherName = teacher
      ? `${teacher.person.firstName} ${teacher.person.lastName}`
      : 'Unbekannt';

    this.classBookEventsGateway.emitAttendanceUpdated(entry.schoolId, {
      lessonId: '',
      classBookEntryId,
      teacherName,
      changeCount: updateResult.count,
    });

    return this.getAttendanceForEntry(classBookEntryId);
  }
}
