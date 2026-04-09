import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../config/database/prisma.service';
import { Prisma } from '../../../config/database/generated/client.js';
import { DSGVO_EXPORT_QUEUE } from '../../../config/queue/queue.constants';
import { PdfExportService, PersonExportData } from './pdf-export.service';
import { RequestExportDto } from './dto/request-export.dto';

@Injectable()
export class DataExportService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(DSGVO_EXPORT_QUEUE) private exportQueue: Queue,
    private pdfExportService: PdfExportService,
  ) {}

  async requestExport(dto: RequestExportDto) {
    // 1. Check person exists
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException(`Person with ID ${dto.personId} was not found.`);
    }

    // 2. Check no pending export
    const pendingExport = await this.prisma.dsgvoJob.findFirst({
      where: {
        personId: dto.personId,
        jobType: 'DATA_EXPORT',
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    });
    if (pendingExport) {
      throw new ConflictException('A data export is already in progress for this person. Please wait for it to complete.');
    }

    // 3. Create DsgvoJob
    const dsgvoJob = await this.prisma.dsgvoJob.create({
      data: {
        schoolId: dto.schoolId,
        personId: dto.personId,
        jobType: 'DATA_EXPORT',
        status: 'QUEUED',
      },
    });

    // 4. Enqueue BullMQ job
    const bullJob = await this.exportQueue.add('export-person-data', {
      personId: dto.personId,
      dsgvoJobId: dsgvoJob.id,
    });

    // 5. Update with bullmqJobId
    const updatedJob = await this.prisma.dsgvoJob.update({
      where: { id: dsgvoJob.id },
      data: { bullmqJobId: bullJob.id },
    });

    return updatedJob;
  }

  async generateExport(personId: string, dsgvoJobId: string) {
    // Update status to PROCESSING
    await this.prisma.dsgvoJob.update({
      where: { id: dsgvoJobId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Aggregate all person data
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
        include: {
          school: true,
          teacher: {
            include: {
              qualifications: { include: { subject: true } },
              availabilityRules: true,
              reductions: true,
            },
          },
          student: {
            include: {
              schoolClass: true,
              groupMemberships: { include: { group: true } },
            },
          },
          parent: {
            include: {
              children: { include: { student: { include: { person: true } } } },
            },
          },
          consentRecords: true,
        },
      });

      if (!person) {
        throw new NotFoundException(`Person with ID ${personId} was not found.`);
      }

      // Get audit entries for this person
      const auditEntries = await this.prisma.auditEntry.findMany({
        where: {
          OR: [
            { resource: 'person', resourceId: personId },
            ...(person.keycloakUserId ? [{ userId: person.keycloakUserId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // ---- Phase 5-8 personal data (DSGVO-04, Audit Finding 4) ----
      //
      // Subject access requests (DSGVO Art. 15) must return all personal data
      // the controller processes about the data subject. Phase 2 only covered
      // entities that existed at that time; Phases 5-8 added grades, attendance,
      // messages, notifications, homework and exams. Each table is queried by
      // the person's local id (Phase 5 classroom data) or keycloakUserId
      // (Phase 6-8 user-scoped events/messaging). 50-row limit per category
      // matches the existing PDF cap (Phase 2 D-14).
      const kcUserId: string | undefined = person.keycloakUserId ?? undefined;

      // Phase 5 — class book (student-scoped data always via person.id)
      const attendanceRecords = await this.prisma.attendanceRecord.findMany({
        where: { studentId: person.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const gradeEntries = await this.prisma.gradeEntry.findMany({
        where: { studentId: person.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const absenceExcuses = await this.prisma.absenceExcuse.findMany({
        where: { OR: [{ studentId: person.id }, { parentId: person.id }] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const studentNotes = await this.prisma.studentNote.findMany({
        where: { OR: [{ studentId: person.id }, { authorId: person.id }] },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Phase 6/9 — notifications (user-scoped by keycloakUserId)
      const notifications = kcUserId
        ? await this.prisma.notification.findMany({
            where: { userId: kcUserId },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];

      // Phase 7 — communication (user-scoped by keycloakUserId)
      const messages = kcUserId
        ? await this.prisma.message.findMany({
            where: { senderId: kcUserId },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];
      const messageRecipients = kcUserId
        ? await this.prisma.messageRecipient.findMany({
            where: { userId: kcUserId },
            take: 50,
          })
        : [];

      // Phase 8 — homework / exams / calendar tokens (createdBy = keycloakUserId)
      const homework = kcUserId
        ? await this.prisma.homework.findMany({
            where: { createdBy: kcUserId },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];
      const exams = kcUserId
        ? await this.prisma.exam.findMany({
            where: { createdBy: kcUserId },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : [];
      const calendarTokens = kcUserId
        ? await this.prisma.calendarToken.findMany({
            where: { userId: kcUserId },
          })
        : [];

      // Determine role
      let role: 'TEACHER' | 'STUDENT' | 'PARENT';
      let roleData: Record<string, unknown>;

      if (person.teacher) {
        role = 'TEACHER';
        roleData = {
          personalNumber: person.teacher.personalNumber,
          yearsOfService: person.teacher.yearsOfService,
          isPermanent: person.teacher.isPermanent,
          employmentPercentage: person.teacher.employmentPercentage,
          isShared: person.teacher.isShared,
          werteinheitenTarget: person.teacher.werteinheitenTarget,
          qualifications: person.teacher.qualifications.map((q) => ({
            subjectName: q.subject.name,
            subjectShortName: q.subject.shortName,
          })),
          availabilityRules: person.teacher.availabilityRules.map((r) => ({
            ruleType: r.ruleType,
            dayOfWeek: r.dayOfWeek,
            periodNumbers: r.periodNumbers,
            isHard: r.isHard,
          })),
          reductions: person.teacher.reductions.map((r) => ({
            reductionType: r.reductionType,
            werteinheiten: r.werteinheiten,
            description: r.description,
          })),
        };
      } else if (person.student) {
        role = 'STUDENT';
        roleData = {
          studentNumber: person.student.studentNumber,
          enrollmentDate: person.student.enrollmentDate?.toISOString() ?? null,
          className: person.student.schoolClass?.name ?? null,
          groupMemberships: person.student.groupMemberships.map((m) => ({
            groupName: m.group.name,
            groupType: m.group.groupType,
          })),
        };
      } else if (person.parent) {
        role = 'PARENT';
        roleData = {
          children: person.parent.children.map((c) => ({
            studentName: `${c.student.person.firstName} ${c.student.person.lastName}`,
          })),
        };
      } else {
        role = 'STUDENT'; // fallback
        roleData = {};
      }

      // Build JSON bundle
      const jsonExport: PersonExportData = {
        exportDate: new Date().toISOString(),
        person: {
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone,
          address: person.address,
          dateOfBirth: person.dateOfBirth,
          personType: person.personType,
        },
        role,
        roleData,
        consents: person.consentRecords.map((c) => ({
          purpose: c.purpose,
          granted: c.granted,
          grantedAt: c.grantedAt?.toISOString() ?? null,
          withdrawnAt: c.withdrawnAt?.toISOString() ?? null,
        })),
        auditLog: auditEntries.map((e) => ({
          action: e.action,
          resource: e.resource,
          createdAt: e.createdAt.toISOString(),
        })),
        // Phase 5-8 personal data (DSGVO-04 closure -- Audit Finding 4)
        attendanceRecords: attendanceRecords as unknown as Array<Record<string, unknown>>,
        gradeEntries: gradeEntries as unknown as Array<Record<string, unknown>>,
        absenceExcuses: absenceExcuses as unknown as Array<Record<string, unknown>>,
        studentNotes: studentNotes as unknown as Array<Record<string, unknown>>,
        notifications: notifications as unknown as Array<Record<string, unknown>>,
        messages: messages as unknown as Array<Record<string, unknown>>,
        messageRecipients: messageRecipients as unknown as Array<Record<string, unknown>>,
        homework: homework as unknown as Array<Record<string, unknown>>,
        exams: exams as unknown as Array<Record<string, unknown>>,
        calendarTokens: calendarTokens as unknown as Array<Record<string, unknown>>,
        schoolName: person.school?.name,
      };

      // Generate PDF
      const pdfBuffer = await this.pdfExportService.generatePersonDataPdf(jsonExport);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Store results
      await this.prisma.dsgvoJob.update({
        where: { id: dsgvoJobId },
        data: {
          status: 'COMPLETED',
          resultData: { jsonExport, pdfBase64 } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await this.prisma.dsgvoJob.update({
        where: { id: dsgvoJobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  async getStatus(dsgvoJobId: string) {
    const job = await this.prisma.dsgvoJob.findUnique({
      where: { id: dsgvoJobId },
    });
    if (!job) {
      throw new NotFoundException(`DSGVO job with ID ${dsgvoJobId} was not found.`);
    }
    return job;
  }

  async getExportData(dsgvoJobId: string) {
    const job = await this.prisma.dsgvoJob.findUnique({
      where: { id: dsgvoJobId },
    });
    if (!job) {
      throw new NotFoundException(`DSGVO job with ID ${dsgvoJobId} was not found.`);
    }
    if (job.status !== 'COMPLETED') {
      throw new ConflictException('Export is not yet completed.');
    }
    return job.resultData;
  }

  async getExportsByPerson(personId: string) {
    return this.prisma.dsgvoJob.findMany({
      where: {
        personId,
        jobType: 'DATA_EXPORT',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
