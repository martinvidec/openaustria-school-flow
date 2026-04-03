import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { AbsenceStatisticsQueryDto, StudentAbsenceQueryDto } from './dto/statistics.dto';
import type { AbsenceStatisticsDto } from '@schoolflow/shared';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current Austrian school semester date range.
   * Austrian school year: Semester 1 = Sep 1 to Jan 31, Semester 2 = Feb 1 to Jun 30.
   * July/August defaults to the previous Semester 2 (Feb 1 to Jun 30).
   */
  getSemesterDateRange(): { start: Date; end: Date } {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based
    const year = now.getFullYear();

    if (month >= 9 || month === 1) {
      // Semester 1: Sep 1 to Jan 31
      const startYear = month === 1 ? year - 1 : year;
      const endYear = month === 1 ? year : year + 1;
      return {
        start: new Date(startYear, 8, 1), // Sep 1
        end: new Date(endYear, 0, 31),    // Jan 31
      };
    }

    if (month >= 2 && month <= 6) {
      // Semester 2: Feb 1 to Jun 30
      return {
        start: new Date(year, 1, 1),  // Feb 1
        end: new Date(year, 5, 30),   // Jun 30
      };
    }

    // July/August: default to previous Semester 2
    return {
      start: new Date(year, 1, 1),  // Feb 1
      end: new Date(year, 5, 30),   // Jun 30
    };
  }

  /**
   * Get per-student absence statistics for a class.
   * Implements BOOK-05 with D-04 Schulunterrichtsgesetz: late >15min counts as absent.
   */
  async getClassStatistics(schoolId: string, query: AbsenceStatisticsQueryDto): Promise<AbsenceStatisticsDto[]> {
    // 1. Resolve date range
    const semesterRange = this.getSemesterDateRange();
    const startDate = query.startDate ? new Date(query.startDate) : semesterRange.start;
    const endDate = query.endDate ? new Date(query.endDate) : semesterRange.end;

    // 2. Fetch all students in the class
    const students = await this.prisma.student.findMany({
      where: { classId: query.classId },
      include: { person: { select: { firstName: true, lastName: true } } },
    });

    if (students.length === 0) {
      return [];
    }

    const studentIds = students.map((s) => s.id);

    // 3. Fetch all ClassBookEntries for this class's classSubjects within date range
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: query.classId },
      select: { id: true },
    });
    const classSubjectIds = classSubjects.map((cs) => cs.id);

    const entries = await this.prisma.classBookEntry.findMany({
      where: {
        schoolId,
        classSubjectId: { in: classSubjectIds },
        date: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    if (entryIds.length === 0) {
      // No entries -- return zero stats for all students
      return students
        .map((s) => ({
          studentId: s.id,
          studentName: `${s.person.firstName} ${s.person.lastName}`,
          totalLessons: 0,
          presentCount: 0,
          absentUnexcusedCount: 0,
          absentExcusedCount: 0,
          lateCount: 0,
          lateOver15MinCount: 0,
          absenceRate: 0,
        }))
        .sort((a, b) => {
          const cmp = a.studentName.split(' ').slice(1).join(' ').localeCompare(
            b.studentName.split(' ').slice(1).join(' '), 'de',
          );
          return cmp !== 0 ? cmp : a.studentName.localeCompare(b.studentName, 'de');
        });
    }

    // 4. Fetch all AttendanceRecords for those entries and students
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        classBookEntryId: { in: entryIds },
        studentId: { in: studentIds },
      },
    });

    // 5. Aggregate per student
    const totalLessonsPerClass = entryIds.length;

    const statsMap = new Map<string, {
      presentCount: number;
      absentUnexcusedCount: number;
      absentExcusedCount: number;
      lateCount: number;
      lateOver15MinCount: number;
      totalRecords: number;
    }>();

    // Initialize all students
    for (const s of students) {
      statsMap.set(s.id, {
        presentCount: 0,
        absentUnexcusedCount: 0,
        absentExcusedCount: 0,
        lateCount: 0,
        lateOver15MinCount: 0,
        totalRecords: 0,
      });
    }

    for (const r of records) {
      const stat = statsMap.get(r.studentId);
      if (!stat) continue;

      stat.totalRecords++;

      switch (r.status) {
        case 'PRESENT':
          stat.presentCount++;
          break;
        case 'ABSENT':
          stat.absentUnexcusedCount++;
          break;
        case 'EXCUSED':
          stat.absentExcusedCount++;
          break;
        case 'LATE':
          stat.lateCount++;
          // D-04 Schulunterrichtsgesetz: >15min late counts as absent in statistics
          if (r.lateMinutes != null && r.lateMinutes > 15) {
            stat.lateOver15MinCount++;
          }
          break;
      }
    }

    // 6. Build result sorted by lastName, firstName
    const result: AbsenceStatisticsDto[] = students.map((s) => {
      const stat = statsMap.get(s.id)!;
      const totalLessons = stat.totalRecords > 0 ? stat.totalRecords : totalLessonsPerClass;
      // Absence rate: (unexcused + excused + lateOver15Min) / totalLessons * 100
      const absenceRate = totalLessons > 0
        ? Math.round(((stat.absentUnexcusedCount + stat.absentExcusedCount + stat.lateOver15MinCount) / totalLessons) * 10000) / 100
        : 0;

      return {
        studentId: s.id,
        studentName: `${s.person.firstName} ${s.person.lastName}`,
        totalLessons,
        presentCount: stat.presentCount,
        absentUnexcusedCount: stat.absentUnexcusedCount,
        absentExcusedCount: stat.absentExcusedCount,
        lateCount: stat.lateCount,
        lateOver15MinCount: stat.lateOver15MinCount,
        absenceRate,
      };
    });

    // Sort by lastName, firstName (German locale)
    result.sort((a, b) => {
      const aNames = a.studentName.split(' ');
      const bNames = b.studentName.split(' ');
      const aLast = aNames.slice(1).join(' ');
      const bLast = bNames.slice(1).join(' ');
      const lastCmp = aLast.localeCompare(bLast, 'de');
      return lastCmp !== 0 ? lastCmp : aNames[0].localeCompare(bNames[0], 'de');
    });

    return result;
  }

  /**
   * Get absence statistics for a single student (parent/student view).
   */
  async getStudentStatistics(schoolId: string, query: StudentAbsenceQueryDto): Promise<AbsenceStatisticsDto> {
    // Resolve date range
    const semesterRange = this.getSemesterDateRange();
    const startDate = query.startDate ? new Date(query.startDate) : semesterRange.start;
    const endDate = query.endDate ? new Date(query.endDate) : semesterRange.end;

    // Get student with class and person info
    const student = await this.prisma.student.findUnique({
      where: { id: query.studentId },
      include: {
        person: { select: { firstName: true, lastName: true } },
      },
    });

    if (!student) {
      return {
        studentId: query.studentId,
        studentName: 'Unbekannt',
        totalLessons: 0,
        presentCount: 0,
        absentUnexcusedCount: 0,
        absentExcusedCount: 0,
        lateCount: 0,
        lateOver15MinCount: 0,
        absenceRate: 0,
      };
    }

    // Find classSubjects for the student's class
    const classSubjectIds = student.classId
      ? (await this.prisma.classSubject.findMany({
          where: { classId: student.classId },
          select: { id: true },
        })).map((cs) => cs.id)
      : [];

    // Fetch ClassBookEntries in range
    const entries = await this.prisma.classBookEntry.findMany({
      where: {
        schoolId,
        classSubjectId: { in: classSubjectIds },
        date: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    if (entryIds.length === 0) {
      return {
        studentId: student.id,
        studentName: `${student.person.firstName} ${student.person.lastName}`,
        totalLessons: 0,
        presentCount: 0,
        absentUnexcusedCount: 0,
        absentExcusedCount: 0,
        lateCount: 0,
        lateOver15MinCount: 0,
        absenceRate: 0,
      };
    }

    // Fetch attendance records for this student
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        classBookEntryId: { in: entryIds },
        studentId: student.id,
      },
    });

    let presentCount = 0;
    let absentUnexcusedCount = 0;
    let absentExcusedCount = 0;
    let lateCount = 0;
    let lateOver15MinCount = 0;

    for (const r of records) {
      switch (r.status) {
        case 'PRESENT':
          presentCount++;
          break;
        case 'ABSENT':
          absentUnexcusedCount++;
          break;
        case 'EXCUSED':
          absentExcusedCount++;
          break;
        case 'LATE':
          lateCount++;
          if (r.lateMinutes != null && r.lateMinutes > 15) {
            lateOver15MinCount++;
          }
          break;
      }
    }

    const totalLessons = records.length > 0 ? records.length : entryIds.length;
    const absenceRate = totalLessons > 0
      ? Math.round(((absentUnexcusedCount + absentExcusedCount + lateOver15MinCount) / totalLessons) * 10000) / 100
      : 0;

    return {
      studentId: student.id,
      studentName: `${student.person.firstName} ${student.person.lastName}`,
      totalLessons,
      presentCount,
      absentUnexcusedCount,
      absentExcusedCount,
      lateCount,
      lateOver15MinCount,
      absenceRate,
    };
  }
}
