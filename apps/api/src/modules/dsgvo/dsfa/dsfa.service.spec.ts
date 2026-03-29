import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DsfaService } from './dsfa.service';
import { PrismaService } from '../../../config/database/prisma.service';

const mockPrisma = {
  dsfaEntry: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  vvzEntry: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  school: {
    findUnique: vi.fn(),
  },
};

describe('DsfaService', () => {
  let service: DsfaService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsfaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DsfaService>(DsfaService);
  });

  describe('createDsfaEntry', () => {
    it('creates a new DSFA entry', async () => {
      const dto = {
        schoolId: 's-1',
        title: 'Stundenplanerstellung',
        description: 'Verarbeitung von Lehrer- und Schuelerdaten fuer Stundenplanerstellung',
        dataCategories: ['Lehrerdaten', 'Schuelerdaten', 'Stundenplandaten'],
        riskAssessment: 'Mittleres Risiko',
        mitigationMeasures: 'Verschluesselung, Zugriffskontrolle',
      };
      const created = { id: 'dsfa-1', ...dto, status: 'draft' };
      mockPrisma.dsfaEntry.create.mockResolvedValue(created);

      const result = await service.createDsfaEntry(dto);

      expect(mockPrisma.dsfaEntry.create).toHaveBeenCalledOnce();
      expect(result.title).toBe('Stundenplanerstellung');
    });
  });

  describe('createVvzEntry', () => {
    it('creates a new VVZ entry', async () => {
      const dto = {
        schoolId: 's-1',
        activityName: 'Schulverwaltung',
        purpose: 'Verwaltung von Schueler- und Lehrerdaten',
        legalBasis: 'Schulunterrichtsgesetz',
        dataCategories: ['Name', 'Kontaktdaten', 'Noten'],
        affectedPersons: ['Schueler', 'Lehrer', 'Eltern'],
        retentionPeriod: '60 Jahre (Noten)',
      };
      const created = { id: 'vvz-1', ...dto };
      mockPrisma.vvzEntry.create.mockResolvedValue(created);

      const result = await service.createVvzEntry(dto);

      expect(mockPrisma.vvzEntry.create).toHaveBeenCalledOnce();
      expect(result.activityName).toBe('Schulverwaltung');
    });
  });

  describe('findDsfaEntries', () => {
    it('returns DSFA entries filtered by schoolId', async () => {
      const entries = [
        { id: 'dsfa-1', schoolId: 's-1', title: 'Entry 1' },
        { id: 'dsfa-2', schoolId: 's-1', title: 'Entry 2' },
      ];
      mockPrisma.dsfaEntry.findMany.mockResolvedValue(entries);

      const result = await service.findDsfaEntries('s-1');

      expect(mockPrisma.dsfaEntry.findMany).toHaveBeenCalledWith({
        where: { schoolId: 's-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findVvzEntries', () => {
    it('returns VVZ entries filtered by schoolId', async () => {
      const entries = [{ id: 'vvz-1', schoolId: 's-1' }];
      mockPrisma.vvzEntry.findMany.mockResolvedValue(entries);

      const result = await service.findVvzEntries('s-1');

      expect(mockPrisma.vvzEntry.findMany).toHaveBeenCalledWith({
        where: { schoolId: 's-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateDsfaEntry', () => {
    it('updates an existing DSFA entry', async () => {
      mockPrisma.dsfaEntry.findUnique.mockResolvedValue({ id: 'dsfa-1' });
      mockPrisma.dsfaEntry.update.mockResolvedValue({ id: 'dsfa-1', title: 'Updated' });

      const result = await service.updateDsfaEntry('dsfa-1', { title: 'Updated' });

      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundException when DSFA entry not found', async () => {
      mockPrisma.dsfaEntry.findUnique.mockResolvedValue(null);

      await expect(service.updateDsfaEntry('nonexistent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDsfaEntry', () => {
    it('deletes a DSFA entry', async () => {
      mockPrisma.dsfaEntry.findUnique.mockResolvedValue({ id: 'dsfa-1' });
      mockPrisma.dsfaEntry.delete.mockResolvedValue({ id: 'dsfa-1' });

      await service.removeDsfaEntry('dsfa-1');

      expect(mockPrisma.dsfaEntry.delete).toHaveBeenCalledWith({ where: { id: 'dsfa-1' } });
    });
  });

  describe('exportCombinedJson', () => {
    it('returns combined DSFA + VVZ data with school metadata', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 's-1',
        name: 'Test Schule',
        schoolType: 'AHS_UNTER',
      });
      mockPrisma.dsfaEntry.findMany.mockResolvedValue([
        { id: 'dsfa-1', title: 'DSFA Entry 1' },
      ]);
      mockPrisma.vvzEntry.findMany.mockResolvedValue([
        { id: 'vvz-1', activityName: 'VVZ Entry 1' },
        { id: 'vvz-2', activityName: 'VVZ Entry 2' },
      ]);

      const result = await service.exportCombinedJson('s-1');

      expect(result.type).toBe('dsgvo-combined');
      expect(result.school.name).toBe('Test Schule');
      expect(result.school.schoolType).toBe('AHS_UNTER');
      expect(result.dsfa.count).toBe(1);
      expect(result.dsfa.entries).toHaveLength(1);
      expect(result.vvz.count).toBe(2);
      expect(result.vvz.entries).toHaveLength(2);
      expect(result.exportedAt).toBeDefined();
    });

    it('throws NotFoundException when school not found', async () => {
      mockPrisma.school.findUnique.mockResolvedValue(null);
      mockPrisma.dsfaEntry.findMany.mockResolvedValue([]);
      mockPrisma.vvzEntry.findMany.mockResolvedValue([]);

      await expect(service.exportCombinedJson('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportDsfaJson', () => {
    it('returns DSFA export with metadata', async () => {
      mockPrisma.dsfaEntry.findMany.mockResolvedValue([{ id: 'dsfa-1' }]);

      const result = await service.exportDsfaJson('s-1');

      expect(result.type).toBe('dsfa');
      expect(result.schoolId).toBe('s-1');
      expect(result.entries).toHaveLength(1);
      expect(result.exportedAt).toBeDefined();
    });
  });

  describe('exportVvzJson', () => {
    it('returns VVZ export with metadata', async () => {
      mockPrisma.vvzEntry.findMany.mockResolvedValue([{ id: 'vvz-1' }]);

      const result = await service.exportVvzJson('s-1');

      expect(result.type).toBe('vvz');
      expect(result.schoolId).toBe('s-1');
      expect(result.entries).toHaveLength(1);
      expect(result.exportedAt).toBeDefined();
    });
  });
});
