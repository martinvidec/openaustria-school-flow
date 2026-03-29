import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../config/database/prisma.service';
import { Prisma } from '../../../config/database/generated/client.js';
import { DSGVO_DELETION_QUEUE } from '../../../config/queue/queue.constants';
import { RequestDeletionDto } from './dto/request-deletion.dto';

@Injectable()
export class DataDeletionService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(DSGVO_DELETION_QUEUE) private deletionQueue: Queue,
  ) {}

  async requestDeletion(dto: RequestDeletionDto) {
    // 1. Check person exists
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person) {
      throw new NotFoundException(`Person with ID ${dto.personId} was not found.`);
    }

    // 2. Check not already anonymized
    if (person.isAnonymized) {
      throw new ConflictException("This person's data has already been anonymized.");
    }

    // 3. Check no pending deletion job
    const pendingJob = await this.prisma.dsgvoJob.findFirst({
      where: {
        personId: dto.personId,
        jobType: 'DATA_DELETION',
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    });
    if (pendingJob) {
      throw new ConflictException('A data deletion is already in progress for this person.');
    }

    // 4. Create DsgvoJob
    const dsgvoJob = await this.prisma.dsgvoJob.create({
      data: {
        schoolId: dto.schoolId,
        personId: dto.personId,
        jobType: 'DATA_DELETION',
        status: 'QUEUED',
      },
    });

    // 5. Enqueue BullMQ job
    const bullJob = await this.deletionQueue.add('anonymize-person', {
      personId: dto.personId,
      dsgvoJobId: dsgvoJob.id,
    });

    // 6. Update with bullmqJobId
    const updatedJob = await this.prisma.dsgvoJob.update({
      where: { id: dsgvoJob.id },
      data: { bullmqJobId: bullJob.id },
    });

    return updatedJob;
  }

  async anonymizePerson(personId: string, dsgvoJobId: string) {
    // Update job status to PROCESSING
    await this.prisma.dsgvoJob.update({
      where: { id: dsgvoJobId },
      data: { status: 'PROCESSING' },
    });

    try {
      // Load person
      const person = await this.prisma.person.findUnique({
        where: { id: personId },
        include: { consentRecords: true },
      });

      if (!person) {
        throw new NotFoundException(`Person with ID ${personId} was not found.`);
      }

      if (person.isAnonymized) {
        throw new ConflictException("This person's data has already been anonymized.");
      }

      // Generate anonymous counter from person ID (deterministic hash-based)
      const counter = this.generateAnonymousCounter(personId);

      await this.prisma.$transaction(async (tx) => {
        // a. Update Person: replace PII with placeholders
        await tx.person.update({
          where: { id: personId },
          data: {
            firstName: 'Geloeschte',
            lastName: `Person #${counter}`,
            email: null,
            phone: null,
            address: null,
            dateOfBirth: null,
            socialSecurityNumber: null,
            healthData: null,
            isAnonymized: true,
            anonymizedAt: new Date(),
          },
        });

        // b. Update ConsentRecord entries: set legalBasis to 'anonymized'
        await tx.consentRecord.updateMany({
          where: { personId },
          data: { legalBasis: 'anonymized' },
        });

        // c. Clear PII from audit entries that reference this person
        const auditEntries = await tx.auditEntry.findMany({
          where: {
            OR: [
              { resource: 'person', resourceId: personId },
              { userId: person.keycloakUserId ?? '' },
            ],
          },
        });

        for (const entry of auditEntries) {
          if (entry.metadata) {
            const sanitized = this.sanitizeAuditMetadata(entry.metadata);
            await tx.auditEntry.update({
              where: { id: entry.id },
              data: { metadata: sanitized as Prisma.InputJsonValue },
            });
          }
        }
      });

      // Update job status to COMPLETED
      await this.prisma.dsgvoJob.update({
        where: { id: dsgvoJobId },
        data: { status: 'COMPLETED' },
      });
    } catch (error) {
      // Update job status to FAILED
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

  async getDeletionsByPerson(personId: string) {
    return this.prisma.dsgvoJob.findMany({
      where: {
        personId,
        jobType: 'DATA_DELETION',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateAnonymousCounter(personId: string): number {
    // Deterministic counter from person ID using simple hash
    let hash = 0;
    for (let i = 0; i < personId.length; i++) {
      const char = personId.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash) % 1000000;
  }

  private sanitizeAuditMetadata(metadata: unknown): unknown {
    if (typeof metadata !== 'object' || metadata === null) {
      return metadata;
    }

    const sanitized: Record<string, unknown> = {};
    const sensitivePatterns = /email|name|phone|address|birth|ssn|health|firstName|lastName|socialSecurity/i;

    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (sensitivePatterns.test(key)) {
        sanitized[key] = '[anonymized]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeAuditMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
