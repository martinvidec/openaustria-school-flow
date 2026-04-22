import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
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
  $transaction: vi.fn((cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)),
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
    it.todo('deletes teacher + person when zero dependents (204)');
    it.todo('throws ConflictException when klassenvorstandId is set on SchoolClass');
    it.todo('throws ConflictException when TimetableLesson.teacherId references teacher (denormalized)');
    it.todo('throws ConflictException when ClassBookEntry.teacherId references teacher');
    it.todo('throws ConflictException when GradeEntry.teacherId references teacher');
    it.todo('throws ConflictException when Substitution.originalTeacherId references teacher');
    it.todo('throws ConflictException when Substitution.substituteTeacherId references teacher');
    it.todo('payload contains extensions.affectedEntities.{klassenvorstandFor, lessonCount, classbookCount, gradeCount, substitutionCount}');
    it.todo('affectedEntities.klassenvorstandFor array is capped at 50 entries');
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
