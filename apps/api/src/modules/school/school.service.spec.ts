import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SchoolService', () => {
  let service: SchoolService;
  let prismaService: any;

  const mockSchool = {
    id: 'school-1',
    name: 'BG/BRG Test',
    schoolType: 'AHS_UNTER',
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeGrid: { id: 'tg-1', periods: [] },
    schoolDays: [],
    // Phase 10 Plan 01a: multi-active migration — schoolYear relation is now a list.
    schoolYears: [],
  };

  const mockPrismaService = {
    school: {
      create: vi.fn().mockResolvedValue(mockSchool),
      findMany: vi.fn().mockResolvedValue([mockSchool]),
      findUnique: vi.fn().mockResolvedValue(mockSchool),
      update: vi.fn().mockResolvedValue(mockSchool),
      delete: vi.fn().mockResolvedValue(mockSchool),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a school with template time grid', async () => {
    const dto = { name: 'BG/BRG Test', schoolType: 'AHS_UNTER' as any };
    await service.create(dto);

    expect(prismaService.school.create).toHaveBeenCalledTimes(1);
    const createArg = prismaService.school.create.mock.calls[0][0];
    expect(createArg.data.name).toBe('BG/BRG Test');
    expect(createArg.data.schoolType).toBe('AHS_UNTER');
    // Template should provide time grid
    expect(createArg.data.timeGrid).toBeDefined();
    expect(createArg.data.timeGrid.create.periods.create.length).toBeGreaterThan(0);
    // Default school days Mo-Fr
    expect(createArg.data.schoolDays.create.length).toBe(5);
  });

  it('should find all schools', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockSchool]);
    expect(prismaService.school.findMany).toHaveBeenCalledTimes(1);
  });

  it('should find a school by id', async () => {
    const result = await service.findOne('school-1');
    expect(result).toEqual(mockSchool);
  });

  it('should throw NotFoundException for missing school', async () => {
    prismaService.school.findUnique.mockResolvedValueOnce(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should return Austrian templates', async () => {
    const templates = await service.getTemplates();
    expect(templates.length).toBe(5);
    expect(templates.map((t: any) => t.schoolType)).toEqual(
      expect.arrayContaining(['VS', 'MS', 'AHS_UNTER', 'AHS_OBER', 'BHS'])
    );
  });
});
