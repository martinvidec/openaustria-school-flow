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
    },
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
  // Wave 0 TDD stubs for SUBJECT-05 Orphan-Guard — implemented in Task 2.
  describe('remove — Orphan-Guard (SUBJECT-05)', () => {
    it.todo('deletes subject when zero dependents');
    it.todo('throws ConflictException when ClassSubject references subject');
    it.todo('throws ConflictException when TeacherSubject references subject');
    it.todo('throws ConflictException when TimetableLesson references via ClassSubject');
    it.todo('throws ConflictException when Homework references via ClassSubject');
    it.todo('throws ConflictException when Exam references via ClassSubject');
    it.todo(
      'payload contains extensions.affectedEntities.{affectedClasses, affectedTeachers, lessonCount, homeworkCount, examCount}',
    );
    it.todo('affectedClasses + affectedTeachers arrays capped at 50 entries each');
  });
});
