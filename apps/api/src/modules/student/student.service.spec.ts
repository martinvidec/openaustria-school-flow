import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

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
  });

  describe('create', () => {
    it('should create a student with nested person creation', async () => {
      const dto = {
        schoolId: 'school-1',
        firstName: 'Maria',
        lastName: 'Huber',
      };

      await service.create(dto);

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

      await service.create(dto);

      const createArg = prisma.person.create.mock.calls[0][0];
      expect(createArg.data.student.create.classId).toBe('class-3b');
      expect(createArg.data.student.create.enrollmentDate).toEqual(new Date('2026-09-01'));
    });
  });

  describe('findAll', () => {
    it('should return paginated students filtered by schoolId', async () => {
      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.findAll('school-1', pagination);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: 'school-1' },
          skip: 0,
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

  describe('remove', () => {
    it('should delete person (cascades to student)', async () => {
      await service.remove('student-1');

      expect(prisma.person.delete).toHaveBeenCalledWith({
        where: { id: 'person-1' },
      });
    });
  });

  // Wave-0 TDD stubs — Phase 12-01 Task 1; implementations land in Task 2.
  describe('remove — Orphan-Guard', () => {
    it.todo('deletes person (cascading student) when zero dependents (204)');
    it.todo('throws ConflictException when AttendanceRecord.studentId references student');
    it.todo('throws ConflictException when GradeEntry.studentId references student');
    it.todo('throws ConflictException when StudentNote.studentId references student');
    it.todo('throws ConflictException when AbsenceExcuse.studentId references student');
    it.todo('throws ConflictException when GroupMembership has student row');
    it.todo('throws ConflictException when ParentStudent has student row');
    it.todo(
      'payload contains extensions.affectedEntities.{attendanceCount, gradeCount, studentNoteCount, excuseCount, groupMembershipCount, parentLinkCount}',
    );
  });

  describe('archive + restore', () => {
    it.todo('archive sets isArchived=true + archivedAt=now');
    it.todo('restore sets isArchived=false + archivedAt=null');
    it.todo('findAll default (archived=active) excludes archived students');
    it.todo('findAll archived=archived returns ONLY archived students');
    it.todo('findAll archived=all returns both');
  });

  describe('create — parentIds', () => {
    it.todo('creates Student + ParentStudent rows in single transaction when parentIds provided');
    it.todo('empty parentIds (or undefined) creates zero ParentStudent rows');
    it.todo('invalid parentId throws validation error before tx');
  });

  describe('linkParent + unlinkParent', () => {
    it.todo('linkParent creates ParentStudent row when (studentId, parentId) pair not yet linked');
    it.todo('linkParent is idempotent (no duplicate, no error) when already linked');
    it.todo('unlinkParent removes ParentStudent row but preserves Parent record');
  });
});
