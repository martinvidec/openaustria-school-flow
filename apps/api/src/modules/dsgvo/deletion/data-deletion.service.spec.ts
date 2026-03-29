import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DataDeletionService } from './data-deletion.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { DSGVO_DELETION_QUEUE } from '../../../config/queue/queue.constants';

const mockPrisma = {
  person: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  dsgvoJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  consentRecord: {
    updateMany: vi.fn(),
  },
  auditEntry: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)),
};

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'bull-job-1' }),
};

describe('DataDeletionService', () => {
  let service: DataDeletionService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataDeletionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(DSGVO_DELETION_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<DataDeletionService>(DataDeletionService);
  });

  describe('anonymizePerson', () => {
    const personId = 'person-1';
    const dsgvoJobId = 'job-1';

    it('replaces firstName with "Geloeschte" and lastName with "Person #NNN"', async () => {
      const mockPerson = {
        id: personId,
        firstName: 'Maria',
        lastName: 'Huber',
        email: 'maria@test.at',
        isAnonymized: false,
        consentRecords: [],
      };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.person.update.mockResolvedValue({ ...mockPerson, isAnonymized: true });
      mockPrisma.dsgvoJob.update.mockResolvedValue({});
      mockPrisma.consentRecord.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);

      await service.anonymizePerson(personId, dsgvoJobId);

      const updateCall = mockPrisma.person.update.mock.calls[0][0];
      expect(updateCall.data.firstName).toBe('Geloeschte');
      expect(updateCall.data.lastName).toMatch(/^Person #\d+$/);
    });

    it('sets email, phone, address, dateOfBirth, socialSecurityNumber, healthData to null', async () => {
      const mockPerson = {
        id: personId,
        firstName: 'Maria',
        lastName: 'Huber',
        email: 'maria@test.at',
        phone: '+431234567',
        address: 'Teststr. 1',
        dateOfBirth: '2000-01-01',
        socialSecurityNumber: '1234010100',
        healthData: 'none',
        isAnonymized: false,
        consentRecords: [],
      };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.person.update.mockResolvedValue({ ...mockPerson, isAnonymized: true });
      mockPrisma.dsgvoJob.update.mockResolvedValue({});
      mockPrisma.consentRecord.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);

      await service.anonymizePerson(personId, dsgvoJobId);

      const updateCall = mockPrisma.person.update.mock.calls[0][0];
      expect(updateCall.data.email).toBeNull();
      expect(updateCall.data.phone).toBeNull();
      expect(updateCall.data.address).toBeNull();
      expect(updateCall.data.dateOfBirth).toBeNull();
      expect(updateCall.data.socialSecurityNumber).toBeNull();
      expect(updateCall.data.healthData).toBeNull();
    });

    it('sets isAnonymized=true and anonymizedAt to current time', async () => {
      const mockPerson = {
        id: personId,
        firstName: 'Maria',
        lastName: 'Huber',
        isAnonymized: false,
        consentRecords: [],
      };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.person.update.mockResolvedValue({ ...mockPerson, isAnonymized: true });
      mockPrisma.dsgvoJob.update.mockResolvedValue({});
      mockPrisma.consentRecord.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);

      const before = new Date();
      await service.anonymizePerson(personId, dsgvoJobId);
      const after = new Date();

      const updateCall = mockPrisma.person.update.mock.calls[0][0];
      expect(updateCall.data.isAnonymized).toBe(true);
      expect(updateCall.data.anonymizedAt).toBeInstanceOf(Date);
      expect(updateCall.data.anonymizedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updateCall.data.anonymizedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('throws ConflictException on already-anonymized person', async () => {
      const mockPerson = {
        id: personId,
        firstName: 'Geloeschte',
        lastName: 'Person #1',
        isAnonymized: true,
        anonymizedAt: new Date(),
        consentRecords: [],
      };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await expect(service.anonymizePerson(personId, dsgvoJobId)).rejects.toThrow(ConflictException);
    });
  });

  describe('requestDeletion', () => {
    const dto = { personId: 'person-1', schoolId: 'school-1' };

    it('creates DsgvoJob with status=QUEUED and enqueues BullMQ job', async () => {
      const mockPerson = { id: 'person-1', isAnonymized: false, schoolId: 'school-1' };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.dsgvoJob.findFirst.mockResolvedValue(null);
      const mockJob = { id: 'job-1', status: 'QUEUED', jobType: 'DATA_DELETION' };
      mockPrisma.dsgvoJob.create.mockResolvedValue(mockJob);
      mockPrisma.dsgvoJob.update.mockResolvedValue({ ...mockJob, bullmqJobId: 'bull-job-1' });

      const result = await service.requestDeletion(dto);

      expect(mockPrisma.dsgvoJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobType: 'DATA_DELETION',
            status: 'QUEUED',
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'anonymize-person',
        expect.objectContaining({ personId: 'person-1' }),
      );
    });

    it('throws ConflictException if deletion already in progress (QUEUED or PROCESSING)', async () => {
      const mockPerson = { id: 'person-1', isAnonymized: false, schoolId: 'school-1' };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      const pendingJob = { id: 'job-1', status: 'QUEUED', jobType: 'DATA_DELETION' };
      mockPrisma.dsgvoJob.findFirst.mockResolvedValue(pendingJob);

      await expect(service.requestDeletion(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getStatus', () => {
    it('returns DsgvoJob with current status', async () => {
      const mockJob = { id: 'job-1', status: 'COMPLETED', jobType: 'DATA_DELETION' };
      mockPrisma.dsgvoJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.getStatus('job-1');

      expect(result).toEqual(mockJob);
      expect(mockPrisma.dsgvoJob.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'job-1' } }),
      );
    });

    it('throws NotFoundException when job not found', async () => {
      mockPrisma.dsgvoJob.findUnique.mockResolvedValue(null);

      await expect(service.getStatus('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
