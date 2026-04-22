import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { PrismaService } from '../../config/database/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

const mockPrisma = {
  person: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teacher: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  teacherSubject: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  availabilityRule: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  teachingReduction: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  schoolClass: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  timetableLesson: {
    count: vi.fn(),
  },
  classBookEntry: {
    count: vi.fn(),
  },
  gradeEntry: {
    count: vi.fn(),
  },
  substitution: {
    count: vi.fn(),
  },
  // Orphan-Guard uses $transaction([...]) array form (returns array of results)
  $transaction: vi.fn(
    async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      // callback form used by update() — run with the same mock object
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
      }
      return arg;
    },
  ),
};

describe('TeacherService', () => {
  let service: TeacherService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TeacherService>(TeacherService);
  });

  describe('create', () => {
    it('calls prisma.person.create with nested teacher create', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Maria',
        lastName: 'Huber',
        email: 'maria@schule.at',
        subjectIds: ['sub-1', 'sub-2'],
        availabilityRules: [
          { ruleType: 'BLOCKED_PERIOD' as const, dayOfWeek: 'MONDAY' as const, periodNumbers: [1, 2], isHard: true },
        ],
        reductions: [
          { reductionType: 'KUSTODIAT' as const, werteinheiten: 2 },
        ],
      };

      const mockResult = { id: 'person-1', teacher: { id: 'teacher-1' } };
      mockPrisma.person.create.mockResolvedValue(mockResult);

      const result = await service.create(dto);

      expect(mockPrisma.person.create).toHaveBeenCalledOnce();
      const call = mockPrisma.person.create.mock.calls[0][0];
      expect(call.data.personType).toBe('TEACHER');
      expect(call.data.firstName).toBe('Maria');
      expect(call.data.lastName).toBe('Huber');
      expect(call.data.teacher.create.qualifications.create).toHaveLength(2);
      expect(call.data.teacher.create.availabilityRules.create).toHaveLength(1);
      expect(call.data.teacher.create.reductions.create).toHaveLength(1);
      expect(result).toBe(mockResult);
    });
  });

  describe('findAll', () => {
    it('returns paginated teachers filtered by schoolId', async () => {
      const teachers = [{ id: 'teacher-1' }, { id: 'teacher-2' }];
      mockPrisma.teacher.findMany.mockResolvedValue(teachers);
      mockPrisma.teacher.count.mockResolvedValue(2);

      const pagination = new PaginationQueryDto();
      pagination.page = 1;
      pagination.limit = 20;

      const result = await service.findAll('school-1', pagination);

      expect(mockPrisma.teacher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: 'school-1' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns teacher when found', async () => {
      const teacher = { id: 'teacher-1', person: { firstName: 'Maria' } };
      mockPrisma.teacher.findUnique.mockResolvedValue(teacher);

      const result = await service.findOne('teacher-1');
      expect(result).toBe(teacher);
    });

    it('throws NotFoundException when teacher not found', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove — Orphan-Guard', () => {
    const TEACHER_ID = 'teacher-1';
    const PERSON_ID = 'person-1';

    function setupTeacherFound() {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: TEACHER_ID,
        personId: PERSON_ID,
        person: { firstName: 'Maria', lastName: 'Huber' },
      });
    }

    function setupCounts(counts: {
      klassenvorstand?: number;
      lesson?: number;
      classbook?: number;
      grade?: number;
      originalSub?: number;
      substituteSub?: number;
      classes?: Array<{ id: string; name: string }>;
    }) {
      mockPrisma.schoolClass.count.mockResolvedValue(counts.klassenvorstand ?? 0);
      mockPrisma.timetableLesson.count.mockResolvedValue(counts.lesson ?? 0);
      mockPrisma.classBookEntry.count.mockResolvedValue(counts.classbook ?? 0);
      mockPrisma.gradeEntry.count.mockResolvedValue(counts.grade ?? 0);
      mockPrisma.substitution.count
        .mockResolvedValueOnce(counts.originalSub ?? 0)
        .mockResolvedValueOnce(counts.substituteSub ?? 0);
      mockPrisma.schoolClass.findMany.mockResolvedValue(counts.classes ?? []);
    }

    it('deletes teacher + person when zero dependents (204)', async () => {
      setupTeacherFound();
      setupCounts({});

      await service.remove(TEACHER_ID);

      expect(mockPrisma.teacher.delete).toHaveBeenCalledWith({ where: { id: TEACHER_ID } });
      expect(mockPrisma.person.delete).toHaveBeenCalledWith({ where: { id: PERSON_ID } });
    });

    it('throws ConflictException when klassenvorstandId is set on SchoolClass', async () => {
      setupTeacherFound();
      setupCounts({
        klassenvorstand: 2,
        classes: [
          { id: 'c1', name: '3A' },
          { id: 'c2', name: '3B' },
        ],
      });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrisma.teacher.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when TimetableLesson.teacherId references teacher (denormalized)', async () => {
      setupTeacherFound();
      setupCounts({ lesson: 12 });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when ClassBookEntry.teacherId references teacher', async () => {
      setupTeacherFound();
      setupCounts({ classbook: 7 });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when GradeEntry.teacherId references teacher', async () => {
      setupTeacherFound();
      setupCounts({ grade: 3 });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when Substitution.originalTeacherId references teacher', async () => {
      setupTeacherFound();
      setupCounts({ originalSub: 1 });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when Substitution.substituteTeacherId references teacher', async () => {
      setupTeacherFound();
      setupCounts({ substituteSub: 4 });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('payload contains extensions.affectedEntities.{klassenvorstandFor, lessonCount, classbookCount, gradeCount, substitutionCount}', async () => {
      setupTeacherFound();
      setupCounts({
        klassenvorstand: 1,
        lesson: 10,
        classbook: 5,
        grade: 2,
        originalSub: 3,
        substituteSub: 4,
        classes: [{ id: 'c1', name: '3A' }],
      });

      try {
        await service.remove(TEACHER_ID);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as {
          extensions: { affectedEntities: Record<string, unknown> };
        };
        expect(response.extensions.affectedEntities).toEqual({
          klassenvorstandFor: [{ id: 'c1', name: '3A' }],
          lessonCount: 10,
          classbookCount: 5,
          gradeCount: 2,
          substitutionCount: 7, // originalSub + substituteSub
        });
      }
    });

    it('affectedEntities.klassenvorstandFor array is capped at 50 entries', async () => {
      setupTeacherFound();
      const fiftyClasses = Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        name: `Klasse ${i}`,
      }));
      setupCounts({ klassenvorstand: 120, classes: fiftyClasses });

      await expect(service.remove(TEACHER_ID)).rejects.toBeInstanceOf(ConflictException);

      // Assert Prisma findMany was called with take: 50 (the cap)
      expect(mockPrisma.schoolClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          where: { klassenvorstandId: TEACHER_ID },
        }),
      );
    });
  });

  describe('getEffectiveCapacity', () => {
    it('returns correct Werteinheiten calculation with reductions', async () => {
      const teacher = {
        id: 'teacher-1',
        werteinheitenTarget: 20,
        reductions: [
          { werteinheiten: 2 },
          { werteinheiten: 1 },
        ],
      };
      mockPrisma.teacher.findUnique.mockResolvedValue(teacher);

      const result = await service.getEffectiveCapacity('teacher-1');

      expect(result.werteinheitenTarget).toBe(20);
      expect(result.totalReductions).toBe(3);
      expect(result.effectiveWerteinheiten).toBe(17);
      expect(result.maxWeeklyHours).toBe(17);
    });

    it('throws NotFoundException when teacher not found', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.getEffectiveCapacity('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
