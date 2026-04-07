import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CalendarService } from '../calendar.service';
import { PrismaService } from '../../../config/database/prisma.service';

const mockPrisma = {
  calendarToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
  person: {
    findFirst: vi.fn(),
  },
  student: {
    findFirst: vi.fn(),
  },
  teacher: {
    findFirst: vi.fn(),
  },
  timetableLesson: {
    findMany: vi.fn(),
  },
  homework: {
    findMany: vi.fn(),
  },
  exam: {
    findMany: vi.fn(),
  },
  timetableRun: {
    findFirst: vi.fn(),
  },
  classSubject: {
    findMany: vi.fn(),
  },
};

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  // IMPORT-03: iCal/ICS export
  describe('IMPORT-03: iCal calendar generation', () => {
    it('generates CalendarToken with UUID', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      mockPrisma.calendarToken.create.mockResolvedValue({
        id: 'ct-1',
        userId,
        schoolId,
        token: 'some-uuid-token',
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.generateToken(userId, schoolId);

      expect(result.token).toBeDefined();
      expect(result.calendarUrl).toContain('/api/v1/calendar/');
      expect(result.calendarUrl).toContain('.ics');
      expect(mockPrisma.calendarToken.create).toHaveBeenCalledOnce();
    });

    it('generates valid ICS content with timetable lessons', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      // User is a teacher
      mockPrisma.person.findFirst.mockResolvedValue({
        id: 'person-1',
        keycloakUserId: userId,
        teacher: { id: 'teacher-1' },
        student: null,
      });

      // Active timetable run
      mockPrisma.timetableRun.findFirst.mockResolvedValue({ id: 'run-1' });

      // Timetable lessons for the teacher
      mockPrisma.timetableLesson.findMany.mockResolvedValue([
        {
          id: 'lesson-1',
          dayOfWeek: 'MONDAY',
          periodNumber: 1,
          weekType: 'BOTH',
          room: { name: 'Raum 101' },
          classSubjectId: 'cs-1',
        },
      ]);

      // ClassSubjects for teacher's lessons
      mockPrisma.classSubject.findMany.mockResolvedValue([
        {
          id: 'cs-1',
          subject: { name: 'Deutsch', shortName: 'D' },
          schoolClass: { name: '1A' },
        },
      ]);

      // No homework or exams
      mockPrisma.homework.findMany.mockResolvedValue([]);
      mockPrisma.exam.findMany.mockResolvedValue([]);

      const ics = await service.generateIcs(userId, schoolId);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('includes homework due dates as all-day events', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      mockPrisma.person.findFirst.mockResolvedValue({
        id: 'person-1',
        keycloakUserId: userId,
        teacher: { id: 'teacher-1' },
        student: null,
      });

      mockPrisma.timetableRun.findFirst.mockResolvedValue({ id: 'run-1' });
      mockPrisma.timetableLesson.findMany.mockResolvedValue([]);
      mockPrisma.classSubject.findMany.mockResolvedValue([]);

      mockPrisma.homework.findMany.mockResolvedValue([
        {
          id: 'hw-1',
          title: 'Aufsatz schreiben',
          dueDate: new Date('2026-03-15'),
          classSubject: { subject: { name: 'Deutsch' }, schoolClass: { name: '1A' } },
        },
      ]);

      mockPrisma.exam.findMany.mockResolvedValue([]);

      const ics = await service.generateIcs(userId, schoolId);

      expect(ics).toContain('HA: Aufsatz schreiben');
    });

    it('includes exam dates as all-day events', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      mockPrisma.person.findFirst.mockResolvedValue({
        id: 'person-1',
        keycloakUserId: userId,
        teacher: null,
        student: { id: 'student-1', classId: 'class-1' },
      });

      mockPrisma.timetableRun.findFirst.mockResolvedValue({ id: 'run-1' });
      mockPrisma.timetableLesson.findMany.mockResolvedValue([]);
      mockPrisma.classSubject.findMany.mockResolvedValue([]);
      mockPrisma.homework.findMany.mockResolvedValue([]);

      mockPrisma.exam.findMany.mockResolvedValue([
        {
          id: 'exam-1',
          title: 'Mathe Schularbeit',
          date: new Date('2026-04-10'),
          duration: 50,
          classSubject: { subject: { name: 'Mathematik' }, schoolClass: { name: '1A' } },
        },
      ]);

      const ics = await service.generateIcs(userId, schoolId);

      expect(ics).toContain('Pruefung: Mathe Schularbeit');
    });

    it('uses Europe/Vienna timezone', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      mockPrisma.person.findFirst.mockResolvedValue({
        id: 'person-1',
        keycloakUserId: userId,
        teacher: { id: 'teacher-1' },
        student: null,
      });

      mockPrisma.timetableRun.findFirst.mockResolvedValue({ id: 'run-1' });
      mockPrisma.timetableLesson.findMany.mockResolvedValue([]);
      mockPrisma.classSubject.findMany.mockResolvedValue([]);
      mockPrisma.homework.findMany.mockResolvedValue([]);
      mockPrisma.exam.findMany.mockResolvedValue([]);

      const ics = await service.generateIcs(userId, schoolId);

      expect(ics).toContain('Europe/Vienna');
    });

    it('revokes token and generates new one', async () => {
      const schoolId = 'school-1';
      const userId = 'user-1';

      mockPrisma.calendarToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.calendarToken.create.mockResolvedValue({
        id: 'ct-2',
        userId,
        schoolId,
        token: 'new-uuid-token',
        createdAt: new Date('2026-01-02'),
      });

      const result = await service.revokeAndRegenerate(userId, schoolId);

      expect(mockPrisma.calendarToken.deleteMany).toHaveBeenCalledWith({
        where: { userId, schoolId },
      });
      expect(result.token).toBeDefined();
      expect(result.calendarUrl).toContain('.ics');
    });

    it('returns null for invalid/revoked token', async () => {
      mockPrisma.calendarToken.findUnique.mockResolvedValue(null);

      const result = await service.findByToken('nonexistent-token');

      expect(result).toBeNull();
    });
  });
});
