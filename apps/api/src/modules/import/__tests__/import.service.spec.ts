import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ImportService } from '../import.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { IMPORT_QUEUE } from '../../../config/queue/queue.constants';

// Mock queue
const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'bullmq-job-1' }),
};

// Mock Prisma
const mockPrisma = {
  importJob: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  teacher: {
    findFirst: vi.fn(),
  },
  person: {
    create: vi.fn(),
    update: vi.fn(),
  },
  schoolClass: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  room: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  student: {
    findFirst: vi.fn(),
  },
};

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(IMPORT_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  // IMPORT-01: Untis import
  describe('IMPORT-01: Untis import', () => {
    it('creates ImportJob in QUEUED status', async () => {
      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
        schoolId: 'school-1',
        fileType: 'UNTIS_XML',
        entityType: 'MIXED',
      });

      const result = await service.uploadAndParse(
        'school-1',
        {
          filename: 'export.xml',
          content: '<?xml version="1.0"?><document><teachers><teacher><shortname>MUL</shortname></teacher></teachers></document>',
        },
        'user-1',
      );

      expect(result.importJobId).toBe('job-1');
      expect(mockPrisma.importJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'QUEUED',
            schoolId: 'school-1',
          }),
        }),
      );
    });

    it('transitions to DRY_RUN status on dry-run', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
        fileType: 'UNTIS_XML',
        entityType: 'TEACHERS',
        conflictMode: 'SKIP',
        columnMapping: null,
        dryRunResult: { filePath: '/tmp/test-file' },
      });

      const result = await service.startDryRun('school-1', 'job-1');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'import-dry-run',
        expect.objectContaining({
          importJobId: 'job-1',
          dryRun: true,
        }),
        expect.any(Object),
      );
      expect(result.bullmqJobId).toBe('bullmq-job-1');
    });

    it('transitions to PROCESSING on commit', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'DRY_RUN',
        fileType: 'UNTIS_XML',
        entityType: 'TEACHERS',
        conflictMode: 'SKIP',
        schoolId: 'school-1',
        columnMapping: null,
        dryRunResult: { filePath: '/tmp/test-file' },
      });

      await service.commitImport('job-1');

      expect(mockPrisma.importJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({ status: 'PROCESSING' }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'import-commit',
        expect.objectContaining({
          importJobId: 'job-1',
          dryRun: false,
        }),
        expect.any(Object),
      );
    });

    it('stores import results (imported, skipped, error counts)', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue({
        id: 'job-1',
        totalRows: 5,
        importedRows: 3,
        skippedRows: 1,
        errorRows: 1,
        status: 'PARTIAL',
      });

      const job = await service.getJob('job-1');
      expect(job.totalRows).toBe(5);
      expect(job.importedRows).toBe(3);
      expect(job.skippedRows).toBe(1);
      expect(job.errorRows).toBe(1);
    });

    it('creates import history for audit trail (D-08)', async () => {
      mockPrisma.importJob.findMany.mockResolvedValue([
        { id: 'job-1', createdAt: new Date('2026-04-07') },
        { id: 'job-2', createdAt: new Date('2026-04-06') },
      ]);

      const history = await service.getHistory('school-1');
      expect(history).toHaveLength(2);
      expect(mockPrisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: 'school-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('throws NotFoundException for non-existent job', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue(null);

      await expect(service.getJob('nonexistent')).rejects.toThrow('Import job not found');
    });
  });

  // IMPORT-02: CSV import with column mapping
  describe('IMPORT-02: CSV import', () => {
    it('accepts column mapping configuration', async () => {
      mockPrisma.importJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
        fileType: 'CSV',
        entityType: 'TEACHERS',
        conflictMode: 'SKIP',
        columnMapping: null,
        dryRunResult: { filePath: '/tmp/test-csv' },
      });

      await service.startDryRun('school-1', 'job-1', {
        columnMapping: { Nachname: 'lastName', Vorname: 'firstName' },
      });

      expect(mockPrisma.importJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            columnMapping: { Nachname: 'lastName', Vorname: 'firstName' },
          }),
        }),
      );
    });

    it('processes rows with SKIP conflict mode', async () => {
      mockPrisma.teacher.findFirst.mockResolvedValue({
        id: 'existing-teacher',
        abbreviation: 'MUL',
        personId: 'person-1',
        person: { firstName: 'Maria', lastName: 'Mueller' },
      });

      const result = await service.processImportRow(
        { shortName: 'MUL', lastName: 'Mueller', firstName: 'Maria' },
        'TEACHERS',
        'school-1',
        'SKIP',
      );

      expect(result.status).toBe('skipped');
    });

    it('processes rows with UPDATE conflict mode', async () => {
      mockPrisma.teacher.findFirst.mockResolvedValue({
        id: 'existing-teacher',
        abbreviation: 'MUL',
        personId: 'person-1',
        person: { firstName: 'Maria', lastName: 'Mueller' },
      });

      const result = await service.processImportRow(
        { shortName: 'MUL', lastName: 'Mueller-Updated', firstName: 'Maria' },
        'TEACHERS',
        'school-1',
        'UPDATE',
      );

      expect(result.status).toBe('imported');
      expect(mockPrisma.person.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'person-1' },
          data: expect.objectContaining({ lastName: 'Mueller-Updated' }),
        }),
      );
    });

    it('processes rows with FAIL conflict mode', async () => {
      mockPrisma.teacher.findFirst.mockResolvedValue({
        id: 'existing-teacher',
        abbreviation: 'MUL',
        personId: 'person-1',
        person: { firstName: 'Maria', lastName: 'Mueller' },
      });

      const result = await service.processImportRow(
        { shortName: 'MUL', lastName: 'Mueller', firstName: 'Maria' },
        'TEACHERS',
        'school-1',
        'FAIL',
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('already exists');
    });

    it('creates new teacher when no conflict exists', async () => {
      mockPrisma.teacher.findFirst.mockResolvedValue(null);
      mockPrisma.person.create.mockResolvedValue({ id: 'new-person' });

      const result = await service.processImportRow(
        { shortName: 'NEW', lastName: 'Neumann', firstName: 'Anna' },
        'TEACHERS',
        'school-1',
        'SKIP',
      );

      expect(result.status).toBe('imported');
      expect(mockPrisma.person.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Anna',
            lastName: 'Neumann',
            schoolId: 'school-1',
            teacher: expect.objectContaining({
              create: expect.objectContaining({ abbreviation: 'NEW' }),
            }),
          }),
        }),
      );
    });

    it('validates required fields are mapped', async () => {
      const result = await service.processImportRow(
        {},
        'TEACHERS',
        'school-1',
        'SKIP',
      );

      expect(result.status).toBe('error');
      expect(result.error).toContain('Missing');
    });
  });
});
