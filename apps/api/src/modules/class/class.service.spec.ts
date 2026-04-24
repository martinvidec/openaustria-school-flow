import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { ClassListQueryDto } from './dto/class-list-query.dto';

/**
 * ClassService unit tests — Phase 12-02 (CLASS-01 + D-13.4 Orphan-Guard).
 *
 * Turned the Wave 0 `it.todo` stubs green after implementing remove()
 * Orphan-Guard with 6-count affectedEntities payload + sampleStudents, and
 * extending findAll with schoolYearId / yearLevels / search filters.
 */

describe('ClassService', () => {
  let service: ClassService;
  let prisma: any;

  const mockClass = {
    id: 'class-3b',
    schoolId: 'school-1',
    name: '3B',
    yearLevel: 3,
    schoolYearId: 'sy-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { students: 2 },
    groups: [],
    classSubjects: [],
  };

  const mockClassFull = {
    ...mockClass,
    students: [
      { id: 'student-1', person: { firstName: 'Maria', lastName: 'Huber' } },
    ],
    groups: [],
    classSubjects: [],
    derivationRules: [],
    klassenvorstand: null,
  };

  const mockStudent = {
    id: 'student-1',
    personId: 'person-1',
    classId: 'class-3b',
    person: { firstName: 'Maria', lastName: 'Huber' },
    schoolClass: mockClass,
  };

  const mockPrismaService = {
    schoolClass: {
      findUnique: vi.fn().mockResolvedValue(mockClassFull),
      findMany: vi.fn().mockResolvedValue([mockClass]),
      create: vi.fn().mockResolvedValue(mockClass),
      update: vi.fn().mockResolvedValue(mockClass),
      delete: vi.fn().mockResolvedValue(mockClass),
      count: vi.fn().mockResolvedValue(1),
    },
    student: {
      findUnique: vi.fn().mockResolvedValue(mockStudent),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(mockStudent),
      count: vi.fn().mockResolvedValue(0),
    },
    classSubject: {
      count: vi.fn().mockResolvedValue(0),
    },
    group: {
      count: vi.fn().mockResolvedValue(0),
    },
    groupMembership: {
      count: vi.fn().mockResolvedValue(0),
    },
    groupDerivationRule: {
      count: vi.fn().mockResolvedValue(0),
    },
    timetableLesson: {
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => Promise<unknown>)(mockPrismaService);
      }
      return arg;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a class', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(null); // No duplicate
      const dto = {
        schoolId: 'school-1',
        name: '3B',
        yearLevel: 3,
        schoolYearId: 'sy-1',
      };

      await service.create(dto);

      expect(prisma.schoolClass.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.schoolClass.create.mock.calls[0][0];
      expect(createArg.data.name).toBe('3B');
      expect(createArg.data.yearLevel).toBe(3);
      expect(createArg.data.schoolId).toBe('school-1');
    });

    it('should throw ConflictException on duplicate class name', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);

      const dto = {
        schoolId: 'school-1',
        name: '3B',
        yearLevel: 3,
        schoolYearId: 'sy-1',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for missing class', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignStudent', () => {
    it('should assign a student to a class', async () => {
      await service.assignStudent('class-3b', 'student-1');

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          data: { classId: 'class-3b' },
        }),
      );
    });
  });

  describe('removeStudent', () => {
    it('should remove a student from a class', async () => {
      await service.removeStudent('class-3b', 'student-1');

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          data: { classId: null },
        }),
      );
    });

    it('should throw NotFoundException if student is not in this class', async () => {
      prisma.student.findUnique.mockResolvedValueOnce({
        id: 'student-1',
        classId: 'other-class',
      });

      await expect(service.removeStudent('class-3b', 'student-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove — Orphan-Guard', () => {
    const CLASS_ID = 'class-3b';

    function setupClassFound(classSubjectIds: string[] = []) {
      prisma.schoolClass.findUnique.mockResolvedValue({
        id: CLASS_ID,
        classSubjects: classSubjectIds.map((id) => ({ id })),
      });
    }

    function setupCounts(counts: {
      activeStudents?: number;
      classSubjects?: number;
      groups?: number;
      groupMemberships?: number;
      timetableRuns?: number;
      derivationRules?: number;
      sampleStudents?: any[];
    }) {
      prisma.student.count.mockResolvedValue(counts.activeStudents ?? 0);
      prisma.classSubject.count.mockResolvedValue(counts.classSubjects ?? 0);
      prisma.group.count.mockResolvedValue(counts.groups ?? 0);
      prisma.groupMembership.count.mockResolvedValue(counts.groupMemberships ?? 0);
      prisma.groupDerivationRule.count.mockResolvedValue(counts.derivationRules ?? 0);
      prisma.timetableLesson.count.mockResolvedValue(counts.timetableRuns ?? 0);
      prisma.student.findMany.mockResolvedValue(counts.sampleStudents ?? []);
    }

    it('deletes class when every dependency count is zero', async () => {
      setupClassFound([]);
      setupCounts({});
      await service.remove(CLASS_ID);
      expect(prisma.schoolClass.delete).toHaveBeenCalledWith({
        where: { id: CLASS_ID },
      });
    });

    it('throws ConflictException when Student with classId exists (active)', async () => {
      setupClassFound([]);
      setupCounts({ activeStudents: 3 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.schoolClass.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when ClassSubject exists', async () => {
      setupClassFound([]);
      setupCounts({ classSubjects: 5 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when Group exists', async () => {
      setupClassFound([]);
      setupCounts({ groups: 1 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when GroupMembership exists (indirect via group.classId)', async () => {
      setupClassFound([]);
      setupCounts({ groupMemberships: 2 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when TimetableLesson references class (indirect via classSubjectId)', async () => {
      setupClassFound(['cs-1', 'cs-2']);
      setupCounts({ timetableRuns: 12 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.timetableLesson.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { classSubjectId: { in: ['cs-1', 'cs-2'] } },
        }),
      );
    });

    it('throws ConflictException when GroupDerivationRule exists for class', async () => {
      setupClassFound([]);
      setupCounts({ derivationRules: 1 });
      await expect(service.remove(CLASS_ID)).rejects.toBeInstanceOf(ConflictException);
    });

    it('payload contains extensions.affectedEntities with all 6 counts + sampleStudents', async () => {
      setupClassFound([]);
      setupCounts({
        activeStudents: 3,
        classSubjects: 10,
        groups: 2,
        groupMemberships: 6,
        timetableRuns: 0,
        derivationRules: 1,
        sampleStudents: [
          { id: 's1', person: { firstName: 'Maria', lastName: 'Huber' } },
          { id: 's2', person: { firstName: 'Felix', lastName: 'Bauer' } },
        ],
      });

      try {
        await service.remove(CLASS_ID);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as {
          extensions: { affectedEntities: Record<string, unknown> };
        };
        expect(response.extensions.affectedEntities).toEqual({
          activeStudentCount: 3,
          classSubjectCount: 10,
          groupCount: 2,
          groupMembershipCount: 6,
          timetableRunCount: 0,
          derivationRuleCount: 1,
          sampleStudents: [
            { id: 's1', name: 'Maria Huber' },
            { id: 's2', name: 'Felix Bauer' },
          ],
        });
      }
    });
  });

  describe('findAll — filters', () => {
    function makeQuery(overrides: Partial<ClassListQueryDto> = {}): ClassListQueryDto {
      return {
        schoolId: 'school-1',
        page: 1,
        limit: 20,
        get skip() {
          return 0;
        },
        ...(overrides as any),
      } as any;
    }

    it('filters by schoolYearId', async () => {
      await service.findAll(makeQuery({ schoolYearId: 'sy-1' }));
      expect(prisma.schoolClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: 'school-1', schoolYearId: 'sy-1' }),
        }),
      );
    });

    it('filters by yearLevels array (IN clause)', async () => {
      await service.findAll(makeQuery({ yearLevels: [1, 3, 5] }));
      expect(prisma.schoolClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            yearLevel: { in: [1, 3, 5] },
          }),
        }),
      );
    });

    it('filters by name substring (case-insensitive)', async () => {
      await service.findAll(makeQuery({ search: '3B' }));
      expect(prisma.schoolClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: '3B', mode: 'insensitive' },
          }),
        }),
      );
    });
  });
});
