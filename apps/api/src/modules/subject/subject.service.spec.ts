import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PrismaService } from '../../config/database/prisma.service';

describe('SubjectService', () => {
  let service: SubjectService;
  let prisma: any;

  const mockSubject = {
    id: 'subj-1',
    schoolId: 'school-1',
    name: 'Deutsch',
    shortName: 'D',
    subjectType: 'PFLICHT',
    lehrverpflichtungsgruppe: 'I',
    werteinheitenFactor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { classSubjects: 2 },
  };

  const mockClassSubject = {
    id: 'cs-1',
    classId: 'class-1',
    subjectId: 'subj-1',
    groupId: null,
    weeklyHours: 4,
    isCustomized: true,
    subject: mockSubject,
    schoolClass: { id: 'class-1', name: '1A' },
  };

  const mockPrismaService = {
    subject: {
      create: vi.fn().mockResolvedValue(mockSubject),
      findMany: vi.fn().mockResolvedValue([mockSubject]),
      findUnique: vi.fn().mockResolvedValue(mockSubject),
      update: vi.fn().mockResolvedValue(mockSubject),
      delete: vi.fn().mockResolvedValue(mockSubject),
      count: vi.fn().mockResolvedValue(1),
    },
    classSubject: {
      create: vi.fn().mockResolvedValue(mockClassSubject),
      findFirst: vi.fn().mockResolvedValue(mockClassSubject),
      findMany: vi.fn().mockResolvedValue([mockClassSubject]),
      update: vi.fn().mockResolvedValue({ ...mockClassSubject, weeklyHours: 5, isCustomized: true }),
      delete: vi.fn().mockResolvedValue(mockClassSubject),
      count: vi.fn().mockResolvedValue(0),
    },
    teacherSubject: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    timetableLesson: {
      count: vi.fn().mockResolvedValue(0),
    },
    homework: {
      count: vi.fn().mockResolvedValue(0),
    },
    exam: {
      count: vi.fn().mockResolvedValue(0),
    },
    // Orphan-Guard uses $transaction([...]) array form (Promise.all semantics).
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => Promise<unknown>)(
          mockPrismaService,
        );
      }
      return arg;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubjectService>(SubjectService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a subject successfully', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValueOnce(null); // no duplicate
      mockPrismaService.subject.create.mockResolvedValueOnce(mockSubject);

      const result = await service.create({
        schoolId: 'school-1',
        name: 'Deutsch',
        shortName: 'D',
        subjectType: 'PFLICHT' as any,
      });

      expect(result).toEqual(mockSubject);
      expect(mockPrismaService.subject.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException on duplicate shortName per school', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValueOnce(mockSubject); // duplicate exists

      await expect(
        service.create({
          schoolId: 'school-1',
          name: 'Deutsch',
          shortName: 'D',
          subjectType: 'PFLICHT' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return subject with classSubjects', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValueOnce({
        ...mockSubject,
        classSubjects: [mockClassSubject],
        teacherSubjects: [],
      });

      const result = await service.findOne('subj-1');
      expect(result.classSubjects).toHaveLength(1);
    });

    it('should throw NotFoundException for missing subject', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addToClass', () => {
    it('should create ClassSubject with isCustomized=true', async () => {
      await service.addToClass('subj-1', 'class-1', 4);

      expect(mockPrismaService.classSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subjectId: 'subj-1',
            classId: 'class-1',
            weeklyHours: 4,
            isCustomized: true,
          }),
        }),
      );
    });

    it('should pass groupId when provided', async () => {
      await service.addToClass('subj-1', 'class-1', 4, 'group-1');

      expect(mockPrismaService.classSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            groupId: 'group-1',
          }),
        }),
      );
    });
  });

  describe('updateClassHours', () => {
    it('should update weekly hours and set isCustomized=true', async () => {
      await service.updateClassHours('cs-1', 5);

      expect(mockPrismaService.classSubject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cs-1' },
          data: {
            weeklyHours: 5,
            isCustomized: true,
          },
        }),
      );
    });
  });

  describe('getClassSubjects', () => {
    it('should return subjects with hours for a class', async () => {
      const result = await service.getClassSubjects('class-1');

      expect(result).toHaveLength(1);
      expect(result[0].weeklyHours).toBe(4);
      expect(result[0].subject).toBeDefined();
      expect(mockPrismaService.classSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classId: 'class-1' },
        }),
      );
    });
  });

  describe('removeFromClass', () => {
    it('should remove class-subject assignment', async () => {
      await service.removeFromClass('subj-1', 'class-1');

      expect(mockPrismaService.classSubject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subjectId: 'subj-1', classId: 'class-1' },
        }),
      );
      expect(mockPrismaService.classSubject.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cs-1' } }),
      );
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockPrismaService.classSubject.findFirst.mockResolvedValueOnce(null);
      await expect(service.removeFromClass('subj-1', 'class-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // SUBJECT-05 Orphan-Guard — $transaction array form + RFC 9457 payload.
  describe('remove — Orphan-Guard (SUBJECT-05)', () => {
    const classA = { id: 'class-a', name: '1A' };
    const classB = { id: 'class-b', name: '1B' };
    const teacherA = {
      id: 'teacher-a',
      person: { firstName: 'Maria', lastName: 'Huber' },
    };

    function seedCounts(overrides: {
      classSubjectCount?: number;
      teacherSubjectCount?: number;
      timetableLessonCount?: number;
      homeworkCount?: number;
      examCount?: number;
      affectedClassSubjects?: Array<{ schoolClass: { id: string; name: string } }>;
      affectedTeacherSubjects?: Array<{
        teacher: { id: string; person: { firstName: string; lastName: string } };
      }>;
      dependentClassSubjectIds?: Array<{ id: string }>;
    } = {}) {
      // Pre-query: gather ClassSubject IDs that depend on the subject.
      // The .remove method calls classSubject.findMany({select:{id:true}})
      // BEFORE the $transaction, then uses the IDs to filter downstream
      // dependent-entity counts (TimetableLesson/Homework/Exam).
      mockPrismaService.classSubject.findMany.mockResolvedValueOnce(
        overrides.dependentClassSubjectIds ??
          (overrides.classSubjectCount && overrides.classSubjectCount > 0
            ? [{ id: 'cs-1' }]
            : []),
      );
      mockPrismaService.classSubject.count.mockResolvedValueOnce(
        overrides.classSubjectCount ?? 0,
      );
      mockPrismaService.teacherSubject.count.mockResolvedValueOnce(
        overrides.teacherSubjectCount ?? 0,
      );
      mockPrismaService.timetableLesson.count.mockResolvedValueOnce(
        overrides.timetableLessonCount ?? 0,
      );
      mockPrismaService.homework.count.mockResolvedValueOnce(
        overrides.homeworkCount ?? 0,
      );
      mockPrismaService.exam.count.mockResolvedValueOnce(overrides.examCount ?? 0);
      // Second findMany is the affected-classes query with `schoolClass` select
      mockPrismaService.classSubject.findMany.mockResolvedValueOnce(
        overrides.affectedClassSubjects ?? [],
      );
      mockPrismaService.teacherSubject.findMany.mockResolvedValueOnce(
        overrides.affectedTeacherSubjects ?? [],
      );
    }

    beforeEach(() => {
      // findOne() in .remove calls subject.findUnique — default returns mockSubject
      mockPrismaService.subject.findUnique.mockResolvedValue({
        ...mockSubject,
        classSubjects: [],
        teacherSubjects: [],
      });
    });

    it('deletes subject when zero dependents', async () => {
      seedCounts({});
      await service.remove('subj-1');
      expect(mockPrismaService.subject.delete).toHaveBeenCalledWith({
        where: { id: 'subj-1' },
      });
    });

    it('throws ConflictException when ClassSubject references subject', async () => {
      seedCounts({
        classSubjectCount: 1,
        affectedClassSubjects: [{ schoolClass: classA }],
      });
      await expect(service.remove('subj-1')).rejects.toThrow(ConflictException);
      expect(mockPrismaService.subject.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when TeacherSubject references subject', async () => {
      seedCounts({
        teacherSubjectCount: 1,
        affectedTeacherSubjects: [{ teacher: teacherA }],
      });
      await expect(service.remove('subj-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when TimetableLesson references via ClassSubject', async () => {
      seedCounts({
        timetableLessonCount: 3,
        dependentClassSubjectIds: [{ id: 'cs-1' }],
      });
      await expect(service.remove('subj-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when Homework references via ClassSubject', async () => {
      seedCounts({
        homeworkCount: 2,
        dependentClassSubjectIds: [{ id: 'cs-1' }],
      });
      await expect(service.remove('subj-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when Exam references via ClassSubject', async () => {
      seedCounts({
        examCount: 1,
        dependentClassSubjectIds: [{ id: 'cs-1' }],
      });
      await expect(service.remove('subj-1')).rejects.toThrow(ConflictException);
    });

    it('payload contains extensions.affectedEntities.{affectedClasses, affectedTeachers, lessonCount, homeworkCount, examCount}', async () => {
      seedCounts({
        classSubjectCount: 2,
        teacherSubjectCount: 1,
        timetableLessonCount: 5,
        homeworkCount: 3,
        examCount: 2,
        affectedClassSubjects: [
          { schoolClass: classA },
          { schoolClass: classB },
        ],
        affectedTeacherSubjects: [{ teacher: teacherA }],
      });
      try {
        await service.remove('subj-1');
        expect.unreachable('remove() should have thrown ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as {
          type: string;
          title: string;
          status: number;
          detail: string;
          extensions: {
            affectedEntities: {
              affectedClasses: Array<{ id: string; name: string }>;
              affectedTeachers: Array<{ id: string; name: string }>;
              lessonCount: number;
              homeworkCount: number;
              examCount: number;
            };
          };
        };
        expect(response.type).toBe('https://schoolflow.dev/errors/subject-has-dependents');
        expect(response.title).toBe('Fach hat Abhängigkeiten');
        expect(response.status).toBe(409);
        expect(response.detail).toContain('zugeordnet');
        const affected = response.extensions.affectedEntities;
        expect(affected.affectedClasses).toEqual([classA, classB]);
        expect(affected.affectedTeachers).toEqual([
          { id: 'teacher-a', name: 'Maria Huber' },
        ]);
        expect(affected.lessonCount).toBe(5);
        expect(affected.homeworkCount).toBe(3);
        expect(affected.examCount).toBe(2);
      }
    });

    it('affectedClasses + affectedTeachers arrays capped at 50 entries each', async () => {
      // Simulate Prisma `take: 50` contract — when backend returns 50 entries,
      // the payload contains exactly 50 (not more). The Prisma `take: 50`
      // clause enforces this; this test verifies the service passes through
      // what Prisma returns without padding or truncating further.
      const fiftyClassSubjects = Array.from({ length: 50 }, (_, i) => ({
        schoolClass: { id: `class-${i}`, name: `Class ${i}` },
      }));
      const fiftyTeacherSubjects = Array.from({ length: 50 }, (_, i) => ({
        teacher: {
          id: `teacher-${i}`,
          person: { firstName: 'F', lastName: `L${i}` },
        },
      }));
      seedCounts({
        classSubjectCount: 200,
        teacherSubjectCount: 200,
        affectedClassSubjects: fiftyClassSubjects,
        affectedTeacherSubjects: fiftyTeacherSubjects,
      });

      try {
        await service.remove('subj-1');
        expect.unreachable('remove() should have thrown ConflictException');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as {
          extensions: {
            affectedEntities: {
              affectedClasses: unknown[];
              affectedTeachers: unknown[];
            };
          };
        };
        expect(response.extensions.affectedEntities.affectedClasses.length).toBeLessThanOrEqual(50);
        expect(response.extensions.affectedEntities.affectedTeachers.length).toBeLessThanOrEqual(50);
      }

      // Also verify the findMany calls were issued with take: 50 (contract)
      expect(mockPrismaService.classSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
      expect(mockPrismaService.teacherSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });
});
