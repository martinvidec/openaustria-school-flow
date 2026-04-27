import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  describe('findAllForAdmin', () => {
    const adminUser = { id: 'admin-1', roles: ['admin'] };
    const baseQuery = {
      schoolId: 'school-1',
      page: 1,
      limit: 20,
      skip: 0,
    };

    beforeEach(() => {
      mockPrisma.consentRecord.findMany.mockResolvedValue([]);
      mockPrisma.consentRecord.count.mockResolvedValue(0);
    });

    it('scopes rows by schoolId via person.schoolId join (Pitfall 4 / RESEARCH §8)', async () => {
      await service.findAllForAdmin(baseQuery, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      expect(args.where.person).toEqual({ schoolId: 'school-1' });
      expect(args.skip).toBe(0);
      expect(args.take).toBe(20);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.include.person.select).toMatchObject({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      });
    });

    it('applies purpose filter when provided', async () => {
      await service.findAllForAdmin({ ...baseQuery, purpose: 'KOMMUNIKATION' }, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      expect(args.where.purpose).toBe('KOMMUNIKATION');
    });

    it('maps status=granted to { granted: true, withdrawnAt: null }', async () => {
      await service.findAllForAdmin({ ...baseQuery, status: 'granted' }, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      expect(args.where.granted).toBe(true);
      expect(args.where.withdrawnAt).toBeNull();
    });

    it('maps status=withdrawn to { withdrawnAt: { not: null } }', async () => {
      await service.findAllForAdmin({ ...baseQuery, status: 'withdrawn' }, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      expect(args.where.withdrawnAt).toEqual({ not: null });
    });

    it('maps status=expired to { granted: false, withdrawnAt: null }', async () => {
      await service.findAllForAdmin({ ...baseQuery, status: 'expired' }, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      expect(args.where.granted).toBe(false);
      expect(args.where.withdrawnAt).toBeNull();
    });

    it('personSearch composes OR over firstName/lastName/email AND keeps schoolId scope', async () => {
      await service.findAllForAdmin({ ...baseQuery, personSearch: 'maria' }, adminUser);
      const args = mockPrisma.consentRecord.findMany.mock.calls[0][0];
      // schoolId scope MUST survive the merge (regression guard against split `person` keys)
      expect(args.where.person.schoolId).toBe('school-1');
      expect(args.where.person.OR).toEqual([
        { firstName: { contains: 'maria', mode: 'insensitive' } },
        { lastName: { contains: 'maria', mode: 'insensitive' } },
        { email: { contains: 'maria', mode: 'insensitive' } },
      ]);
    });

    it.each([['schulleitung'], ['lehrer'], ['eltern'], ['schueler']])(
      'throws ForbiddenException for non-admin role: %s',
      async (role) => {
        await expect(
          service.findAllForAdmin(baseQuery, { id: 'u-1', roles: [role] }),
        ).rejects.toThrow(ForbiddenException);
        // Database must NOT be queried at all when the role gate fails
        expect(mockPrisma.consentRecord.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.consentRecord.count).not.toHaveBeenCalled();
      },
    );

    it('throws BadRequestException when schoolId is empty string (defensive guard)', async () => {
      await expect(
        service.findAllForAdmin({ ...baseQuery, schoolId: '' }, adminUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.consentRecord.findMany).not.toHaveBeenCalled();
    });

    it('returns paginated meta envelope { page, limit, total, totalPages }', async () => {
      mockPrisma.consentRecord.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
      mockPrisma.consentRecord.count.mockResolvedValue(45);
      const result = await service.findAllForAdmin(
        { ...baseQuery, page: 2, limit: 20, skip: 20 },
        adminUser,
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
    });
  });
});
