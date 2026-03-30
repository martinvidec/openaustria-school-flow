import { Test, TestingModule } from '@nestjs/testing';
import { ConstraintTemplateService } from './constraint-template.service';
import { PrismaService } from '../../config/database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ConstraintTemplateType } from './dto/constraint-template.dto';

describe('ConstraintTemplateService', () => {
  let service: ConstraintTemplateService;
  let prismaService: any;

  const mockTemplate = {
    id: 'ct-1',
    schoolId: 'school-1',
    templateType: 'NO_LESSONS_AFTER',
    params: { classId: 'class-1a', maxPeriod: 5 },
    isActive: true,
    createdAt: new Date('2026-03-30T10:00:00Z'),
  };

  const mockTemplate2 = {
    id: 'ct-2',
    schoolId: 'school-1',
    templateType: 'SUBJECT_MORNING',
    params: { subjectId: 'sub-mathe', maxPeriod: 4 },
    isActive: false,
    createdAt: new Date('2026-03-29T10:00:00Z'),
  };

  const mockPrismaService = {
    constraintTemplate: {
      create: vi.fn().mockResolvedValue(mockTemplate),
      findMany: vi.fn().mockResolvedValue([mockTemplate, mockTemplate2]),
      findUnique: vi.fn().mockResolvedValue(mockTemplate),
      update: vi.fn().mockResolvedValue({ ...mockTemplate, isActive: false }),
      delete: vi.fn().mockResolvedValue(mockTemplate),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstraintTemplateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConstraintTemplateService>(ConstraintTemplateService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a constraint template with schoolId and dto data', async () => {
      const dto = {
        templateType: ConstraintTemplateType.NO_LESSONS_AFTER,
        params: { classId: 'class-1a', maxPeriod: 5 },
      };

      const result = await service.create('school-1', dto);

      expect(result).toEqual(mockTemplate);
      expect(prismaService.constraintTemplate.create).toHaveBeenCalledWith({
        data: {
          schoolId: 'school-1',
          templateType: 'NO_LESSONS_AFTER',
          params: { classId: 'class-1a', maxPeriod: 5 },
          isActive: true,
        },
      });
    });

    it('should create a constraint template with isActive=false', async () => {
      const dto = {
        templateType: ConstraintTemplateType.SUBJECT_MORNING,
        params: { subjectId: 'sub-mathe', maxPeriod: 4 },
        isActive: false,
      };

      await service.create('school-1', dto);

      const createArg = prismaService.constraintTemplate.create.mock.calls[0][0];
      expect(createArg.data.isActive).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all constraint templates for a school ordered by createdAt desc', async () => {
      const result = await service.findAll('school-1');

      expect(result).toEqual([mockTemplate, mockTemplate2]);
      expect(prismaService.constraintTemplate.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a constraint template by id', async () => {
      const result = await service.findOne('ct-1');

      expect(result).toEqual(mockTemplate);
      expect(prismaService.constraintTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'ct-1' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prismaService.constraintTemplate.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a constraint template params', async () => {
      const dto = { params: { classId: 'class-1a', maxPeriod: 6 } };

      const result = await service.update('ct-1', dto);

      expect(result.isActive).toBe(false);
      expect(prismaService.constraintTemplate.update).toHaveBeenCalledWith({
        where: { id: 'ct-1' },
        data: {
          params: { classId: 'class-1a', maxPeriod: 6 },
        },
      });
    });

    it('should update isActive flag only', async () => {
      const dto = { isActive: false };

      await service.update('ct-1', dto);

      expect(prismaService.constraintTemplate.update).toHaveBeenCalledWith({
        where: { id: 'ct-1' },
        data: {
          isActive: false,
        },
      });
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      prismaService.constraintTemplate.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('nonexistent', { isActive: false })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a constraint template', async () => {
      await service.remove('ct-1');

      expect(prismaService.constraintTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'ct-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent template', async () => {
      prismaService.constraintTemplate.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('should return only active constraint templates for a school', async () => {
      prismaService.constraintTemplate.findMany.mockResolvedValueOnce([mockTemplate]);

      const result = await service.findActive('school-1');

      expect(result).toEqual([mockTemplate]);
      expect(prismaService.constraintTemplate.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no active templates exist', async () => {
      prismaService.constraintTemplate.findMany.mockResolvedValueOnce([]);

      const result = await service.findActive('school-1');

      expect(result).toEqual([]);
    });
  });
});
