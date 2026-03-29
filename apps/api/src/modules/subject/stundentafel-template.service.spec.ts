import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StundentafelTemplateService } from './stundentafel-template.service';
import { AUSTRIAN_STUNDENTAFELN, StundentafelTemplate } from './templates/austrian-stundentafeln';
import { PrismaService } from '../../config/database/prisma.service';

// Valid Lehrverpflichtungsgruppen per Austrian law
const LEHRVERPFLICHTUNGSGRUPPEN = ['I', 'II', 'III', 'IV', 'IVa', 'V', 'Va'];

describe('StundentafelTemplateService', () => {
  let service: StundentafelTemplateService;
  let prisma: any;

  const mockPrismaService = {
    subject: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    classSubject: {
      createMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StundentafelTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StundentafelTemplateService>(StundentafelTemplateService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Stundentafel template data', () => {
    it('should contain templates for AHS_UNTER years 1-4', () => {
      const ahsTemplates = AUSTRIAN_STUNDENTAFELN.filter(
        (t) => t.schoolType === 'AHS_UNTER',
      );
      expect(ahsTemplates).toHaveLength(4);
      const years = ahsTemplates.map((t) => t.yearLevel).sort();
      expect(years).toEqual([1, 2, 3, 4]);
    });

    it('should contain templates for MS years 1-4', () => {
      const msTemplates = AUSTRIAN_STUNDENTAFELN.filter(
        (t) => t.schoolType === 'MS',
      );
      expect(msTemplates).toHaveLength(4);
      const years = msTemplates.map((t) => t.yearLevel).sort();
      expect(years).toEqual([1, 2, 3, 4]);
    });

    it('AHS_UNTER year 1 should have 12 subjects totaling 31 weekly hours', () => {
      const template = AUSTRIAN_STUNDENTAFELN.find(
        (t) => t.schoolType === 'AHS_UNTER' && t.yearLevel === 1,
      );
      expect(template).toBeDefined();
      expect(template!.subjects).toHaveLength(12);
      expect(template!.totalWeeklyHours).toBe(31);
      const sum = template!.subjects.reduce((acc, s) => acc + s.weeklyHours, 0);
      expect(sum).toBe(31);
    });

    it('all templates should have valid lehrverpflichtungsgruppe values', () => {
      for (const template of AUSTRIAN_STUNDENTAFELN) {
        for (const subject of template.subjects) {
          expect(LEHRVERPFLICHTUNGSGRUPPEN).toContain(subject.lehrverpflichtungsgruppe);
        }
      }
    });
  });

  describe('getTemplate', () => {
    it('should return the correct template for AHS_UNTER year 1', () => {
      const template = service.getTemplate('AHS_UNTER', 1);
      expect(template).toBeDefined();
      expect(template!.schoolType).toBe('AHS_UNTER');
      expect(template!.yearLevel).toBe(1);
      expect(template!.displayName).toContain('AHS Unterstufe');
    });

    it('should return null for unknown school type', () => {
      const template = service.getTemplate('UNKNOWN', 1);
      expect(template).toBeNull();
    });
  });

  describe('getTemplatesForSchoolType', () => {
    it('should return all year levels for AHS_UNTER', () => {
      const templates = service.getTemplatesForSchoolType('AHS_UNTER');
      expect(templates).toHaveLength(4);
      expect(templates.every((t) => t.schoolType === 'AHS_UNTER')).toBe(true);
    });
  });

  describe('applyTemplate', () => {
    const schoolId = 'school-1';
    const classId = 'class-1';

    it('should create Subject records for subjects not yet in school', async () => {
      // Subject does not exist yet -- findFirst returns null
      mockPrismaService.subject.findFirst.mockResolvedValue(null);
      mockPrismaService.subject.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: `subj-${data.shortName}`, ...data }),
      );
      mockPrismaService.classSubject.createMany.mockResolvedValue({ count: 1 });

      const result = await service.applyTemplate(schoolId, classId, 'AHS_UNTER', 1);

      expect(result.subjectsCreated).toBe(12); // AHS_UNTER year 1 has 12 subjects
      expect(mockPrismaService.subject.create).toHaveBeenCalledTimes(12);
    });

    it('should create ClassSubject records with weeklyHours from template', async () => {
      // Subject already exists -- findFirst returns the subject
      mockPrismaService.subject.findFirst.mockImplementation(({ where }: any) =>
        Promise.resolve({ id: `subj-${where.shortName}`, shortName: where.shortName }),
      );
      mockPrismaService.classSubject.createMany.mockResolvedValue({ count: 1 });

      const result = await service.applyTemplate(schoolId, classId, 'AHS_UNTER', 1);

      expect(result.classSubjectsCreated).toBe(12);
      expect(result.totalWeeklyHours).toBe(31);
      expect(mockPrismaService.subject.create).not.toHaveBeenCalled(); // subjects already exist
    });

    it('should set isCustomized=false on all created ClassSubject entries', async () => {
      mockPrismaService.subject.findFirst.mockImplementation(({ where }: any) =>
        Promise.resolve({ id: `subj-${where.shortName}`, shortName: where.shortName }),
      );
      mockPrismaService.classSubject.createMany.mockResolvedValue({ count: 1 });

      await service.applyTemplate(schoolId, classId, 'AHS_UNTER', 1);

      // Check each createMany call has isCustomized: false
      for (const call of mockPrismaService.classSubject.createMany.mock.calls) {
        const data = call[0].data;
        if (Array.isArray(data)) {
          for (const entry of data) {
            expect(entry.isCustomized).toBe(false);
          }
        } else {
          expect(data.isCustomized).toBe(false);
        }
      }
    });

    it('should throw NotFoundException for unknown template', async () => {
      await expect(
        service.applyTemplate(schoolId, classId, 'UNKNOWN', 99),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
