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
  // Phase 5-8 tables consulted by data-export.service for DSGVO-04
  // (Audit Finding 4). Default to empty arrays so existing tests focused on
  // person/teacher/student/audit data continue to pass without per-test stubs.
  attendanceRecord: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  gradeEntry: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  absenceExcuse: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  studentNote: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  notification: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  message: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  messageRecipient: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  homework: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  exam: {
    findMany: vi.fn().mockResolvedValue([]),
  },
  calendarToken: {
    findMany: vi.fn().mockResolvedValue([]),
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

    // Restore Phase 5-8 default empty results after clearAllMocks() resets them
    mockPrisma.attendanceRecord.findMany.mockResolvedValue([]);
    mockPrisma.gradeEntry.findMany.mockResolvedValue([]);
    mockPrisma.absenceExcuse.findMany.mockResolvedValue([]);
    mockPrisma.studentNote.findMany.mockResolvedValue([]);
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.messageRecipient.findMany.mockResolvedValue([]);
    mockPrisma.homework.findMany.mockResolvedValue([]);
    mockPrisma.exam.findMany.mockResolvedValue([]);
    mockPrisma.calendarToken.findMany.mockResolvedValue([]);

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

    // ---- DSGVO-04 closure (Phase 9.2 / Audit Finding 4) ----
    // Subject access requests must include personal data added by Phases 5-8.

    it('includes Phase 5 attendance records when person is a student', async () => {
      const mockPerson = {
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
        student: { studentNumber: 'S001', enrollmentDate: null, schoolClass: null, groupMemberships: [] },
        parent: null,
        consentRecords: [],
      };
      const mockAttendance = [
        { id: 'att-1', studentId: personId, status: 'ABSENT', createdAt: new Date('2026-03-01') },
        { id: 'att-2', studentId: personId, status: 'PRESENT', createdAt: new Date('2026-03-02') },
      ];

      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);
      mockPrisma.attendanceRecord.findMany.mockResolvedValue(mockAttendance);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await service.generateExport(personId, dsgvoJobId);

      expect(mockPrisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: personId },
          take: 50,
        }),
      );
      const completedCall = mockPrisma.dsgvoJob.update.mock.calls.find(
        (c: any) => c[0].data.status === 'COMPLETED',
      );
      const resultData = completedCall![0].data.resultData;
      expect(resultData.jsonExport.attendanceRecords).toHaveLength(2);
    });

    it('includes Phase 7 messages when person is a sender', async () => {
      const mockPerson = {
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
          personalNumber: 'T001', yearsOfService: 0, isPermanent: false,
          employmentPercentage: 100, isShared: false, werteinheitenTarget: 20,
          qualifications: [], availabilityRules: [], reductions: [],
        },
        student: null,
        parent: null,
        consentRecords: [],
      };
      const mockMessages = [
        { id: 'msg-1', senderId: 'kc-1', body: 'Hallo Eltern', createdAt: new Date('2026-03-01') },
      ];
      const mockRecipients = [
        { id: 'mr-1', userId: 'kc-1', messageId: 'msg-2' },
      ];

      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);
      mockPrisma.message.findMany.mockResolvedValue(mockMessages);
      mockPrisma.messageRecipient.findMany.mockResolvedValue(mockRecipients);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await service.generateExport(personId, dsgvoJobId);

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { senderId: 'kc-1' } }),
      );
      expect(mockPrisma.messageRecipient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'kc-1' } }),
      );
      const completedCall = mockPrisma.dsgvoJob.update.mock.calls.find(
        (c: any) => c[0].data.status === 'COMPLETED',
      );
      const resultData = completedCall![0].data.resultData;
      expect(resultData.jsonExport.messages).toHaveLength(1);
      expect(resultData.jsonExport.messageRecipients).toHaveLength(1);
    });

    it('includes Phase 8 homework and exams when person is the creator', async () => {
      const mockPerson = {
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
          personalNumber: 'T001', yearsOfService: 0, isPermanent: false,
          employmentPercentage: 100, isShared: false, werteinheitenTarget: 20,
          qualifications: [], availabilityRules: [], reductions: [],
        },
        student: null,
        parent: null,
        consentRecords: [],
      };
      const mockHomework = [
        { id: 'hw-1', title: 'Mathe Hausuebung', createdBy: 'kc-1', createdAt: new Date('2026-03-01') },
      ];
      const mockExams = [
        { id: 'ex-1', title: 'Schularbeit', createdBy: 'kc-1', createdAt: new Date('2026-03-01') },
      ];

      mockPrisma.person.findUnique.mockResolvedValue(mockPerson);
      mockPrisma.auditEntry.findMany.mockResolvedValue([]);
      mockPrisma.homework.findMany.mockResolvedValue(mockHomework);
      mockPrisma.exam.findMany.mockResolvedValue(mockExams);
      mockPrisma.dsgvoJob.update.mockResolvedValue({});

      await service.generateExport(personId, dsgvoJobId);

      expect(mockPrisma.homework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdBy: 'kc-1' } }),
      );
      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdBy: 'kc-1' } }),
      );
      const completedCall = mockPrisma.dsgvoJob.update.mock.calls.find(
        (c: any) => c[0].data.status === 'COMPLETED',
      );
      const resultData = completedCall![0].data.resultData;
      expect(resultData.jsonExport.homework).toHaveLength(1);
      expect(resultData.jsonExport.exams).toHaveLength(1);
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
