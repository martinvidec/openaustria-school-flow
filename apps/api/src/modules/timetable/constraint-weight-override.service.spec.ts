import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
import { PrismaService } from '../../config/database/prisma.service';
import { DEFAULT_CONSTRAINT_WEIGHTS } from './dto/constraint-weight.dto';

describe('ConstraintWeightOverrideService', () => {
  let service: ConstraintWeightOverrideService;
  let prismaService: any;

  const mockPrismaService = {
    constraintWeightOverride: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((args: any[]) => Promise.all(args)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstraintWeightOverrideService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConstraintWeightOverrideService>(
      ConstraintWeightOverrideService,
    );
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findBySchool', () => {
    it('returns DEFAULT_CONSTRAINT_WEIGHTS when no rows exist', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([]);

      const result = await service.findBySchool('school-1');

      expect(result).toEqual(DEFAULT_CONSTRAINT_WEIGHTS);
      expect(Object.keys(result)).toHaveLength(9);
    });

    it('overlays DB rows on top of defaults', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([
        { constraintName: 'No same subject doubling', weight: 50 },
        { constraintName: 'Subject preferred slot', weight: 8 },
      ]);

      const result = await service.findBySchool('school-1');

      expect(result['No same subject doubling']).toBe(50);
      expect(result['Subject preferred slot']).toBe(8);
      // unchanged defaults remain
      expect(result['Balanced weekly distribution']).toBe(
        DEFAULT_CONSTRAINT_WEIGHTS['Balanced weekly distribution'],
      );
    });
  });

  describe('findOverridesOnly', () => {
    it('returns persisted overrides without merging defaults', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([
        { constraintName: 'No same subject doubling', weight: 50 },
      ]);

      const result = await service.findOverridesOnly('school-1');

      expect(result).toEqual({ 'No same subject doubling': 50 });
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('returns empty object when no rows exist', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([]);

      const result = await service.findOverridesOnly('school-1');

      expect(result).toEqual({});
    });
  });

  describe('findLastUpdatedAt', () => {
    it('returns Date when rows exist', async () => {
      const ts = new Date('2026-04-25T10:00:00Z');
      prismaService.constraintWeightOverride.aggregate.mockResolvedValueOnce({
        _max: { updatedAt: ts },
      });

      const result = await service.findLastUpdatedAt('school-1');

      expect(result).toEqual(ts);
    });

    it('returns null when no rows exist', async () => {
      prismaService.constraintWeightOverride.aggregate.mockResolvedValueOnce({
        _max: { updatedAt: null },
      });

      const result = await service.findLastUpdatedAt('school-1');

      expect(result).toBeNull();
    });
  });

  describe('bulkReplace', () => {
    it('runs deleteMany + createMany inside $transaction', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([]);

      await service.bulkReplace(
        'school-1',
        { 'No same subject doubling': 25 },
        'admin-user',
      );

      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('runs only deleteMany when weights map is empty (no createMany with empty data[])', async () => {
      prismaService.constraintWeightOverride.findMany.mockResolvedValueOnce([]);

      await service.bulkReplace('school-1', {}, 'admin-user');

      expect(prismaService.$transaction).not.toHaveBeenCalled();
      expect(prismaService.constraintWeightOverride.deleteMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
      });
    });

    it('throws 422 unknown-constraint-name for unknown names', async () => {
      await expect(
        service.bulkReplace('school-1', { 'Bogus name': 10 }),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.bulkReplace('school-1', { 'Bogus name': 10 });
      } catch (err: any) {
        expect(err.response.type).toBe(
          'schoolflow://errors/unknown-constraint-name',
        );
        expect(err.response.constraintName).toBe('Bogus name');
      }
    });

    it('throws 422 weight-out-of-range for weight > 100', async () => {
      await expect(
        service.bulkReplace('school-1', { 'No same subject doubling': 200 }),
      ).rejects.toThrow(UnprocessableEntityException);

      try {
        await service.bulkReplace('school-1', { 'No same subject doubling': 200 });
      } catch (err: any) {
        expect(err.response.type).toBe(
          'schoolflow://errors/weight-out-of-range',
        );
        expect(err.response.weight).toBe(200);
      }
    });

    it('throws 422 weight-out-of-range for weight < 0', async () => {
      await expect(
        service.bulkReplace('school-1', { 'No same subject doubling': -5 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 weight-out-of-range for non-integer weight', async () => {
      await expect(
        service.bulkReplace('school-1', { 'No same subject doubling': 12.5 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('resetOne', () => {
    it('calls deleteMany with composite where clause', async () => {
      await service.resetOne('school-1', 'No same subject doubling');

      expect(prismaService.constraintWeightOverride.deleteMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1', constraintName: 'No same subject doubling' },
      });
    });
  });
});
