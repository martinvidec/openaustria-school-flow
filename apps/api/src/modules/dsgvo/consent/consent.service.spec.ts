import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { PrismaService } from '../../../config/database/prisma.service';

const mockPrisma = {
  consentRecord: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

describe('ConsentService', () => {
  let service: ConsentService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
  });

  describe('grant', () => {
    it('creates a new consent record when none exists', async () => {
      mockPrisma.consentRecord.findUnique.mockResolvedValue(null);
      const created = { id: 'c-1', personId: 'p-1', purpose: 'KOMMUNIKATION', granted: true, version: 1 };
      mockPrisma.consentRecord.create.mockResolvedValue(created);

      const result = await service.grant({
        personId: 'p-1',
        purpose: 'KOMMUNIKATION',
        granted: true,
      });

      expect(mockPrisma.consentRecord.create).toHaveBeenCalledOnce();
      expect(result).toBe(created);
    });

    it('re-grants consent after withdrawal', async () => {
      const existing = {
        id: 'c-1',
        personId: 'p-1',
        purpose: 'FOTOFREIGABE',
        granted: false,
        withdrawnAt: new Date(),
        version: 1,
        legalBasis: 'consent',
      };
      mockPrisma.consentRecord.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, granted: true, withdrawnAt: null, version: 2 };
      mockPrisma.consentRecord.update.mockResolvedValue(updated);

      const result = await service.grant({
        personId: 'p-1',
        purpose: 'FOTOFREIGABE',
        granted: true,
      });

      expect(mockPrisma.consentRecord.update).toHaveBeenCalledOnce();
      expect(result.version).toBe(2);
    });

    it('throws ConflictException when consent already granted', async () => {
      const existing = {
        id: 'c-1',
        personId: 'p-1',
        purpose: 'KOMMUNIKATION',
        granted: true,
        withdrawnAt: null,
        version: 1,
      };
      mockPrisma.consentRecord.findUnique.mockResolvedValue(existing);

      await expect(
        service.grant({
          personId: 'p-1',
          purpose: 'KOMMUNIKATION',
          granted: true,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.grant({
          personId: 'p-1',
          purpose: 'KOMMUNIKATION',
          granted: true,
        }),
      ).rejects.toThrow('Consent for KOMMUNIKATION has already been granted');
    });
  });

  describe('withdraw', () => {
    it('withdraws consent and sets withdrawnAt', async () => {
      const existing = { id: 'c-1', personId: 'p-1', purpose: 'STATISTIK', granted: true };
      mockPrisma.consentRecord.findUnique.mockResolvedValue(existing);
      const updated = { ...existing, granted: false, withdrawnAt: new Date() };
      mockPrisma.consentRecord.update.mockResolvedValue(updated);

      const result = await service.withdraw({
        personId: 'p-1',
        purpose: 'STATISTIK',
      });

      expect(mockPrisma.consentRecord.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { granted: false, withdrawnAt: expect.any(Date) },
      });
      expect(result.granted).toBe(false);
    });

    it('throws NotFoundException when no consent record exists', async () => {
      mockPrisma.consentRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw({ personId: 'p-1', purpose: 'STATISTIK' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasConsent', () => {
    it('returns true when consent is granted and not withdrawn', async () => {
      mockPrisma.consentRecord.findUnique.mockResolvedValue({
        granted: true,
        withdrawnAt: null,
      });

      const result = await service.hasConsent('p-1', 'KOMMUNIKATION');
      expect(result).toBe(true);
    });

    it('returns false when consent is withdrawn', async () => {
      mockPrisma.consentRecord.findUnique.mockResolvedValue({
        granted: false,
        withdrawnAt: new Date(),
      });

      const result = await service.hasConsent('p-1', 'KOMMUNIKATION');
      expect(result).toBe(false);
    });

    it('returns false when no consent record exists', async () => {
      mockPrisma.consentRecord.findUnique.mockResolvedValue(null);

      const result = await service.hasConsent('p-1', 'KOMMUNIKATION');
      expect(result).toBe(false);
    });
  });

  describe('findByPerson', () => {
    it('returns all consent records ordered by purpose', async () => {
      const records = [
        { id: 'c-1', purpose: 'FOTOFREIGABE' },
        { id: 'c-2', purpose: 'KOMMUNIKATION' },
      ];
      mockPrisma.consentRecord.findMany.mockResolvedValue(records);

      const result = await service.findByPerson('p-1');

      expect(mockPrisma.consentRecord.findMany).toHaveBeenCalledWith({
        where: { personId: 'p-1' },
        orderBy: { purpose: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findBySchool', () => {
    it('returns paginated consent records for a school', async () => {
      const records = [{ id: 'c-1' }];
      mockPrisma.consentRecord.findMany.mockResolvedValue(records);
      mockPrisma.consentRecord.count.mockResolvedValue(1);

      const pagination = { page: 1, limit: 20, skip: 0 } as any;
      const result = await service.findBySchool('school-1', pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });
});
