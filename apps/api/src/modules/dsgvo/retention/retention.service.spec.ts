import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RetentionService, DEFAULT_RETENTION_DAYS } from './retention.service';
import { PrismaService } from '../../../config/database/prisma.service';

const mockPrisma = {
  retentionPolicy: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  school: {
    findMany: vi.fn(),
  },
  auditEntry: {
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  // Phase 6 (D-19): handover_materials retention category.
  // Default to "no expired rows" so pre-existing tests stay focused on their
  // audit-entry assertions without needing to stub handover mocks explicitly.
  handoverNote: {
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  },
};

describe('RetentionService', () => {
  let service: RetentionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore Phase 6 handover default values after clearAllMocks() resets them
    mockPrisma.handoverNote.count.mockResolvedValue(0);
    mockPrisma.handoverNote.findFirst.mockResolvedValue(null);
    mockPrisma.handoverNote.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
  });

  describe('create', () => {
    it('creates a new retention policy with isDefault=false', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);
      const created = { id: 'rp-1', schoolId: 's-1', dataCategory: 'noten', retentionDays: 10000, isDefault: false };
      mockPrisma.retentionPolicy.create.mockResolvedValue(created);

      const result = await service.create({
        schoolId: 's-1',
        dataCategory: 'noten',
        retentionDays: 10000,
      });

      expect(mockPrisma.retentionPolicy.create).toHaveBeenCalledWith({
        data: {
          schoolId: 's-1',
          dataCategory: 'noten',
          retentionDays: 10000,
          isDefault: false,
        },
      });
      expect(result).toBe(created);
    });

    it('throws ConflictException on duplicate school+category', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue({
        id: 'rp-1',
        schoolId: 's-1',
        dataCategory: 'noten',
      });

      await expect(
        service.create({ schoolId: 's-1', dataCategory: 'noten', retentionDays: 10000 }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create({ schoolId: 's-1', dataCategory: 'noten', retentionDays: 10000 }),
      ).rejects.toThrow('A retention policy for category noten already exists for this school. Use PUT to update.');
    });
  });

  describe('getEffectivePolicy', () => {
    it('returns school-specific policy when it exists', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue({
        retentionDays: 10000,
        isDefault: false,
      });

      const result = await service.getEffectivePolicy('s-1', 'noten');

      expect(result.retentionDays).toBe(10000);
      expect(result.isDefault).toBe(false);
    });

    it('returns default retention for noten (21900 days = 60 years)', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePolicy('s-1', 'noten');

      expect(result.retentionDays).toBe(21900);
      expect(result.isDefault).toBe(true);
    });

    it('returns default retention for anwesenheit (1825 days = 5 years)', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePolicy('s-1', 'anwesenheit');

      expect(result.retentionDays).toBe(1825);
      expect(result.isDefault).toBe(true);
    });

    it('returns default retention for kommunikation (365 days = 1 year)', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePolicy('s-1', 'kommunikation');

      expect(result.retentionDays).toBe(365);
      expect(result.isDefault).toBe(true);
    });

    it('returns fallback of 1825 days for unknown categories', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePolicy('s-1', 'unknown_category');

      expect(result.retentionDays).toBe(1825);
      expect(result.isDefault).toBe(true);
    });
  });

  describe('update', () => {
    it('updates retentionDays and sets isDefault=false', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.retentionPolicy.update.mockResolvedValue({ id: 'rp-1', retentionDays: 500, isDefault: false });

      const result = await service.update('rp-1', 500);

      expect(mockPrisma.retentionPolicy.update).toHaveBeenCalledWith({
        where: { id: 'rp-1' },
        data: { retentionDays: 500, isDefault: false },
      });
      expect(result.retentionDays).toBe(500);
    });

    it('throws NotFoundException when policy not found', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 500)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes retention policy', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue({ id: 'rp-1' });
      mockPrisma.retentionPolicy.delete.mockResolvedValue({ id: 'rp-1' });

      await service.remove('rp-1');

      expect(mockPrisma.retentionPolicy.delete).toHaveBeenCalledWith({ where: { id: 'rp-1' } });
    });

    it('throws NotFoundException when policy not found', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkExpiredRecords', () => {
    it('returns expired audit entries for a specific school', async () => {
      // Mock getEffectivePolicy by providing no school-specific policies
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);
      mockPrisma.auditEntry.count.mockResolvedValue(5);
      mockPrisma.auditEntry.findFirst.mockResolvedValue({
        createdAt: new Date('2020-01-01'),
      });

      const result = await service.checkExpiredRecords('s-1');

      expect(result.length).toBeGreaterThan(0);
      const auditResult = result.find((r) => r.category.startsWith('audit_'));
      expect(auditResult).toBeDefined();
      expect(auditResult!.count).toBe(5);
      expect(auditResult!.oldestDate).toEqual(new Date('2020-01-01'));
    });

    it('returns empty array when no expired records exist', async () => {
      mockPrisma.retentionPolicy.findUnique.mockResolvedValue(null);
      mockPrisma.auditEntry.count.mockResolvedValue(0);

      const result = await service.checkExpiredRecords('s-1');

      const hasPositiveCounts = result.some((r) => r.count > 0);
      expect(hasPositiveCounts).toBe(false);
    });
  });

  describe('DEFAULT_RETENTION_DAYS', () => {
    it('has correct Austrian-specific defaults', () => {
      expect(DEFAULT_RETENTION_DAYS.noten).toBe(21900);
      expect(DEFAULT_RETENTION_DAYS.anwesenheit).toBe(1825);
      expect(DEFAULT_RETENTION_DAYS.kommunikation).toBe(365);
      expect(DEFAULT_RETENTION_DAYS.audit_mutation).toBe(1095);
      expect(DEFAULT_RETENTION_DAYS.audit_sensitive_read).toBe(365);
      expect(DEFAULT_RETENTION_DAYS.personal_data).toBe(1825);
      expect(DEFAULT_RETENTION_DAYS.health_data).toBe(365);
    });
  });
});
