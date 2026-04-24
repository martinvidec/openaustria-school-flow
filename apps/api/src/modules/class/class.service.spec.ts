import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

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
  };

  const mockClassFull = {
    ...mockClass,
    students: [
      { id: 'student-1', person: { firstName: 'Maria', lastName: 'Huber' } },
    ],
    groups: [],
    classSubjects: [],
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
      update: vi.fn().mockResolvedValue(mockStudent),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      // First findUnique returns existing class (duplicate check)
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
      const result = await service.assignStudent('class-3b', 'student-1');

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

      await expect(service.removeStudent('class-3b', 'student-1')).rejects.toThrow(NotFoundException);
    });
  });

  // --- Phase 12-02 Wave 0 stubs: turned green in Task 2 ---

  describe('remove — Orphan-Guard', () => {
    it.todo('deletes class + cascades when every dependency count is zero');
    it.todo('throws ConflictException when Student with classId exists (active, isArchived=false)');
    it.todo('throws ConflictException when ClassSubject exists');
    it.todo('throws ConflictException when Group exists');
    it.todo('throws ConflictException when GroupMembership exists (indirect via groups)');
    it.todo('throws ConflictException when TimetableLesson.classSubjectId references class (indirect)');
    it.todo('throws ConflictException when GroupDerivationRule exists for class');
    it.todo(
      'payload contains extensions.affectedEntities.{activeStudentCount, classSubjectCount, groupCount, groupMembershipCount, timetableRunCount, derivationRuleCount, sampleStudents}',
    );
  });

  describe('findAll — filters', () => {
    it.todo('filters by schoolYearId');
    it.todo('filters by yearLevels array (IN clause)');
    it.todo('filters by name substring (case-insensitive)');
  });
});
