import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../../config/database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: any;

  const mockPerson = {
    id: 'person-1',
    schoolId: 'school-1',
    personType: 'STUDENT',
    firstName: 'Maria',
    lastName: 'Huber',
    email: null,
    phone: null,
    address: null,
    dateOfBirth: null,
    socialSecurityNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: {
      id: 'student-1',
      personId: 'person-1',
      schoolId: 'school-1',
      classId: null,
      studentNumber: null,
      enrollmentDate: null,
      isArchived: false,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      schoolClass: null,
    },
  };

  const mockStudent = {
    id: 'student-1',
    personId: 'person-1',
    schoolId: 'school-1',
    classId: null,
    studentNumber: null,
    enrollmentDate: null,
    isArchived: false,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    person: {
      id: 'person-1',
      firstName: 'Maria',
      lastName: 'Huber',
      email: null,
    },
    schoolClass: null,
    groupMemberships: [],
    parentStudents: [],
  };

  const mockPrismaService = {
    person: {
      create: vi.fn().mockResolvedValue(mockPerson),
      update: vi.fn().mockResolvedValue(mockPerson),
      delete: vi.fn().mockResolvedValue(mockPerson),
    },
    student: {
      findMany: vi.fn().mockResolvedValue([mockStudent]),
      findUnique: vi.fn().mockResolvedValue(mockStudent),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(mockStudent),
    },
    parentStudent: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({ id: 'ps-1', parentId: 'p-1', studentId: 'student-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    attendanceRecord: {
      count: vi.fn().mockResolvedValue(0),
    },
    gradeEntry: {
      count: vi.fn().mockResolvedValue(0),
    },
    studentNote: {
      count: vi.fn().mockResolvedValue(0),
    },
    absenceExcuse: {
      count: vi.fn().mockResolvedValue(0),
    },
    groupMembership: {
      count: vi.fn().mockResolvedValue(0),
    },
    // Support both $transaction(fn) (create) and $transaction([...]) (Orphan-Guard).
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
        StudentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset default zero-counts for Orphan-Guard so isolation between tests holds.
    mockPrismaService.attendanceRecord.count.mockResolvedValue(0);
    mockPrismaService.gradeEntry.count.mockResolvedValue(0);
    mockPrismaService.studentNote.count.mockResolvedValue(0);
    mockPrismaService.absenceExcuse.count.mockResolvedValue(0);
    mockPrismaService.groupMembership.count.mockResolvedValue(0);
    mockPrismaService.parentStudent.count.mockResolvedValue(0);
    mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);
  });

  describe('create', () => {
    it('should create a student with nested person creation', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Maria',
        lastName: 'Huber',
      };

      await service.create(dto as any);

      expect(prisma.person.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.person.create.mock.calls[0][0];
      expect(createArg.data.personType).toBe('STUDENT');
      expect(createArg.data.firstName).toBe('Maria');
      expect(createArg.data.lastName).toBe('Huber');
      expect(createArg.data.student.create).toBeDefined();
      expect(createArg.data.student.create.schoolId).toBe('school-1');
    });

    it('should create a student with classId (Stammklasse)', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Max',
        lastName: 'Mueller',
        classId: 'class-3b',
        enrollmentDate: '2026-09-01',
      };

      await service.create(dto as any);

      const createArg = prisma.person.create.mock.calls[0][0];
      expect(createArg.data.student.create.classId).toBe('class-3b');
      expect(createArg.data.student.create.enrollmentDate).toEqual(new Date('2026-09-01'));
    });
  });

  describe('findAll', () => {
    it('should return paginated students filtered by schoolId (legacy signature)', async () => {
      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.findAll('school-1', pagination);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: 'school-1', isArchived: false }),
          take: 20,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a student by id with relations', async () => {
      const result = await service.findOne('student-1');

      expect(result).toEqual(mockStudent);
      expect(prisma.student.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'student-1' },
          include: expect.objectContaining({
            person: true,
            schoolClass: true,
            groupMemberships: expect.any(Object),
          }),
        }),
      );
    });

    it('should throw NotFoundException for missing student', async () => {
      prisma.student.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // --- Phase 12-01 Wave 0 stubs turned green in Task 2 ---

  describe('remove — Orphan-Guard', () => {
    it('deletes person (cascading student) when zero dependents (204)', async () => {
      await service.remove('student-1');
      expect(prisma.person.delete).toHaveBeenCalledWith({
        where: { id: 'person-1' },
      });
    });

    it('throws ConflictException when AttendanceRecord.studentId references student', async () => {
      mockPrismaService.attendanceRecord.count.mockResolvedValueOnce(3);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when GradeEntry.studentId references student', async () => {
      mockPrismaService.gradeEntry.count.mockResolvedValueOnce(2);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when StudentNote.studentId references student', async () => {
      mockPrismaService.studentNote.count.mockResolvedValueOnce(1);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when AbsenceExcuse.studentId references student', async () => {
      mockPrismaService.absenceExcuse.count.mockResolvedValueOnce(1);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when GroupMembership has student row', async () => {
      mockPrismaService.groupMembership.count.mockResolvedValueOnce(4);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when ParentStudent has student row', async () => {
      mockPrismaService.parentStudent.count.mockResolvedValueOnce(2);
      await expect(service.remove('student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('payload contains extensions.affectedEntities with all six category counts', async () => {
      mockPrismaService.attendanceRecord.count.mockResolvedValueOnce(1);
      mockPrismaService.gradeEntry.count.mockResolvedValueOnce(2);
      mockPrismaService.studentNote.count.mockResolvedValueOnce(3);
      mockPrismaService.absenceExcuse.count.mockResolvedValueOnce(4);
      mockPrismaService.groupMembership.count.mockResolvedValueOnce(5);
      mockPrismaService.parentStudent.count.mockResolvedValueOnce(6);

      const err = (await service.remove('student-1').catch((e) => e)) as ConflictException;
      expect(err).toBeInstanceOf(ConflictException);
      const response = err.getResponse() as any;
      expect(response.extensions.affectedEntities).toEqual({
        attendanceCount: 1,
        gradeCount: 2,
        studentNoteCount: 3,
        excuseCount: 4,
        groupMembershipCount: 5,
        parentLinkCount: 6,
      });
    });
  });

  describe('archive + restore', () => {
    it('archive sets isArchived=true + archivedAt=now', async () => {
      await service.archive('student-1');
      const updateArgs = prisma.student.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: 'student-1' });
      expect(updateArgs.data.isArchived).toBe(true);
      expect(updateArgs.data.archivedAt).toBeInstanceOf(Date);
    });

    it('restore sets isArchived=false + archivedAt=null', async () => {
      await service.restore('student-1');
      const updateArgs = prisma.student.update.mock.calls[0][0];
      expect(updateArgs.data.isArchived).toBe(false);
      expect(updateArgs.data.archivedAt).toBeNull();
    });

    it('findAll default (archived=active) excludes archived students', async () => {
      await service.findAll('school-1', { page: 1, limit: 20, skip: 0 } as any);
      const whereArg = prisma.student.findMany.mock.calls[0][0].where;
      expect(whereArg.isArchived).toBe(false);
    });

    it('findAll archived=archived returns ONLY archived students', async () => {
      await service.findAll({
        schoolId: 'school-1',
        archived: 'archived',
        page: 1,
        limit: 20,
      } as any);
      const whereArg = prisma.student.findMany.mock.calls[0][0].where;
      expect(whereArg.isArchived).toBe(true);
    });

    it('findAll archived=all returns both (no isArchived filter)', async () => {
      await service.findAll({
        schoolId: 'school-1',
        archived: 'all',
        page: 1,
        limit: 20,
      } as any);
      const whereArg = prisma.student.findMany.mock.calls[0][0].where;
      expect(whereArg.isArchived).toBeUndefined();
    });
  });

  describe('create — parentIds', () => {
    it('creates Student + ParentStudent rows in single transaction when parentIds provided', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Lisa',
        lastName: 'Muster',
        parentIds: ['parent-1', 'parent-2'],
      };

      await service.create(dto as any);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.parentStudent.createMany).toHaveBeenCalledWith({
        data: [
          { parentId: 'parent-1', studentId: 'student-1' },
          { parentId: 'parent-2', studentId: 'student-1' },
        ],
        skipDuplicates: true,
      });
    });

    it('empty parentIds (or undefined) creates zero ParentStudent rows', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Lisa',
        lastName: 'Muster',
      };

      await service.create(dto as any);
      expect(prisma.parentStudent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('linkParent + unlinkParent', () => {
    it('linkParent upserts ParentStudent row when not yet linked', async () => {
      await service.linkParent('student-1', 'parent-1');
      expect(prisma.parentStudent.upsert).toHaveBeenCalledWith({
        where: { parentId_studentId: { parentId: 'parent-1', studentId: 'student-1' } },
        update: {},
        create: { parentId: 'parent-1', studentId: 'student-1' },
      });
    });

    it('linkParent is idempotent (upsert absorbs duplicate)', async () => {
      await service.linkParent('student-1', 'parent-1');
      await service.linkParent('student-1', 'parent-1');
      expect(prisma.parentStudent.upsert).toHaveBeenCalledTimes(2);
    });

    it('unlinkParent removes ParentStudent row but preserves Parent record', async () => {
      await service.unlinkParent('student-1', 'parent-1');
      expect(prisma.parentStudent.deleteMany).toHaveBeenCalledWith({
        where: { parentId: 'parent-1', studentId: 'student-1' },
      });
      expect(prisma.person.delete).not.toHaveBeenCalled();
    });
  });
});
