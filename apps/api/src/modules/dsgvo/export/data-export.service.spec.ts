import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { DataExportService } from './data-export.service';
import { PdfExportService } from './pdf-export.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { DSGVO_EXPORT_QUEUE } from '../../../config/queue/queue.constants';

const mockPrisma = {
  person: {
    findUnique: vi.fn(),
  },
  dsgvoJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  auditEntry: {
    findMany: vi.fn(),
  },
};

const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'bull-export-1' }),
};

const mockPdfService = {
  generatePersonDataPdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
};

describe('DataExportService', () => {
  let service: DataExportService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(DSGVO_EXPORT_QUEUE), useValue: mockQueue },
        { provide: PdfExportService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
  });

  describe('requestExport', () => {
    const dto = { personId: 'person-1', schoolId: 'school-1' };

    it('creates DsgvoJob and enqueues BullMQ job', async () => {
      const mockPerson = { id: 'person-1', schoolId: 'school-1' };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.dsgvoJob.findFirst.mockResolvedValue(null);
      const mockJob = { id: 'job-1', status: 'QUEUED', jobType: 'DATA_EXPORT' };
      mockPrisma.dsgvoJob.create.mockResolvedValue(mockJob);
      mockPrisma.dsgvoJob.update.mockResolvedValue({ ...mockJob, bullmqJobId: 'bull-export-1' });

      const result = await service.requestExport(dto);

      expect(mockPrisma.dsgvoJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobType: 'DATA_EXPORT',
            status: 'QUEUED',
            personId: 'person-1',
            schoolId: 'school-1',
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'export-person-data',
        expect.objectContaining({ personId: 'person-1' }),
      );
    });

    it('throws ConflictException on duplicate pending export', async () => {
      const mockPerson = { id: 'person-1', schoolId: 'school-1' };
      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      const pendingJob = { id: 'job-1', status: 'QUEUED', jobType: 'DATA_EXPORT' };
      mockPrisma.dsgvoJob.findFirst.mockResolvedValue(pendingJob);

      await expect(service.requestExport(dto)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when person does not exist', async () => {
      mockPrisma.person.findUnique.mockResolvedValue(null);

      await expect(service.requestExport(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateExport', () => {
    const personId = 'person-1';
    const dsgvoJobId = 'job-1';

    it('aggregates person + teacher data correctly', async () => {
      const mockPersonWithTeacher = {
        id: personId,
        firstName: 'Maria',
        lastName: 'Huber',
        email: 'maria@test.at',
        phone: null,
        address: null,
        dateOfBirth: null,
        personType: 'TEACHER',
        keycloakUserId: 'kc-1',
        school: { name: 'Testschule' },
        teacher: {
          personalNumber: 'T001',
          yearsOfService: 10,
          isPermanent: true,
          employmentPercentage: 100,
          isShared: false,
          werteinheitenTarget: 20,
          qualifications: [
            { subject: { name: 'Mathematik', shortName: 'M' } },
          ],
          availabilityRules: [
            { ruleType: 'BLOCKED_PERIOD', dayOfWeek: 'MONDAY', periodNumbers: [1], isHard: true },
          ],
          reductions: [
            { reductionType: 'KUSTODIAT', werteinheiten: 2, description: 'Physik' },
          ],
        },
        student: null,
        parent: null,
        consentRecords: [
          { purpose: 'STUNDENPLANERSTELLUNG', granted: true, grantedAt: new Date('2026-01-01'), withdrawnAt: null },
        ],
      };

      mockPrisma.person.findUnique.mockResolvedValue(mockPersonWithTeacher);
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await service.generateExport(personId, dsgvoJobId);

      // Check that the job was updated to COMPLETED with data
      const completedCall = mockPrisma.dsgvoJob.update.mock.calls.find(
        (c: any) => c[0].data.status === 'COMPLETED',
      );
      expect(completedCall).toBeDefined();
      const resultData = completedCall![0].data.resultData;
      expect(resultData.jsonExport.role).toBe('TEACHER');
      expect(resultData.jsonExport.person.firstName).toBe('Maria');
      expect(resultData.jsonExport.roleData.personalNumber).toBe('T001');
      expect(resultData.jsonExport.roleData.qualifications).toHaveLength(1);
      expect(resultData.pdfBase64).toBeDefined();
    });

    it('aggregates person + student data correctly', async () => {
      const mockPersonWithStudent = {
        id: personId,
        firstName: 'Max',
        lastName: 'Mustermann',
        email: 'max@test.at',
        phone: null,
        address: null,
        dateOfBirth: null,
        personType: 'STUDENT',
        keycloakUserId: 'kc-2',
        school: { name: 'Testschule' },
        teacher: null,
        student: {
          studentNumber: 'S001',
          enrollmentDate: new Date('2025-09-01'),
          schoolClass: { name: '3B' },
          groupMemberships: [
            { group: { name: 'Religion Evangelisch', groupType: 'RELIGION' } },
          ],
        },
        parent: null,
        consentRecords: [],
      };

      mockPrisma.person.findUnique.mockResolvedValue(mockPersonWithStudent);
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await service.generateExport(personId, dsgvoJobId);

      const completedCall = mockPrisma.dsgvoJob.update.mock.calls.find(
        (c: any) => c[0].data.status === 'COMPLETED',
      );
      expect(completedCall).toBeDefined();
      const resultData = completedCall![0].data.resultData;
      expect(resultData.jsonExport.role).toBe('STUDENT');
      expect(resultData.jsonExport.roleData.studentNumber).toBe('S001');
      expect(resultData.jsonExport.roleData.className).toBe('3B');
      expect(resultData.jsonExport.roleData.groupMemberships).toHaveLength(1);
    });
  });

  describe('getExportData', () => {
    it('returns result from completed job', async () => {
      const mockJob = {
        id: 'job-1',
        status: 'COMPLETED',
        resultData: { jsonExport: { person: {} }, pdfBase64: 'abc123' },
      };
      mockPrisma.dsgvoJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.getExportData('job-1');

      expect(result).toEqual(mockJob.resultData);
    });

    it('throws ConflictException when export is not completed', async () => {
      const mockJob = { id: 'job-1', status: 'PROCESSING', resultData: null };
      mockPrisma.dsgvoJob.findUnique.mockResolvedValue(mockJob);

      await expect(service.getExportData('job-1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when job does not exist', async () => {
      mockPrisma.dsgvoJob.findUnique.mockResolvedValue(null);

      await expect(service.getExportData('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
