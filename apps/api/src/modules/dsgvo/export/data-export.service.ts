import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../config/database/prisma.service';
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
          resultData: { jsonExport, pdfBase64 },
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
