import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClassSubjectService } from './class-subject.service';
import { PrismaService } from '../../config/database/prisma.service';
import { StundentafelTemplateService } from '../subject/stundentafel-template.service';

describe('ClassSubjectService', () => {
  let service: ClassSubjectService;
  let prisma: any;
  let templates: any;

  const mockClass = {
    id: 'class-3b',
    schoolId: 'school-1',
    yearLevel: 3,
    school: { schoolType: 'AHS_UNTER' },
  };

  const templatePayload = {
    schoolType: 'AHS_UNTER',
    yearLevel: 3,
    displayName: 'AHS Unterstufe 3. Klasse',
    totalWeeklyHours: 30,
    subjects: [
      { name: 'Deutsch', shortName: 'D', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'I' },
      { name: 'Mathematik', shortName: 'M', subjectType: 'PFLICHT', weeklyHours: 4, lehrverpflichtungsgruppe: 'II' },
    ],
  };

  const mockPrismaService = {
    schoolClass: {
      findUnique: vi.fn(),
    },
    classSubject: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation((args: any) => ({ id: `cs-${Date.now()}`, ...args.data })),
      update: vi.fn().mockImplementation((args: any) => ({ id: args.where.id, ...args.data })),
    },
    subject: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'sub-deutsch', shortName: 'D' },
        { id: 'sub-mathe', shortName: 'M' },
      ]),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => Promise<unknown>)(mockPrismaService);
      }
      return arg;
    }),
  };

  const mockTemplatesService = {
    getTemplate: vi.fn().mockReturnValue(templatePayload),
    applyTemplate: vi.fn().mockResolvedValue({ subjectsCreated: 0, classSubjectsCreated: 2, totalWeeklyHours: 8 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-apply default mocks that get cleared
    mockTemplatesService.getTemplate.mockReturnValue(templatePayload);
    mockTemplatesService.applyTemplate.mockResolvedValue({ subjectsCreated: 0, classSubjectsCreated: 2, totalWeeklyHours: 8 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StundentafelTemplateService, useValue: mockTemplatesService },
      ],
    }).compile();

    service = module.get<ClassSubjectService>(ClassSubjectService);
    prisma = module.get(PrismaService);
    templates = module.get(StundentafelTemplateService);
  });

  describe('applyStundentafel', () => {
    it('creates ClassSubject rows via templates.applyTemplate when none exist', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.count.mockResolvedValueOnce(0);
      prisma.classSubject.findMany.mockResolvedValueOnce([
        { id: 'cs-1', classId: 'class-3b', subjectId: 'sub-deutsch', weeklyHours: 4, subject: { shortName: 'D' } },
      ]);

      await service.applyStundentafel('class-3b', 'AHS_UNTER');

      expect(templates.applyTemplate).toHaveBeenCalledWith('school-1', 'class-3b', 'AHS_UNTER', 3);
    });

    it('throws ConflictException when ClassSubjects already exist for class', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.count.mockResolvedValueOnce(5);

      await expect(service.applyStundentafel('class-3b', 'AHS_UNTER')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(templates.applyTemplate).not.toHaveBeenCalled();
    });

    it('sets isCustomized=false on applied rows (via StundentafelTemplateService which seeds isCustomized=false)', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.count.mockResolvedValueOnce(0);
      prisma.classSubject.findMany.mockResolvedValueOnce([
        { id: 'cs-1', isCustomized: false, subject: { shortName: 'D' } },
      ]);

      const rows = await service.applyStundentafel('class-3b', 'AHS_UNTER');
      expect(rows.every((r: any) => r.isCustomized === false)).toBe(true);
    });
  });

  describe('updateClassSubjects', () => {
    it('replaces ALL ClassSubject rows in single tx (delete + update/create)', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.findMany
        // 1st findMany inside tx: existing rows
        .mockResolvedValueOnce([
          { id: 'cs-old', classId: 'class-3b', subjectId: 'sub-deutsch', weeklyHours: 4, isCustomized: false, preferDoublePeriod: false },
        ])
        // 2nd findMany at end of tx: fresh list
        .mockResolvedValueOnce([]);

      await service.updateClassSubjects('class-3b', {
        rows: [
          // Keep deutsch with changed hours → update path
          { subjectId: 'sub-deutsch', weeklyHours: 5 },
          // New mathematics row → create path
          { subjectId: 'sub-mathe', weeklyHours: 4 },
        ],
      });

      // deleteMany only called when there are rows to delete; in this case none removed
      expect(prisma.classSubject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cs-old' },
          data: expect.objectContaining({ weeklyHours: 5 }),
        }),
      );
      expect(prisma.classSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subjectId: 'sub-mathe', weeklyHours: 4 }),
        }),
      );
    });

    it('flips isCustomized=true when weeklyHours differs from template', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.findMany
        .mockResolvedValueOnce([
          { id: 'cs-old', classId: 'class-3b', subjectId: 'sub-deutsch', weeklyHours: 4, isCustomized: false, preferDoublePeriod: false },
        ])
        .mockResolvedValueOnce([]);

      await service.updateClassSubjects('class-3b', {
        rows: [{ subjectId: 'sub-deutsch', weeklyHours: 6 }], // template=4 → customized
      });

      const updateCall = prisma.classSubject.update.mock.calls[0][0];
      expect(updateCall.data.isCustomized).toBe(true);
    });

    it('preserves isCustomized=false when hours match template default', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.classSubject.findMany
        .mockResolvedValueOnce([
          { id: 'cs-old', classId: 'class-3b', subjectId: 'sub-deutsch', weeklyHours: 4, isCustomized: true, preferDoublePeriod: false },
        ])
        .mockResolvedValueOnce([]);

      await service.updateClassSubjects('class-3b', {
        rows: [{ subjectId: 'sub-deutsch', weeklyHours: 4 }],
      });

      const updateCall = prisma.classSubject.update.mock.calls[0][0];
      expect(updateCall.data.isCustomized).toBe(false);
    });
  });

  describe('resetStundentafel', () => {
    it('deletes all ClassSubject rows for class then re-applies template in single tx', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      prisma.subject.findFirst
        .mockResolvedValueOnce({ id: 'sub-deutsch', shortName: 'D' })
        .mockResolvedValueOnce({ id: 'sub-mathe', shortName: 'M' });
      prisma.classSubject.findMany.mockResolvedValueOnce([]);

      await service.resetStundentafel('class-3b', 'AHS_UNTER');

      expect(prisma.classSubject.deleteMany).toHaveBeenCalledWith({
        where: { classId: 'class-3b' },
      });
      // 2 template subjects → 2 new ClassSubject.create calls
      expect(prisma.classSubject.create).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundException if template not found for (schoolType, yearLevel)', async () => {
      prisma.schoolClass.findUnique.mockResolvedValueOnce(mockClass);
      mockTemplatesService.getTemplate.mockReturnValueOnce(null);

      await expect(service.resetStundentafel('class-3b', 'UNKNOWN')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
